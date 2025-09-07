param(
    [string]$ContainerName = "neo4j-graphrag"
)

Write-Host "=== Start Neo4j (Enterprise) for GraphRAG ==="

function Assert-DockerRunning {
  if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    Write-Error "Docker not installed. Install Docker Desktop and retry."; exit 1
  }
  $null = docker info 2>$null
  if ($LASTEXITCODE -ne 0) {
    Write-Error "Docker daemon not running. Start Docker Desktop and retry."; exit 1
  }
}

# Resolve project root (parent of this script's folder)
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Locate .env (project root first, then FastAPI Backend)
$envCandidates = @(
  (Join-Path $ProjectRoot ".env"),
  (Join-Path $ProjectRoot "FastAPI Backend/.env")
)
$envPath = $null
foreach ($c in $envCandidates) { if (Test-Path $c) { $envPath = $c; break } }
if (-not $envPath) { Write-Error ".env not found in project root or FastAPI Backend"; exit 1 }

$envDict = @{}
Get-Content $envPath | ForEach-Object {
  if ($_ -match '^(\w+)=(.*)$') { $envDict[$matches[1]] = $matches[2] }
}

$NEO4J_URI = $envDict['NEO4J_URI']
$NEO4J_USERNAME = $envDict['NEO4J_USERNAME']
$NEO4J_PASSWORD = $envDict['NEO4J_PASSWORD']
$EMBEDDING_BACKEND = $envDict['EMBEDDING_BACKEND']

Write-Host "Using .env: $envPath"
Write-Host "NEO4J_USERNAME: $NEO4J_USERNAME"
Write-Host "EMBEDDING_BACKEND: $EMBEDDING_BACKEND"

if (-not $NEO4J_USERNAME -or -not $NEO4J_PASSWORD) {
  Write-Error "Missing NEO4J_USERNAME or NEO4J_PASSWORD in .env"; exit 1
}

$dim = 384
if ($EMBEDDING_BACKEND -and $EMBEDDING_BACKEND.ToLower() -eq 'openai') { $dim = 1536 }

# Ensure Docker is installed and daemon is running
Assert-DockerRunning

# Ensure container exists and is running
$exists = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $exists) {
  Write-Host "Creating Neo4j Enterprise container '$ContainerName'..."
  docker run -d --name $ContainerName `
    -p 7474:7474 -p 7687:7687 `
    -e NEO4J_ACCEPT_LICENSE_AGREEMENT=yes `
    -e NEO4J_AUTH=$NEO4J_USERNAME/$NEO4J_PASSWORD `
    -e 'NEO4J_PLUGINS=["apoc"]' `
    -e NEO4J_dbms_security_procedures_unrestricted=apoc.* `
    -e NEO4J_server_config_strict__validation_enabled=false `
    neo4j:5.21-enterprise | Out-Null
} else {
  $running = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
  if (-not $running) {
    Write-Host "Starting existing container '$ContainerName'..."
    docker start $ContainerName | Out-Null
  } else {
    Write-Host "Container '$ContainerName' is already running."
  }
}

# Wait for Bolt (7687) to be ready
Write-Host "Waiting for Bolt (7687) to be ready..."
$maxWait = 180
$sw = [Diagnostics.Stopwatch]::StartNew()
while ($sw.Elapsed.TotalSeconds -lt $maxWait) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient('localhost',7687)
    if ($tcp.Connected) { $tcp.Close(); break }
  } catch {}
  Start-Sleep -Seconds 2
}
$sw.Stop()

# Create vector indexes (idempotent)
$cypher = @"
CALL db.index.vector.createNodeIndex('function_embedding','Function','embedding',$dim,'cosine');
CALL db.index.vector.createNodeIndex('class_embedding','Class','embedding',$dim,'cosine');
CALL db.awaitIndexes();
"@

$tmp = New-TemporaryFile
# Write cypher without BOM to avoid cypher-shell '???' prefix
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tmp, $cypher, $utf8NoBom)
docker cp $tmp "$ContainerName`:/var/lib/neo4j/import/init.cypher" | Out-Null

Write-Host "Ensuring vector indexes (dimension=$dim)..."
$execCmd = "/var/lib/neo4j/bin/cypher-shell -a bolt://localhost:7687 -u $NEO4J_USERNAME -p $NEO4J_PASSWORD -f /var/lib/neo4j/import/init.cypher"
for ($i=0; $i -lt 6; $i++) {
  docker exec $ContainerName bash -lc $execCmd
  if ($LASTEXITCODE -eq 0) { break }
  Start-Sleep -Seconds 5
}
Remove-Item $tmp -ErrorAction SilentlyContinue

$boltOk = $false
try {
  $tcp = New-Object System.Net.Sockets.TcpClient('localhost',7687)
  if ($tcp.Connected) { $tcp.Close(); $boltOk = $true }
} catch {}

if (-not $boltOk) {
  Write-Error "Neo4j Bolt is not reachable on localhost:7687. Check Docker Desktop and container logs."; exit 1
}

Write-Host "Neo4j is ready at bolt://localhost:7687 (http://localhost:7474)."
Write-Host "Username: $NEO4J_USERNAME"
Write-Host "Vector indexes ensured (function_embedding, class_embedding)."
