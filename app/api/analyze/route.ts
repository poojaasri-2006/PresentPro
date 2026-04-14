// Node.js runtime — works reliably on Vercel, Netlify, Railway, Render etc.
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/analyze
 *
 * Accepts a small JSON body:
 *   { fileUri: string; mimeType: string }           ← large-file path (URI from Gemini)
 *   { inlineBase64: string; mimeType: string }      ← fast-path for tiny files (<1 MB)
 *
 * The video itself is NEVER sent through Vercel — it goes directly from the
 * browser to the Gemini File API.  Only the tiny URI string comes here.
 */

/** ─── Types ──────────────────────────────────────────────────── */
interface GeminiFileStatusResponse {
  state?: string;
  file?: { state?: string };
}

/** ─── Poll until ACTIVE ──────────────────────────────────────── */
async function waitForFileActive(
  fileName: string,
  apiKey: string,
  maxWaitMs = 120_000
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`
    );
    const data = (await res.json()) as GeminiFileStatusResponse;
    const state: string = data?.state ?? data?.file?.state ?? "PROCESSING";
    if (state === "ACTIVE") return;
    if (state === "FAILED") throw new Error("Gemini file processing failed");
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Timed out waiting for Gemini file to become ACTIVE");
}

/** ─── Delete file (cleanup) ──────────────────────────────────── */
async function deleteGeminiFile(fileName: string, apiKey: string) {
  try {
    await fetch(
      `https://generativelanguage.googleapis.com/v1beta/${fileName}?key=${apiKey}`,
      { method: "DELETE" }
    );
  } catch {
    // Non-critical — files expire in 48 h anyway
  }
}

const MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
];

function isQuotaError(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("resource_exhausted") ||
    m.includes("quota") ||
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("429") ||
    m.includes("high demand") ||
    m.includes("overloaded") ||
    m.includes("503") ||
    m.includes("unavailable") ||
    m.includes("try again later")
  );
}

function parseWithRepair(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    let s = raw;
    let inString = false;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '"' && (i === 0 || s[i - 1] !== "\\")) inString = !inString;
    }
    if (inString) s += '"';
    const stack: string[] = [];
    inString = false;
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (ch === '"' && (j === 0 || s[j - 1] !== "\\")) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === "{") stack.push("}");
      else if (ch === "[") stack.push("]");
      else if (ch === "}" || ch === "]") stack.pop();
    }
    while (stack.length) s += stack.pop();
    try {
      const result = JSON.parse(s);
      console.warn("⚠️ JSON was truncated and repaired");
      return result;
    } catch (e) {
      throw new Error(`JSON parse failed even after repair: ${e}`);
    }
  }
}

async function tryModel(model: string, body: string, apiKey: string): Promise<unknown> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body }
  );
  const data = await res.json() as {
    error?: { message?: string };
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  if (!res.ok || data.error) {
    const errMsg = data?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(errMsg);
  }
  const raw =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? "")
      .join("") ?? "";
  const cleaned = raw.replace(/^```json\s*/i, "").replace(/\s*```$/i, "").trim();
  return parseWithRepair(cleaned);
}

async function callGemini(
  prompt: string,
  apiKey: string,
  videoData: { mimeType: string; uri?: string; inlineBase64?: string }
): Promise<unknown> {
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
    generationConfig: { temperature: 0.2, maxOutputTokens: 8192 },
  });

  const delays = [0, 5000, 12000];
  let lastError: Error = new Error("No models attempted");

  for (let i = 0; i < MODELS.length; i++) {
    if (delays[i] > 0) await new Promise((r) => setTimeout(r, delays[i]));
    try {
      return await tryModel(MODELS[i], body, apiKey);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (isQuotaError(lastError.message)) continue;
      if (lastError.message.includes("JSON") || lastError.message.includes("parse")) continue;
      throw lastError;
    }
  }

  await new Promise((r) => setTimeout(r, 20000));
  try {
    return await tryModel(MODELS[0], body, apiKey);
  } catch {
    throw new Error("API quota limit reached. Please wait 1–2 minutes and try again.");
  }
}

async function analyzeVideo(
  apiKey: string,
  videoData: { mimeType: string; uri?: string; inlineBase64?: string }
): Promise<unknown> {
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

  return callGemini(prompt, apiKey, videoData);
}

/** ─── POST handler ───────────────────────────────────────────── */
export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });
  }

  let fileName: string | null = null;

  try {
    const body = await req.json() as {
      fileUri?: string;
      fileName?: string;
      mimeType?: string;
      inlineBase64?: string;
    };

    const mimeType = body.mimeType ?? "video/mp4";

    let result: unknown;

    if (body.inlineBase64) {
      // ── Fast-path: tiny video sent inline ──
      result = await analyzeVideo(apiKey, { mimeType, inlineBase64: body.inlineBase64 });

    } else if (body.fileUri && body.fileName) {
      // ── Standard-path: video already uploaded to Gemini File API ──
      fileName = body.fileName; // e.g. "files/abc123"

      // Wait for Gemini to finish processing the upload
      await waitForFileActive(fileName, apiKey);

      // Run the analysis
      result = await analyzeVideo(apiKey, { mimeType, uri: body.fileUri });

      // Clean up
      await deleteGeminiFile(fileName, apiKey);
      fileName = null;

    } else {
      return Response.json(
        { error: "Provide either fileUri+fileName or inlineBase64 in the request body." },
        { status: 400 }
      );
    }

    return Response.json(result);

  } catch (error) {
    if (fileName) await deleteGeminiFile(fileName, process.env.GEMINI_API_KEY ?? "");

    const message = error instanceof Error ? error.message : "Unknown error";
    const isQuota = message.includes("quota") || message.includes("RESOURCE_EXHAUSTED");
    return Response.json(
      {
        error: message,
        summary: isQuota
          ? "⚠️ API quota limit reached. Please wait a few minutes and try again."
          : "Analysis failed. Please try again with a smaller or clearer video.",
        fillerWords: [],
        repeatedWords: [],
        grammarMistakes: [],
        sentenceImprovements: [],
        facialExpressions: [],
        bodyLanguage: [],
        suggestions: isQuota
          ? ["Wait 1–2 minutes and retry", "Try a shorter clip"]
          : ["Try a shorter clip (under 5 minutes)", "Ensure good audio quality"],
        overallScore: 0,
        transcript: "",
      },
      { status: isQuota ? 429 : 500 }
    );
  }
}