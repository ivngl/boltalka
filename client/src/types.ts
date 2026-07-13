export interface User {
  id: number;
  username: string;
  name?: string;
  createdAt?: string;
}

export interface Message {
  id: number;
  content: string;
  conversationId: number;
  senderId: number;
  sender?: { id: number; username: string; name?: string };
  createdAt: string;
  deletedAt?: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
}

export interface Participant {
  user: User;
  joinedAt: string;
  alias?: string;
}

export interface Conversation {
  id: number;
  type: "dm" | "group";
  name?: string;
  participants: Participant[];
  messages?: Message[];
  createdAt: string;
}

export type ViewState = "auth" | "register" | "chat" | "profile";

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UploadResult {
  url: string;
  name: string;
  type: string;
  size: number;
}
