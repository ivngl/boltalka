import axios from "axios";

const api = axios.create({ baseURL: "http://localhost:4000" });

export function setToken(token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export async function register(username, email, password) {
  const { data } = await api.post("/auth/register", { username, email, password });
  return data;
}

export async function login(email, password) {
  const { data } = await api.post("/auth/login", { email, password });
  return data;
}

export async function getMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

export async function getConversations() {
  const { data } = await api.get("/conversations");
  return data;
}

export async function getMessages(conversationId, before) {
  const params = before ? { before } : {};
  const { data } = await api.get(`/conversations/${conversationId}/messages`, { params });
  return data;
}

export async function createConversation(type, participantIds, name) {
  const { data } = await api.post("/conversations", { type, participantIds, name });
  return data;
}

export async function getUsers() {
  const { data } = await api.get("/conversations/users");
  return data;
}
