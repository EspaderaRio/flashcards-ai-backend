import express from "express";
import cors from "cors";

const app = express();

/* ---------------- Middleware ---------------- */
app.use(cors());
app.use(express.json());

/* ---------------- Env Check ---------------- */
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is missing");
  process.exit(1);
}

/* ---------------- Health Check ---------------- */
app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "Flashcards AI Backend",
    message: "Server is running successfully 🚀",
    endpoints: {
      generate_cards: "POST /api/generate-cards"
    }
  });
});

/* ---------------- AI Flashcards Endpoint ---------------- */
app.post("/api/generate-cards", async (req, res) => {
  try {
    const { topic, count } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Missing topic" });
    }

    // Clamp card count
    const cardCount = Math.min(Math.max(Number(count) || 10, 1), 50);

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You are a flashcard generation engine. Output ONLY valid JSON. No markdown. No explanations."
            },
            {
              role: "user",
              content: `
Create study flashcards for the topic:

"${topic}"

Number of flashcards to generate: ${cardCount}

Rules:
- Output ONLY valid JSON
- Follow this EXACT structure:

{
  "cards": [
    { "question": "...", "answer": "..." }
  ]
}

Constraints:
- Generate EXACTLY ${cardCount} cards
- Questions must be clear and concise
- Answers must be accurate and short
- No numbering
- No emojis
- No markdown
- No explanations
- No extra keys

Begin.
`.trim()
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error?.message || "Groq API error");
    }

    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("No AI output");

    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/^```\w*\s*/, '').replace(/\s*```$/, '');
    }

    const json = JSON.parse(cleanedText);
    if (!Array.isArray(json.cards)) {
      throw new Error("Invalid JSON structure");
    }

    res.json(json);
  } catch (err) {
    console.error("❌ AI error:", err.message);
    res.status(500).json({ error: "AI generation failed" });
  }
});

/* ---------------- Start Server ---------------- */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API running on port ${PORT}`);
});
