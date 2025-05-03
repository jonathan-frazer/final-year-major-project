from flask import Flask, request, jsonify
import zipfile
from flask_cors import CORS
import os
import shutil
from queue import Queue
import time
import re
from threading import Thread
import random
from processing_modules.llm_process import invoke_llm
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
        try: shutil.rmtree(f'server/uploads')
        except Exception: pass

        # Return the Structure in JSON Format
        return jsonify({'structure': directory_structure}), 200
    except Exception as e:
        print(e)
        return jsonify({'error': 'Could not Open JSON File'}), 400
    
# Queue for incoming LLM requests
request_queue = Queue()
response_dict = {}

# Worker function to handle requests with delay
def llm_worker():
    while True:
        req_id, content = request_queue.get()
        documentation = invoke_llm(content) 
        try:
            result = re.sub(r"```\w{0,10}\n{0,5}","",documentation) +"\n\n"+content
            response_dict[req_id] = result
        except Exception as e:
            response_dict[req_id] = f"Error: {str(e)}"
        time.sleep(1)  # Wait 1 second before processing next
        request_queue.task_done()

# Start background worker thread
Thread(target=llm_worker, daemon=True).start()

@app.route('/api/transform-content', methods=['POST', 'OPTIONS'])
def code_transform():
    if request.method == 'OPTIONS':
        return '', 200

    data = request.get_json()
    content = data.get('content')
    req_id = str(time.time_ns())  # Unique ID for this request

    request_queue.put((req_id, content))

    # Wait until the worker processes it (polling response_dict)
    while req_id not in response_dict:
        time.sleep(0.1)  # Polling wait

    result = response_dict.pop(req_id)
    return jsonify({'modifiedContent': result}), 200

if __name__ == '__main__':
    app.run()