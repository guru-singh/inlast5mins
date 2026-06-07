import { GoogleGenAI, Type } from "@google/genai";
import { DraftPost, XSignal } from "./types";
import { fifaGrokPrompt } from "./grok";

const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const defaultImage = "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80";

const fallbackImages = [
  defaultImage,
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80"
];

type GeminiDraft = {
  angle: string;
  content: string;
  imageUrl?: string;
  source?: string;
};

type GeminiPayload = {
  summary?: {
    score?: string;
    controversy?: string;
    fanReaction?: string;
    extra?: string;
  };
  tweets: GeminiDraft[];
};

export async function generateFifaDraftsWithGemini(): Promise<{
  mode: "gemini";
  drafts: DraftPost[];
  signals: XSignal[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
}> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Add your Gemini API key to .env.local, then restart the dev server.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `You are a strict JSON-only generator.
Return only valid JSON matching the schema.
Do not include markdown or commentary.

${fifaGrokPrompt}`
          }
        ]
      }
    ],
    config: {
      temperature: 0.85,
      topP: 0.95,
      maxOutputTokens: 4000,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.STRING },
              controversy: { type: Type.STRING },
              fanReaction: { type: Type.STRING },
              extra: { type: Type.STRING }
            }
          },
          tweets: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                angle: { type: Type.STRING },
                content: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                source: { type: Type.STRING }
              },
              required: ["angle", "content"]
            }
          }
        },
        required: ["summary", "tweets"]
      }
    }
  });

  const parsed = parseGeminiJson(response.text ?? "");

  return buildResponse(parsed);
}

function buildResponse(payload: GeminiPayload) {
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
    author: "Gemini",
    username: "gemini",
    createdAt: new Date().toISOString(),
    category: categoryForIndex(index),
    engagement: 100 - index
  }));

  return {
    mode: "gemini" as const,
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

function parseGeminiJson(text: string): GeminiPayload {
  const trimmed = text.trim();
  const jsonText = trimmed.startsWith("{") ? trimmed : trimmed.match(/\{[\s\S]*\}/)?.[0] ?? "";

  if (!jsonText) {
    throw new Error("Gemini did not return JSON.");
  }

  const parsed = JSON.parse(jsonText) as GeminiPayload;

  if (!Array.isArray(parsed.tweets) || parsed.tweets.length < 6) {
    throw new Error("Gemini response did not include six tweets.");
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
