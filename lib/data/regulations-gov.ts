import { extractDocument } from "../ai/document-intelligence";

const REGULATIONS_API_BASE =
  "https://api.regulations.gov/v4";

export type RegulationsComment = {
  id: string;
  title: string;
  text: string;

  postedDate?: string;

  docketId?: string;
  documentId?: string;

  attachmentUrl?: string;
  attachmentFormat?: string;
};


// --------------------------------------------------
// API key helper
// --------------------------------------------------

function getApiKey() {
  const apiKey =
    process.env.REGULATIONS_API_KEY;

  if (!apiKey) {
    throw new Error(
      "REGULATIONS_API_KEY is missing"
    );
  }

  return apiKey;
}


// --------------------------------------------------
// Generic Regulations.gov fetch helper
// --------------------------------------------------

async function regulationsFetch(
  url: string
) {
  const response = await fetch(url, {
    headers: {
      "X-Api-Key": getApiKey(),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details =
      await response.text();

    throw new Error(
      `Regulations.gov request failed (${response.status}): ${details}`
    );
  }

  return response.json();
}


// --------------------------------------------------
// 1. Fetch official comments for a specific rule
// --------------------------------------------------

export async function fetchCommentsForRule(
  objectId: string,
  limit = 5
): Promise<RegulationsComment[]> {
  /*
   * Regulations.gov requires page[size] >= 5.
   */
  const pageSize = Math.max(
    5,
    Math.min(limit, 100)
  );

  const params =
    new URLSearchParams({
      "filter[commentOnId]":
        objectId,

      "page[size]":
        String(pageSize),
    });

  const searchData =
    await regulationsFetch(
      `${REGULATIONS_API_BASE}/comments?${params.toString()}`
    );

  const selected =
    searchData.data.slice(
      0,
      limit
    );

  /*
   * Fetch detailed metadata for each comment,
   * including attachments.
   */
  const comments =
    await Promise.all(
      selected.map(
        async (
          item: {
            id: string;
          }
        ) => {
          const detail =
            await regulationsFetch(
              `${REGULATIONS_API_BASE}/comments/${item.id}?include=attachments`
            );

          const attributes =
            detail.data.attributes;

          const attachment =
            detail.included?.find(
              (
                includedItem: {
                  type: string;
                }
              ) =>
                includedItem.type ===
                "attachments"
            );

          /*
           * For MVP, use the first attachment/file format.
           */
          const file =
            attachment
              ?.attributes
              ?.fileFormats?.[0];

          return {
            id:
              detail.data.id,

            title:
              attributes.title ??
              detail.data.id,

            text:
              attributes.comment ??
              "",

            postedDate:
              attributes.postedDate,

            docketId:
              attributes.docketId,

            documentId:
              attributes
                .commentOnDocumentId,

            attachmentUrl:
              file?.fileUrl,

            attachmentFormat:
              file?.format,
          };
        }
      )
    );

  return comments;
}


// --------------------------------------------------
// 2. Detect placeholder / cover-text comments
// --------------------------------------------------

function looksLikeAttachmentPlaceholder(
  text: string
) {
  const normalized =
    text
      .trim()
      .toLowerCase();

  if (!normalized) {
    return true;
  }

  return (
    normalized.startsWith(
      "see attached"
    ) ||
    normalized.startsWith(
      "attached"
    ) ||
    normalized.startsWith(
      "please find"
    ) ||
    normalized.startsWith(
      "public comment from"
    )
  );
}


// --------------------------------------------------
// 3. Get actual analyzable comment text
// --------------------------------------------------

export async function getCommentText(
  comment: RegulationsComment
): Promise<string | null> {
  /*
   * Prefer an attached PDF whenever one exists.
   *
   * Regulations.gov often provides only a short
   * cover message in the inline "comment" field,
   * while the substantive comment is in the PDF.
   */
  if (
    comment.attachmentUrl &&
    comment.attachmentFormat
      ?.toLowerCase() === "pdf"
  ) {
    const fileResponse =
      await fetch(
        comment.attachmentUrl,
        {
          cache: "no-store",

          headers: {
            /*
             * Some CDN responses behave differently
             * for generic automated requests.
             */
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36",

            Accept:
              "application/pdf,*/*",
          },
        }
      );

    if (!fileResponse.ok) {
      throw new Error(
        `Attachment download failed (${fileResponse.status}): ${comment.id}`
      );
    }

    const arrayBuffer =
      await fileResponse.arrayBuffer();

    const buffer =
      Buffer.from(
        arrayBuffer
      );

    /*
     * Make sure the downloaded content is actually
     * a PDF instead of an HTML error page.
     */
    const signature =
      buffer
        .subarray(0, 4)
        .toString();

    if (signature !== "%PDF") {
      throw new Error(
        `Downloaded attachment is not a valid PDF: ${comment.id}`
      );
    }

    /*
     * Reuse the team's existing
     * Azure Document Intelligence pipeline.
     */
    const extracted =
      await extractDocument(
        buffer
      );

    const extractedText =
      extracted.content
        ?.trim();

    if (extractedText) {
      return extractedText;
    }
  }

  /*
   * If there is no usable PDF text,
   * fall back to inline text.
   */
  const inlineText =
    comment.text
      ?.trim();

  if (
    inlineText &&
    !looksLikeAttachmentPlaceholder(
      inlineText
    )
  ) {
    return inlineText;
  }

  return null;
}


// --------------------------------------------------
// 4. Fetch comments and prepare them for analysis
// --------------------------------------------------

export async function fetchAnalyzableComments(
  objectId: string,
  limit = 5
) {
  const comments =
    await fetchCommentsForRule(
      objectId,
      limit
    );

  const results = [];

  for (
    const comment of comments
  ) {
    try {
      const analysisText =
        await getCommentText(
          comment
        );

      results.push({
        ...comment,

        analysisText,

        readyForAnalysis:
          Boolean(
            analysisText
          ),
      });
    } catch (error) {
      console.error(
        `Comment extraction failed: ${comment.id}`,
        error
      );

      results.push({
        ...comment,

        analysisText: null,

        readyForAnalysis:
          false,

        /*
         * Useful while developing/debugging.
         * You may remove this from production output later.
         */
        extractionError:
          error instanceof Error
            ? error.message
            : "Unknown extraction error",
      });
    }
  }

  return results;
}