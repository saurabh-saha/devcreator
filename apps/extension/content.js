// Tell the page the extension is installed — set a flag AND fire event
// Flag is readable synchronously even after React mounts
window.__dc_extension = true;
window.dispatchEvent(new CustomEvent("dc:extension-ready"));

// Listen for fetch requests from the page
window.addEventListener("dc:fetch-medium", async (e) => {
  const { url, requestId } = e.detail;
  try {
    const res = await fetch(url, {
      credentials: "include",
      headers: {
        "Accept": "application/json",
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
    });
    const text = await res.text();
    window.dispatchEvent(new CustomEvent("dc:medium-data", {
      detail: { requestId, text, ok: !text.startsWith("<!") },
    }));
  } catch (err) {
    window.dispatchEvent(new CustomEvent("dc:medium-data", {
      detail: { requestId, ok: false, error: String(err) },
    }));
  }
});
