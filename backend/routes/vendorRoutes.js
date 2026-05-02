const express        = require('express');
const router         = express.Router();
const vendorCtrl     = require('../controllers/vendorController');
const { verifyToken, isVendor } = require('../middleware/auth');
 
router.use(verifyToken, isVendor);
 
// Profile
router.get('/profile',       vendorCtrl.getProfile);
router.put('/profile',       vendorCtrl.updateProfile);
 
// Bookings
router.get('/bookings',      vendorCtrl.getBookings);
router.put('/bookings/:id',  vendorCtrl.updateBooking);
 
// Quote — vendor sends price to customer after visit
router.post('/bookings/:id/quote',         vendorCtrl.sendQuote);
 
// Final payment — vendor records how customer paid remaining balance
router.post('/bookings/:id/final-payment', vendorCtrl.recordFinalPayment);
 
// Stats & reviews
router.get('/stats',         vendorCtrl.getStats);
router.get('/reviews',       vendorCtrl.getReviews);
 
module.exports = router;