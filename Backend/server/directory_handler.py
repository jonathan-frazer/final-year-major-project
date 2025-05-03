import json
import os

import os

def directory_to_json(rootdir):
    stack = []
    root_structure = {
        "name": os.path.basename(rootdir),
        "type": "directory",
        "children": []
    }
    stack.append((rootdir, root_structure))

    while stack:
        current_dir, current_structure = stack.pop()

        try:
            items = os.listdir(current_dir)
        except Exception:
            continue  # Skip unreadable directories

        for item in items:
            item_path = os.path.join(current_dir, item)

            if os.path.isdir(item_path):
                dir_structure = {
                    "name": os.path.basename(item_path),
                    "type": "directory",
                    "children": []
                }
                current_structure["children"].append(dir_structure)
                stack.append((item_path, dir_structure))
            else:
                if item.endswith(('.java', '.py', '.js', '.ts', '.cpp', '.c', '.h', '.hpp', '.go', '.swift', '.kotlin', '.scala', '.php', '.rb', '.rs')):
                    try:
                        with open(item_path, 'r', encoding='utf-8') as file:
                            content = file.read()
                    except Exception:
                        content = ""  # Handle file read errors

                    current_structure["children"].append({
                        "name": item,
                        "type": "file",
                        "content": content
                    })

    return root_structure


if __name__ == '__main__':
    # Specify the directory you want to traverse
    directory_path = 'server/uploads/neural_network-master'  # Change this to your target directory
    directory_structure = directory_to_json(directory_path)

    # Print the structure in JSON format
    print(json.dumps(directory_structure, indent=2))