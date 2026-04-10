export const maxDuration = 30;

export async function POST(req: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

  const { feedback, messages } = await req.json() as {
    feedback: string;
    messages: { role: "user" | "model"; content: string }[];
  };

  if (!messages?.length) return Response.json({ error: "No messages" }, { status: 400 });

  // Build conversation history for Gemini
  const systemPrompt = `You are an expert AI presentation coach inside the PresentPro app.
The user just received this analysis of their presentation:

${feedback}

Your job: answer their questions in a warm, specific, and actionable way.
- Reference actual data from the analysis (specific filler words, scores, grammar mistakes, etc.)
- Keep responses concise (2-5 sentences max unless they ask for detail)
- Be encouraging but honest
- Give concrete, practical improvement tips`;

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    { role: "model", parts: [{ text: "Understood! I've reviewed the full analysis and I'm ready to help. What would you like to know?" }] },
    ...messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    }
  );

  const data = await res.json();
  if (!res.ok || data.error) {
    return Response.json({ error: data?.error?.message ?? "Gemini error" }, { status: 500 });
  }

  const reply: string =
    data?.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ?? "";

  return Response.json({ reply });
}
