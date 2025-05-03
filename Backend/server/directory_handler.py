import json
import os

def directory_to_json(rootdir):
    structure = {
        "name": os.path.basename(rootdir),
        "type": "directory",
        "children": []
    }
    
    for item in os.listdir(rootdir):
        item_path = os.path.join(rootdir, item)
        if os.path.isdir(item_path):
            # If it's a directory, recursively get its structure
            structure["children"].append(directory_to_json(item_path))
        else:
            # If it's a file, read its content with error handling
            if item.endswith(('.java', '.py', '.js', '.ts', '.cpp', '.c', '.h', '.hpp', '.go', '.swift', '.kotlin', '.scala', '.php', '.rb', '.rs')):
                with open(item_path, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                structure["children"].append({
                    "name": item,
                    "type": "file",
                    "content": content
                })
    
    return structure

if __name__ == '__main__':
    # Specify the directory you want to traverse
    directory_path = 'server/uploads/neural_network-master'  # Change this to your target directory
    directory_structure = directory_to_json(directory_path)

    # Print the structure in JSON format
    print(json.dumps(directory_structure, indent=2))