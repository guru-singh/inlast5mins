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

const businessImages = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80"
];

export const fifaGrokPrompt = `
Create a ready-to-post series of 6 engaging tweets about the FIFA World Cup 2026 in the current pre-tournament period (just before the tournament starts).

Make the tweets feel timely for right now — reference how close we are to kickoff, current fan sentiment, ticket issues, and any ongoing discussions. Avoid generic or outdated statements.

Cover these angles across the 6 tweets (blend or reorder them naturally):
- A prediction or talking point about the opening match
- Global excitement mixed with real fan frustrations (especially around tickets and access)
- The 16 venues and atmosphere across USA, Canada, and Mexico
- Ticket pricing issues and ongoing fan disappointment
- Off-field controversies (heat protocols, geopolitics, 48-team format)
- Real-time fan reactions, emotions, and viral moments from ongoing matches
- Overall historic nature of this World Cup + strong engagement CTA

Rules:
- Keep every tweet under 220 characters
- Use emojis and hashtags (#FIFAWorldCup2026 #WorldCup2026) naturally
- Make the tone conversational, slightly witty, and reply-friendly
- Include at least one sharper or opinionated take
- Make the tweets feel current and relevant to the actual days leading up to the tournament

For images: Search the web for relevant public images and use them when suitable.`;

export const globalIconsPrompt = `You are a sharp business and tech news social media writer.

Your task is to create publication-ready social media post drafts for global business icons based **only** on verified news from the **last 48 hours**.

**People to cover:**
- Elon Musk
- Jeff Bezos
- Bill Gates
- Mark Zuckerberg
- Mukesh Ambani

---

**Step 1: Research First (Mandatory)**
Before writing a single word, use web search to find credible news published in the last 48 hours from sources such as Reuters, Bloomberg, CNBC, Forbes, BBC, Financial Times, The Economic Times, or Business Standard.

Only proceed to Step 2 after completing research for all five names.

---

**Step 2: Write Social Media Posts**

**Content Rules:**
- Use only verified, factual news. No rumors, speculation, or recycled old news.
- If no credible news exists for a person in the last 48 hours, write exactly: "No major verified update in the last 48 hours." — do not fabricate content.
- Prioritize high-impact stories: major announcements, business moves, controversies, or significant public statements.

**Post Format Rules:**
- Length: 220–260 characters (including hashtags).
- Open with a strong, headline-style hook — treat the first line like a breaking news alert.
- Tone: Professional yet conversational. Sharp business reporter voice. Suitable for both X (Twitter) and LinkedIn.
- End with 2–4 relevant hashtags.
- Emojis: Maximum 1–2, only if they add clarity or energy. Never decorative.

---

**Output Format**

Return a clean markdown table with these exact columns:

| Name | Draft Social Post | Suggested Visual | Source |

**Suggested Visual Guidelines:**
- If the news has a strong visual element (product launch, event, announcement, etc.), describe a relevant news image or screenshot.
- If no suitable news visual is available, fall back to a clean professional headshot or portrait.
- Clearly label every visual as either: **[News Visual]** or **[Portrait Fallback]**.
- Keep descriptions specific and actionable (e.g., "Photo of Zuckerberg at Meta Connect stage, Sept 2024" or "Professional portrait of Mukesh Ambani in business attire").

---

**Final Checklist Before Outputting:**
- [ ] All five names are covered (even if "no update")
- [ ] Every post is between 220–260 characters
- [ ] Every post has a source listed
- [ ] No post contains rumors, speculation, or unverified claims
- [ ] Visual type is clearly labeled`;

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

export async function generateGlobalIconsWithGrok(): Promise<{
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
            "Use live web search before writing. Return only the requested markdown table. Do not include any intro, outro, checklist, or notes."
        },
        {
          role: "user",
          content: `${globalIconsPrompt}

Current date: May 30, 2026. The last 48 hours means news published from May 28, 2026 through May 30, 2026.

Important app constraint: keep table cells on one line so the markdown table can be parsed.`
        }
      ],
      tools: [
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

  const rows = parseMarkdownTable(extractText(payload));
  const expectedNames = ["Elon Musk", "Jeff Bezos", "Bill Gates", "Mark Zuckerberg", "Mukesh Ambani"];
  const drafts = expectedNames.map((name, index) => {
    const row = rows.find((item) => item.name.toLowerCase() === name.toLowerCase());
    const content = row?.draftSocialPost || "No major verified update in the last 48 hours.";

    return {
      id: `global-${index + 1}`,
      angle: name,
      content: content.slice(0, 280),
      imageUrl: businessImages[index] ?? defaultImage,
      sourceTweetIds: row?.source ? [stripMarkdown(row.source)] : [],
      suggestedVisual: stripMarkdown(row?.suggestedVisual ?? "[Portrait Fallback] Clean professional portrait."),
      source: stripMarkdown(row?.source ?? "No source listed")
    };
  });

  const signals = drafts.map((draft, index) => ({
    id: draft.id,
    text: draft.content,
    author: "Grok",
    username: "xai",
    createdAt: new Date().toISOString(),
    category: "buzz" as const,
    engagement: 100 - index
  }));

  return {
    mode: "grok",
    drafts,
    signals,
    summary: {
      score: "Global business icon drafts generated from Grok web research.",
      controversy: "Posts are restricted to verified news from the last 48 hours.",
      fanReaction: "Covers Elon Musk, Jeff Bezos, Bill Gates, Mark Zuckerberg, and Mukesh Ambani.",
      extra: "Each draft includes a suggested visual and source."
    }
  };
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

function parseMarkdownTable(markdown: string) {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));
  const dataLines = lines.filter((line) => !/^\|\s*-+/.test(line) && !/\|\s*Name\s*\|/i.test(line));

  return dataLines.map((line) => {
    const cells = splitMarkdownRow(line);

    return {
      name: stripMarkdown(cells[0] ?? ""),
      draftSocialPost: stripMarkdown(cells[1] ?? ""),
      suggestedVisual: stripMarkdown(cells[2] ?? ""),
      source: cells[3] ?? ""
    };
  });
}

function splitMarkdownRow(line: string) {
  return line
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim().replace(/\\\|/g, "|"));
}

function stripMarkdown(value: string) {
  return value
    .replace(/\*\*/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 - $2")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
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
