// backend/routes/aiRecommendRoutes.js
// Matches existing pattern: bookingRoutes.js, vendorRoutes.js, etc.

const express = require('express');
const router = express.Router();
const { getAIRecommendations } = require('../controllers/aiRecommendController');
const { verifyToken } = require('../middleware/auth'); 
// ☝️ Use your existing auth middleware name — check middleware/ folder
// Common names: verifyToken, authenticateToken, protect, authMiddleware

// POST /api/ai-recommend
router.post('/', verifyToken, getAIRecommendations);

module.exports = router;