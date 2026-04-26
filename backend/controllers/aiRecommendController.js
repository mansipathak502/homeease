// backend/controllers/aiRecommendController.js
// Uses OpenRouter → google/gemma-3-12b-it:free for NLP intent parsing

const { pool } = require('../config/db');
const { interpretServiceWithGemma } = require('../utils/gemmaMapper');

/**
 * Smart Ranking Formula (report mein yahi likhna):
 * score = (rating × 2) + (experience × 1.5) − (price / 100)
 */
function computeScore(vendor) {
  return (parseFloat(vendor.rating || 0) * 2.0) +
         (parseInt(vendor.experience || 0) * 1.5) -
         (parseFloat(vendor.price || 0) / 100);
}

// POST /api/ai-recommend
const getAIRecommendations = async (req, res) => {
  try {
    const { service, budget, location } = req.body;

    if (!service || !budget || !location) {
      return res.status(400).json({
        success: false,
        message: 'service, budget, and location are required.'
      });
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget must be a positive number.'
      });
    }

    // Step 1: Gemma AI parses user intent
    const { canonical, keywords, confidence, source } = await interpretServiceWithGemma(service);
    console.log(`[aiRecommend] "${service}" → "${canonical}" | ${source} | ${confidence}`);

    // Step 2: SQL query with keyword matching
// Step 2: SQL query with keyword matching
const keywordConditions = keywords
  .map((_, i) => `LOWER(v.services_offered) LIKE LOWER($${i + 3})`)
  .join(' OR ');
const keywordParams = keywords.map(kw => `%${kw}%`);

const query = `
  SELECT v.id, 
         v.business_name AS name,
         v.services_offered AS skills,
         v.city AS location,
         CAST(REGEXP_REPLACE(v.pricing, '[^0-9.]', '', 'g') AS FLOAT) AS price,
         0.0 AS rating,
         CAST(v.years_in_business AS INT) AS experience,
         v.availability,
         v.service_category
  FROM vendors v
  WHERE v.is_approved = true
    AND v.is_blocked = 0
    AND LOWER(v.city) = LOWER($1)
    AND CAST(REGEXP_REPLACE(v.pricing, '[^0-9.]', '', 'g') AS FLOAT) <= $2
    AND (${keywordConditions})
  LIMIT 10
`;

const { rows: vendors } = await pool.query(query, [location.trim(), budgetNum, ...keywordParams]);

// Step 3: Budget suggestion if empty
if (vendors.length === 0) {
  const fbCond = keywords.map((_, i) => `LOWER(v.services_offered) LIKE LOWER($${i + 2})`).join(' OR ');
  const { rows: fb } = await pool.query(
  `SELECT MIN(CAST(REGEXP_REPLACE(v.pricing, '[^0-9.]', '', 'g') AS FLOAT)) AS min_price 
   FROM vendors v
   WHERE v.is_approved = true 
     AND v.is_blocked = 0
     AND LOWER(v.city) = LOWER($1) 
     AND (${fbCond})`,
  [location.trim(), ...keywordParams]
);
      const suggestedBudget = fb[0]?.min_price
        ? Math.ceil(parseFloat(fb[0].min_price) / 100) * 100
        : null;

      return res.json({
        success: true, vendors: [], suggestedBudget,
        interpreted: canonical, aiSource: source,
        message: suggestedBudget
          ? `No vendors within ₹${budgetNum}. Try ₹${suggestedBudget}+.`
          : `No vendors found for "${canonical}" in ${location}.`
      });
    }

    // Step 4: Smart ranking
    const ranked = vendors
      .map(v => ({ ...v, score: parseFloat(computeScore(v).toFixed(3)) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return res.json({
      success: true,
      vendors: ranked,
      suggestedBudget: null,
      interpreted: canonical,
      aiSource: source,
      confidence,
      message: `Found ${ranked.length} vendor(s) for "${canonical}" in ${location}.`
    });

  } catch (error) {
    console.error('[aiRecommendController]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAIRecommendations };