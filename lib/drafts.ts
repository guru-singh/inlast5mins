import { DraftPost, XSignal } from "./types";

const imagePool = [
  "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1517466787929-bc90951d0974?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1200&q=80"
];

export function createDrafts(signals: XSignal[]): DraftPost[] {
  const topSignals = [...signals].sort((a, b) => b.engagement - a.engagement);
  const score = firstByCategory(topSignals, "score");
  const controversy = firstByCategory(topSignals, "controversy");
  const fan = firstByCategory(topSignals, "fan");
  const buzz = firstByCategory(topSignals, "buzz");

  const hooks = [
    {
      angle: "Score pulse",
      body: `FIFA 2026 watch: ${cleanSnippet(score?.text ?? "the latest score chatter is moving fast")}. The match conversation is shifting by the minute.`
    },
    {
      angle: "Controversy watch",
      body: `The FIFA 2026 debate of the day: ${cleanSnippet(controversy?.text ?? "fans are split on a call, format change, or tournament decision")}. This one has reply sections working overtime.`
    },
    {
      angle: "Fan reaction",
      body: `Fan mood around FIFA 2026 right now: ${cleanSnippet(fan?.text ?? "huge excitement, sharp jokes, and a lot of national-team pride")}. The timeline feels ready for kickoff already.`
    },
    {
      angle: "Big picture",
      body: `In the last 24 hours, FIFA 2026 chatter is clustering around scores, debate, and fan energy. ${cleanSnippet(buzz?.text ?? "The tournament build-up is already becoming a daily news cycle")}.`
    },
    {
      angle: "Conversation starter",
      body: `FIFA 2026 question: what is the one storyline people are underrating right now? Scores, controversy, travel, squads, ticket talk, or pure fan chaos?`
    }
  ];

  return hooks.map((hook, index) => ({
    id: `draft-${index + 1}`,
    angle: hook.angle,
    content: `${hook.body}\n\n#FIFA2026 #WorldCup2026`,
    imageUrl: imagePool[index],
    sourceTweetIds: topSignals.slice(index, index + 3).map((signal) => signal.id)
  }));
}

export function summarizeSignals(signals: XSignal[]) {
  const top = [...signals].sort((a, b) => b.engagement - a.engagement);

  return {
    score: cleanSnippet(firstByCategory(top, "score")?.text ?? "No strong score-specific signal found in the last 24 hours."),
    controversy: cleanSnippet(firstByCategory(top, "controversy")?.text ?? "No major controversy signal found yet."),
    fanReaction: cleanSnippet(firstByCategory(top, "fan")?.text ?? "Fan reaction is broad, upbeat, and still forming."),
    extra: cleanSnippet(firstByCategory(top, "buzz")?.text ?? "General FIFA 2026 buzz is active around teams, host cities, and tournament prep.")
  };
}

function firstByCategory(signals: XSignal[], category: XSignal["category"]) {
  return signals.find((signal) => signal.category === category);
}

function cleanSnippet(text: string) {
  return text
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/g, "")
    .trim()
    .slice(0, 190);
}
