// A website ID is public in Umami's browser script. The env variable can override it.
const websiteId = (import.meta.env.VITE_UMAMI_WEBSITE_ID || "2b4a5bb0-0c8d-4882-b780-e4dff636eea4").trim();
const enabled = import.meta.env.PROD && Boolean(websiteId) &&
  ["claimforcampus.com", "www.claimforcampus.com"].includes(window.location.hostname);
export const behavioralTrackingEnabled = enabled && !["1", "yes"].includes(navigator.doNotTrack || window.doNotTrack);

let pendingPage = null;
const pendingEvents = [];
let lastRoute = null;

export function analyticsPath(pathname) {
  const path = pathname.split(/[?#]/, 1)[0];
  if (/^\/items\/[^/]+\/?$/.test(path)) return "/items/:id";
  if (/^\/users\/[^/]+\/?$/.test(path)) return "/users/:id";
  if (/^\/chat\/[^/]+\/?$/.test(path)) return "/chat/:conversationId";
  const publicPaths = ["/", "/login", "/board", "/post", "/mine", "/account", "/messages", "/help", "/insights"];
  return publicPaths.includes(path) ? path : "/other";
}

function send(path, name) {
  if (!window.umami?.track) return false;
  // Build an allowlisted payload. Umami never receives query strings, IDs, referrers, or form data.
  window.umami.track(props => ({
    website: props.website,
    hostname: props.hostname,
    url: path,
    title: "Bruno Sells",
    ...(name ? { name } : {}),
  }));
  return true;
}

export function initAnalytics() {
  if (!enabled) return;
  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://cloud.umami.is/script.js";
  script.dataset.websiteId = websiteId;
  script.dataset.autoTrack = "false";
  script.dataset.doNotTrack = "true";
  script.onload = () => {
    if (pendingPage) {
      send(pendingPage);
      pendingPage = null;
    }
    pendingEvents.splice(0).forEach(({ path, name }) => send(path, name));
  };
  document.head.appendChild(script);
}

export function trackPage(pathname) {
  if (!enabled) return;
  if (pathname === lastRoute) return;
  lastRoute = pathname;
  const path = analyticsPath(pathname);
  pendingPage = path;
  if (send(path)) pendingPage = null;
}

export function trackEvent(name) {
  if (!enabled) return;
  const path = analyticsPath(window.location.pathname);
  if (!send(path, name) && pendingEvents.length < 20) pendingEvents.push({ path, name });
}
