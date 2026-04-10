export const maxDuration = 120; // Allow up to 2 min for large video processing

/** ─── Types ──────────────────────────────────────────────────── */
interface GeminiFileUploadResponse {
  file: {
    name: string;
    uri: string;
    mimeType: string;
    state: string;
  };
}

/** ─── Step 1: Upload video bytes to Gemini File API ─────────── */
async function uploadToGeminiFileApi(
  videoBuffer: ArrayBuffer,
  mimeType: string,
  fileName: string,
  apiKey: string
): Promise<{ uri: string; name: string }> {
  const numBytes = videoBuffer.byteLength;

  // --- Initiate resumable upload ---
  const initRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "X-Goog-Upload-Header-Content-Length": String(numBytes),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file: { display_name: fileName } }),
    }
  );

  if (!initRes.ok) {
    const err = await initRes.text();
    throw new Error(`File API init failed: ${initRes.status} – ${err}`);
  }

  const uploadUrl = initRes.headers.get("x-goog-upload-url");
  if (!uploadUrl) throw new Error("No upload URL returned from Gemini File API");

  // --- Upload the actual bytes ---
  const uploadRes = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(numBytes),
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: videoBuffer,
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`File upload failed: ${uploadRes.status} – ${err}`);
  }

  const data: GeminiFileUploadResponse = await uploadRes.json();
  return { uri: data.file.uri, name: data.file.name };
}

/** ─── Step 2: Poll until the file state is ACTIVE ───────────── */
async function waitForFileActive(
  fileName: string,
  apiKey: string,
  maxWaitMs = 60_000
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );
    const data = await res.json();
    const state: string = data?.state ?? data?.file?.state ?? "PROCESSING";

    if (state === "ACTIVE") return;
    if (state === "FAILED") throw new Error("Gemini file processing failed");

    await new Promise((r) => setTimeout(r, 1500)); // poll every 1.5s (down from 3s)
  }

  throw new Error("Timed out waiting for Gemini file to become ACTIVE");
}

/** ─── Step 3: Delete the file from Gemini (cleanup) ─────────── */
async function deleteGeminiFile(fileName: string, apiKey: string) {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: "DELETE" }
    );
  } catch {
    // Non-critical – files expire in 48h anyway
  }
}

// Models tried sequentially — one at a time to avoid quota bursts
// Confirmed valid via ListModels API — all support generateContent
const MODELS = [
  "gemini-2.0-flash",       // fast & reliable, good free quota
  "gemini-2.0-flash-lite",  // lightest, highest RPM on free tier
  "gemini-2.5-flash-lite",  // newest lite model, solid fallback
];

/** Detect quota / rate-limit / overload errors from Gemini response */
function isQuotaError(msg: string): boolean {
  const lower = msg.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("too many requests") ||
    lower.includes("429") ||
    lower.includes("high demand")  ||   // "experiencing high demand"
    lower.includes("overloaded")   ||   // server overload
    lower.includes("503")          ||   // service unavailable
    lower.includes("unavailable")  ||   // generic unavailable
    lower.includes("try again later")   // catch-all retry hint
  );
}

/** ─── Single model attempt ─────────────────────────────────── */
async function tryModel(
  model: string,
  body: string,
  apiKey: string
): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );
  const data = await res.json();
  if (!res.ok || data.error) {
    const errMsg = data?.error?.message ?? `HTTP ${res.status}`;
    console.error(`[${model}] HTTP ${res.status}:`, JSON.stringify(data?.error ?? data));
    throw new Error(errMsg);
  }
  const raw: string =
    data?.candidates?.[0]?.content?.parts
      ?.map((p: { text: string }) => p.text)
      .join("") ?? "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  console.log(`[${model}] ✓ Raw length: ${cleaned.length} chars`);
  return parseWithRepair(cleaned);
}

/**
 * Best-effort JSON repair: closes unterminated strings, arrays, and objects
 * that result from the model hitting its output token limit mid-response.
 */
function parseWithRepair(raw: string): unknown {
  // First try clean parse
  try {
    return JSON.parse(raw);
  } catch {
    // Attempt to repair truncated JSON
    let s = raw;

    // If the string was cut in the middle of a string value, close it
    // Count unescaped quotes to detect open string
    let inString = false;
    let i = 0;
    for (; i < s.length; i++) {
      if (s[i] === '"' && (i === 0 || s[i - 1] !== '\\')) inString = !inString;
    }
    if (inString) s += '"'; // close the open string

    // Close any open arrays and objects by counting brackets
    const stack: string[] = [];
    inString = false;
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (ch === '"' && (j === 0 || s[j - 1] !== '\\')) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') stack.push('}');
      else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') stack.pop();
    }
    // Close in reverse order
    while (stack.length) s += stack.pop();

    try {
      const result = JSON.parse(s);
      console.warn('⚠️ JSON was truncated and repaired — some fields may be incomplete');
      return result;
    } catch (repairErr) {
      throw new Error(`JSON parse failed even after repair: ${repairErr}`);
    }
  }
}

/** ─── Step 4: Sequential model waterfall with backoff ───────── */
async function callGemini(
  prompt: string,
  apiKey: string,
  videoData: { mimeType: string; uri?: string; inlineBase64?: string }
) {
  const parts: { text?: string; file_data?: object; inline_data?: object }[] = [
    { text: prompt },
  ];

  if (videoData.uri) {
    parts.unshift({ file_data: { mime_type: videoData.mimeType, file_uri: videoData.uri } });
  } else if (videoData.inlineBase64) {
    parts.unshift({ inline_data: { mime_type: videoData.mimeType, data: videoData.inlineBase64 } });
  }

  const body = JSON.stringify({
    contents: [{ parts }],
    // 8192 tokens prevents response truncation (the cause of "Unterminated string" errors)
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  });

  // Try models sequentially — if one is quota-limited, wait briefly then try the next
  const delays = [0, 5000, 12000]; // wait before each model attempt (ms)
  let lastError: Error = new Error("No models attempted");

  for (let i = 0; i < MODELS.length; i++) {
    const model = MODELS[i];
    if (delays[i] > 0) {
      console.log(`Waiting ${delays[i] / 1000}s before trying ${model}...`);
      await new Promise((r) => setTimeout(r, delays[i]));
    }
    try {
      console.log(`Trying model: ${model}`);
      return await tryModel(model, body, apiKey);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      const errMsg = lastError.message;
      if (isQuotaError(errMsg)) {
        console.warn(`[${model}] Quota limit hit, falling back to next model...`);
        // continue to next model
      } else if (errMsg.includes("JSON") || errMsg.includes("parse") || errMsg.includes("Unexpected")) {
        // Truncated/malformed JSON from this model — try next model which may give a complete response
        console.warn(`[${model}] JSON parse error, trying next model: ${errMsg}`);
        // continue to next model
      } else {
        // Unexpected error — throw immediately
        throw lastError;
      }
    }
  }

  // All models exhausted — final retry after a longer cooldown
  console.warn("All models quota-limited, waiting 20s for a final retry...");
  await new Promise((r) => setTimeout(r, 20000));
  try {
    return await tryModel(MODELS[0], body, apiKey);
  } catch {
    throw new Error(
      "API quota limit reached. Please wait 1–2 minutes and try again, or use a shorter video."
    );
  }
}

/** ─── Step 5: Single combined analysis (saves quota vs. 2 parallel calls) ─ */
async function analyzeVideo(
  apiKey: string,
  videoData: { mimeType: string; uri?: string; inlineBase64?: string }
) {
  // ONE prompt = ONE race of 3 models instead of TWO races (6 requests).
  // This is the key change that stops quota exhaustion.
  const prompt = `You are an expert presentation coach. Analyze this video carefully.
Return ONLY valid JSON (no markdown) matching this exact schema:
{
  "overallScore": <number 0-100>,
  "summary": "<2-3 sentence assessment>",
  "transcript": "<concise summary of what was said with key quotes>",
  "fillerWords": [{ "word": "<word>", "count": <n>, "advice": "<tip>" }],
  "repeatedWords": [{ "word": "<word>", "count": <n>, "alternatives": ["<alt>"] }],
  "grammarMistakes": [{ "mistake": "<wrong>", "correction": "<right>", "explanation": "<why>" }],
  "sentenceImprovements": [{ "original": "<weak>", "improved": "<polished>", "reason": "<why>" }],
  "facialExpressions": [{ "type": "<type>", "timestamp": "<e.g. 0:10>", "analysis": "<what it shows>", "severity": "low|medium|high" }],
  "bodyLanguage": [{ "observation": "<observation>", "timestamp": "<e.g. 0:30>", "suggestion": "<how to improve>" }],
  "suggestions": ["<tip 1>", "<tip 2>", "<tip 3>", "<tip 4>", "<tip 5>"]
}
Rules: detect ALL filler words (um, uh, like, you know, so, basically, right, etc), flag grammar errors and repeated content words, score based on clarity, professionalism and body language.`;

  return await callGemini(prompt, apiKey, videoData);
}

/** ─── POST Handler ───────────────────────────────────────────── */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let fileName: string | null = null;

  try {
    // Accept multipart form data with the video file
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;

    if (!videoFile) {
      return Response.json(
        {
          error: "No video file provided",
          summary: "Please upload a video file to analyze.",
        },
        { status: 400 }
      );
    }

    const mimeType = videoFile.type || "video/mp4";
    const videoBuffer = await videoFile.arrayBuffer();
    const videoSize = videoBuffer.byteLength;

    let result;

    // FAST-PATH: If video is < 20MB send inline — no File API wait required
    if (videoSize < 20 * 1024 * 1024) {
      console.log(`Fast-path (inline): ${videoFile.name} (${(videoSize / 1024 / 1024).toFixed(1)}MB)`);
      const base64Data = Buffer.from(videoBuffer).toString("base64");
      result = await analyzeVideo(apiKey, { mimeType, inlineBase64: base64Data });
    } else {
      console.log(`Standard-path (File API): ${videoFile.name} (${(videoSize / 1024 / 1024).toFixed(1)}MB)`);
      // 1. Upload to Gemini File API
      const { uri, name } = await uploadToGeminiFileApi(
        videoBuffer,
        mimeType,
        videoFile.name,
        apiKey
      );
      fileName = name;

      // 2. Wait for processing (standard path)
      await waitForFileActive(fileName, apiKey);

      // 3. Analyze with single prompt
      result = await analyzeVideo(apiKey, { mimeType, uri });
    }

    // 4. Cleanup (if using File API)
    if (fileName) {
      await deleteGeminiFile(fileName, apiKey);
    }

    return Response.json(result);
  } catch (error) {
    console.error("PresentPro analyze error:", error);

    // Attempt cleanup even on error
    if (fileName) {
      await deleteGeminiFile(fileName, process.env.GEMINI_API_KEY ?? "");
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    const isQuotaError = message.includes("quota exceeded") || message.includes("RESOURCE_EXHAUSTED");
    return Response.json(
      {
        error: message,
        summary: isQuotaError
          ? "⚠️ API quota limit reached. Please wait a few minutes before trying again, or upgrade your Google AI plan."
          : "Analysis failed. Please try again with a smaller or clearer video.",
        fillerWords: [],
        repeatedWords: [],
        grammarMistakes: [],
        sentenceImprovements: [],
        facialExpressions: [],
        bodyLanguage: [],
        suggestions: isQuotaError
          ? [
              "Wait 1–2 minutes and retry — free tier limits reset per minute",
              "Check your quota at https://ai.dev/rate-limit",
              "Consider upgrading to a paid Google AI plan for higher limits",
            ]
          : ["Try a shorter clip (under 5 minutes)", "Ensure good audio quality"],
        overallScore: 0,
        transcript: "",
      },
      { status: isQuotaError ? 429 : 500 }
    );
  }
}