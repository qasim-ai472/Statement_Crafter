# ✍️ StatementCraft: Narrating Your Future

**StatementCraft** is an AI-powered personal statement architect designed to bridge the gap between a student's raw experiences and a world-class university application. 

Most applicants don't fail because they aren't "good enough"—they fail because nobody taught them how to tell their story. This project ensured that your journey is written in a proper engaging manner.

---

## 📖 The Story Behind the Project

I spent months applying to national and international universities and scholarships. While grades and test scores are objective hurdles, the **Personal Statement** is a psychological one. It asks you to compress your entire existence into a few hundred words that must sound unique, authentic, and compelling.

I watched brilliant, capable people get rejected because their essays read like generic templates. I am not a professional writer, but I spent enough time in the "trenches" of the application process to understand the mechanics of a winning narrative:
* The **Circular Narrative**: Where the closing echo makes the story feel complete.
* The **Research Connection**: Bridging the gap between your passion and a professor's work.
* The **Opening Spark**: Turning a raw two-sentence journey into a hook that captures an admissions officer in seconds.

I built this because your actual story matters more than your ability to mimic an essay guide.

---

## ✨ Features

* **Guided Narrative Extraction:** A 25-question, 7-step journey that digs deep into your specific experiences and sacrifices.
* **Dual-Statement Generation:** Produces two complete, distinct personal statements based on your unique input.
* **Zero-Config AI:** No API keys, no signups, and no complex backend setup required for the end user.
* **Narrative Logic:** Built-in prompts ensure the AI uses advanced storytelling techniques like circular endings and specific academic linkages.

---

## 🛠️ The Technical Journey (and the Midnight Debugging)

This project was a battle of persistence. Living in a region where many major AI API tiers are restricted or unstable, I faced constant roadblocks:
* **The Struggle:** Gemini (zero quota in Pakistan), Groq (permission errors), and OpenRouter (multi-day outages).
* **The Breakthrough:** I discovered **Puter.js**. It allowed me to route AI calls through its infrastructure using a single script tag and no API keys.
* **Robust Logic:** Implemented sequential generation with custom retry logic that interprets provider errors to manage rate limits effectively.

---

## 🚀 How It Works

1.  **Input:** Answer 25 targeted questions honestly.
2.  **Process:** The system extracts the "pearls" from your answers.
3.  **Generate:** The AI constructs two full drafts that sound like *you*, not a bot.
4.  **Refine:** Use these as your foundation to secure your spot at your dream university.

---

**If you are applying for a scholarship, Masters, or PhD—StatementCraft is free for you.**
