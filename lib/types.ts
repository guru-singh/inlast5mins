export type XSignal = {
  id: string;
  text: string;
  author: string;
  username: string;
  createdAt: string;
  category: "score" | "controversy" | "fan" | "buzz";
  engagement: number;
};

export type DraftPost = {
  id: string;
  angle: string;
  content: string;
  imageUrl: string;
  sourceTweetIds: string[];
};

export type DraftResponse = {
  generatedAt: string;
  mode: "grok";
  signals: XSignal[];
  drafts: DraftPost[];
  summary: {
    score: string;
    controversy: string;
    fanReaction: string;
    extra: string;
  };
};

export type PublishResult = {
  id: string;
  status: "posted" | "simulated" | "failed";
  url?: string;
  error?: string;
};
