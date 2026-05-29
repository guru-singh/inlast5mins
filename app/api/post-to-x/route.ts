import { NextRequest, NextResponse } from "next/server";
import { publishTweet } from "@/lib/x-api";
import { DraftPost, PublishResult } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { drafts?: DraftPost[] };
    const drafts = body.drafts ?? [];

    if (!drafts.length) {
      return NextResponse.json({ message: "Choose at least one draft to publish." }, { status: 400 });
    }

    const results: PublishResult[] = [];

    for (const draft of drafts) {
      try {
        const result = await publishTweet(draft.content, draft.imageUrl);

        results.push({
          id: draft.id,
          status: result.status,
          url: result.url,
          error: result.warning
        });
      } catch (error) {
        results.push({
          id: draft.id,
          status: "failed",
          error: error instanceof Error ? error.message : "Post failed"
        });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : "Unable to publish to X."
      },
      { status: 500 }
    );
  }
}
