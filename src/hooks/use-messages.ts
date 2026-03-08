import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  sender: "matthew" | "jarvis";
  text: string;
  timestamp: string;
}

type ChatMsg = { role: "user" | "assistant"; content: string };

export function useMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages on mount
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .order("timestamp", { ascending: true });

      if (data) {
        const msgs: Message[] = data.map((m: any) => ({
          id: m.id,
          sender: m.sender as "matthew" | "jarvis",
          text: m.text,
          timestamp: new Date(m.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        }));
        setMessages(msgs);
        // Rebuild chat history
        setChatHistory(
          data.map((m: any) => ({
            role: m.sender === "matthew" ? "user" as const : "assistant" as const,
            content: m.text,
          }))
        );
      }
      setIsLoading(false);
    };
    load();
  }, []);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as any;
          const msg: Message = {
            id: m.id,
            sender: m.sender,
            text: m.text,
            timestamp: new Date(m.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setMessages((prev) => {
            if (prev.some((p) => p.id === msg.id)) return prev;
            return [...prev, msg];
          });
          setChatHistory((prev) => [
            ...prev,
            {
              role: m.sender === "matthew" ? "user" as const : "assistant" as const,
              content: m.text,
            },
          ]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const addMessage = useCallback(
    async (sender: "matthew" | "jarvis", text: string) => {
      const { data } = await supabase
        .from("messages")
        .insert({ sender, text })
        .select()
        .single();

      // Optimistic local update if realtime hasn't fired yet
      if (data) {
        const msg: Message = {
          id: data.id,
          sender: data.sender as "matthew" | "jarvis",
          text: data.text,
          timestamp: new Date(data.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
        setMessages((prev) => {
          if (prev.some((p) => p.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    },
    []
  );

  return { messages, chatHistory, isLoading, addMessage };
}
