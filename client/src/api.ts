import axios from "axios";
import type { User, Message, Conversation, AuthResponse, UploadResult } from "./types.ts";

const SERVER = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");
const api = axios.create({ baseURL: SERVER });

export function setToken(token: string): void {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export async function register(username: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post("/auth/register", { username, email, password });
  return data;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function getMe(): Promise<User> {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function getConversations(): Promise<Conversation[]> {
  const { data } = await api.get("/conversations");
  return data;
}

export async function getMessages(conversationId: number, before?: string): Promise<Message[]> {
  const params = before ? { before } : {};
  const { data } = await api.get(`/conversations/${conversationId}/messages`, { params });
  return data;
}

export async function createConversation(type: "dm" | "group", participantIds: number[], name?: string): Promise<Conversation> {
  const { data } = await api.post("/conversations", { type, participantIds, name });
  return data;
}

export async function getUsers(): Promise<User[]> {
  const { data } = await api.get("/conversations/users");
  return data;
}

export async function updateProfile(body: Record<string, unknown>): Promise<User> {
  const { data } = await api.put("/auth/profile", body);
  return data;
}

export async function deleteConversation(id: number): Promise<void> {
  const { data } = await api.delete(`/conversations/${id}`);
  return data;
}

export async function uploadFile(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const { data } = await api.post("/upload", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}
