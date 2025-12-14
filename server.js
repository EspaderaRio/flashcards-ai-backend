const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const GROQ_API_KEY = process.env.GROQ_API_KEY;

app.post("/api/generate-cards", async (req, res) => {
  try {
    const { topic } = req.body;

    if (!topic) {
      return res.status(400).json({ error: "Missing topic" });
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
              content: "You generate study flashcards."
            },
            {
              role: "user",
              content: `
Create flashcards for the topic: "${topic}"

Output ONLY JSON:
{
  "cards": [
    { "question": "...", "answer": "..." }
  ]
}

Make exactly 15 cards.
              `
            }
          ]
        })
      }
    );

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;

    if (!text) throw new Error("No AI response");

    const json = JSON.parse(text);
    res.json(json);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "AI generation failed" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("API running on port", PORT);
});
