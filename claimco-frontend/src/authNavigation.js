export function authPath(next, mode) {
  const params = new URLSearchParams({ next });
  if (mode) params.set("mode", mode);
  return `/login?${params}`;
}

export function safeNext(value) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some(char => char.charCodeAt(0) < 32) || /^\/login(?:[/?#]|$)/.test(value)) return "/board";
  return value;
}
