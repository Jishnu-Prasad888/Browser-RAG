# main.py
from fastapi import FastAPI
from pydantic import BaseModel
import sqlite3
from query import query_knowledge_base
from query import ask_ollama
from db import init_db
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    conversation_id: int
    message: str

@app.post("/api/conversations")
def create_conversation():
    conn = sqlite3.connect("chat.db")
    c = conn.cursor()
    c.execute("INSERT INTO conversations (title) VALUES ('New Conversation')")
    conn.commit()
    conv_id = c.lastrowid
    conn.close()
    return {"id": conv_id}

@app.get("/api/conversations")
def list_conversations():
    conn = sqlite3.connect("chat.db")
    c = conn.cursor()
    c.execute("SELECT id, title, created_at FROM conversations ORDER BY created_at DESC")
    data = [{"id": row[0], "title": row[1], "created_at": row[2]} for row in c.fetchall()]
    conn.close()
    return data

@app.get("/api/messages/{conversation_id}")
def get_messages(conversation_id: int):
    conn = sqlite3.connect("chat.db")
    c = conn.cursor()
    c.execute("SELECT role, content FROM messages WHERE conversation_id=? ORDER BY created_at ASC", (conversation_id,))
    data = [{"role": row[0], "content": row[1]} for row in c.fetchall()]
    conn.close()
    return data

@app.post("/api/chat")
def chat(req: ChatRequest):
    conn = sqlite3.connect("chat.db")
    c = conn.cursor()

    # Save user message
    c.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
              (req.conversation_id, "user", req.message))

    # Get RAG answer
    docs = query_knowledge_base(req.message)
    combined_context = "\n\n".join(docs)
    answer = ask_ollama(req.message, combined_context)

    # Save assistant message
    c.execute("INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
              (req.conversation_id, "assistant", answer))

    conn.commit()
    conn.close()

    return {"response": answer}


# Add this to your main.py
@app.delete("/api/conversations/{conversation_id}")
def delete_conversation(conversation_id: int):
    conn = sqlite3.connect("chat.db")
    c = conn.cursor()
    
    # Delete messages first to maintain referential integrity
    c.execute("DELETE FROM messages WHERE conversation_id=?", (conversation_id,))
    c.execute("DELETE FROM conversations WHERE id=?", (conversation_id,))
    
    conn.commit()
    conn.close()
    return {"status": "success"}