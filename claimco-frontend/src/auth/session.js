import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const key = "claimco_token";
const native = Capacitor.isNativePlatform();
let token = native ? null : localStorage.getItem(key);

export function getToken() { return token; }
export async function loadToken() {
  token = native ? await SecureStorage.getItem(key) : localStorage.getItem(key);
  return token;
}
export async function setToken(value) {
  if (native) await SecureStorage.setItem(key, value);
  else localStorage.setItem(key, value);
  token = value;
}
export async function clearToken() {
  if (native) await SecureStorage.removeItem(key);
  else localStorage.removeItem(key);
  token = null;
}
