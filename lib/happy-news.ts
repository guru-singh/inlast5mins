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
  score: number;
  category: string;
  xPost: string;
  source: string;
  url: string;
  publishedAt: string;
};

type HappyNewsAnalysis = {
  original_id: string;
  analysis: {
    is_positive: boolean;
    score: number;
    category: string;
    summary: string;
    x_post: string;
  };
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
            "You are a warm, plainspoken social editor for genuinely positive news. Return only valid JSON. No markdown."
        },
        {
          role: "user",
          content: `Analyze these RSS items from the last 48 hours.

For each candidate article, apply this exact analysis shape:
{
  "is_positive": true,
  "score": 1-10,
  "category": "",
  "summary": "",
  "x_post": ""
}

Rules:
- Remove duplicates first.
- Only keep genuinely positive news.
- Summary must be exactly 2 sentences.
- x_post must sound like a real person.
- No AI tone.
- No corporate language.
- No journalist clichés.
- x_post maximum 280 characters.
- Return the top 20 strongest positive items, sorted by score descending.

Return this exact JSON shape:
{
  "items": [
    {
      "original_id": "the RSS item id",
      "analysis": {
        "is_positive": true,
        "score": 8,
        "category": "animal rescue",
        "summary": "Two sentences exactly. Keep it factual and grounded.",
        "x_post": "A natural post under 280 characters, written like a real person."
      }
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
  const articlesById = new Map(articles.map((article) => [article.id, article]));
  const items = parsed.items
    .filter((item) => item.analysis.is_positive)
    .map((item) => {
      const article = articlesById.get(item.original_id);

      if (!article) return null;

      return {
        title: article.title,
        summary: item.analysis.summary,
        score: clampScore(item.analysis.score),
        category: item.analysis.category,
        xPost: item.analysis.x_post,
        source: article.source,
        url: article.link,
        publishedAt: article.pubDate
      } satisfies HappyNewsItem;
    })
    .filter((item): item is HappyNewsItem => Boolean(item))
    .sort((a, b) => b.score - a.score)
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
    angle: `${item.category || "Happy News"} - ${item.source}`,
    content: toPostText(item),
    imageUrl: happyNewsImage,
    sourceTweetIds: [item.url],
    suggestedVisual: `[News Visual] Positive-news image from the linked story. Score: ${item.score}/10. Summary: ${item.summary}`,
    source: `${item.source} - ${item.url}`
  }));

  const signals = items.map((item, index) => ({
    id: `happy-news-${index + 1}`,
    text: item.title,
    author: item.source,
    username: "happynews",
    createdAt: item.publishedAt,
    category: "buzz" as const,
    engagement: item.score * 10 - index
  }));

  return {
    mode: "openai" as const,
    drafts,
    signals,
    summary: {
      score: `${items.length} genuinely positive news item${items.length === 1 ? "" : "s"} found in the last 48 hours.`,
      controversy: items[0]?.title ?? "No genuinely positive news items found in the last 48 hours.",
      fanReaction: items[0] ? `Top score: ${items[0].score}/10 from ${items[0].source}.` : "Feeds checked and deduped.",
      extra: "Each item uses OpenAI JSON analysis with is_positive, score, category, summary, and x_post."
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

function parseOpenAIHappyNews(text: string): { items: HappyNewsAnalysis[] } {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) {
    throw new Error("OpenAI did not return JSON.");
  }

  const parsed = JSON.parse(jsonText) as { items?: HappyNewsAnalysis[] };

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
  const text = item.xPost || item.title;

  return text.length <= 280 ? text : `${text.slice(0, 277).trim()}...`;
}

function clampScore(score: number) {
  if (!Number.isFinite(score)) return 1;
  return Math.min(10, Math.max(1, Math.round(score)));
}
