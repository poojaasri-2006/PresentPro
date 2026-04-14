// Node.js runtime — handles large file uploads server-side, no CORS issues
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/upload-proxy
 *
 * Receives a video file from the browser as FormData,
 * uploads it server-side to the Gemini File API (no CORS issues),
 * and returns { fileUri, fileName, mimeType }.
 *
 * Railway has no body size limit, so large videos work fine.
 */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return Response.json({ error: `Failed to read upload: ${e}` }, { status: 400 });
  }

  const videoFile = formData.get("video") as File | null;
  if (!videoFile) {
    return Response.json({ error: "No video file in request" }, { status: 400 });
  }

  const mimeType = videoFile.type || "video/mp4";
  const fileSize = videoFile.size;

  // ── Step 1: Initiate resumable upload session ──────────────────
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
      body: JSON.stringify({ file: { display_name: videoFile.name } }),
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    return Response.json(
      { error: `Gemini upload init failed (${initRes.status}): ${errText}` },
      { status: 502 }
    );
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) {
    return Response.json({ error: "No upload URL from Gemini" }, { status: 502 });
  }

  // ── Step 2: Upload video bytes server-to-server (no CORS) ──────
  const videoBuffer = await videoFile.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(fileSize),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    return Response.json(
      { error: `Gemini video upload failed (${uploadRes.status}): ${errText.slice(0, 200)}` },
      { status: 502 }
    );
  }

  const uploadData = await uploadRes.json() as {
    file?: { name?: string; uri?: string };
  };

  const fileName = uploadData?.file?.name ?? "";
  const fileUri = uploadData?.file?.uri ?? "";

  if (!fileName || !fileUri) {
    return Response.json({ error: "Gemini did not return file info after upload" }, { status: 502 });
  }

  return Response.json({ fileUri, fileName, mimeType });
}
