// Runs in MAIN world — sets the flag React reads, bridges CustomEvents ↔ postMessage
window.__dc_extension = true;
window.dispatchEvent(new CustomEvent("dc:extension-ready"));

// Forward fetch requests from page to isolated world via postMessage
window.addEventListener("dc:fetch-medium", (e) => {
  window.postMessage({ type: "dc:fetch-medium", url: e.detail.url, requestId: e.detail.requestId }, "*");
});

// Forward responses from isolated world back to page as CustomEvent
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.type !== "dc:medium-data") return;
  window.dispatchEvent(new CustomEvent("dc:medium-data", { detail: e.data }));
});
