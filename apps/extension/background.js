// Background service worker — no CORS restrictions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type !== "dc:fetch") return false;

  fetch(msg.url, {
    credentials: "include",
    headers: { "Accept": "application/json, text/plain, */*" },
  })
    .then(r => r.text())
    .then(text => sendResponse({ ok: !text.startsWith("<!"), text }))
    .catch(err => sendResponse({ ok: false, error: String(err) }));

  return true; // keep message channel open for async response
});
