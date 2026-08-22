// Background service worker — no CORS restrictions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "dc:fetch") {
    fetch(msg.url, {
      credentials: "include",
      headers: { "Accept": "application/json, text/plain, */*" },
    })
      .then(r => r.text())
      .then(text => sendResponse({ ok: !text.startsWith("<!"), text }))
      .catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === "dc:fetch-linkedin") {
    fetchLinkedIn(msg.handle).then(sendResponse).catch(err => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  return false;
});

async function fetchLinkedIn(handle) {
  const slug = handle.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  console.log("[li] opening tab for slug", slug);

  const posts = await scrapeLinkedInTab(`https://www.linkedin.com/in/${slug}/recent-activity/all/`);
  const articles = await scrapeLinkedInTab(`https://www.linkedin.com/in/${slug}/recent-activity/articles/`);

  // Dedup by URL, keeping the entry with more data
  const combined = [...posts, ...articles];
  const byUrl = new Map();
  for (const p of combined) {
    const key = p.url || p.snippet;
    if (!byUrl.has(key) || p.impressions > (byUrl.get(key).impressions ?? 0)) {
      byUrl.set(key, p);
    }
  }
  const deduped = [...byUrl.values()];
  console.log("[li] posts", posts.length, "articles", articles.length, "deduped", deduped.length);
  return { ok: true, posts: deduped };
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function scrapeLinkedInTab(url) {
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTabLoad(tab.id);
    // Initial hydration wait
    await new Promise(r => setTimeout(r, 3000));

    // Scroll to load more posts (pagination via infinite scroll)
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async function scrollAndLoad() {
        for (let i = 0; i < 6; i++) {
          window.scrollTo(0, document.body.scrollHeight);
          await new Promise(r => setTimeout(r, 2000));
        }
        window.scrollTo(0, 0);
      },
    });

    // Wait for last batch to render
    await new Promise(r => setTimeout(r, 1000));

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: scrapeLinkedInDOM,
    });

    return results?.[0]?.result ?? [];
  } catch (err) {
    console.error("[li] scrape error", err);
    return [];
  } finally {
    chrome.tabs.remove(tab.id).catch(() => {});
  }
}

// This function runs inside the LinkedIn tab — no closure access to outer scope
function scrapeLinkedInDOM() {
  function parseNum(str) {
    if (!str) return 0;
    const s = str.replace(/,/g, "").trim();
    if (s.endsWith("k") || s.endsWith("K")) return Math.round(parseFloat(s) * 1000);
    return parseInt(s) || 0;
  }

  const isArticlesPage = window.location.href.includes("/articles");
  const posts = [];
  const seen = new Set();

  if (isArticlesPage) {
    // Articles page — find all pulse links, dedupe to top-level containers
    const pulseLinks = [...document.querySelectorAll("a[href*='/pulse/']")];
    const articleRoots = new Set();
    for (const a of pulseLinks) {
      // Use the li ancestor if available, else the closest data-urn container, else the link itself
      const root = a.closest("li") ?? a.closest("[data-urn]") ?? a;
      articleRoots.add(root);
    }

    console.log("[li-scrape] article roots found:", articleRoots.size);

    for (const root of articleRoots) {
      const linkEl = root.querySelector("a[href*='/pulse/']");
      const url = linkEl?.href?.split("?")[0] ?? "";
      if (!url || seen.has(url)) continue;
      seen.add(url);
      const titleEl = root.querySelector("h1, h2, h3, .update-components-article__title, [data-test-id='article-title']");
      const title = titleEl?.innerText?.trim() ?? linkEl?.innerText?.trim() ?? "";
      const allEls = [...root.querySelectorAll("*")];
      const impressionEl = allEls.find(e => /\d[\d,.]*[kK]?\s*(impression|view)/i.test(e.innerText?.trim()) && e.innerText.trim().length < 40);
      const impressions = parseNum(impressionEl?.innerText?.match(/([\d,.]+[kK]?)/)?.[1] ?? "0");
      const artReactEl = allEls.find(e => /^\d[\d,.]*[kK]?\s+reactions?$/i.test(e.innerText?.trim()) && e.innerText.trim().length < 20);
      const artLikes = artReactEl ? parseNum(artReactEl.innerText.match(/([\d,.]+[kK]?)/)?.[1] ?? "0") : 0;
      const artCommentBtn = root.querySelector("a[aria-label='Comment'], button[aria-label='Comment']");
      const artCommentSpan = artCommentBtn ? [...artCommentBtn.querySelectorAll("span")].find(s => /^\d[\d,.]*[kK]?$/.test(s.innerText?.trim())) : null;
      const artComments = artCommentSpan ? parseNum(artCommentSpan.innerText) : 0;
      console.log("[li-scrape] article:", { url, title: title.slice(0, 40), impressions, artLikes, artComments });
      posts.push({ url, snippet: title, impressions, likes: artLikes, comments: artComments, reposts: 0, postType: "article" });
    }
  } else {
    // Posts page — only top-level activity containers (not nested ones)
    const allActivity = [...document.querySelectorAll("[data-urn]")].filter(el => {
      const urn = el.getAttribute("data-urn") ?? "";
      if (!urn.includes("activity")) return false;
      // Skip if an ancestor also has a matching data-urn (we want outermost only)
      return !el.parentElement?.closest("[data-urn*='activity']");
    });

    console.log("[li-scrape] top-level activity containers found:", allActivity.length);

    allActivity.forEach(el => {
      // URL: from link or data-urn
      const linkEl = el.querySelector("a[href*='/posts/'], a[href*='/feed/update/']");
      let url = linkEl?.href?.split("?")[0] ?? "";
      if (!url) {
        const urn = el.getAttribute("data-urn") ?? "";
        if (urn.includes("activity")) url = `https://www.linkedin.com/feed/update/${urn}/`;
      }
      // Skip pulse/article URLs — handled by articles page
      if (url.includes("/pulse/")) return;
      if (seen.has(url)) return;
      seen.add(url);

      // Snippet from post text
      const textEl = el.querySelector(".feed-shared-text, .update-components-text, .attributed-text-segment-list__content, [class*='commentary']");
      const snippet = textEl?.innerText?.trim().slice(0, 200) ?? "";

      // Impressions — look for any element containing "impressions" or "views" text
      const impressionEl = [...el.querySelectorAll("*")].find(e =>
        /\d[\d,.]*[kK]?\s*(impression|view)/i.test(e.innerText?.trim()) && e.innerText.trim().length < 40
      );
      const impressions = parseNum(impressionEl?.innerText?.match(/([\d,.]+[kK]?)/)?.[1] ?? "0");

      // Likes — try multiple approaches in order of reliability
      let likes = 0;

      // 1. Reactions link aria-label: "10 reactions" or "See who reacted... 10 reactions"
      const reactionsLink = el.querySelector("a[aria-label*='reaction' i]");
      if (reactionsLink) {
        const m = reactionsLink.getAttribute("aria-label")?.match(/([\d,.]+[kK]?)\s+reactions?/i);
        if (m) likes = parseNum(m[1]);
      }

      // 2. Any element whose innerText contains "N reactions" (may have emoji prefix)
      if (likes === 0) {
        const reactEl = [...el.querySelectorAll("*")].find(e =>
          /([\d,.]+[kK]?)\s+reactions?/i.test(e.innerText?.trim()) && e.innerText.trim().length < 40
        );
        if (reactEl) {
          const m = reactEl.innerText.match(/([\d,.]+[kK]?)\s+reactions?/i);
          if (m) likes = parseNum(m[1]);
        }
      }

      // 3. Reaction button aria-label: "React Like. 10 reactions"
      if (likes === 0) {
        const reactionBtn = el.querySelector("button[aria-label*='reaction' i], button[aria-label*='React' i]");
        if (reactionBtn) {
          const label = reactionBtn.getAttribute("aria-label") ?? "";
          const m = label.match(/([\d,.]+[kK]?)\s+reactions?/i) ?? label.match(/^([\d,.]+[kK]?)$/);
          if (m) {
            likes = parseNum(m[1]);
          } else {
            const numSpan = [...reactionBtn.querySelectorAll("span")].find(s => /^\d[\d,.]*[kK]?$/.test(s.innerText?.trim()));
            if (numSpan) likes = parseNum(numSpan.innerText);
          }
        }
      }

      // Comments
      const commentBtn = el.querySelector("a[aria-label='Comment'], button[aria-label='Comment']");
      let comments = 0;
      if (commentBtn) {
        const numSpan = [...commentBtn.querySelectorAll("span")].find(s => /^\d[\d,.]*[kK]?$/.test(s.innerText?.trim()));
        if (numSpan) comments = parseNum(numSpan.innerText);
      }

      // Reposts
      const repostBtn = el.querySelector("button[aria-label='Repost']");
      let reposts = 0;
      if (repostBtn) {
        const numSpan = [...repostBtn.querySelectorAll("span")].find(s => /^\d[\d,.]*[kK]?$/.test(s.innerText?.trim()));
        if (numSpan) reposts = parseNum(numSpan.innerText);
      }

      console.log("[li-scrape] post:", {
        url: url || "(no url)",
        likes,
        comments,
        impressions,
        reactElText: reactEl?.innerText?.trim() ?? "(none)",
        impressionElText: impressionEl?.innerText?.trim() ?? "(none)",
        snippet: snippet.slice(0, 50),
      });
      if (snippet || url) posts.push({ url, snippet, impressions, likes, comments, reposts, postType: "post" });
    });
  }

  console.log("[li-scrape] found", posts.length, "on", window.location.href);
  return posts;
}
