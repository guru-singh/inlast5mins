import { DraftPost, XSignal } from "./types";

const GOOGLE_NEWS_FIFA_RSS =
  "https://news.google.com/rss/search?q=fifa+2026&hl=en-US&gl=US&ceid=US:en";

const newsImage =
  "https://images.unsplash.com/photo-1518604666860-9ed391f76460?auto=format&fit=crop&w=1200&q=80";

type RssItem = {
  title: string;
  link: string;
  source: string;
  pubDate: Date;
};

export async function fetchGoogleNewsFifa2026(): Promise<{
  mode: "rss";
  drafts: DraftPost[];
  signals: XSignal[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
}> {
  const response = await fetch(GOOGLE_NEWS_FIFA_RSS, {
    cache: "no-store",
    headers: {
      accept: "application/rss+xml, application/xml, text/xml",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
  });

  if (!response.ok) {
    throw new Error(`Google News RSS failed: ${response.status}`);
  }

  const xml = await response.text();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const items = parseRssItems(xml)
    .filter((item) => item.pubDate.getTime() >= cutoff)
    .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  const drafts = items.map((item, index) => ({
    id: `google-news-${index + 1}`,
    angle: item.source || "Google News",
    content: toPostText(item),
    imageUrl: newsImage,
    sourceTweetIds: [item.link],
    suggestedVisual: "[News Visual] Use the article image or publisher thumbnail from the linked story.",
    source: `${item.source || "Google News"} - ${item.link}`
  }));

  const signals = items.map((item, index) => ({
    id: `google-news-${index + 1}`,
    text: item.title,
    author: item.source || "Google News",
    username: "googlenews",
    createdAt: item.pubDate.toISOString(),
    category: "buzz" as const,
    engagement: items.length - index
  }));

  return {
    mode: "rss",
    drafts,
    signals,
    summary: {
      score: `${items.length} FIFA 2026 Google News item${items.length === 1 ? "" : "s"} found in the last 24 hours.`,
      controversy: items[0]?.title ?? "No FIFA 2026 news found in the last 24 hours.",
      fanReaction: items[1]?.title ?? "RSS feed checked and filtered by published date.",
      extra: "Source: Google News RSS search for fifa 2026."
    }
  };
}

function parseRssItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((match) => {
    const block = match[1] ?? "";
    const title = decodeXml(getTag(block, "title"));
    const link = decodeXml(getTag(block, "link"));
    const pubDateText = decodeXml(getTag(block, "pubDate"));
    const source = decodeXml(getTag(block, "source"));
    const pubDate = new Date(pubDateText);

    if (!title || !link || Number.isNaN(pubDate.getTime())) {
      return [];
    }

    return [{ title, link, source, pubDate }];
  });
}

function getTag(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`));
  return match?.[1]?.trim() ?? "";
}

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function toPostText(item: RssItem) {
  const sourceLine = `\n\nSource: ${item.link}`;
  const maxTitleLength = 280 - sourceLine.length - 3;
  const title =
    item.title.length > maxTitleLength ? `${item.title.slice(0, Math.max(40, maxTitleLength)).trim()}...` : item.title;
  const base = `${title}${sourceLine}`;

  return base.length <= 280 ? base : `${item.title}\n\nSource: ${item.link}`;
}
