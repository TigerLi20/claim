import { io } from "socket.io-client";
import { API_BASE } from "../api/client";

export const socket = io(API_BASE, {
    autoConnect: false,
    auth: { token: localStorage.getItem("claimco_token") },
});
