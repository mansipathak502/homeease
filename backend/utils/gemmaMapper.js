// backend/utils/gemmaMapper.js
const axios = require('axios');

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'meta-llama/llama-3.2-3b-instruct:free';

// ── All exact service_category values from your DB ────────────────────────────
const SERVICE_CATEGORIES = [
  'Home Cleaning', 'Deep Cleaning', 'Kitchen Cleaning', 'Bathroom Cleaning',
  'Sofa Cleaning', 'Carpet Cleaning', 'Mattress Cleaning',
  'Pest Control', 'Termite Control', 'Cockroach / Ant Control', 'Bed Bug Control',
  'AC Repair & Service', 'Washing Machine Repair', 'Refrigerator Repair',
  'Microwave Repair', 'TV Repair & Installation', 'Geyser Repair',
  'Water Cooler Repair', 'Electrician', 'Fan Installation / Repair',
  'Light & Switch Repair', 'Inverter / Battery Service', 'Plumber',
  'Tap & Faucet Repair', 'Leakage Repair', 'Bathroom Fittings Installation',
  'Water Tank Cleaning', 'RO / Water Purifier Service', 'RO Installation',
  'RO Filter Change', 'CCTV Installation', 'Doorbell Installation',
  'TV Wall Mount Installation', 'Curtain & Blinds Installation', 'Carpenter',
  'Furniture Repair', 'Modular Kitchen Repair', 'Wardrobe Repair',
  'House Painting', 'Wall Putty & Polish', 'Home Renovation', 'Tiles & Flooring',
  'Packers & Movers', 'Home Shifting Service', 'Cook / Chef at Home',
  'Babysitter / Nanny', 'Elderly Care', 'Maid Service', 'Laptop / Computer Repair',
  'WiFi / Internet Setup', 'Printer Repair', 'Driver on Hire',
  'Gardening Service', 'Home Sanitization', 'Handyman Service',
];

// ── Fallback rule-based map (if AI fails) ─────────────────────────────────────
const FALLBACK_MAP = [
  { triggers: ['kitchen clean', 'kitchen saf', 'rasoi'],         canonical: 'Kitchen Cleaning',           keywords: ['kitchen', 'cleaning', 'kitchen cleaning', 'rasoi', 'stove clean'] },
  { triggers: ['bathroom clean', 'toilet clean', 'washroom'],    canonical: 'Bathroom Cleaning',          keywords: ['bathroom', 'toilet', 'washroom', 'cleaning', 'tiles'] },
  { triggers: ['sofa clean', 'couch clean'],                     canonical: 'Sofa Cleaning',              keywords: ['sofa', 'couch', 'upholstery', 'cleaning'] },
  { triggers: ['carpet clean', 'rug clean'],                     canonical: 'Carpet Cleaning',            keywords: ['carpet', 'rug', 'cleaning'] },
  { triggers: ['mattress clean', 'gadda'],                       canonical: 'Mattress Cleaning',          keywords: ['mattress', 'gadda', 'cleaning', 'bed'] },
  { triggers: ['deep clean', 'full clean', 'poora ghar'],        canonical: 'Deep Cleaning',              keywords: ['deep cleaning', 'full house', 'thorough cleaning', 'ghar saf'] },
  { triggers: ['home clean', 'house clean', 'ghar clean', 'ghar saf', 'cleaning', 'jhaadu', 'maid', 'sweeping'], canonical: 'Home Cleaning', keywords: ['cleaning', 'maid', 'home cleaning', 'sweeping', 'dust'] },
  { triggers: ['ac ', ' ac', 'air condition', 'cooling', 'hvac'],canonical: 'AC Repair & Service',       keywords: ['ac', 'air conditioner', 'cooling', 'hvac', 'split ac', 'repair'] },
  { triggers: ['washing machine', 'washer'],                     canonical: 'Washing Machine Repair',     keywords: ['washing machine', 'washer', 'laundry', 'repair'] },
  { triggers: ['fridge', 'refrigerator', 'freeze'],              canonical: 'Refrigerator Repair',        keywords: ['fridge', 'refrigerator', 'cooling', 'repair'] },
  { triggers: ['geyser', 'water heater', 'heater'],              canonical: 'Geyser Repair',              keywords: ['geyser', 'water heater', 'hot water', 'repair'] },
  { triggers: ['microwave', 'oven'],                             canonical: 'Microwave Repair',           keywords: ['microwave', 'oven', 'repair'] },
  { triggers: ['tv ', ' tv', 'television', 'led'],               canonical: 'TV Repair & Installation',   keywords: ['tv', 'television', 'led', 'screen', 'repair'] },
  { triggers: ['water cooler', 'cooler'],                        canonical: 'Water Cooler Repair',        keywords: ['water cooler', 'cooler', 'repair'] },
  { triggers: ['plumb', 'pipe', 'drain', 'tap', 'flush', 'nal', 'pani leak'], canonical: 'Plumber', keywords: ['plumber', 'pipe', 'leak', 'drain', 'tap'] },
  { triggers: ['tap', 'faucet', 'nala'],                         canonical: 'Tap & Faucet Repair',        keywords: ['tap', 'faucet', 'water', 'repair'] },
  { triggers: ['leak', 'leakage', 'seepage'],                    canonical: 'Leakage Repair',             keywords: ['leak', 'leakage', 'seepage', 'water', 'repair'] },
  { triggers: ['water tank', 'tanki'],                           canonical: 'Water Tank Cleaning',        keywords: ['water tank', 'tanki', 'cleaning'] },
  { triggers: ['ro ', 'water purif', 'filter change'],           canonical: 'RO / Water Purifier Service',keywords: ['ro', 'water purifier', 'filter', 'service'] },
  { triggers: ['electric', 'wiring', 'switch', 'mcb', 'power cut', 'bijli'], canonical: 'Electrician', keywords: ['electrician', 'wiring', 'switch', 'power', 'repair'] },
  { triggers: ['fan ', ' fan', 'ceiling fan'],                   canonical: 'Fan Installation / Repair',  keywords: ['fan', 'ceiling fan', 'installation', 'repair'] },
  { triggers: ['light', 'bulb', 'tube light'],                   canonical: 'Light & Switch Repair',      keywords: ['light', 'bulb', 'switch', 'repair'] },
  { triggers: ['inverter', 'battery', 'ups'],                    canonical: 'Inverter / Battery Service', keywords: ['inverter', 'battery', 'ups', 'service'] },
  { triggers: ['pest', 'cockroach', 'ant', 'mosquito', 'kida'],  canonical: 'Pest Control',               keywords: ['pest', 'cockroach', 'insect', 'spray'] },
  { triggers: ['termite', 'deemak'],                             canonical: 'Termite Control',            keywords: ['termite', 'deemak', 'wood', 'pest'] },
  { triggers: ['bed bug', 'khatmal'],                            canonical: 'Bed Bug Control',            keywords: ['bed bug', 'khatmal', 'pest', 'spray'] },
  { triggers: ['cctv', 'camera', 'security'],                    canonical: 'CCTV Installation',          keywords: ['cctv', 'camera', 'security', 'installation'] },
  { triggers: ['doorbell', 'bell'],                              canonical: 'Doorbell Installation',      keywords: ['doorbell', 'bell', 'installation'] },
  { triggers: ['carpenter', 'furniture', 'wood', 'shelf', 'door hinge'], canonical: 'Carpenter',        keywords: ['carpenter', 'furniture', 'wood', 'repair'] },
  { triggers: ['modular kitchen', 'kitchen cabinet'],            canonical: 'Modular Kitchen Repair',     keywords: ['modular kitchen', 'cabinet', 'kitchen', 'repair'] },
  { triggers: ['wardrobe', 'almirah'],                           canonical: 'Wardrobe Repair',            keywords: ['wardrobe', 'almirah', 'repair'] },
  { triggers: ['paint', 'colour', 'wall color'],                 canonical: 'House Painting',             keywords: ['painting', 'wall paint', 'colour', 'interior'] },
  { triggers: ['putty', 'polish', 'plaster'],                    canonical: 'Wall Putty & Polish',        keywords: ['putty', 'polish', 'wall', 'smooth'] },
  { triggers: ['renovation', 'remodel', 'repair ghar'],         canonical: 'Home Renovation',            keywords: ['renovation', 'remodel', 'construction', 'repair'] },
  { triggers: ['tile', 'flooring', 'floor'],                     canonical: 'Tiles & Flooring',           keywords: ['tiles', 'flooring', 'floor', 'installation'] },
  { triggers: ['packers', 'movers', 'shifting', 'move'],        canonical: 'Packers & Movers',           keywords: ['packers', 'movers', 'shifting', 'transport'] },
  { triggers: ['cook', 'chef', 'khana', 'food'],                 canonical: 'Cook / Chef at Home',        keywords: ['cook', 'chef', 'food', 'cooking', 'khana'] },
  { triggers: ['baby', 'nanny', 'child care', 'creche'],         canonical: 'Babysitter / Nanny',         keywords: ['babysitter', 'nanny', 'child', 'care'] },
  { triggers: ['elderly', 'old age', 'bujurg'],                  canonical: 'Elderly Care',               keywords: ['elderly', 'old', 'care', 'nurse'] },
  { triggers: ['laptop', 'computer', 'pc repair'],               canonical: 'Laptop / Computer Repair',   keywords: ['laptop', 'computer', 'pc', 'repair'] },
  { triggers: ['wifi', 'internet', 'router', 'broadband'],       canonical: 'WiFi / Internet Setup',      keywords: ['wifi', 'internet', 'router', 'setup'] },
  { triggers: ['printer'],                                       canonical: 'Printer Repair',             keywords: ['printer', 'ink', 'repair'] },
  { triggers: ['driver', 'cab', 'chauffeur'],                    canonical: 'Driver on Hire',             keywords: ['driver', 'cab', 'chauffeur', 'hire'] },
  { triggers: ['garden', 'plant', 'lawn', 'mali'],               canonical: 'Gardening Service',          keywords: ['garden', 'plant', 'lawn', 'mali'] },
  { triggers: ['sanitiz', 'disinfect', 'fumigat'],               canonical: 'Home Sanitization',          keywords: ['sanitization', 'disinfection', 'cleaning'] },
  { triggers: ['handyman', 'general repair', 'misc'],            canonical: 'Handyman Service',           keywords: ['handyman', 'repair', 'general', 'fix'] },
];

function fallbackInterpret(input) {
  const lower = input.toLowerCase();
  for (const { triggers, canonical, keywords } of FALLBACK_MAP) {
    if (triggers.some(t => lower.includes(t))) {
      return { canonical, keywords };
    }
  }
  return { canonical: input.trim(), keywords: [input.trim().toLowerCase()] };
}

async function interpretServiceWithGemma(userInput) {
  const categoriesList = SERVICE_CATEGORIES.join(', ');

  const systemPrompt = `You are a home services classifier for HomeEase — an Indian home service marketplace.

Your ONLY job: map user input to the EXACT service category from this list:
${categoriesList}

CRITICAL RULES:
- Return ONLY a valid JSON object, no markdown, no explanation
- "canonical" MUST be copied EXACTLY from the list above — do not paraphrase
- If user says "kitchen cleaning" → canonical = "Kitchen Cleaning" (NOT "House Cleaning")
- If user says "bathroom cleaning" → canonical = "Bathroom Cleaning" (NOT "House Cleaning")  
- If user says "sofa cleaning" → canonical = "Sofa Cleaning"
- Match the MOST SPECIFIC category possible, not a generic one
- keywords: 3-6 relevant English search terms the vendor's profile might contain
- confidence: "high" if clear match, "medium" if reasonable, "low" if guessing

JSON format (copy exactly):
{
  "canonical": "<exact category from list>",
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "confidence": "high"
}`;

  const userMessage = `Classify: "${userInput}"`;

  try {
    const response = await axios.post(
      OPENROUTER_API_URL,
      {
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.05, // very low = deterministic, consistent
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': process.env.FRONTEND_URL,
          'X-Title': 'HomeEase Service Marketplace',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );

    const rawContent = response.data?.choices?.[0]?.message?.content || '';
    const cleaned = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Extract JSON even if model adds some text before/after
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found in response');

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.canonical || !Array.isArray(parsed.keywords)) {
      throw new Error('Invalid response shape');
    }

    // Validate canonical is in our list — if not, find closest match
    const exactMatch = SERVICE_CATEGORIES.find(
      c => c.toLowerCase() === parsed.canonical.toLowerCase()
    );

    if (!exactMatch) {
      // Try partial match
      const partial = SERVICE_CATEGORIES.find(
        c => c.toLowerCase().includes(parsed.canonical.toLowerCase()) ||
             parsed.canonical.toLowerCase().includes(c.toLowerCase().split(' ')[0])
      );
      parsed.canonical = partial || parsed.canonical;
    } else {
      parsed.canonical = exactMatch; // use exact casing from our list
    }

    console.log(`[Gemma] "${userInput}" → "${parsed.canonical}" (${parsed.confidence})`);

    return {
      canonical:  parsed.canonical,
      keywords:   parsed.keywords,
      confidence: parsed.confidence || 'medium',
      source:     'gemma-3-12b',
    };

  } catch (error) {
    if (error.response) {
      console.error(`[Gemma] API error ${error.response.status}:`, error.response.data?.error?.message || error.message);
    } else if (error.code === 'ECONNABORTED') {
      console.error('[Gemma] Timeout — fallback');
    } else {
      console.error('[Gemma] Error:', error.message);
    }

    const fallback = fallbackInterpret(userInput);
    return { ...fallback, confidence: 'low', source: 'fallback' };
  }
}

module.exports = { interpretServiceWithGemma, fallbackInterpret };