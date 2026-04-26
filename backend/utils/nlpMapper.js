// utils/nlpMapper.js
// ─────────────────────────────────────────────────────────────────────────────
//  Maps natural-language user input to canonical service names + keyword arrays.
//  Extend `SERVICE_MAP` to grow the NLP vocabulary without any ML dependency.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * SERVICE_MAP:
 *   Key   = canonical service name (stored in DB skills column)
 *   Value = array of trigger phrases / keywords (lowercased)
 */
const SERVICE_MAP = {
  'AC Repair': [
    'ac not cooling', 'ac repair', 'air conditioner', 'ac service',
    'split ac', 'window ac', 'hvac', 'cooling system', 'ac not working',
    'ac making noise', 'cool', 'cooling',
  ],
  'Plumbing': [
    'pipe leak', 'leakage', 'water leaking', 'tap repair', 'drain blocked',
    'bathroom fitting', 'plumber', 'plumbing', 'pipe fitting', 'toilet repair',
    'flush not working', 'water supply', 'pipeline',
  ],
  'Electrician': [
    'power cut', 'no electricity', 'wiring', 'switch not working',
    'fan installation', 'light not working', 'electrician', 'electrical',
    'mcb trip', 'short circuit', 'socket repair', 'switchboard',
  ],
  'House Cleaning': [
    'cleaning', 'deep clean', 'maid', 'house clean', 'dirty house',
    'sofa cleaning', 'carpet clean', 'bathroom clean', 'kitchen clean',
    'pest control', 'dust',
  ],
  'Carpenter': [
    'carpenter', 'furniture repair', 'wooden', 'modular kitchen',
    'shelf installation', 'door repair', 'wood work', 'cabinet',
  ],
  'Painting': [
    'painting', 'wall paint', 'interior paint', 'exterior paint',
    'colour change', 'distemper', 'waterproofing', 'texture paint',
  ],
};

/**
 * interpretService(input)
 * Returns:
 *   { canonical: string, keywords: string[] }
 *
 * - If input matches a known mapping → return that canonical + keywords
 * - Otherwise → return original input + single-element keyword array
 */
function interpretService(input) {
  const normalized = input.trim().toLowerCase();

  for (const [canonical, triggers] of Object.entries(SERVICE_MAP)) {
    const matched = triggers.some(trigger => normalized.includes(trigger) || trigger.includes(normalized));
    if (matched) {
      return { canonical, keywords: triggers };
    }
  }

  // Fallback: use raw input as keyword
  return {
    canonical: input.trim(),
    keywords: [normalized],
  };
}

module.exports = { interpretService, SERVICE_MAP };