// Runs in ISOLATED world — forwards fetch requests to background service worker
window.addEventListener("message", (e) => {
  if (e.source !== window || e.data?.type !== "dc:fetch-medium") return;
  const { url, requestId } = e.data;

  chrome.runtime.sendMessage({ type: "dc:fetch", url }, (res) => {
    if (chrome.runtime.lastError) {
      window.postMessage({ type: "dc:medium-data", requestId, ok: false, error: chrome.runtime.lastError.message }, "*");
      return;
    }
    window.postMessage({ type: "dc:medium-data", requestId, ...res }, "*");
  });
});
