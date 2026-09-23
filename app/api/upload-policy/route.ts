import {
  NextRequest,
  NextResponse,
} from "next/server";

import { randomUUID } from "crypto";

import { extractDocument } from "../../../lib/ai/document-intelligence";

import {
  ensureSearchIndex,
  uploadEvidence,
  type EvidenceDocument,
} from "../../../lib/search/azure-search";

const MAX_FILE_SIZE =
  10 * 1024 * 1024;

export async function POST(
  request: NextRequest
) {
  try {
    const formData =
      await request.formData();

    const file =
      formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error:
            "A PDF file is required.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !== "application/pdf"
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF files are supported.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.size > MAX_FILE_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            "PDF must be 10 MB or smaller.",
        },
        {
          status: 400,
        }
      );
    }

    const arrayBuffer =
      await file.arrayBuffer();

    const buffer =
      Buffer.from(arrayBuffer);

    // 1. Extract document with Azure Document Intelligence
    const extracted =
      await extractDocument(buffer);

    if (
      extracted.pages.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No readable pages were extracted from the PDF.",
        },
        {
          status: 400,
        }
      );
    }

    // 2. Create a unique CivicTrace case
    const caseId =
      randomUUID();

    // 3. Convert extracted pages into searchable evidence
    const evidenceDocuments: EvidenceDocument[] =
      extracted.pages
        .filter(
          (page) =>
            page.text.trim().length >
            0
        )
        .map((page) => ({
          id: `${caseId}-page-${page.pageNumber}`,
          caseId,
          sourceType: "policy",
          sourceTitle: file.name,
          pageNumber:
            page.pageNumber,
          content: page.text,
        }));

    // 4. Ensure index exists
    await ensureSearchIndex();

    // 5. Upload evidence into Azure AI Search
    await uploadEvidence(
      evidenceDocuments
    );

    return NextResponse.json({
      caseId,

      fileName: file.name,
      fileSize: file.size,

      content:
        extracted.content,

      pages:
        extracted.pages,

      pageCount:
        extracted.pages.length,

      indexedEvidenceCount:
        evidenceDocuments.length,
    });
  } catch (error) {
    console.error(
      "Policy upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to process and index the PDF.",
      },
      {
        status: 500,
      }
    );
  }
}