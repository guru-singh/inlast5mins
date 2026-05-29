import { NextResponse } from "next/server";
import { createDrafts, summarizeSignals } from "@/lib/drafts";
import { fetchFifaSignals } from "@/lib/x-api";

export async function POST() {
  try {
    const { mode, signals } = await fetchFifaSignals();
    const drafts = createDrafts(signals);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      signals,
      drafts,
      summary: summarizeSignals(signals)
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch FIFA 2026 details from X."
      },
      { status: 500 }
    );
  }
}
