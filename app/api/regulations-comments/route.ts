import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  fetchAnalyzableComments,
} from "../../../lib/data/regulations-gov";

export async function GET(
  request: NextRequest
) {
  try {
    const objectId =
      request.nextUrl.searchParams.get(
        "objectId"
      );

    const limitValue =
      request.nextUrl.searchParams.get(
        "limit"
      );

    if (!objectId) {
      return NextResponse.json(
        {
          error:
            "objectId is required",
        },
        {
          status: 400,
        }
      );
    }

    const limit =
      Number(
        limitValue ?? "5"
      );

    const comments =
      await fetchAnalyzableComments(
        objectId,
        limit
      );

    return NextResponse.json({
      objectId,
      count:
        comments.length,
      comments,
    });
  } catch (error) {
    console.error(
      "Regulations.gov import error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to import comments",
      },
      {
        status: 500,
      }
    );
  }
}