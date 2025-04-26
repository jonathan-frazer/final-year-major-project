# Python 
## Use a virtual environment
1. Install `virtualenv` using `pip install virtualenv`.
2. Create a virtual environment using `virtualenv venv`.
3. Activate the virtual environment using `venv\Scripts\activate`.

## Install packages
1. Run `pip install -r requirements.txt` to install the required packages on pulling a commit.

## Install packages responsibly
1. Run `pip freeze > requirements.txt` after installing a new package.


# Neo4j - Docker
## Installation
1. Install Docker on your Machine
2. Open your terminal and type in `docker pull neo4j` and ENTER. It should download 'neo4j:latest'

## Running
1. Type in `docker run -p7474:7474 -p7687:7687 -d --env NEO4J_AUTH=neo4j/gohome123 neo4j:latest` and ENTER
   It creates a docker instances at port 7474 and 7687 as a background process with
   username: "neo4j"
   password: "gohome"
2. Check to see if docker is running the image using `docker ps``
3. Go to `http://localhost:7474/` in your browser and type in the password to login to Neo4j

## Deleting container
1. First stop the container `docker stop <CONTAINER-ID>`
2. Then remove the container `docker rm <CONTAINER-ID>`

# Neo4j
## Connecting/Executing Database
1. `graph_test/init.py` Contains the code to connect to the database 
2. Once you have connected to the database, you can run queries using Cypher and the method `driver.execute_query()`
(To learn Cypher, Use CHATGPT or view the docs for just basic understanding like how to input nodes and relationships)

3. It's best to Keep `driver.execute_query()` within a try-except Block

## Extracting Information from Database
1. By default, `Driver.execute_query()` returns an `EagerResult object`.
2. The result can be transformed into a variety of objects using `result_transformer_` be it a list, a Pandas Dataframe or a Graph 