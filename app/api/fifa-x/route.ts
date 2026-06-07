import { NextResponse } from "next/server";
import { generateFifaDraftsWithGemini } from "@/lib/gemini";

export async function POST() {
  try {
    const { mode, signals, drafts, summary } = await generateFifaDraftsWithGemini();
    
    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      topic: "fifa",
      sourceWindow: "24 hrs",
      signals,
      drafts,
      summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch FIFA 2026 content from Gemini."
      },
      { status: 500 }
    );
  }
}
