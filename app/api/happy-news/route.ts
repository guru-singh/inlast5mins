import { NextResponse } from "next/server";
import { fetchHappyNews } from "@/lib/happy-news";

export async function POST() {
  try {
    const { mode, signals, drafts, summary } = await fetchHappyNews();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      topic: "happy-news",
      sourceWindow: "48 hrs",
      signals,
      drafts,
      summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch Happy News."
      },
      { status: 500 }
    );
  }
}
