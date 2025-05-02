from flask import Flask, request, jsonify
import zipfile
from flask_cors import CORS
import json

app = Flask(__name__)
CORS(app)

@app.route('/api/code_upload', methods=['POST'])
def code_upload():
    zip_file = request.files['file']
    zip_ref = zipfile.ZipFile(zip_file, 'r')
    zip_ref.extractall('uploads/')
    zip_ref.close()
    with open('example.json') as f:
        structure = json.load(f)
        return jsonify({'structure': structure}), 200
    
    return jsonify({'error': 'Could not Open JSON File'}), 400

if __name__ == '__main__':
    app.run()
