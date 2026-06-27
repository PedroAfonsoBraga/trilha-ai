"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
  placeholder: string;
  hasSelectedDocs: boolean;
}

export default function ChatInput({ onSend, disabled, placeholder, hasSelectedDocs }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
  }, [text, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const canSend = text.trim().length > 0 && !disabled;

  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 shadow-sm transition-shadow focus-within:border-teal-400 focus-within:shadow-md">
        <button
          type="button"
          disabled={!hasSelectedDocs}
          className="flex-shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="Anexar arquivo"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
          </svg>
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent py-1.5 text-sm text-slate-800 placeholder-slate-400 outline-none disabled:cursor-not-allowed"
        />

        <button
          onClick={handleSend}
          disabled={!canSend}
          className={`flex-shrink-0 rounded-full p-2 transition-colors ${
            canSend
              ? "bg-teal-600 text-white hover:bg-teal-700"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
          }`}
          aria-label="Enviar mensagem"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
