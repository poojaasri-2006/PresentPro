// Node.js runtime — works reliably on Vercel, Netlify, Railway, Render etc.
export const runtime = "nodejs";

/**
 * POST /api/upload-init
 * Body: { fileName: string; mimeType: string; fileSize: number }
 *
 * Initiates a Gemini resumable upload session from the server side
 * (so the API key stays secret) and returns the upload URL.
 * The browser then streams the video bytes directly to that URL,
 * bypassing Vercel's 4.5 MB body-size limit entirely.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let fileName: string;
  let mimeType: string;
  let fileSize: number;

  try {
    const body = await req.json() as { fileName?: string; mimeType?: string; fileSize?: number };
    fileName = body.fileName ?? "presentation.mp4";
    mimeType = body.mimeType ?? "video/mp4";
    fileSize = body.fileSize ?? 0;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Ask Gemini File API to create a resumable upload session
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(fileSize),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: fileName } }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    return Response.json(
      { error: `Gemini init failed: ${initRes.status} – ${errText}` },
      { status: 502 }
    );
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    return Response.json({ error: "No upload URL returned by Gemini" }, { status: 502 });
  }

  return Response.json({ uploadUrl });
}
