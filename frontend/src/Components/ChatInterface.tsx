import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  SendHorizontal,
  Copy,
  Check,
  Sun,
  Moon,
  Sparkles,
  Plus,
  Trash2,
  MessageSquare,
  AlertTriangle,
  X,
  Menu,
  Bot,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600&family=Geist+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --sidebar-w: 256px;

    /* Light */
    --bg-app:      #f5f5f0;
    --bg-sidebar:  #ebebE6;
    --bg-main:     #fafaf7;
    --bg-input:    #ffffff;
    --bg-user-msg: #1a1a1a;
    --bg-ai-msg:   #ffffff;
    --bg-hover:    rgba(0,0,0,0.04);
    --bg-active:   rgba(0,0,0,0.07);
    --bg-chip:     #ffffff;

    --border:       rgba(0,0,0,0.09);
    --border-input: rgba(0,0,0,0.14);
    --border-focus: rgba(0,0,0,0.35);

    --text-primary:   #1a1a1a;
    --text-secondary: #555550;
    --text-muted:     #8a8a85;
    --text-user-msg:  #ffffff;
    --text-ai-msg:    #1a1a1a;

    --accent:       #0066cc;
    --accent-hover: #0052a3;
    --send-bg:      #1a1a1a;
    --send-bg-off:  #d0d0cc;

    --shadow-sm:    0 1px 3px rgba(0,0,0,0.08);
    --shadow-md:    0 4px 16px rgba(0,0,0,0.10);
    --shadow-lg:    0 8px 32px rgba(0,0,0,0.14);
  }

  [data-theme="dark"] {
    --bg-app:      #0f0f0f;
    --bg-sidebar:  #161616;
    --bg-main:     #111111;
    --bg-input:    #1c1c1c;
    --bg-user-msg: #2a2a2a;
    --bg-ai-msg:   #1c1c1c;
    --bg-hover:    rgba(255,255,255,0.04);
    --bg-active:   rgba(255,255,255,0.08);
    --bg-chip:     #1e1e1e;

    --border:       rgba(255,255,255,0.08);
    --border-input: rgba(255,255,255,0.12);
    --border-focus: rgba(255,255,255,0.35);

    --text-primary:   #f0f0f0;
    --text-secondary: #a0a0a0;
    --text-muted:     #606060;
    --text-user-msg:  #f0f0f0;
    --text-ai-msg:    #f0f0f0;

    --accent:       #4d9fff;
    --accent-hover: #66aaff;
    --send-bg:      #f0f0f0;
    --send-bg-off:  #2a2a2a;

    --shadow-sm:    0 1px 3px rgba(0,0,0,0.3);
    --shadow-md:    0 4px 16px rgba(0,0,0,0.4);
    --shadow-lg:    0 8px 32px rgba(0,0,0,0.5);
  }

  html, body, #root {
    height: 100%;
    font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    background: var(--bg-app);
    color: var(--text-primary);
  }

  /* ── App shell ── */
  .app-shell {
    display: flex;
    height: 100dvh;
    overflow: hidden;
    background: var(--bg-app);
  }

  /* ── Sidebar overlay (mobile) ── */
  .sidebar-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.4);
    z-index: 40;
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .sidebar-overlay.visible {
    display: block;
    opacity: 1;
    pointer-events: auto;
  }

  /* ── Sidebar ── */
  .sidebar {
    width: var(--sidebar-w);
    flex-shrink: 0;
    background: var(--bg-sidebar);
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar-header {
    padding: 16px 14px 12px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }
  .sidebar-logo {
    width: 28px; height: 28px;
    background: var(--text-primary);
    color: var(--bg-main);
    border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  [data-theme="dark"] .sidebar-logo { background: #f0f0f0; color: #111; }
  .sidebar-brand {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.01em;
    flex: 1;
  }

  .sidebar-new-btn {
    display: flex; align-items: center; gap: 7px;
    margin: 10px 10px 6px;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--bg-main);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    width: calc(100% - 20px);
  }
  .sidebar-new-btn:hover {
    background: var(--bg-hover);
    border-color: var(--border-focus);
  }
  .sidebar-new-btn svg { opacity: 0.7; }

  .sidebar-section-label {
    padding: 10px 14px 4px;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .sidebar-list {
    flex: 1;
    overflow-y: auto;
    padding: 2px 8px 12px;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .sidebar-list::-webkit-scrollbar { width: 4px; }
  .sidebar-list::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .sidebar-item {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 8px 8px 10px;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.12s;
    position: relative;
    group: true;
  }
  .sidebar-item:hover { background: var(--bg-hover); }
  .sidebar-item.active { background: var(--bg-active); }

  .sidebar-item-icon {
    width: 20px; height: 20px;
    border-radius: 5px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    color: var(--text-muted);
  }
  .sidebar-item.active .sidebar-item-icon {
    background: var(--text-primary);
    border-color: transparent;
    color: var(--bg-main);
  }
  [data-theme="dark"] .sidebar-item.active .sidebar-item-icon { color: #111; }

  .sidebar-item-body { flex: 1; min-width: 0; }
  .sidebar-item-title {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1.3;
  }
  .sidebar-item-date {
    font-size: 0.7rem;
    color: var(--text-muted);
    margin-top: 1px;
  }

  .sidebar-delete-btn {
    width: 24px; height: 24px;
    border-radius: 6px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s, color 0.12s;
    opacity: 0;
  }
  .sidebar-item:hover .sidebar-delete-btn { opacity: 1; }
  .sidebar-delete-btn:hover { background: rgba(220,38,38,0.1); color: #dc2626; }

  .sidebar-empty {
    padding: 40px 12px;
    text-align: center;
    color: var(--text-muted);
  }
  .sidebar-empty p { font-size: 0.78rem; margin-top: 8px; line-height: 1.4; }

  .skeleton {
    height: 52px;
    border-radius: 8px;
    background: var(--bg-hover);
    margin-bottom: 4px;
    animation: shimmer 1.4s ease-in-out infinite alternate;
  }
  @keyframes shimmer { from { opacity: 0.5; } to { opacity: 1; } }

  /* ── Main area ── */
  .main-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-main);
    min-width: 0;
  }

  /* ── Header ── */
  .chat-header {
    height: 52px;
    padding: 0 16px;
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
    background: var(--bg-main);
  }
  .header-menu-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    display: none; /* hidden on desktop */
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: background 0.12s;
    flex-shrink: 0;
  }
  .header-menu-btn:hover { background: var(--bg-hover); }
  .header-title {
    flex: 1;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .header-actions { display: flex; align-items: center; gap: 4px; }
  .header-icon-btn {
    width: 32px; height: 32px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: var(--text-secondary);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    transition: background 0.12s;
  }
  .header-icon-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* ── Messages area ── */
  .messages-scroll {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .messages-scroll::-webkit-scrollbar { width: 5px; }
  .messages-scroll::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

  .messages-inner {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 20px 16px;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  /* ── Message rows ── */
  .msg-row {
    display: flex;
    flex-direction: column;
    margin-bottom: 28px;
  }

  .msg-sender {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-muted);
    margin-bottom: 6px;
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .msg-sender-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: var(--accent);
    flex-shrink: 0;
  }

  /* User message */
  .msg-row.user { align-items: flex-end; }
  .msg-row.user .msg-sender { justify-content: flex-end; }
  .user-bubble {
    background: var(--bg-user-msg);
    color: var(--text-user-msg);
    border-radius: 16px 16px 4px 16px;
    padding: 10px 14px;
    font-size: 0.895rem;
    line-height: 1.55;
    max-width: 80%;
    white-space: pre-wrap;
    word-break: break-word;
  }

  /* AI message */
  .msg-row.assistant { align-items: flex-start; }
  .ai-bubble {
    background: transparent;
    color: var(--text-ai-msg);
    font-size: 0.895rem;
    line-height: 1.65;
    max-width: 100%;
    word-break: break-word;
  }

  .msg-actions {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-top: 8px;
    opacity: 0;
    transition: opacity 0.15s;
  }
  .msg-row:hover .msg-actions { opacity: 1; }
  .msg-action-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--bg-chip);
    color: var(--text-muted);
    font-family: inherit;
    font-size: 0.72rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .msg-action-btn:hover { background: var(--bg-hover); color: var(--text-primary); }

  /* ── Prose (AI markdown) ── */
  .prose-chat p { margin: 0 0 12px; }
  .prose-chat p:last-child { margin-bottom: 0; }
  .prose-chat h1, .prose-chat h2, .prose-chat h3 {
    font-weight: 600;
    line-height: 1.3;
    margin: 18px 0 8px;
    color: var(--text-primary);
  }
  .prose-chat h1 { font-size: 1.25rem; }
  .prose-chat h2 { font-size: 1.1rem; }
  .prose-chat h3 { font-size: 0.975rem; }
  .prose-chat ul, .prose-chat ol {
    padding-left: 20px;
    margin: 8px 0 12px;
  }
  .prose-chat li { margin-bottom: 4px; line-height: 1.6; }
  .prose-chat code:not(.code-content) {
    font-family: 'Geist Mono', 'Menlo', 'Monaco', monospace;
    font-size: 0.82em;
    background: var(--bg-active);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 5px;
    color: var(--text-primary);
  }
  .prose-chat a { color: var(--accent); text-decoration: none; }
  .prose-chat a:hover { text-decoration: underline; }
  .prose-chat blockquote {
    border-left: 3px solid var(--border-focus);
    padding-left: 12px;
    color: var(--text-secondary);
    margin: 12px 0;
    font-style: italic;
  }
  .prose-chat table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85rem;
    margin: 12px 0;
  }
  .prose-chat th, .prose-chat td {
    padding: 7px 10px;
    border: 1px solid var(--border);
    text-align: left;
  }
  .prose-chat th {
    background: var(--bg-hover);
    font-weight: 600;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  /* ── Code blocks ── */
  .code-block-wrap {
    border-radius: 10px;
    border: 1px solid var(--border);
    overflow: hidden;
    margin: 10px 0;
    font-family: 'Geist Mono', 'Menlo', 'Monaco', monospace;
  }
  .code-block-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 7px 12px;
    background: rgba(0,0,0,0.35);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .code-lang {
    font-size: 0.7rem;
    font-weight: 500;
    color: rgba(255,255,255,0.45);
    letter-spacing: 0.04em;
    text-transform: lowercase;
  }
  .code-copy-btn {
    display: flex; align-items: center; gap: 4px;
    padding: 3px 8px;
    border-radius: 5px;
    border: 1px solid rgba(255,255,255,0.12);
    background: rgba(255,255,255,0.07);
    color: rgba(255,255,255,0.5);
    font-family: inherit;
    font-size: 0.68rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s, color 0.12s;
  }
  .code-copy-btn:hover { background: rgba(255,255,255,0.12); color: rgba(255,255,255,0.8); }
  .code-content {
    display: block;
    padding: 14px 16px;
    overflow-x: auto;
    font-size: 0.82rem;
    line-height: 1.6;
    background: #0d1117;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.1) transparent;
  }
  .code-content::-webkit-scrollbar { height: 4px; }
  .code-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 2px; }

  /* ── Thinking indicator ── */
  .thinking-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    margin-bottom: 28px;
  }
  .thinking-dots {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 12px 0 4px;
  }
  .thinking-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: thinking-pulse 1.4s ease-in-out infinite;
  }
  .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
  .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes thinking-pulse {
    0%, 80%, 100% { opacity: 0.3; transform: scale(0.85); }
    40% { opacity: 1; transform: scale(1); }
  }

  /* ── Empty state ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 60px 24px 40px;
    text-align: center;
  }
  .empty-icon {
    width: 48px; height: 48px;
    border-radius: 14px;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    color: var(--text-muted);
    margin-bottom: 20px;
  }
  .empty-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--text-primary);
    letter-spacing: -0.02em;
    margin-bottom: 8px;
  }
  .empty-sub {
    font-size: 0.875rem;
    color: var(--text-muted);
    max-width: 340px;
    line-height: 1.55;
    margin-bottom: 32px;
  }
  .empty-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    max-width: 520px;
  }
  .empty-chip {
    padding: 7px 14px;
    border-radius: 20px;
    border: 1px solid var(--border);
    background: var(--bg-chip);
    color: var(--text-secondary);
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 450;
    cursor: pointer;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    white-space: nowrap;
  }
  .empty-chip:hover {
    background: var(--bg-hover);
    border-color: var(--border-focus);
    color: var(--text-primary);
  }

  /* ── Input area ── */
  .input-area {
    flex-shrink: 0;
    padding: 12px 20px 16px;
    border-top: 1px solid var(--border);
    background: var(--bg-main);
  }
  .input-box {
    max-width: 720px;
    margin: 0 auto;
    background: var(--bg-input);
    border: 1px solid var(--border-input);
    border-radius: 14px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-sm);
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .input-box:focus-within {
    border-color: var(--border-focus);
    box-shadow: var(--shadow-md);
  }
  .input-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    padding: 10px 10px 10px 14px;
  }
  .input-textarea {
    flex: 1;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.895rem;
    line-height: 1.55;
    resize: none;
    outline: none;
    min-height: 24px;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  .input-textarea::placeholder { color: var(--text-muted); }
  .input-textarea::-webkit-scrollbar { width: 4px; }
  .input-textarea::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

  .send-btn {
    width: 34px; height: 34px;
    border-radius: 10px;
    border: none;
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, opacity 0.15s, transform 0.1s;
  }
  .send-btn.active {
    background: var(--send-bg);
    color: var(--bg-main);
    opacity: 1;
  }
  [data-theme="dark"] .send-btn.active { color: #111; }
  .send-btn.inactive {
    background: var(--send-bg-off);
    color: var(--text-muted);
    opacity: 0.6;
    cursor: not-allowed;
  }
  .send-btn.active:hover { transform: scale(1.05); }

  .input-hint-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px 8px;
  }
  .input-hint {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
  .input-hint kbd {
    font-family: 'Geist Mono', monospace;
    font-size: 0.65rem;
    background: var(--bg-hover);
    border: 1px solid var(--border);
    border-radius: 4px;
    padding: 1px 4px;
    color: var(--text-secondary);
  }
  .char-count {
    font-size: 0.7rem;
    color: var(--text-muted);
    font-family: 'Geist Mono', monospace;
  }
  .char-count.warn { color: #f59e0b; }

  /* ── Alert modal ── */
  .alert-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }
  .alert-card {
    background: var(--bg-input);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 24px;
    width: 100%;
    max-width: 360px;
    box-shadow: var(--shadow-lg);
  }
  .alert-top {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 18px;
  }
  .alert-icon {
    width: 36px; height: 36px;
    border-radius: 10px;
    background: rgba(239,68,68,0.1);
    border: 1px solid rgba(239,68,68,0.2);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .alert-text h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }
  .alert-text p {
    font-size: 0.82rem;
    color: var(--text-secondary);
    line-height: 1.5;
  }
  .alert-close-icon {
    margin-left: auto;
    width: 28px; height: 28px;
    border-radius: 7px;
    border: none;
    background: transparent;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.12s;
  }
  .alert-close-icon:hover { background: var(--bg-hover); color: var(--text-primary); }
  .alert-dismiss-btn {
    width: 100%;
    padding: 9px;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--bg-hover);
    color: var(--text-primary);
    font-family: inherit;
    font-size: 0.82rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.12s;
  }
  .alert-dismiss-btn:hover { background: var(--bg-active); }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sidebar {
      position: fixed;
      top: 0; left: 0; bottom: 0;
      z-index: 50;
      transform: translateX(-100%);
      box-shadow: var(--shadow-lg);
    }
    .sidebar.open {
      transform: translateX(0);
    }
    .header-menu-btn { display: flex; }
    .messages-inner { padding: 20px 14px 12px; }
    .input-area { padding: 10px 12px 14px; }
    .empty-title { font-size: 1.25rem; }
    .empty-chips { gap: 6px; }
    .empty-chip { font-size: 0.75rem; padding: 6px 11px; }
    .user-bubble { max-width: 92%; }
  }
`;

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES
───────────────────────────────────────────────────────────────────────────── */
interface Message { role: "user" | "assistant"; content: string; }
interface Conversation { id: number; title: string; created_at: string; }
const API_BASE = "/api";

/* ─────────────────────────────────────────────────────────────────────────────
   CODE BLOCK
───────────────────────────────────────────────────────────────────────────── */
const CodeBlock = ({ language, className, children, ...props }: {
  language: string; className?: string; children: React.ReactNode; [k: string]: unknown;
}) => {
  const [copied, setCopied] = useState(false);
  const text = typeof children === "string" ? children : Array.isArray(children) ? children.join("") : String(children);
  const copy = () => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  return (
    <div className="code-block-wrap">
      <div className="code-block-header">
        <span className="code-lang">{language || "code"}</span>
        <button className="code-copy-btn" onClick={copy}>
          {copied ? <Check size={11} /> : <Copy size={11} />}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <code className={`code-content ${className ?? ""}`} {...props}>{children}</code>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MESSAGE BUBBLE
───────────────────────────────────────────────────────────────────────────── */
const MessageBubble = ({ message }: { message: Message }) => {
  const [copied, setCopied] = useState(false);
  const isUser = message.role === "user";
  const copy = () => navigator.clipboard.writeText(message.content).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  return (
    <div className={`msg-row ${isUser ? "user" : "assistant"}`}>
      <div className="msg-sender">
        {!isUser && <span className="msg-sender-dot" />}
        {isUser ? "You" : "Assistant"}
      </div>
      {isUser ? (
        <div className="user-bubble">{message.content}</div>
      ) : (
        <>
          <div className="ai-bubble">
            <div className="prose-chat">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight]}
                components={{
                  code(props) {
                    const { className, children } = props;
                    const match = /language-(\S+)/.exec(className || "");
                    return match ? (
                      <CodeBlock language={match[1]} className={className}>{children}</CodeBlock>
                    ) : (
                      <code className={className}>{children}</code>
                    );
                  },
                }}
              >{message.content}</ReactMarkdown>
            </div>
          </div>
          <div className="msg-actions">
            <button className="msg-action-btn" onClick={copy}>
              {copied ? <Check size={11} /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   THINKING INDICATOR
───────────────────────────────────────────────────────────────────────────── */
const ThinkingIndicator = () => (
  <div className="thinking-row">
    <div className="msg-sender">
      <span className="msg-sender-dot" />
      Assistant
    </div>
    <div className="thinking-dots">
      {[0,1,2].map(i => <span key={i} className="thinking-dot" />)}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   EMPTY STATE
───────────────────────────────────────────────────────────────────────────── */
const SUGGESTIONS = [
  "Summarise a recent article", "Help me write a cover letter",
  "Debug my Python code", "Explain quantum entanglement",
  "Draft a project proposal", "Compare REST vs GraphQL",
];
const EmptyState = ({ onSuggest }: { onSuggest: (s: string) => void }) => (
  <div className="empty-state">
    <div className="empty-icon"><Sparkles size={20} strokeWidth={1.8} /></div>
    <h2 className="empty-title">What's on your mind?</h2>
    <p className="empty-sub">Ask anything — from deep research to quick answers.</p>
    <div className="empty-chips">
      {SUGGESTIONS.map(s => (
        <button key={s} className="empty-chip" onClick={() => onSuggest(s)}>{s}</button>
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   ALERT
───────────────────────────────────────────────────────────────────────────── */
const AlertBox = ({ title, msg, onClose }: { title: string; msg: string; onClose?: () => void }) => (
  <div className="alert-overlay" onClick={onClose}>
    <div className="alert-card" onClick={e => e.stopPropagation()}>
      <div className="alert-top">
        <div className="alert-icon"><AlertTriangle size={16} color="#ef4444" /></div>
        <div className="alert-text">
          <h3>{title}</h3>
          <p>{msg}</p>
        </div>
        {onClose && (
          <button className="alert-close-icon" onClick={onClose}><X size={14} /></button>
        )}
      </div>
      {onClose && (
        <button className="alert-dismiss-btn" onClick={onClose}>Dismiss</button>
      )}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────────────────────
   SIDEBAR
───────────────────────────────────────────────────────────────────────────── */
interface SidebarProps {
  currentConversationId: number | null;
  onConversationSelect: (id: number) => void;
  onNewConversation: () => void;
  onConversationDeleted: () => void;
  refreshTrigger: number;
  isOpen: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentConversationId, onConversationSelect, onNewConversation,
  onConversationDeleted, refreshTrigger, isOpen, onToggle,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  useEffect(() => { fetchConversations(); }, [refreshTrigger]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/conversations`);
      const data = await res.json();
      setConversations(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const deleteConversation = async (id: number) => {
    try {
      await fetch(`${API_BASE}/conversations/${id}`, { method: "DELETE" });
      if (currentConversationId === id) onNewConversation();
      onConversationDeleted();
    } catch (e) { console.error(e); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = Math.floor((Date.now() - date.getTime()) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? "visible" : ""}`} onClick={onToggle} />
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo"><Bot size={14} strokeWidth={2} /></div>
          <span className="sidebar-brand">Browser Rag</span>
        </div>

        {/* New conversation */}
        <button className="sidebar-new-btn" onClick={() => { onNewConversation(); if (isOpen) onToggle(); }}>
          <Plus size={14} strokeWidth={2.5} />
          <span>New conversation</span>
        </button>

        {/* List */}
        {conversations.length > 0 && (
          <div className="sidebar-section-label">Recent</div>
        )}
        <div className="sidebar-list">
          {loading ? (
            [1,2,3].map(i => <div key={i} className="skeleton" style={{ animationDelay: `${i * 0.1}s` }} />)
          ) : conversations.length === 0 ? (
            <div className="sidebar-empty">
              <MessageSquare size={20} style={{ opacity: 0.25, display: "block", margin: "0 auto" }} />
              <p>No conversations yet.<br />Start a new one above.</p>
            </div>
          ) : conversations.map(conv => (
            <div
              key={conv.id}
              className={`sidebar-item ${currentConversationId === conv.id ? "active" : ""}`}
              onMouseEnter={() => setHoveredId(conv.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => { onConversationSelect(conv.id); if (isOpen) onToggle(); }}
            >
              <div className="sidebar-item-icon">
                <MessageSquare size={10} strokeWidth={2} />
              </div>
              <div className="sidebar-item-body">
                <p className="sidebar-item-title">{conv.title}</p>
                <p className="sidebar-item-date">{formatDate(conv.created_at)}</p>
              </div>
              {(hoveredId === conv.id || currentConversationId === conv.id) && (
                <button
                  className="sidebar-delete-btn"
                  onClick={e => { e.stopPropagation(); deleteConversation(conv.id); }}
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN CHAT INTERFACE
───────────────────────────────────────────────────────────────────────────── */
const ChatInterface: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<number | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [messages, setMessages] = useState<Message[]>([]);
  const [query, setQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [currentTitle, setCurrentTitle] = useState("New conversation");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleQueryChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const v = e.target.value;
    setQuery(v);
    setCharCount(v.length);
    const ta = e.target;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  };

  const loadConversationMessages = useCallback(async (id: number) => {
    try {
      const res = await fetch(`${API_BASE}/conversations/${id}/messages`);
      const data = await res.json();
      setMessages(data);
    } catch (e) { console.error(e); }
  }, []);

  const handleConversationSelect = (id: number) => {
    setCurrentConversationId(id);
    loadConversationMessages(id);
    setSidebarOpen(false);
    setCurrentTitle("Conversation");
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
    setCurrentTitle("New conversation");
  };

  const sendQuery = async () => {
    if (!query.trim() || isLoading) return;
    const userMessage = query.trim();
    setQuery("");
    setCharCount(0);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setIsLoading(true);
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);

    try {
      let convId = currentConversationId;
      if (!convId) {
        const convRes = await fetch(`${API_BASE}/conversations`, { method: "POST" });
        const convData = await convRes.json();
        convId = convData.id;
        setCurrentConversationId(convId);
        setRefreshTrigger(n => n + 1);
      }
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: convId, message: userMessage }),
      });
      if (!res.ok) { setShowAlert(true); throw new Error(`HTTP ${res.status}`); }
      const data = await res.json();
      setMessages(prev => [...prev, { role: "assistant", content: data.response }]);
      if (messages.length === 0) setCurrentTitle(userMessage.slice(0, 40) + (userMessage.length > 40 ? "…" : ""));
    } catch (e) {
      console.error(e);
      setMessages(prev => prev.slice(0, -1));
      setShowAlert(true);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendQuery(); }
  };

  const handleSuggest = (s: string) => {
    setQuery(s);
    setCharCount(s.length);
    textareaRef.current?.focus();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="app-shell">
        <Sidebar
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onConversationDeleted={() => setRefreshTrigger(n => n + 1)}
          refreshTrigger={refreshTrigger}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(o => !o)}
        />

        <div className="main-area">
          {/* Header */}
          <div className="chat-header">
            <button className="header-menu-btn" onClick={() => setSidebarOpen(o => !o)} title="Toggle sidebar">
              <Menu size={17} />
            </button>
            <div className="header-title">{currentTitle}</div>
            <div className="header-actions">
              <button className="header-icon-btn" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} title="Toggle theme">
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="messages-scroll">
            {messages.length === 0 && !isLoading ? (
              <EmptyState onSuggest={handleSuggest} />
            ) : (
              <div className="messages-inner">
                {messages.map((msg, i) => <MessageBubble key={i} message={msg} />)}
                {isLoading && <ThinkingIndicator />}
                <div ref={messagesEndRef} style={{ height: "1px" }} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="input-area">
            <div className="input-box">
              <div className="input-row">
                <textarea
                  ref={textareaRef}
                  className="input-textarea"
                  value={query}
                  onChange={handleQueryChange}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask anything…"
                  rows={1}
                />
                <button
                  className={`send-btn ${query.trim() && !isLoading ? "active" : "inactive"}`}
                  onClick={sendQuery}
                  disabled={isLoading || !query.trim()}
                  title="Send"
                >
                  <SendHorizontal size={15} />
                </button>
              </div>
              <div className="input-hint-bar">
                <p className="input-hint"><kbd>↵</kbd> send · <kbd>⇧↵</kbd> new line</p>
                {charCount > 0 && (
                  <span className={`char-count ${charCount > 3800 ? "warn" : ""}`}>{charCount}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {showAlert && (
          <AlertBox
            title="Connection failed"
            msg="Could not reach the server. Make sure the backend is running and try again."
            onClose={() => setShowAlert(false)}
          />
        )}
      </div>
    </>
  );
};

export default ChatInterface;