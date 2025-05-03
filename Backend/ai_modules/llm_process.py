import yaml
import torch
from sentence_transformers import SentenceTransformer
from langchain.embeddings.base import Embeddings
from langchain.schema.runnable import Runnable
from langchain_community.vectorstores import Chroma
import chromadb
import google.generativeai as genai

# Load configuration from YAML
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

class CUDAHuggingFaceEmbeddings(Embeddings):
    """
    Custom HuggingFaceEmbeddings class using CUDA for SentenceTransformer with GPU layer control.
    """
    def __init__(self, model_name):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.model = SentenceTransformer(model_name).to(self.device)
    
    def embed_query(self, query: str):
        return self.model.encode(query, device=self.device).tolist()

    def embed_documents(self, documents: list):
        return [self.model.encode(doc, device=self.device).tolist() for doc in documents]

class GeminiFlashLLM(Runnable):
    """Custom LLM class to interact with Google Gemini 2.0 Flash"""
    def __init__(self, model_name="gemini-2.0-flash", api_key=config["api_key"]):
        
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(model_name)
    
    def invoke(self, prompt, *args, **kwargs):
        response = self.model.generate_content(prompt, stream=False)
        return response.text.strip()

# Function to create embeddings
def create_embeddings():
    return CUDAHuggingFaceEmbeddings(model_name=config["embeddings_path"])

# Function to load vector database
def load_vectordb(embeddings, collection_name="default"):
    persistent_client = chromadb.PersistentClient("chroma_db")
    return Chroma(client=persistent_client, collection_name=collection_name, embedding_function=embeddings)

def invoke_prompt():
    llm = GeminiFlashLLM()
    result = llm.invoke("""
                        Keep your response <100 tokens.
                        Explain what a neural network is
                        """)  # Pass the query and retrieved data
    
    output_filename = "generated_output.txt"
    with open(output_filename, "w") as f:
        f.write(result)

if __name__ == "__main__":
    invoke_prompt()