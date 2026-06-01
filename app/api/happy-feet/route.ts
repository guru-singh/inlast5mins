import { NextResponse } from "next/server";
import { fetchHappyFeetRecord } from "@/lib/happy-feet";

export async function POST() {
  try {
    const { mode, signals, drafts, summary } = await fetchHappyFeetRecord();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      topic: "happy-feet",
      sourceWindow: "current slot",
      signals,
      drafts,
      summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch Happy Feet record."
      },
      { status: 500 }
    );
  }
}
