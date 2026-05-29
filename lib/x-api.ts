import crypto from "crypto";
import OAuth from "oauth-1.0a";
import { XSignal } from "./types";

type XSearchTweet = {
  id: string;
  text: string;
  created_at?: string;
  author_id?: string;
  public_metrics?: {
    retweet_count: number;
    reply_count: number;
    like_count: number;
    quote_count: number;
  };
};

type XSearchUser = {
  id: string;
  name: string;
  username: string;
};

export async function fetchFifaSignals(): Promise<{ mode: "live" | "demo"; signals: XSignal[] }> {
  const bearer = process.env.X_BEARER_TOKEN;

  if (!bearer) {
    return { mode: "demo", signals: demoSignals() };
  }

  const sinceTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const params = new URLSearchParams({
    query: '("FIFA 2026" OR "World Cup 2026" OR "FIFA World Cup 2026") lang:en -is:retweet',
    max_results: "50",
    since_time: sinceTime,
    "tweet.fields": "created_at,public_metrics,author_id",
    expansions: "author_id",
    "user.fields": "name,username"
  });

  const response = await fetch(`https://api.x.com/2/tweets/search/recent?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${bearer}`
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`X search failed: ${response.status} ${detail}`);
  }

  const payload = (await response.json()) as {
    data?: XSearchTweet[];
    includes?: { users?: XSearchUser[] };
  };

  const users = new Map((payload.includes?.users ?? []).map((user) => [user.id, user]));
  const signals =
    payload.data?.map((tweet) => {
      const user = users.get(tweet.author_id ?? "");
      const metrics = tweet.public_metrics;

      return {
        id: tweet.id,
        text: tweet.text,
        author: user?.name ?? "X user",
        username: user?.username ?? "unknown",
        createdAt: tweet.created_at ?? new Date().toISOString(),
        category: categorize(tweet.text),
        engagement: metrics
          ? metrics.like_count + metrics.reply_count * 2 + metrics.retweet_count * 3 + metrics.quote_count * 3
          : 0
      } satisfies XSignal;
    }) ?? [];

  return { mode: "live", signals };
}

export async function publishTweet(content: string, imageUrl?: string) {
  const credentials = getOAuthCredentials();

  if (!credentials) {
    throw new Error(
      "Missing X posting credentials. Add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, and X_ACCESS_TOKEN_SECRET to .env.local, then restart the dev server."
    );
  }

  let mediaId: string | undefined;
  let imageWarning: string | undefined;

  if (imageUrl) {
    try {
      mediaId = await uploadImage(imageUrl, credentials);
    } catch (error) {
      imageWarning = error instanceof Error ? error.message : "Image upload failed.";
    }
  }

  const body = {
    text: content,
    ...(mediaId ? { media: { media_ids: [mediaId] } } : {})
  };

  const response = await signedFetch(
    "https://api.x.com/2/tweets",
    {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    },
    credentials
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`X publish failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return {
    status: "posted" as const,
    url: `https://x.com/i/web/status/${payload.data.id}`,
    warning: imageWarning
  };
}

async function uploadImage(imageUrl: string, credentials: OAuthCredentials) {
  const imageResponse = await fetch(imageUrl, {
    cache: "no-store",
    headers: {
      accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    }
  });

  if (!imageResponse.ok) {
    throw new Error(`Image fetch failed: ${imageResponse.status}`);
  }

  const arrayBuffer = await imageResponse.arrayBuffer();
  const mediaData = Buffer.from(arrayBuffer).toString("base64");
  const uploadParams = {
    media_data: mediaData
  };
  const body = new URLSearchParams(uploadParams);

  const response = await signedFetch(
    "https://upload.twitter.com/1.1/media/upload.json",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded"
      },
      body
    },
    credentials,
    uploadParams
  );

  const payload = await response.json();

  if (!response.ok) {
    throw new Error(`X media upload failed: ${response.status} ${JSON.stringify(payload)}`);
  }

  return payload.media_id_string as string;
}

type OAuthCredentials = {
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessSecret: string;
};

function getOAuthCredentials(): OAuthCredentials | null {
  const consumerKey = process.env.X_API_KEY;
  const consumerSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessSecret = process.env.X_ACCESS_TOKEN_SECRET;

  if (!consumerKey || !consumerSecret || !accessToken || !accessSecret) {
    return null;
  }

  return { consumerKey, consumerSecret, accessToken, accessSecret };
}

async function signedFetch(
  url: string,
  init: RequestInit,
  credentials: OAuthCredentials,
  data?: Record<string, string>
) {
  const oauth = new OAuth({
    consumer: {
      key: credentials.consumerKey,
      secret: credentials.consumerSecret
    },
    signature_method: "HMAC-SHA1",
    hash_function(baseString, key) {
      return crypto.createHmac("sha1", key).update(baseString).digest("base64");
    }
  });

  const token = {
    key: credentials.accessToken,
    secret: credentials.accessSecret
  };
  const request = {
    url,
    method: init.method ?? "GET",
    data
  };
  const authHeader = oauth.toHeader(oauth.authorize(request, token));

  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      ...authHeader
    }
  });
}

function categorize(text: string): XSignal["category"] {
  const lower = text.toLowerCase();

  if (/(score|goal|won|win|lost|draw|match|fixture|qualifier)/.test(lower)) {
    return "score";
  }

  if (/(controversy|controversial|var|referee|ban|corrupt|scandal|outrage|backlash)/.test(lower)) {
    return "controversy";
  }

  if (/(fans|supporters|reaction|hype|love|hate|chant|timeline|meme)/.test(lower)) {
    return "fan";
  }

  return "buzz";
}

function demoSignals(): XSignal[] {
  const now = Date.now();

  return [
    {
      id: "demo-1",
      text: "Latest FIFA 2026 qualifier chatter is all about a late goal changing the table and fans arguing over who looks tournament-ready.",
      author: "Demo Sports Desk",
      username: "sportsdesk",
      createdAt: new Date(now - 42 * 60 * 1000).toISOString(),
      category: "score",
      engagement: 240
    },
    {
      id: "demo-2",
      text: "A debated referee call has pushed FIFA 2026 conversation into controversy mode, with VAR takes splitting the timeline again.",
      author: "Demo Football Daily",
      username: "footballdaily",
      createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
      category: "controversy",
      engagement: 410
    },
    {
      id: "demo-3",
      text: "Fans are already making FIFA 2026 travel plans, jersey predictions, and bold bracket claims. The hype is real.",
      author: "Demo Fan Zone",
      username: "fanzone",
      createdAt: new Date(now - 4 * 60 * 60 * 1000).toISOString(),
      category: "fan",
      engagement: 350
    },
    {
      id: "demo-4",
      text: "Host city buzz is rising again as FIFA 2026 ticket, travel, and stadium conversations pick up across X.",
      author: "Demo World Cup Wire",
      username: "worldcupwire",
      createdAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      category: "buzz",
      engagement: 180
    },
    {
      id: "demo-5",
      text: "Squad depth, qualifier form, and manager choices are becoming the big FIFA 2026 talking points this week.",
      author: "Demo Tactics",
      username: "tacticsnow",
      createdAt: new Date(now - 11 * 60 * 60 * 1000).toISOString(),
      category: "buzz",
      engagement: 155
    }
  ];
}
