import chromadb
from chromadb.utils import embedding_functions
import requests
import json
import subprocess

# ----- CONFIG -----
CHROMA_COLLECTION = "page_chunks"  # The collection with HTML chunks
OLLAMA_MODEL = "llama3.2"
RETRIEVAL_LIMIT = 5

# Connect to Chroma DB
client = chromadb.PersistentClient(path="./page_chunks_db")
embedding_func = embedding_functions.OllamaEmbeddingFunction(
    model_name="nomic-embed-text"
)

collection = client.get_or_create_collection(
    name=CHROMA_COLLECTION,
    embedding_function=embedding_func
)

def query_knowledge_base(question: str, n_results=RETRIEVAL_LIMIT):
    """Retrieve top-matching documents for the query."""
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )
    documents = results.get("documents", [[]])[0]
    return documents

def ask_ollama(question: str, context: str) -> str:
    """Send the question + retrieved context to Ollama."""
    prompt = f"""You are an AI assistant. 
    Use the following context from the user's browsing history to answer the question.
    If you don't know the answer, say you don't know. Do not answer if the answer cant be found in the context.Only answer from the context if the  context is not sufficient tell the user that you dont have the required data do not in any case answer the user if the context is not sufficient

    Context:
    {context}

    Question: {question}
    Answer:
    """
    
    process = subprocess.Popen(
        ["ollama", "run", OLLAMA_MODEL],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    output, _ = process.communicate(prompt)
    return output.strip()

if __name__ == "__main__":
    user_query = input("Enter your question: ")

    # Step 1: Retrieve matching HTML chunks from Chroma DB
    docs = query_knowledge_base(user_query)
    combined_context = "\n\n".join(docs)

    # Step 2: Ask LLaMA with the retrieved context
    answer = ask_ollama(user_query, combined_context)

    print("\n--- ANSWER ---")
    print(answer)
