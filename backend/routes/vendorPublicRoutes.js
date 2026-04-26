const express = require('express');
const router = express.Router();
const vendorPublicController = require('../controllers/vendorPublicController');

// Public routes (no authentication required)

// Get all approved vendors
router.get('/approved', vendorPublicController.getApprovedVendors);

// Search vendors
router.get('/search', vendorPublicController.searchVendors);

// Get vendor by ID
router.get('/:id', vendorPublicController.getVendorById);

// Get vendor reviews
router.get('/:id/reviews', vendorPublicController.getVendorReviews);


router.get("/recommend", async (req, res) => {
  try {
    const { service, city, budget } = req.query;

    if (!service) {
      return res.status(400).json({ message: "service query param is required" });
    }

    const conditions = [
      "v.is_approved = true",
      "v.is_blocked = 0",
      "LOWER(v.service_category) LIKE LOWER($1)",
    ];
    const values = [`%${service}%`];
    let idx = 2;

    if (city) {
      conditions.push(`LOWER(v.city) LIKE LOWER($${idx})`);
      values.push(`%${city}%`);
      idx++;
    }

    if (budget) {
      const budgetNum = parseFloat(budget);
      if (!isNaN(budgetNum)) {
        conditions.push(`(
          v.pricing IS NULL OR v.pricing = ''
          OR REGEXP_REPLACE(v.pricing, '[^0-9.]', '', 'g') = ''
          OR CAST(REGEXP_REPLACE(v.pricing, '[^0-9.]', '', 'g') AS NUMERIC) <= $${idx}
        )`);
        values.push(budgetNum);
        idx++;
      }
    }

    const sql = `
      SELECT
        v.id, v.business_name, v.owner_name, v.email, v.phone,
        v.city, v.state, v.service_category, v.description,
        v.pricing, v.availability, v.certification, v.created_at,
        COALESCE(ROUND(AVG(r.rating)::numeric, 1), 0) AS average_rating,
        COUNT(r.id) AS review_count
      FROM vendors v
      LEFT JOIN reviews r ON r.vendor_id = v.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY v.id
      ORDER BY average_rating DESC, v.created_at DESC
      LIMIT 10
    `;

    const result = await pool.query(sql, values);
    return res.json(result.rows);
  } catch (err) {
    console.error("Vendor recommend error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


module.exports = router;