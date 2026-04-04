import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "No url" }, { status: 400 });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch image." }, { status: 502 });
    }
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Disposition": 'attachment; filename="lacore-image.jpg"'
      }
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch image." }, { status: 502 });
  }
}
