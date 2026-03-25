/**
 * context/ChatContext.tsx — Chat Message Store
 *
 * Responsibilities:
 *   - Holds the shared message list used by both onboarding.tsx and chat.tsx
 *   - clearMessages() is called by NavigationGuard whenever the active user changes
 *     so messages never leak between accounts
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import type { Message } from "@/types/chat";

interface ChatContextType {
  messages: Message[];
  appendMessage: (message: Message) => void;
  clearMessages: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);

  const appendMessage = useCallback((message: Message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return (
    <ChatContext.Provider value={{ messages, appendMessage, clearMessages }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
