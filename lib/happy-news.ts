import { DraftPost, XSignal } from "./types";

const OPENAI_ENDPOINT = "https://api.openai.com/v1/responses";
const DEFAULT_OPENAI_MODEL = "gpt-5.2";

const feeds = [
  { name: "Good News Network", url: "https://www.goodnewsnetwork.org/feed/" },
  { name: "Positive News", url: "https://www.positive.news/feed/" },
  { name: "Reasons to be Cheerful", url: "https://reasonstobecheerful.world/feed/" },
  { name: "Optimist Daily", url: "https://www.optimistdaily.com/feed/" },
  { name: "DailyGood", url: "https://www.dailygood.org/rss.php" },
  {
    name: "Google News - Good News",
    url: "https://news.google.com/rss/search?q=good+news&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - Animal Rescue",
    url: "https://news.google.com/rss/search?q=animal+rescue&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - Medical Breakthrough",
    url: "https://news.google.com/rss/search?q=medical+breakthrough&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - Community Hero",
    url: "https://news.google.com/rss/search?q=community+hero&hl=en-US&gl=US&ceid=US:en"
  },
  {
    name: "Google News - Environmental Success",
    url: "https://news.google.com/rss/search?q=environmental+success&hl=en-US&gl=US&ceid=US:en"
  }
];

const happyNewsImage =
  "https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?auto=format&fit=crop&w=1200&q=80";

type FeedItem = {
  id: string;
  title: string;
  link: string;
  source: string;
  pubDate: string;
  description: string;
};

type HappyNewsItem = {
  title: string;
  summary: string;
  happinessScore: number;
  source: string;
  url: string;
  publishedAt: string;
  reason: string;
};

export async function fetchHappyNews(): Promise<{
  mode: "openai";
  drafts: DraftPost[];
  signals: XSignal[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
}> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY. Add your OpenAI API key to .env.local, then restart the dev server.");
  }

  const articles = await fetchAllFeeds();

  if (!articles.length) {
    return buildHappyNewsResponse([]);
  }

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL,
      input: [
        {
          role: "system",
          content:
            "You are a precise news editor. Return only valid JSON. Remove duplicates, score happiness from 1 to 10, summarize accurately, and keep only items with score >= 8."
        },
        {
          role: "user",
          content: `From these RSS items published in the last 48 hours, remove duplicates, score happiness 1-10, generate concise summaries, keep only score >= 8, and return the top 20 highest-score items.

Return this exact JSON shape:
{
  "items": [
    {
      "title": "article title",
      "summary": "1 sentence happy-news summary under 220 characters",
      "happinessScore": 8,
      "source": "publisher/feed source",
      "url": "source URL",
      "publishedAt": "ISO date",
      "reason": "short reason for the score"
    }
  ]
}

RSS items:
${JSON.stringify(articles.slice(0, 120), null, 2)}`
        }
      ]
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`OpenAI request failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  const parsed = parseOpenAIHappyNews(extractText(payload));
  const items = parsed.items
    .filter((item) => item.happinessScore >= 8)
    .sort((a, b) => b.happinessScore - a.happinessScore)
    .slice(0, 20);

  return buildHappyNewsResponse(items);
}

async function fetchAllFeeds() {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  const responses = await Promise.allSettled(
    feeds.map(async (feed) => {
      const response = await fetch(feed.url, {
        cache: "no-store",
        headers: {
          accept: "application/rss+xml, application/xml, text/xml, *;q=0.7",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
        }
      });

      if (!response.ok) return [];

      return parseRssItems(await response.text(), feed.name)
        .filter((item) => new Date(item.pubDate).getTime() >= cutoff)
        .map((item, index) => ({ ...item, id: `${feed.name}-${index}` }));
    })
  );

  return responses
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());
}

function buildHappyNewsResponse(items: HappyNewsItem[]) {
  const drafts = items.map((item, index) => ({
    id: `happy-news-${index + 1}`,
    angle: `Happy ${item.happinessScore}/10 - ${item.source}`,
    content: toPostText(item),
    imageUrl: happyNewsImage,
    sourceTweetIds: [item.url],
    suggestedVisual: `[News Visual] Positive-news image from the linked story. Happiness: ${item.happinessScore}/10. Score reason: ${item.reason}`,
    source: `${item.source} - ${item.url}`
  }));

  const signals = items.map((item, index) => ({
    id: `happy-news-${index + 1}`,
    text: item.title,
    author: item.source,
    username: "happynews",
    createdAt: item.publishedAt,
    category: "buzz" as const,
    engagement: item.happinessScore * 10 - index
  }));

  return {
    mode: "openai" as const,
    drafts,
    signals,
    summary: {
      score: `${items.length} happy news item${items.length === 1 ? "" : "s"} scored 8+ in the last 48 hours.`,
      controversy: items[0]?.title ?? "No score 8+ happy news items found in the last 48 hours.",
      fanReaction: items[0] ? `Top score: ${items[0].happinessScore}/10 from ${items[0].source}.` : "Feeds checked and deduped.",
      extra: "Sources include positive news RSS feeds plus Google News happiness searches."
    }
  };
}

function parseRssItems(xml: string, fallbackSource: string): Omit<FeedItem, "id">[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].flatMap((match) => {
    const block = match[1] ?? "";
    const title = decodeXml(getTag(block, "title"));
    const link = decodeXml(getTag(block, "link"));
    const pubDateText = decodeXml(getTag(block, "pubDate") || getTag(block, "dc:date"));
    const source = decodeXml(getTag(block, "source")) || fallbackSource;
    const description = decodeXml(stripHtml(getTag(block, "description")));
    const pubDate = new Date(pubDateText);

    if (!title || !link || Number.isNaN(pubDate.getTime())) {
      return [];
    }

    return [
      {
        title,
        link,
        source,
        pubDate: pubDate.toISOString(),
        description
      }
    ];
  });
}

function parseOpenAIHappyNews(text: string): { items: HappyNewsItem[] } {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) {
    throw new Error("OpenAI did not return JSON.");
  }

  const parsed = JSON.parse(jsonText) as { items?: HappyNewsItem[] };

  return {
    items: Array.isArray(parsed.items) ? parsed.items : []
  };
}

function extractText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string }> }>;
  };

  if (response.output_text) {
    return response.output_text;
  }

  return (
    response.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n") ?? ""
  );
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

function stripHtml(value: string) {
  return value.replace(/<[^>]+>/g, " ");
}

function toPostText(item: HappyNewsItem) {
  const text = item.summary || item.title;

  return text.length <= 280 ? text : `${text.slice(0, 277).trim()}...`;
}
