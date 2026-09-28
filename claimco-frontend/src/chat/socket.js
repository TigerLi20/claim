import { io } from "socket.io-client";
import { API_BASE } from "../api/client";
import { getToken } from "../auth/session";

export const socket = io(API_BASE, {
    autoConnect: false,
    auth: { token: getToken() },
});
