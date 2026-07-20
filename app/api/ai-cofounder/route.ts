import { NextRequest, NextResponse } from "next/server";

// This route runs on the server so your GROQ_API_KEY is never exposed to
// the browser. Set it in .env.local (see .env.example).
//
// Uses Groq (https://console.groq.com) — genuinely free tier, no credit
// card required, runs open-source models (Llama 3.3 70B here) on their
// custom LPU hardware. The API is OpenAI-compatible.
export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();

    if (!idea?.title) {
      return NextResponse.json({ error: "Missing idea data" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GROQ_API_KEY is not set on the server" },
        { status: 500 }
      );
    }

    const prompt = `You are an experienced startup advisor acting as an "AI Co-Founder" inside a startup execution platform.
Analyze this startup idea and respond ONLY with valid JSON (no markdown fences, no preamble) matching this exact shape:
{
  "marketAnalysis": "2-3 sentences",
  "competitors": ["name / short note", "..."],
  "revenueIdeas": ["idea", "..."],
  "techStack": ["item", "..."],
  "risks": ["risk", "..."],
  "roadmap": ["step 1", "step 2", "step 3", "step 4"]
}

Idea title: ${idea.title}
Problem: ${idea.problem}
Description: ${idea.description}
Category: ${idea.category}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "Groq API error", detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const finishReason = data?.choices?.[0]?.finish_reason;
    const raw = data?.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      if (finishReason === "length") {
        return NextResponse.json(
          { error: "The AI's response was cut off before finishing. Please try again." },
          { status: 502 }
        );
      }
      throw new Error(`Groq returned non-JSON output: ${clean.slice(0, 200)}`);
    }

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI Co-Founder failed", detail: err?.message },
      { status: 500 }
    );
  }
}
