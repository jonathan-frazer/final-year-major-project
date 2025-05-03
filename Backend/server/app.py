from flask import Flask, request, jsonify
import zipfile
from flask_cors import CORS
import os
import shutil
from directory_handler import directory_to_json

app = Flask(__name__)
CORS(app)

@app.route('/api/code_upload', methods=['POST'])
def code_upload():
    zip_file = request.files['file']
    zip_ref = zipfile.ZipFile(zip_file, 'r')
    zip_ref.extractall('server/uploads/')
    zip_ref.close()

        

    try:
        # Specify the directory you want to traverse
        directory_structure = directory_to_json(f"server/uploads/{zip_file.filename.replace('.zip','')}")
        
        #Delete once uploaded
        for child in os.listdir('server/uploads'):
            shutil.rmtree(f'server/uploads/{child}')
        
        # Return the Structure in JSON Format
        return jsonify({'structure': directory_structure}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': 'Could not Open JSON File'}), 400

if __name__ == '__main__':
    app.run()
