import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Allow frontend to call this API
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"],
}));

app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("❌ GROQ_API_KEY is missing");
  process.exit(1);
}

/**
 * POST /api/generate-cards
 * Body: { topic: string }
 */
app.post("/api/generate-cards", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Topic is required" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content:
                "You generate study flashcards. Output ONLY valid JSON. No explanations."
            },
            {
              role: "user",
              content: `
Create 10 flashcards for the topic: "${topic}"

Output ONLY JSON in this exact format:
{
  "cards": [
    { "question": "...", "answer": "..." }
  ]
}
              `
            }
          ]
        })
      }
    );

    const data = await response.json();

    if (!data.choices?.[0]?.message?.content) {
      throw new Error("Invalid Groq response");
    }

    // Clean & parse AI output
    const raw = data.choices[0].message.content.trim();

    let json;
    try {
      json = JSON.parse(raw);
    } catch {
      console.error("❌ Invalid JSON from AI:", raw);
      return res.status(500).json({ error: "AI returned invalid JSON" });
    }

    if (!Array.isArray(json.cards)) {
      return res.status(500).json({ error: "Invalid card format" });
    }

    res.json(json);
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: "Failed to generate cards" });
  }
});

// Health check (IMPORTANT for Render)
app.get("/", (req, res) => {
  res.send("Flashcards AI backend is running");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
