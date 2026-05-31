import { NextResponse } from "next/server";
import { fetchGoogleNewsFifa2026 } from "@/lib/google-news";

export async function POST() {
  try {
    const { mode, signals, drafts, summary } = await fetchGoogleNewsFifa2026();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      topic: "google-news-fifa",
      sourceWindow: "24 hrs",
      signals,
      drafts,
      summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch Google News FIFA 2026 RSS."
      },
      { status: 500 }
    );
  }
}
