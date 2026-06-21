import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";
import { chatsApi } from "@/api/chatsApi";
import { getErrorMessage } from "@/api/client";
import type { Chat, ChatFilters, Message } from "@/types/chat.types";

interface ChatContextValue {
  chats: Chat[];
  starredChats: Chat[];
  activeChat: Chat | null;
  activeChatId: string | null;
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  isStreaming: boolean;
  error: string | null;

  fetchChats: (filters?: ChatFilters) => Promise<void>;
  createChat: (message?: string, projectId?: string) => Promise<Chat>;
  deleteChat: (id: string) => Promise<void>;
  renameChat: (id: string, title: string) => Promise<void>;
  setActiveChatId: (id: string | null) => void;
  sendMessage: (content: string) => Promise<void>;
  postAssistantNotice: (content: string, metadata?: Record<string, unknown>) => Promise<void>;
  toggleStar: (id: string) => Promise<void>;
  moveToProject: (chatId: string, projectId: string | null) => Promise<void>;
  loadMessages: (chatId: string) => Promise<void>;
  unassignChatsFromProject: (projectId: string) => void;
  clearError: () => void;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatIdState] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const activeChatIdRef = useRef<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) ?? null,
    [chats, activeChatId]
  );

  const starredChats = useMemo(() => chats.filter((c) => c.is_starred), [chats]);

  // ─── Fetch Chats ──────────────────────────────────────────────

  const fetchChats = useCallback(async (filters: ChatFilters = {}) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await chatsApi.list({ limit: 50, ...filters });
      setChats(response.chats);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ─── Load Messages ────────────────────────────────────────────

  const loadMessages = useCallback(async (chatId: string) => {
    setError(null);
    setIsLoadingMessages(true);
    try {
      const response = await chatsApi.getMessages(chatId, { limit: 100, order: "asc" });
      setMessages(response.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
    } finally {
      setIsLoadingMessages(false);
    }
  }, []);

  // ─── Set Active Chat ──────────────────────────────────────────

  const setActiveChatId = useCallback(
    (id: string | null) => {
      activeChatIdRef.current = id;
      setActiveChatIdState(id);
      if (id) {
        setMessages([]);
        loadMessages(id);
      } else {
        setMessages([]);
      }
    },
    [loadMessages]
  );

  // ─── Create Chat ──────────────────────────────────────────────

  const createChat = useCallback(
    async (message?: string, projectId?: string): Promise<Chat> => {
      setError(null);
      try {
        const chat = await chatsApi.create({
          message,
          project_id: projectId,
        });

        setChats((prev) => [chat, ...prev]);
        activeChatIdRef.current = chat.id;
        setActiveChatIdState(chat.id);

        if (message) {
          await loadMessages(chat.id);
        } else {
          setMessages([]);
        }

        navigate(`/dashboard/chat/${chat.id}`);
        return chat;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [navigate, loadMessages]
  );

  // ─── Delete Chat ──────────────────────────────────────────────

  const deleteChat = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await chatsApi.delete(id);
        setChats((prev) => prev.filter((c) => c.id !== id));

        if (activeChatId === id) {
          activeChatIdRef.current = null;
          setActiveChatIdState(null);
          setMessages([]);
          navigate("/dashboard");
        }
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [activeChatId, navigate]
  );

  // ─── Rename Chat ──────────────────────────────────────────────

  const renameChat = useCallback(async (id: string, title: string) => {
    setError(null);
    try {
      const updated = await chatsApi.update(id, { title });
      setChats((prev) => prev.map((c) => (c.id === id ? updated : c)));
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  // ─── Toggle Star ──────────────────────────────────────────────

  const toggleStar = useCallback(
    async (id: string) => {
      const chat = chats.find((c) => c.id === id);
      if (!chat) return;

      setError(null);
      try {
        const updated = await chatsApi.toggleStar(id, !chat.is_starred);
        setChats((prev) => prev.map((c) => (c.id === id ? updated : c)));
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      }
    },
    [chats]
  );

  // ─── Move to Project ──────────────────────────────────────────

  const moveToProject = useCallback(async (chatId: string, projectId: string | null) => {
    setError(null);
    try {
      const updated = await chatsApi.moveToProject(chatId, projectId);
      setChats((prev) => prev.map((c) => (c.id === chatId ? updated : c)));
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    }
  }, []);

  // ─── Send Message ─────────────────────────────────────────────

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      let chatId = activeChatId;

      if (!chatId) {
        const chat = await createChat();
        chatId = chat.id;
      }

      const tempUserMsg: Message = {
        id: `temp-${Date.now()}`,
        chat_id: chatId,
        role: "user",
        content,
        metadata: null,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, tempUserMsg]);

      setIsStreaming(true);

      try {
        const response = await chatsApi.sendMessage(chatId, { content });

        setMessages((prev) => [
          ...prev.filter((m) => m.id !== tempUserMsg.id),
          response.user_message,
          response.assistant_message,
        ]);

        setChats((prev) => prev.map((c) => (c.id === chatId ? response.chat : c)));
      } catch (err) {
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setError(getErrorMessage(err));
      } finally {
        setIsStreaming(false);
      }
    },
    [activeChatId, createChat]
  );

  const postAssistantNotice = useCallback(
    async (content: string, metadata?: Record<string, unknown>) => {
      if (!content.trim()) return;

      let chatId = activeChatId;
      if (!chatId) {
        const chat = await createChat();
        chatId = chat.id;
      }

      try {
        const response = await chatsApi.postAssistantNotice(chatId, { content, metadata });
        if (activeChatIdRef.current === chatId) {
          setMessages((prev) => [...prev, response.assistant_message]);
        }
        setChats((prev) => prev.map((c) => (c.id === chatId ? response.chat : c)));
      } catch (err) {
        setError(getErrorMessage(err));
      }
    },
    [activeChatId, createChat]
  );

  useEffect(() => {
    activeChatIdRef.current = activeChatId;
  }, [activeChatId]);

  // ─── Unassign Chats from Project ─────────────────────────────
  // Called when a project is deleted to update local state immediately

  const unassignChatsFromProject = useCallback((projectId: string) => {
    setChats((prev) =>
      prev.map((c) => (c.project_id === projectId ? { ...c, project_id: null } : c))
    );
  }, []);

  // ─── Clear Error ──────────────────────────────────────────────

  const clearError = useCallback(() => setError(null), []);

  // ─── Initial Fetch ────────────────────────────────────────────

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchChats();
  }, [fetchChats]);

  // ─── Context Value ────────────────────────────────────────────

  const value = useMemo(
    () => ({
      chats,
      starredChats,
      activeChat,
      activeChatId,
      messages,
      isLoading,
      isLoadingMessages,
      isStreaming,
      error,
      fetchChats,
      createChat,
      deleteChat,
      renameChat,
      setActiveChatId,
      sendMessage,
      postAssistantNotice,
      toggleStar,
      moveToProject,
      loadMessages,
      unassignChatsFromProject,
      clearError,
    }),
    [
      chats,
      starredChats,
      activeChat,
      activeChatId,
      messages,
      isLoading,
      isLoadingMessages,
      isStreaming,
      error,
      fetchChats,
      createChat,
      deleteChat,
      renameChat,
      setActiveChatId,
      sendMessage,
      postAssistantNotice,
      toggleStar,
      moveToProject,
      loadMessages,
      unassignChatsFromProject,
      clearError,
    ]
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
