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
      try {
        const { data, error } = await supabase
          .from("messages")
          .select("*")
          .order("timestamp", { ascending: true });

        if (error) throw error;

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
          setChatHistory(
            data.map((m: any) => ({
              role: m.sender === "matthew" ? ("user" as const) : ("assistant" as const),
              content: m.text,
            }))
          );
        }
      } catch (error) {
        console.warn("Messages load failed, continuing in local mode:", error);
      } finally {
        setIsLoading(false);
      }
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
      const fallbackMessage: Message = {
        id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        sender,
        text,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      try {
        const { data, error } = await supabase
          .from("messages")
          .insert({ sender, text })
          .select()
          .single();

        if (error) throw error;

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
          setChatHistory((prev) => [
            ...prev,
            { role: sender === "matthew" ? ("user" as const) : ("assistant" as const), content: text },
          ]);
          return;
        }
      } catch (error) {
        console.warn("Message save failed, using local message:", error);
      }

      setMessages((prev) => [...prev, fallbackMessage]);
      setChatHistory((prev) => [
        ...prev,
        { role: sender === "matthew" ? ("user" as const) : ("assistant" as const), content: text },
      ]);
    },
    []
  );

  return { messages, chatHistory, isLoading, addMessage };
}
