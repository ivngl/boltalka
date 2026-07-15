import axios from "axios";
import type { User, Message, Conversation, AuthResponse, UploadResult, Topic, TopicMessage } from "./types.ts";

const SERVER = import.meta.env.VITE_SERVER_URL || "";
export const api = axios.create({ baseURL: SERVER });

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      window.location.reload();
    }
    return Promise.reject(error);
  },
);

export function setToken(token: string): void {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export async function register(username: string, password: string, name?: string): Promise<AuthResponse> {
  const { data } = await api.post("/auth/register", { username, password, name });
  return data;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post("/auth/login", { username, password });
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

export async function deleteProfile(id: string | number): Promise<void> {
  await api.delete(`/auth/profile/${id}`);

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

export async function getVapidPublicKey(): Promise<string> {
  const { data } = await api.get("/api/push/vapid-public-key");
  return data.publicKey;
}

export async function subscribePushServer(subscription: { endpoint: string; p256dh: string; auth: string }): Promise<void> {
  await api.post("/api/push/subscribe", subscription);
}

export async function unsubscribePushServer(endpoint: string): Promise<void> {
  await api.delete("/api/push/subscribe", { data: { endpoint } });
}

export async function setParticipantAlias(conversationId: number, userId: number, alias: string | null): Promise<void> {
  await api.put(`/conversations/${conversationId}/participants/${userId}/alias`, { alias });
}

export async function getTopics(search?: string): Promise<Topic[]> {
  const params = search ? { search } : {};
  const { data } = await api.get("/topics", { params });
  return data;
}

export async function getTopic(id: string): Promise<Topic> {
  const { data } = await api.get(`/topics/${id}`);
  return data;
}

export async function createTopic(title: string, description?: string): Promise<Topic> {
  const { data } = await api.post("/topics", { title, description });
  return data;
}

export async function sendTopicMessage(topicId: string, content: string, parentId?: string): Promise<TopicMessage> {
  const { data } = await api.post(`/topics/${topicId}/messages`, { content, parentId });
  return data;
}

export async function editTopicMessage(topicId: string, messageId: string, content: string): Promise<TopicMessage> {
  const { data } = await api.put(`/topics/${topicId}/messages/${messageId}`, { content });
  return data;
}

export async function deleteTopicMessage(topicId: string, messageId: string): Promise<void> {
  await api.delete(`/topics/${topicId}/messages/${messageId}`);
}

export async function deleteTopic(id: string): Promise<void> {
  await api.delete(`/topics/${id}`);
}

export async function getSocieties(search?: string): Promise<Society[]> {
  const params = search ? { search } : {};
  const { data } = await api.get("/societies", { params });
  return data;
}

export async function createSociety(name: string, description?: string): Promise<Society> {
  const { data } = await api.post("/societies", { name, description });
  return data;
}

export async function deleteSociety(id: string): Promise<void> {
  await api.delete(`/societies/${id}`);
}
