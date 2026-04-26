// backend/utils/gemmaMapper.js
// ─────────────────────────────────────────────────────────────────────────────
//  Uses OpenRouter → google/gemma-3-12b-it:free
//  Replaces rule-based nlpMapper.js with real AI intent parsing
// ─────────────────────────────────────────────────────────────────────────────

const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemma-3-12b-it:free';

// Fallback rule-based map (used if API call fails)
const FALLBACK_MAP = {
  'ac':          { canonical: 'AC Repair',       keywords: ['ac', 'air conditioner', 'cooling', 'hvac', 'split ac'] },
  'plumb':       { canonical: 'Plumbing',         keywords: ['plumber', 'pipe', 'leak', 'drain', 'tap', 'flush'] },
  'electric':    { canonical: 'Electrician',      keywords: ['electrician', 'wiring', 'switch', 'fan', 'mcb', 'power'] },
  'clean':       { canonical: 'House Cleaning',   keywords: ['cleaning', 'maid', 'deep clean', 'sweep', 'dust'] },
  'carpenter':   { canonical: 'Carpenter',        keywords: ['carpenter', 'furniture', 'wood', 'shelf', 'door'] },
  'paint':       { canonical: 'Painting',         keywords: ['painting', 'wall paint', 'colour', 'interior paint'] },
};

function fallbackInterpret(input) {
  const lower = input.toLowerCase();
  for (const [trigger, data] of Object.entries(FALLBACK_MAP)) {
    if (lower.includes(trigger)) return data;
  }
  return { canonical: input.trim(), keywords: [input.trim().toLowerCase()] };
}

/**
 * interpretServiceWithGemma(userInput)
 *
 * Sends user's natural language to Gemma 3 12B via OpenRouter.
 * Returns: { canonical: string, keywords: string[], confidence: string }
 *
 * Example:
 *   Input:  "mere ghar mein AC thanda nahi kar raha"
 *   Output: { canonical: "AC Repair", keywords: ["ac", "cooling", "air conditioner"] }
 */
async function interpretServiceWithGemma(userInput) {
  const systemPrompt = `You are a home services classifier for an Indian service marketplace app called HomeEase.

Your job is to analyze a user's problem description and return ONLY a JSON object — no explanation, no markdown, no extra text.

Classify the input into one of these service categories:
- AC Repair
- Plumbing
- Electrician
- House Cleaning
- Carpenter
- Painting
- Appliance Repair
- Pest Control
- Other

Return this exact JSON format:
{
  "canonical": "<service category name>",
  "keywords": ["<keyword1>", "<keyword2>", "<keyword3>"],
  "confidence": "high" | "medium" | "low"
}

Rules:
- canonical must be one of the categories listed above
- keywords should be 3-5 relevant search terms in English (lowercase)
- If input is in Hindi/Hinglish, still return English canonical and keywords
- Return ONLY the JSON object, nothing else`;

  const userMessage = `Classify this service request: "${userInput}"`;

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage  }
        ],
        max_tokens: 150,
        temperature: 0.1,   // low temp = consistent, structured output
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
          'X-Title': 'HomeEase Service Marketplace',
          'Content-Type': 'application/json',
        },
        timeout: 10000,   // 10 second timeout
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content || '';

    // Strip markdown fences if model wraps in ```json ... ```
    const cleaned = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    // Validate response shape
    if (!parsed.canonical || !Array.isArray(parsed.keywords)) {
      throw new Error('Invalid response shape from Gemma');
    }

    console.log(`[Gemma] "${userInput}" → "${parsed.canonical}" (${parsed.confidence})`);

    return {
      canonical:  parsed.canonical,
      keywords:   parsed.keywords,
      confidence: parsed.confidence || 'medium',
      source:     'gemma-3-12b',
    };

  } catch (error) {
    // Log error type for debugging
    if (error.response) {
      console.error(`[Gemma] API error ${error.response.status}:`, error.response.data?.error?.message || error.message);
    } else if (error.code === 'ECONNABORTED') {
      console.error('[Gemma] Timeout — falling back to rule-based mapper');
    } else {
      console.error('[Gemma] Parse/network error:', error.message);
    }

    // Graceful fallback — app keeps working even if AI call fails
    const fallback = fallbackInterpret(userInput);
    return { ...fallback, confidence: 'low', source: 'fallback' };
  }
}

module.exports = { interpretServiceWithGemma, fallbackInterpret };