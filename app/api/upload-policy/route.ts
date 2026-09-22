import { NextResponse } from "next/server";

import { extractDocument } from
  "../../../lib/ai/document-intelligence";

export const runtime = "nodejs";

export async function POST(
  request: Request
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
            "A PDF file is required",
        },
        {
          status: 400,
        }
      );
    }

    if (
      file.type !==
      "application/pdf"
    ) {
      return NextResponse.json(
        {
          error:
            "Only PDF files are supported",
        },
        {
          status: 400,
        }
      );
    }

    // 10 MB maximum for hackathon MVP.
    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      return NextResponse.json(
        {
          error:
            "PDF is too large. Maximum size is 10 MB.",
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

    const extracted =
      await extractDocument(buffer);

    return NextResponse.json({
      fileName: file.name,

      fileSize: file.size,

      content:
        extracted.content,

      pages:
        extracted.pages,

      pageCount:
        extracted.pages.length,
    });
  } catch (error) {
    console.error(
      "Policy upload error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unable to extract the policy document",
      },
      {
        status: 500,
      }
    );
  }
}