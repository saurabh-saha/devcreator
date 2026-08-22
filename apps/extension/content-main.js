// Runs in MAIN world — sets the flag React reads, bridges CustomEvents ↔ postMessage
window.__dc_extension = true;
window.dispatchEvent(new CustomEvent("dc:extension-ready"));

// Forward fetch requests from page to isolated world via postMessage
window.addEventListener("dc:fetch-medium", (e) => {
  window.postMessage({ type: "dc:fetch-medium", url: e.detail.url, requestId: e.detail.requestId }, "*");
});

window.addEventListener("dc:fetch-linkedin", (e) => {
  console.log("[dc] forwarding dc:fetch-linkedin", e.detail);
  window.postMessage({ type: "dc:fetch-linkedin", handle: e.detail.handle, requestId: e.detail.requestId }, "*");
});

// Forward responses from isolated world back to page as CustomEvents
window.addEventListener("message", (e) => {
  if (e.source !== window) return;
  if (e.data?.type === "dc:medium-data") {
    window.dispatchEvent(new CustomEvent("dc:medium-data", { detail: e.data }));
  }
  if (e.data?.type === "dc:linkedin-data") {
    window.dispatchEvent(new CustomEvent("dc:linkedin-data", { detail: e.data }));
  }
});
