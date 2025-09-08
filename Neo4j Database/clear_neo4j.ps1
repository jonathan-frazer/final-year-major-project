param(
    [string]$ContainerName = "neo4j-graphrag",
    [switch]$Hard
)

Write-Host "=== Clear Neo4j Graph Database ==="

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
if (-not $envPath) { Write-Warning ".env not found; falling back to default Docker auth in container." }

$envDict = @{}
if ($envPath) {
  Get-Content $envPath | ForEach-Object {
    if ($_ -match '^(\w+)=(.*)$') { $envDict[$matches[1]] = $matches[2] }
  }
}

$NEO4J_USERNAME = $envDict['NEO4J_USERNAME']
$NEO4J_PASSWORD = $envDict['NEO4J_PASSWORD']

Write-Host "Using container: $ContainerName"
if ($NEO4J_USERNAME) { Write-Host "NEO4J_USERNAME: $NEO4J_USERNAME" }

# Ensure Docker is installed and daemon is running
Assert-DockerRunning

# Ensure container exists and is running
$exists = docker ps -a --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $exists) {
  Write-Error "Container '$ContainerName' not found. Run start_neo4j.ps1 first."; exit 1
}
$running = docker ps --filter "name=$ContainerName" --format "{{.Names}}"
if (-not $running) {
  Write-Host "Starting existing container '$ContainerName'..."
  docker start $ContainerName | Out-Null
}

# Build Cypher
if ($Hard) {
  Write-Host "Mode: HARD reset (drop all schema + delete all data)"
  $cypher = @"
CALL apoc.schema.assert({}, {});
MATCH (n) DETACH DELETE n;
"@
} else {
  Write-Host "Mode: Data only (delete all nodes/relationships)"
  $cypher = @"
MATCH (n) DETACH DELETE n;
"@
}

# Write cypher to temp file without BOM
$tmp = New-TemporaryFile
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($tmp, $cypher, $utf8NoBom)

# Copy and execute via cypher-shell
docker cp $tmp "$ContainerName`:/var/lib/neo4j/import/clear.cypher" | Out-Null

$authPart = ""
if ($NEO4J_USERNAME -and $NEO4J_PASSWORD) {
  $authPart = "-u $NEO4J_USERNAME -p $NEO4J_PASSWORD"
}
$execCmd = "/var/lib/neo4j/bin/cypher-shell -a bolt://localhost:7687 $authPart -f /var/lib/neo4j/import/clear.cypher"

Write-Host "Executing clear..."
docker exec $ContainerName bash -lc $execCmd
$code = $LASTEXITCODE

Remove-Item $tmp -ErrorAction SilentlyContinue

if ($code -ne 0) {
  Write-Error "Clear operation failed with exit code $code."; exit $code
}

Write-Host "Neo4j graph cleared successfully."

