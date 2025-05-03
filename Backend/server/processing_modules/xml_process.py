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
    code = ""
    with open(file_path, 'r') as file:
        code = file.read()    
    tree = ast.parse(code)

    return ast.dump(tree, indent=4)

def extract_class(file_path):
    # Python
    if file_path.endswith('.py'):
        return convert_to_ast(file_path)
    
    # C, Java, C# and C++
    else:
        return convert_to_srcml(file_path)

if __name__ == '__main__':
    # Example usage
    xml_ast = extract_class('processing_modules/llm_process.py')
    print(xml_ast)