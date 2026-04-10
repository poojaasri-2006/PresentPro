export const maxDuration = 30;

const CHAT_MODELS = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-lite",
  "gemini-2.5-flash-lite",
];

function isQuotaError(msg: string) {
  const lower = msg.toLowerCase();
  return (
    lower.includes("resource_exhausted") ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("429") ||
    lower.includes("high demand") ||
    lower.includes("overloaded") ||
    lower.includes("503") ||
    lower.includes("unavailable") ||
    lower.includes("try again later")
  );
}

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

  const { feedback, messages } = (await req.json()) as {
    feedback: string;
    messages: { role: "user" | "model"; content: string }[];
  };

  if (!messages?.length) return Response.json({ error: "No messages" }, { status: 400 });

  // System prompt — coach persona with full analysis context
  const systemPrompt = `You are an expert AI presentation coach inside the PresentPro app.
The user just received this AI analysis of their presentation:

${feedback}

Important rules:
- Always answer the user's question directly and specifically
- Reference actual data from their analysis (specific words, scores, mistakes found)
- If they ask about improving their script, rewrite sections using their transcript as a base
- Keep answers concise but complete (3-8 sentences, or longer if they ask for a full script)
- Be warm, encouraging, and constructive
- Always give at least ONE concrete, actionable tip`;

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    {
      role: "model",
      parts: [{ text: "I've reviewed your full presentation analysis and I'm ready to help! Ask me anything — I can help you improve your script, reduce filler words, work on body language, or anything else from your feedback." }],
    },
    ...messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  ];

  let lastError = "Gemini API error";

  for (const model of CHAT_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents,
            generationConfig: {
              temperature: 0.75,
              maxOutputTokens: 1024,
            },
          }),
        }
      );

      const data = await res.json();

      if (!res.ok || data.error) {
        const errMsg = data?.error?.message ?? "";
        if (isQuotaError(errMsg)) {
          console.warn(`[chat/${model}] Quota hit, trying next model…`);
          lastError = errMsg;
          continue;
        }
        lastError = errMsg || "Unknown error";
        continue;
      }

      const reply: string =
        data?.candidates?.[0]?.content?.parts
          ?.map((p: { text: string }) => p.text)
          .join("") ?? "";

      if (!reply.trim()) {
        lastError = "Empty response from model";
        continue;
      }

      console.log(`[chat/${model}] ✓ Reply: ${reply.length} chars`);
      return Response.json({ reply });
    } catch (e) {
      lastError = e instanceof Error ? e.message : "Network error";
      console.warn(`[chat/${model}] Exception: ${lastError}`);
      continue;
    }
  }

  // All models failed
  return Response.json(
    { error: `All models failed. Last error: ${lastError}` },
    { status: 503 }
  );
}
