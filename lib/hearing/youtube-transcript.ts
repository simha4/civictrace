export type TranscriptSnippet = {
  text: string;
  startSec: number;
  endSec: number;
};

export type TranscriptResult = {
  snippets: TranscriptSnippet[];
  durationSec: number;
  languageCode: string | null;
  source: "serpapi-manual" | "serpapi-asr";
  suspectedTruncation: boolean;
};

type AvailableTranscript = {
  title?: string;
  language_name?: string;
  language_code?: string;
  type?: string;
  selected?: boolean;
};

type SerpApiTranscriptItem = {
  start_ms?: number;
  end_ms?: number;
  snippet?: string;
  start_time_text?: string;
};

type SerpApiResponse = {
  error?: string;

  transcript?: SerpApiTranscriptItem[];

  available_transcripts?: AvailableTranscript[];

  search_parameters?: {
    language_code?: string;
    type?: string;
  };
};

const SERPAPI_ENDPOINT =
  "https://serpapi.com/search";

function isManualTranscript(
  transcript: AvailableTranscript
) {
  return transcript.type !== "asr";
}

function isEnglishTranscript(
  transcript: AvailableTranscript
) {
  const code =
    transcript.language_code
      ?.toLowerCase()
      .trim();

  if (code) {
    return code.startsWith("en");
  }

  const language =
    transcript.language_name
      ?.toLowerCase()
      .trim();

  return language === "english";
}

function convertTranscript(
  transcript: SerpApiTranscriptItem[]
): TranscriptSnippet[] {
  return transcript
    .map((item) => {
      const text =
        item.snippet
          ?.replace(/\s+/g, " ")
          .trim() ?? "";

      const startSec =
        typeof item.start_ms === "number"
          ? item.start_ms / 1000
          : 0;

      const endSec =
        typeof item.end_ms === "number"
          ? item.end_ms / 1000
          : startSec;

      return {
        text,
        startSec,
        endSec,
      };
    })
    .filter(
      (item) =>
        item.text.length > 0
    );
}

async function requestTranscript(
  videoId: string,
  options?: {
    languageCode?: string;
    type?: string;
    title?: string;
  }
) {
  const apiKey =
    process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "SERPAPI_API_KEY is missing from environment variables."
    );
  }

  const params =
    new URLSearchParams({
      engine:
        "youtube_video_transcript",

      v: videoId,

      api_key: apiKey,

      output: "json",
    });

  if (
    options?.languageCode
  ) {
    params.set(
      "language_code",
      options.languageCode
    );
  }

  if (options?.type) {
    params.set(
      "type",
      options.type
    );
  }

  if (options?.title) {
    params.set(
      "title",
      options.title
    );
  }

  const response =
    await fetch(
      `${SERPAPI_ENDPOINT}?${params.toString()}`,
      {
        cache: "no-store",
      }
    );

  const json =
    (await response.json()) as SerpApiResponse;

  if (json.error) {
    throw new Error(
      `SerpApi error: ${json.error}`
    );
  }

  if (!response.ok) {
    throw new Error(
      `SerpApi request failed with status ${response.status}.`
    );
  }

  return json;
}

export function getYouTubeVideoId(
  input: string
) {
  const trimmed =
    input.trim();

  try {
    const url =
      new URL(trimmed);

    if (
      url.hostname ===
        "youtu.be" ||
      url.hostname ===
        "www.youtu.be"
    ) {
      return url.pathname
        .replace(
          /^\/+/,
          ""
        )
        .split("/")[0];
    }

    if (
      url.hostname.includes(
        "youtube.com"
      )
    ) {
      if (
        url.pathname.startsWith(
          "/shorts/"
        )
      ) {
        return (
          url.pathname
            .split("/")[2] ??
          ""
        );
      }

      if (
        url.pathname.startsWith(
          "/embed/"
        )
      ) {
        return (
          url.pathname
            .split("/")[2] ??
          ""
        );
      }

      return (
        url.searchParams.get(
          "v"
        ) ?? ""
      );
    }
  } catch {
    return "";
  }

  return "";
}

export async function fetchYouTubeTranscript(
  videoId: string
): Promise<TranscriptResult> {
  /*
   * Start with English.
   *
   * SerpApi returns the transcript plus the
   * available transcript tracks.
   */
  const initial =
    await requestTranscript(
      videoId,
      {
        languageCode: "en",
      }
    );

  const available =
    initial.available_transcripts ??
    [];

  /*
   * Prefer a manually authored English
   * transcript when YouTube provides one.
   */
  const manualEnglish =
    available.find(
      (track) =>
        isEnglishTranscript(
          track
        ) &&
        isManualTranscript(
          track
        )
    );

  let response =
    initial;

  let source:
    TranscriptResult["source"] =
    initial.search_parameters
      ?.type === "asr"
      ? "serpapi-asr"
      : "serpapi-manual";

  let languageCode =
    initial.search_parameters
      ?.language_code ??
    "en";

  if (manualEnglish) {
    try {
      response =
        await requestTranscript(
          videoId,
          {
            languageCode:
              manualEnglish.language_code ??
              "en",

            type:
              manualEnglish.type,

            title:
              manualEnglish.title,
          }
        );

      source =
        "serpapi-manual";

      languageCode =
        manualEnglish.language_code ??
        "en";
    } catch {
      /*
       * If the preferred manual transcript
       * fails, keep the initial transcript.
       */
      response =
        initial;
    }
  }

  /*
   * If the current transcript is empty,
   * explicitly try an ASR transcript.
   */
  if (
    !response.transcript ||
    response.transcript.length ===
      0
  ) {
    const asrTrack =
      available.find(
        (track) =>
          track.type ===
          "asr"
      );

    if (asrTrack) {
      response =
        await requestTranscript(
          videoId,
          {
            languageCode:
              asrTrack.language_code ??
              "en",

            type: "asr",
          }
        );

      source =
        "serpapi-asr";

      languageCode =
        asrTrack.language_code ??
        "en";
    }
  }

  const snippets =
    convertTranscript(
      response.transcript ??
        []
    );

  if (
    snippets.length === 0
  ) {
    throw new Error(
      "No usable transcript was found for this YouTube video. Make sure the video has captions or a transcript."
    );
  }

  const durationSec =
    snippets.reduce(
      (
        longest,
        snippet
      ) =>
        Math.max(
          longest,
          snippet.endSec
        ),
      0
    );

  /*
   * Very short transcript responses can
   * indicate unavailable or truncated
   * caption data.
   */
  const suspectedTruncation =
    snippets.length < 10 ||
    durationSec < 60;

  return {
    snippets,
    durationSec,
    languageCode,
    source,
    suspectedTruncation,
  };
}
