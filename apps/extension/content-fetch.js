// Runs in ISOLATED world — forwards fetch requests to background service worker
window.addEventListener("message", (e) => {
  if (e.source !== window) return;

  if (e.data?.type === "dc:fetch-medium") {
    const { url, requestId } = e.data;
    chrome.runtime.sendMessage({ type: "dc:fetch", url }, (res) => {
      if (chrome.runtime.lastError) {
        window.postMessage({ type: "dc:medium-data", requestId, ok: false, error: chrome.runtime.lastError.message }, "*");
        return;
      }
      window.postMessage({ type: "dc:medium-data", requestId, ...res }, "*");
    });
  }

  if (e.data?.type === "dc:fetch-linkedin") {
    const { handle, requestId } = e.data;
    console.log("[dc-fetch] sending dc:fetch-linkedin to background, handle:", handle);
    chrome.runtime.sendMessage({ type: "dc:fetch-linkedin", handle }, (res) => {
      console.log("[dc-fetch] got response from background:", res?.ok, "posts:", res?.posts?.length);
      if (chrome.runtime.lastError) {
        window.postMessage({ type: "dc:linkedin-data", requestId, ok: false, error: chrome.runtime.lastError.message }, "*");
        return;
      }
      window.postMessage({ type: "dc:linkedin-data", requestId, ...res }, "*");
    });
  }
});
