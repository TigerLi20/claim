import { Capacitor } from "@capacitor/core";
import { FirebaseMessaging } from "@capacitor-firebase/messaging";
import { api } from "../api/client";

export const isNative = Capacitor.isNativePlatform();
let initialized = false;
let currentToken = null;

export async function enableNotifications() {
  if (!isNative) return false;
  const permission = await FirebaseMessaging.requestPermissions();
  if (permission.receive !== "granted") return false;
  const { token } = await FirebaseMessaging.getToken();
  currentToken = token;
  await api.registerPushToken(token, Capacitor.getPlatform());
  return true;
}

export async function initializeNotifications(navigate) {
  if (!isNative) return;
  if (!initialized) {
    initialized = true;
    await FirebaseMessaging.addListener("tokenReceived", async ({ token }) => {
      currentToken = token;
      try { await api.registerPushToken(token, Capacitor.getPlatform()); } catch (error) { console.error("Push token registration failed", error); }
    });
    await FirebaseMessaging.addListener("notificationActionPerformed", ({ notification }) => {
      const path = notification?.data?.path;
      if (typeof path === "string" && /^\/chat\/\d+$/.test(path)) navigate(path);
    });
  }
  const permission = await FirebaseMessaging.checkPermissions();
  if (permission.receive === "granted") {
    try { const { token } = await FirebaseMessaging.getToken(); currentToken = token; await api.registerPushToken(token, Capacitor.getPlatform()); } catch (error) { console.error("Push setup failed", error); }
  }
}

export async function disableNotifications() {
  if (!isNative) return;
  if (currentToken) await api.removePushToken(currentToken).catch(() => {});
  await FirebaseMessaging.deleteToken();
  currentToken = null;
}
