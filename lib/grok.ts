import { DraftPost, XSignal } from "./types";

const GROK_ENDPOINT = "https://api.x.ai/v1/responses";
const DEFAULT_MODEL = "grok-4.3";

const defaultImage = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80";

const fallbackImages = [
  defaultImage,
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80"
];

export const fifaGrokPrompt = `You are an expert football content creator and X growth specialist. Create a ready-to-post series of 6 engaging tweets about FIFA World Cup 2026 (late May 2026 context).
Structure exactly like this:
1.  Tweet 1 - Score/Predictions: Fun, confident prediction for the opening match (Mexico vs South Africa at Azteca) + engagement question.
2.  Tweet 2 - Fan Reaction: Mix of huge global excitement for the first tri-nation World Cup + real frustrations (especially tickets/access).
3.  Tweet 3 - Stadiums: Celebrate the 16 venues across USA, Canada & Mexico. Highlight variety and atmosphere.
4.  Tweet 4 - Tickets: Honestly cover dynamic pricing, seat assignment issues, fan disappointment, and ongoing scrutiny/investigations.
5.  Tweet 5 - Controversy: Touch on key off-field topics (heat protocols, geopolitics like Iran base move, 48-team format, ticket drama) and ask for opinions.
6.  Tweet 6 - Overall Hype/Engagement: Why this World Cup is historic + strong CTA (dark horse, predictions, or "are you ready?").
Rules for every tweet:
* Keep under 280 characters (shorter = better reach)
* Use relevant emojis (football, stadium, ticket, fire, Mexico, USA, Canada) and hashtags (#FIFAWorldCup2026 #WorldCup2026)
* Conversational, slightly witty, and reply/poll friendly
* Passionate about football

For images: Search the web for relevant public images and use them when suitable.`;

type GrokDraft = {
  angle: string;
  content: string;
  imageUrl?: string;
  source?: string;
};

type GrokPayload = {
  summary?: {
    score?: string;
    controversy?: string;
    fanReaction?: string;
    extra?: string;
  };
  tweets: GrokDraft[];
};

export async function generateFifaDraftsWithGrok(): Promise<{
  mode: "grok";
  drafts: DraftPost[];
  signals: XSignal[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
}> {
  const apiKey = process.env.XAI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing XAI_API_KEY. Add your xAI API key to .env.local, then restart the dev server.");
  }

  const response = await fetch(GROK_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      model: process.env.XAI_MODEL ?? DEFAULT_MODEL,
      input: [
        {
          role: "system",
          content:
            "Return only valid JSON. Do not include markdown. Keep every tweet under 280 characters."
        },
        {
          role: "user",
          content: `${fifaGrokPrompt}

Current date: May 30, 2026.

Return JSON with this exact shape:
{
  "summary": {
    "score": "short score/prediction summary",
    "controversy": "short controversy summary",
    "fanReaction": "short fan reaction summary",
    "extra": "short stadium/ticket/hype summary"
  },
  "tweets": [
    {
      "angle": "Tweet 1 - Score/Predictions",
      "content": "tweet text under 280 characters",
      "imageUrl": "public https image URL suitable for this tweet",
      "source": "page URL for the image or context"
    }
  ]
}`
        }
      ],
      tools: [
        {
          type: "x_search",
          from_date: "2026-05-29",
          to_date: "2026-05-30",
          enable_image_understanding: true
        },
        {
          type: "web_search",
          enable_image_understanding: true
        }
      ]
    })
  });

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`Grok request failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  const text = extractText(payload);
  const parsed = parseGrokJson(text);

  return buildResponse("grok", parsed);
}

function buildResponse(mode: "grok", payload: GrokPayload) {
  const drafts = payload.tweets.slice(0, 6).map((tweet, index) => ({
    id: `draft-${index + 1}`,
    angle: tweet.angle || `Tweet ${index + 1}`,
    content: tweet.content.slice(0, 280),
    imageUrl: isValidPublicImage(tweet.imageUrl) ? tweet.imageUrl : fallbackImages[index] ?? defaultImage,
    sourceTweetIds: tweet.source ? [tweet.source] : []
  }));

  const signals = drafts.map((draft, index) => ({
    id: draft.id,
    text: draft.content,
    author: "Grok",
    username: "xai",
    createdAt: new Date().toISOString(),
    category: categoryForIndex(index),
    engagement: 100 - index
  }));

  return {
    mode,
    drafts,
    signals,
    summary: {
      score: payload.summary?.score ?? drafts[0]?.content ?? "",
      controversy: payload.summary?.controversy ?? drafts[4]?.content ?? "",
      fanReaction: payload.summary?.fanReaction ?? drafts[1]?.content ?? "",
      extra: payload.summary?.extra ?? drafts[2]?.content ?? ""
    }
  };
}

function extractText(payload: unknown): string {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ type?: string; text?: string }> }>;
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

function parseGrokJson(text: string): GrokPayload {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{")
    ? trimmed
    : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) {
    throw new Error("Grok did not return JSON.");
  }

  const parsed = JSON.parse(jsonText) as GrokPayload;

  if (!Array.isArray(parsed.tweets) || parsed.tweets.length < 6) {
    throw new Error("Grok response did not include six tweets.");
  }

  return parsed;
}

function isValidPublicImage(url?: string): url is string {
  if (!url) return false;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function categoryForIndex(index: number): XSignal["category"] {
  if (index === 0) return "score";
  if (index === 1) return "fan";
  if (index === 4) return "controversy";
  return "buzz";
}
