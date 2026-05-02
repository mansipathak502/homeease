const { pool } = require('../config/db');

// ─────────────────────────────────────────────────────────────
//  Helper — get vendorId from JWT (req.user set by auth middleware)
// ─────────────────────────────────────────────────────────────
const getVendorId = (req) => req.user?.id || req.user?.vendorId;

// ─────────────────────────────────────────────────────────────
//  GET /api/vendor/bookings
// ─────────────────────────────────────────────────────────────
exports.getBookings = async (req, res) => {
  try {
    const vendorId = getVendorId(req);

    const result = await pool.query(
      `SELECT
         b.*,
         u.name  AS customer_name,
         u.phone AS customer_phone,
         u.email AS customer_email
       FROM bookings b
       LEFT JOIN users u ON u.id = b.user_id
       WHERE b.vendor_id = $1
       ORDER BY b.created_at DESC`,
      [vendorId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('getBookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/vendor/stats
// ─────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const vendorId = getVendorId(req);

    const { rows: bookings } = await pool.query(
      `SELECT status, final_amount, quote_amount, vendor_payout, created_at
       FROM bookings WHERE vendor_id = $1`,
      [vendorId]
    );

    // Weekly data (last 7 days)
    const { rows: weeklyRows } = await pool.query(
      `SELECT
         TO_CHAR(created_at, 'Dy') AS day,
         COUNT(*)                  AS bookings,
         COALESCE(SUM(vendor_payout), 0) AS revenue
       FROM bookings
       WHERE vendor_id = $1
         AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY TO_CHAR(created_at, 'Dy'), DATE_TRUNC('day', created_at)
       ORDER BY DATE_TRUNC('day', created_at)`,
      [vendorId]
    );

    // Monthly data (last 6 months)
    const { rows: monthlyRows } = await pool.query(
      `SELECT
         TO_CHAR(created_at, 'Mon') AS month,
         COUNT(*)                   AS bookings,
         COALESCE(SUM(vendor_payout), 0) AS revenue
       FROM bookings
       WHERE vendor_id = $1
         AND created_at >= NOW() - INTERVAL '6 months'
       GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
       ORDER BY DATE_TRUNC('month', created_at)`,
      [vendorId]
    );

    // Status distribution
    const { rows: statusRows } = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM bookings WHERE vendor_id = $1
       GROUP BY status`,
      [vendorId]
    );

    // Average rating
    const { rows: ratingRows } = await pool.query(
      `SELECT COALESCE(AVG(rating), 0) AS avg FROM reviews WHERE vendor_id = $1`,
      [vendorId]
    );

    const totalRevenue = bookings.reduce(
      (sum, b) => sum + parseFloat(b.vendor_payout || b.final_amount || b.quote_amount || 0),
      0
    );

    res.json({
      totalBookings:     bookings.length,
      pendingBookings:   bookings.filter(b => b.status === 'pending' || b.status === 'pending_visit').length,
      completedBookings: bookings.filter(b => b.status === 'completed').length,
      totalRevenue,
      averageRating:     parseFloat(ratingRows[0]?.avg || 0).toFixed(1),
      weeklyData:        weeklyRows.map(r => ({ ...r, bookings: parseInt(r.bookings), revenue: parseFloat(r.revenue) })),
      monthlyData:       monthlyRows.map(r => ({ ...r, bookings: parseInt(r.bookings), revenue: parseFloat(r.revenue) })),
      statusDistribution: statusRows.map(r => ({ status: r.status, count: parseInt(r.count) })),
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/vendor/profile
// ─────────────────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    const { rows } = await pool.query('SELECT * FROM vendors WHERE id = $1', [vendorId]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Vendor not found' });
    res.json(rows[0]);
  } catch (error) {
    console.error('getProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/vendor/profile
// ─────────────────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    const {
      businessName, ownerName, phone, address,
      city, state, zipCode, servicesOffered,
      description, pricing, availability, website,
    } = req.body;

    await pool.query(
      `UPDATE vendors SET
         business_name    = $1,  owner_name      = $2,
         phone            = $3,  address         = $4,
         city             = $5,  state           = $6,
         zip_code         = $7,  services_offered= $8,
         description      = $9,  pricing         = $10,
         availability     = $11, website         = $12,
         updated_at       = NOW()
       WHERE id = $13`,
      [businessName, ownerName, phone, address,
       city, state, zipCode, servicesOffered,
       description, pricing, availability, website,
       vendorId]
    );

    res.json({ success: true, message: 'Profile updated' });
  } catch (error) {
    console.error('updateProfile error:', error);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// ─────────────────────────────────────────────────────────────
//  PUT /api/vendor/bookings/:id
//  General status update (approve, reject, complete, reschedule)
// ─────────────────────────────────────────────────────────────
exports.updateBooking = async (req, res) => {
  try {
    const vendorId  = getVendorId(req);
    const bookingId = req.params.id;
    const { status, vendor_response, new_date, new_time, service_notes } = req.body;

    // Ownership check
    const { rows: check } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2',
      [bookingId, vendorId]
    );
    if (!check.length) {
      return res.status(403).json({ success: false, message: 'Booking not found or unauthorized' });
    }

    // Conflict check for approval
    if (status === 'approved') {
      const booking = check[0];
      const { rows: conflicts } = await pool.query(
        `SELECT id FROM bookings
         WHERE vendor_id = $1
           AND date = $2
           AND time = $3
           AND status = 'approved'
           AND id != $4`,
        [vendorId, booking.date, booking.time, bookingId]
      );
      if (conflicts.length) {
        return res.json({
          success: false,
          conflict: true,
          message: 'You already have an approved booking at this date/time.',
        });
      }
    }

    await pool.query(
      `UPDATE bookings SET
         status          = COALESCE($1, status),
         vendor_response = COALESCE($2, vendor_response),
         new_date        = COALESCE($3, new_date),
         new_time        = COALESCE($4, new_time),
         service_notes   = COALESCE($5, service_notes),
         updated_at      = NOW()
       WHERE id = $6`,
      [status, vendor_response, new_date, new_time, service_notes, bookingId]
    );

    res.json({ success: true, message: `Booking updated` });
  } catch (error) {
    console.error('updateBooking error:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/vendor/bookings/:id/quote
//  Vendor sends price quote to customer after visiting
// ─────────────────────────────────────────────────────────────
exports.sendQuote = async (req, res) => {
  try {
    const vendorId  = getVendorId(req);
    const bookingId = req.params.id;
    const { quote_amount, quote_note } = req.body;

    if (!quote_amount || isNaN(quote_amount) || Number(quote_amount) <= 0) {
      return res.status(400).json({ success: false, message: 'Enter a valid quote amount' });
    }

    // Ownership + status check
    const { rows } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2',
      [bookingId, vendorId]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: 'Booking not found or unauthorized' });
    }
    if (rows[0].quote_status === 'accepted') {
      return res.status(400).json({ success: false, message: 'Quote already accepted by customer' });
    }

    await pool.query(
      `UPDATE bookings SET
         quote_amount    = $1,
         quote_status    = 'pending_user',
         vendor_response = COALESCE($2, vendor_response),
         updated_at      = NOW()
       WHERE id = $3`,
      [quote_amount, quote_note, bookingId]
    );

    res.json({ success: true, message: 'Quote sent to customer' });
  } catch (error) {
    console.error('sendQuote error:', error);
    res.status(500).json({ success: false, message: 'Failed to send quote' });
  }
};

// ─────────────────────────────────────────────────────────────
//  POST /api/vendor/bookings/:id/final-payment
//  Vendor records how customer paid remaining balance after service
//
//  Flow:
//    advance_amount (₹99) = already paid via Razorpay at booking time
//    quote_amount          = total price vendor quoted
//    final_amount          = same as quote_amount (set when user accepted)
//    remaining             = final_amount - advance_amount  ← vendor collects this
//    commission_pct        = admin's cut %
//    admin_earning         = final_amount × commission_pct / 100
//    vendor_payout         = final_amount - admin_earning
// ─────────────────────────────────────────────────────────────
exports.recordFinalPayment = async (req, res) => {
  try {
    const vendorId  = getVendorId(req);
    const bookingId = req.params.id;
    const { final_payment_method } = req.body;

    if (!['cash', 'online'].includes(final_payment_method)) {
      return res.status(400).json({ success: false, message: 'Payment method must be cash or online' });
    }

    const { rows } = await pool.query(
      'SELECT * FROM bookings WHERE id = $1 AND vendor_id = $2',
      [bookingId, vendorId]
    );
    if (!rows.length) {
      return res.status(403).json({ success: false, message: 'Booking not found or unauthorized' });
    }

    const booking = rows[0];

    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Mark booking as completed first' });
    }
    if (booking.final_payment_status === 'paid') {
      return res.status(400).json({ success: false, message: 'Payment already recorded' });
    }

    // Total = what customer agreed to pay (set when they accepted the quote)
    const totalAmt   = parseFloat(booking.final_amount || booking.quote_amount || booking.advance_amount || 0);
    const advanceAmt = parseFloat(booking.advance_amount || 99);
    const commPct    = parseFloat(booking.commission_pct || 10);
    const adminEarn  = Math.round(totalAmt * commPct / 100);
    const vendorPay  = totalAmt - adminEarn;
    const remaining  = Math.max(0, totalAmt - advanceAmt);

    await pool.query(
      `UPDATE bookings SET
         final_payment_method = $1,
         final_payment_status = 'paid',
         final_amount         = $2,
         admin_earning        = $3,
         vendor_payout        = $4,
         payout_status        = 'pending',
         updated_at           = NOW()
       WHERE id = $5`,
      [final_payment_method, totalAmt, adminEarn, vendorPay, bookingId]
    );

    res.json({
      success: true,
      message: 'Payment recorded successfully',
      summary: {
        totalAmount:        totalAmt,
        advancePaid:        advanceAmt,
        remainingCollected: remaining,
        commissionPct:      commPct,
        adminEarning:       adminEarn,
        vendorPayout:       vendorPay,
        paymentMethod:      final_payment_method,
      },
    });
  } catch (error) {
    console.error('recordFinalPayment error:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
};

// ─────────────────────────────────────────────────────────────
//  GET /api/vendor/reviews
// ─────────────────────────────────────────────────────────────
exports.getReviews = async (req, res) => {
  try {
    const vendorId = getVendorId(req);
    const { rows } = await pool.query(
      `SELECT r.*, u.name AS customer_name
       FROM reviews r
       LEFT JOIN users u ON u.id = r.user_id
       WHERE r.vendor_id = $1
       ORDER BY r.created_at DESC`,
      [vendorId]
    );
    res.json(rows);
  } catch (error) {
    console.error('getReviews error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
};