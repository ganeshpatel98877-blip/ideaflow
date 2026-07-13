import { NextRequest, NextResponse } from "next/server";

// This route runs on the server so your GEMINI_API_KEY is never exposed
// to the browser. Set it in .env.local (see .env.example).
export async function POST(req: NextRequest) {
  try {
    const { idea } = await req.json();

    if (!idea?.title) {
      return NextResponse.json({ error: "Missing idea data" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not set on the server" },
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

    const model = "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            maxOutputTokens: 1000,
          },
        }),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { error: "Gemini API error", detail: errText },
        { status: response.status }
      );
    }

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    return NextResponse.json(parsed);
  } catch (err: any) {
    return NextResponse.json(
      { error: "AI Co-Founder failed", detail: err?.message },
      { status: 500 }
    );
  }
}
