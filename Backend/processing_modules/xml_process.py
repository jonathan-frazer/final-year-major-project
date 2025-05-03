import subprocess
import os
import ast

#SRCML for Handling: C, Java, C# and C++
def convert_to_srcml(file_path):
    try:
        result = subprocess.run(['srcml', file_path], capture_output=True, text=True, check=True)
        return result.stdout  # This is the XML AST
    except subprocess.CalledProcessError as e:
        print("Error:", e.stderr)
        return None

#Basic AST for Handling: Python
def convert_to_ast(file_path):
    with open(file_path, 'r') as file:
        code = file.read()
        
        tree = ast.parse(code)

        # Print the AST
        print(ast.dump(tree, indent=4))


def convert_to_xml(file_path):
    if file_path.endswith('.py'):
        return convert_to_ast(file_path)
    else:
        return convert_to_srcml(file_path)

if __name__ == '__main__':
    # Example usage
    xml_ast = convert_to_xml('llm_process.py')
    print(xml_ast)