from neo4j import GraphDatabase
import neo4j
import pyvis

URI = "neo4j://localhost:7687"
AUTH = ("neo4j", "gohome123")


def visualize_result(query_graph, nodes_text_properties):
	visual_graph = pyvis.network.Network(directed=True)

	for node in query_graph.nodes:
		node_label = list(node.labels)[0]
		node_text = node[nodes_text_properties[node_label]]

		node_color = node['favoritecolor'].lower() if node['favoritecolor'] else 'gray'

		visual_graph.add_node(node.element_id, node_text, color=node_color)

	for relationship in query_graph.relationships:
		visual_graph.add_edge(
			relationship.start_node.element_id,
			relationship.end_node.element_id,
			title=relationship.type
		)

	visual_graph.show('network.html', notebook=False)

def run_query(driver):
	#Delete all nodes
	driver.execute_query("MATCH (n) DETACH DELETE(n)")

	driver.execute_query("""
		CREATE (n0:Person {name:"Kaio",favoritecolor:"Red",age:33.1,sex:"M"})
		CREATE (n1:Person {name:"Tsuyu",favoritecolor:"Green",age:33.3,sex:"F"})
		CREATE (n2:Person {name:"Aeon",favoritecolor:"#EEEEEE",age:11.7,sex:"M"})
		CREATE (n3:Person {name:"Ikari",favoritecolor:"Aqua",age:7.2,sex:"F"})
		CREATE (n4:Person {name:"Izayoi",favoritecolor:"Blue",age:9.5,sex:"F"})
	""")

	driver.execute_query("""
		MATCH (n0:Person),(n1:Person) WHERE n0.age >= 18 AND n1.age >= 18 AND n0.sex <> n1.sex
		CREATE (n0)-[:MARRIED_TO]->(n1)
		"""
	)

	driver.execute_query("""
		MATCH (n0:Person),(n1:Person) WHERE n0.age >= 18 AND n0.sex = 'M' AND n1.age < 18
		CREATE (n0)-[:FATHER_OF]->(n1)
		"""
	)

	driver.execute_query("""
		MATCH (n0:Person),(n1:Person) WHERE n0.age >= 18 AND n0.sex = 'F' AND n1.age < 18
		CREATE (n0)-[:MOTHER_OF]->(n1)
		"""
	)

	driver.execute_query("""
		MATCH (n0:Person),(n1:Person) WHERE n0.age < 18 AND n0.sex = 'M' AND n1.age < 18 AND n1 <> n0
		CREATE (n0)-[:BROTHER_OF]->(n1)
		"""
	)

	driver.execute_query("""
		MATCH (n0:Person),(n1:Person) WHERE n0.age < 18 AND n0.sex = 'F' AND n1.age < 18 AND n1 <> n0
		CREATE (n0)-[:SISTER_OF]->(n1)
		"""
	)
		
	graph_result = driver.execute_query(
		"""
		MATCH (n)
		OPTIONAL MATCH (n)-[r]->(m)
		RETURN n, r, m
		""",
		result_transformer_=neo4j.Result.graph,
	)

	# Draw graph
	nodes_text_properties = {"Person": "name", "School": "name"}
	visualize_result(graph_result, nodes_text_properties)


if __name__ == "__main__":
	with GraphDatabase.driver(URI, auth=AUTH) as driver: 
		driver.verify_connectivity() 
		print("Connection established.")
		run_query(driver)