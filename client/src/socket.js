import { io } from "socket.io-client";

let socket = null;

export function connectSocket(token) {
  if (socket?.connected) socket.disconnect();
  socket = io("http://localhost:4000", {
    auth: { token },
    autoConnect: true,
  });
  return socket;
}

export function getSocket() {
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
