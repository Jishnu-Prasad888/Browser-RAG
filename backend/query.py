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
    prompt = f"""
    You are an AI assistant that answers questions strictly based on the provided context. 
    Your responses must be in Markdown format.

    Instructions:
    - Use only the information from the given context to answer the user's question.
    - If the context does not contain enough information to answer, respond with: 
      "I don't have enough information in the context to answer that question."
    - Do not make assumptions or provide information not present in the context.
    - Answer in Markdown only; do not include anything outside of Markdown formatting.

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
    print(output.strip())
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
