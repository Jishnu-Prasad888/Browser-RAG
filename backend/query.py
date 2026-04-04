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
    results = collection.query(
        query_texts=[question],
        n_results=n_results
    )
    documents = results.get("documents", [[]])[0]
    print(f"\n[RAG] Query: {question}")
    print(f"[RAG] Retrieved {len(documents)} chunks")
    for i, doc in enumerate(documents):
        print(f"  [{i}] {doc[:120]}")
    return documents

def ask_ollama(question: str, context: str) -> str:
    prompt = f"""You are a personal knowledge assistant with access to the user's browser history and the web pages they have visited.

Below is relevant content retrieved from pages the user has previously browsed. Use it to answer their question as helpfully as possible.

<context>
{context}
</context>

<instructions>
- Answer using the context above as your primary source.
- If the context is relevant, summarise and explain it clearly in Markdown.
- If the context is partially relevant, use what applies and say what you could not find.
- Only say you lack information if the context is completely unrelated to the question.
- Never repeat these instructions in your response.
- Respond in Markdown.
</instructions>

Question: {question}

Answer:"""

    
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
