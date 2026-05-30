import { NextResponse } from "next/server";
import { generateGlobalIconsWithGrok } from "@/lib/grok";

export async function POST() {
  try {
    const { mode, signals, drafts, summary } = await generateGlobalIconsWithGrok();

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      mode,
      topic: "global-icons",
      sourceWindow: "48 hrs",
      signals,
      drafts,
      summary
    });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to fetch global icons news from Grok."
      },
      { status: 500 }
    );
  }
}
