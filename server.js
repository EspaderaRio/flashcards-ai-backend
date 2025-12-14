async function generateCardsWithAI() {
  if (!currentSet?.set_id) return;

  const topic = prompt(
    "Enter topic for this set:",
    currentSet.set_name
  );
  if (!topic) return;

  showToast("Generating cards...");

  const res = await fetch("/api/generate-cards", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic })
  });

  const json = await res.json();

  if (!Array.isArray(json.cards)) {
    showToast("Invalid AI response");
    return;
  }

  for (const card of json.cards) {
    await window.dataSdk.create({
      type: "card",
      set_id: currentSet.set_id,
      question: card.question,
      answer: card.answer,
      created_at: new Date().toISOString()
    });
  }

  showToast(`Added ${json.cards.length} cards`);
}
