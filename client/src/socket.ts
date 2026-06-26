import { io, type Socket } from "socket.io-client";

const SERVER = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? "http://localhost:4000" : "");
let socket: Socket | null = null;

export function connectSocket(token: string): Socket {
  if (socket?.connected) socket.disconnect();
  socket = io(SERVER, {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function getSocket(): Socket | null {
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
