// backend/controllers/aiRecommendController.js

const { pool } = require('../config/db');
const { interpretServiceWithGemma } = require('../utils/gemmaMapper');

function computeScore(vendor) {
  return (parseFloat(vendor.rating || 0) * 2.0) +
         (parseInt(vendor.experience || 0) * 1.5) -
         (parseFloat(vendor.price || 0) / 100);
}

const priceExpr = `CAST(NULLIF(REGEXP_REPLACE(SPLIT_PART(v.pricing, '-', 1), '[^0-9]', '', 'g'), '') AS FLOAT)`;

const getAIRecommendations = async (req, res) => {
  try {
    const { service, budget, location } = req.body;

    if (!service || !budget || !location) {
      return res.status(400).json({ success: false, message: 'service, budget, and location are required.' });
    }

    const budgetNum = parseFloat(budget);
    if (isNaN(budgetNum) || budgetNum <= 0) {
      return res.status(400).json({ success: false, message: 'Budget must be a positive number.' });
    }

    // Step 1: AI intent parsing
    const { canonical, keywords, confidence, source } = await interpretServiceWithGemma(service);
    console.log(`[aiRecommend] "${service}" → "${canonical}" | ${source} | conf:${confidence}`);

    // Step 2: Build params array explicitly
    // $1=city, $2=canonical, $3=%canonical%, $4...$4+n-1=keywords, $4+n=budget
    const kwParams = keywords.map(kw => `%${kw}%`);
    const budgetIdx = 4 + kwParams.length; // e.g. 5 keywords → $9

    const params = [
      location.trim(),   // $1
      canonical,          // $2
      `%${canonical}%`,  // $3
      ...kwParams,        // $4 ... $4+n-1
      budgetNum,          // $budgetIdx
    ];

    const kwConditions = kwParams.length > 0
      ? kwParams.map((_, i) => `LOWER(v.services_offered) LIKE LOWER($${i + 4})`).join(' OR ')
      : 'false';

    const mainQuery = `
      SELECT 
        v.id,
        v.business_name AS name,
        COALESCE(v.service_category, v.services_offered) AS skills,
        v.city AS location,
        COALESCE(${priceExpr}, 0) AS price,
        COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.vendor_id = v.id), 0) AS rating,
        COALESCE(CAST(v.years_in_business AS INT), 0) AS experience,
        v.availability,
        v.service_category
      FROM vendors v
      WHERE v.is_approved = true
        AND (v.is_blocked = 0 OR v.is_blocked IS NULL)
        AND LOWER(v.city) = LOWER($1)
        AND (
          LOWER(v.service_category) = LOWER($2)
          OR LOWER(v.service_category) LIKE LOWER($3)
          OR (${kwConditions})
        )
        AND (
          ${priceExpr} IS NULL
          OR ${priceExpr} <= $${budgetIdx}
        )
      ORDER BY
        CASE WHEN LOWER(v.service_category) = LOWER($2) THEN 0 ELSE 1 END,
        COALESCE(${priceExpr}, 0) ASC
      LIMIT 10
    `;

    console.log(`[aiRecommend] total params: ${params.length}, budgetIdx: $${budgetIdx}`);

    const { rows: vendors } = await pool.query(mainQuery, params);

    // Step 3: No results → suggest budget
    if (vendors.length === 0) {
      const fbKwParams = keywords.map(kw => `%${kw}%`);
      const fbParams = [location.trim(), canonical, `%${canonical}%`, ...fbKwParams];
      const fbKwCond = fbKwParams.length > 0
        ? fbKwParams.map((_, i) => `LOWER(v.services_offered) LIKE LOWER($${i + 4})`).join(' OR ')
        : 'false';

      const fbQuery = `
        SELECT COALESCE(MIN(${priceExpr}), 0) AS min_price
        FROM vendors v
        WHERE v.is_approved = true
          AND (v.is_blocked = 0 OR v.is_blocked IS NULL)
          AND LOWER(v.city) = LOWER($1)
          AND (
            LOWER(v.service_category) = LOWER($2)
            OR LOWER(v.service_category) LIKE LOWER($3)
            OR (${fbKwCond})
          )
      `;

      const { rows: fb } = await pool.query(fbQuery, fbParams);
      const minPrice = parseFloat(fb[0]?.min_price || 0);
      const suggestedBudget = minPrice > 0 ? Math.ceil(minPrice / 100) * 100 : null;

      const { rows: cityCheck } = await pool.query(
        `SELECT COUNT(*) AS cnt FROM vendors v WHERE v.is_approved = true AND LOWER(v.city) = LOWER($1)`,
        [location.trim()]
      );
      const cityHasVendors = parseInt(cityCheck[0]?.cnt || 0) > 0;

      return res.json({
        success: true,
        vendors: [],
        suggestedBudget,
        interpreted: canonical,
        aiSource: source,
        confidence,
        message: !cityHasVendors
          ? `No vendors found in ${location} yet. Try a nearby city.`
          : suggestedBudget
            ? `No vendors within ₹${budgetNum} for "${canonical}" in ${location}. Minimum: ₹${suggestedBudget}.`
            : `No vendors found for "${canonical}" in ${location}. Try a different service.`,
      });
    }

    // Step 4: Rank and return
    const ranked = vendors
      .map(v => ({
        ...v,
        rating: parseFloat(parseFloat(v.rating).toFixed(1)),
        price: parseFloat(v.price),
        score: parseFloat(computeScore(v).toFixed(3)),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);

    return res.json({
      success: true,
      vendors: ranked,
      suggestedBudget: null,
      interpreted: canonical,
      aiSource: source,
      confidence,
      message: `Found ${ranked.length} vendor(s) for "${canonical}" in ${location}.`,
    });

  } catch (error) {
    console.error('[aiRecommendController]', error);
    return res.status(500).json({ success: false, message: 'Server error.' });
  }
};

module.exports = { getAIRecommendations };