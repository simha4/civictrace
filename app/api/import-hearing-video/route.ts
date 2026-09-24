import {
  NextResponse,
} from "next/server";
import { z } from "zod";

import {
  fetchYouTubeTranscript,
  getYouTubeVideoId,
} from "../../../lib/hearing/youtube-transcript";

const RequestSchema =
  z.object({
    caseId:
      z.string()
        .trim()
        .min(1),

    youtubeUrl:
      z.string()
        .trim()
        .url(),
  });

function formatTimestamp(
  seconds: number
) {
  const total =
    Math.floor(seconds);

  const hours =
    Math.floor(
      total / 3600
    );

  const minutes =
    Math.floor(
      (total % 3600) /
        60
    );

  const remaining =
    total % 60;

  if (hours > 0) {
    return [
      hours,
      minutes
        .toString()
        .padStart(
          2,
          "0"
        ),
      remaining
        .toString()
        .padStart(
          2,
          "0"
        ),
    ].join(":");
  }

  return [
    minutes,
    remaining
      .toString()
      .padStart(
        2,
        "0"
      ),
  ].join(":");
}

function groupTranscript(
  snippets: {
    text: string;
    startSec: number;
    endSec: number;
  }[]
) {
  const groups: {
    text: string;
    startSec: number;
    endSec: number;
  }[] = [];

  const targetDuration =
    45;

  let current:
    | {
        text: string;
        startSec: number;
        endSec: number;
      }
    | null = null;

  for (
    const snippet
    of snippets
  ) {
    if (!current) {
      current = {
        ...snippet,
      };

      continue;
    }

    const combinedDuration =
      snippet.endSec -
      current.startSec;

    if (
      combinedDuration <=
      targetDuration
    ) {
      current.text =
        `${current.text} ${snippet.text}`;

      current.endSec =
        snippet.endSec;

      continue;
    }

    groups.push(
      current
    );

    current = {
      ...snippet,
    };
  }

  if (current) {
    groups.push(
      current
    );
  }

  return groups;
}

export async function POST(
  request: Request
) {
  try {
    const body =
      await request.json();

    const {
      caseId,
      youtubeUrl,
    } =
      RequestSchema.parse(
        body
      );

    const videoId =
      getYouTubeVideoId(
        youtubeUrl
      );

    if (!videoId) {
      return NextResponse.json(
        {
          error:
            "Enter a valid YouTube video URL.",
        },
        {
          status: 400,
        }
      );
    }

    const transcript =
      await fetchYouTubeTranscript(
        videoId
      );

    const segments =
      groupTranscript(
        transcript.snippets
      );

    /*
     * IMPORTANT:
     *
     * We intentionally do NOT upload these
     * segments to Azure AI Search here.
     *
     * The existing /api/analyze-hearing
     * endpoint already indexes hearing
     * evidence.
     *
     * Uploading here as well would create
     * duplicate hearing evidence.
     */

    const transcriptText =
      segments
        .map(
          (
            segment,
            index
          ) => {
            const timestamp =
              formatTimestamp(
                segment.startSec
              );

            return (
              `Video Segment ${index + 1}: [${timestamp}] ` +
              segment.text
            );
          }
        )
        .join("\n");

    return NextResponse.json({
      caseId,
      videoId,
      youtubeUrl,

      source:
        transcript.source,

      languageCode:
        transcript.languageCode,

      durationSec:
        transcript.durationSec,

      suspectedTruncation:
        transcript.suspectedTruncation,

      snippetCount:
        transcript.snippets.length,

      segmentCount:
        segments.length,

      transcriptText,

      segments:
        segments.map(
          (
            segment,
            index
          ) => ({
            id:
              `video-segment-${index + 1}`,

            sequenceNumber:
              index + 1,

            timestamp:
              formatTimestamp(
                segment.startSec
              ),

            startSec:
              segment.startSec,

            endSec:
              segment.endSec,

            text:
              segment.text,
          })
        ),
    });
  } catch (error) {
    console.error(
      "Hearing video import error:",
      error
    );

    if (
      error instanceof
      z.ZodError
    ) {
      return NextResponse.json(
        {
          error:
            "caseId and a valid YouTube URL are required.",
        },
        {
          status: 400,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : "Unable to import the hearing video.",
      },
      {
        status: 500,
      }
    );
  }
}
