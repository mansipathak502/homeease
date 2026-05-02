const { pool } = require('../config/db');

// ── VENDOR MANAGEMENT ──────────────────────────────────────────────────────

exports.getAllVendors = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id,business_name,owner_name,email,phone,address,city,state,zip_code,
       service_category,services_offered,description,years_in_business,pricing,
       availability,website,certification,is_approved,created_at FROM vendors ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

exports.getVendorStats = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT v.id AS vendor_id,
        COUNT(b.id) AS "totalBookings",
        COUNT(b.id) FILTER (WHERE b.status='completed') AS "completedJobs",
        COUNT(b.id) FILTER (WHERE b.status='cancelled') AS "cancelledJobs",
        ROUND(COUNT(b.id) FILTER (WHERE b.status='cancelled')::NUMERIC/NULLIF(COUNT(b.id),0)*100,1) AS "cancelRate",
        COALESCE(AVG(r.rating),0) AS "avgRating",
        COALESCE(SUM(b.vendor_payout) FILTER (WHERE b.status='completed'),0) AS "totalEarnings"
      FROM vendors v LEFT JOIN bookings b ON b.vendor_id=v.id LEFT JOIN reviews r ON r.vendor_id=v.id GROUP BY v.id
    `);
    res.json({ success: true, stats: result.rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.approveVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE vendors SET is_approved=true WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ message: 'Vendor not found' });
    res.json({ success: true, message: 'Vendor approved' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

exports.rejectVendor = async (req, res) => {
  try {
    const { id } = req.params;
    const vendor = await pool.query('SELECT email,business_name FROM vendors WHERE id=$1', [id]);
    if (vendor.rows.length === 0) return res.status(404).json({ message: 'Vendor not found' });
    await pool.query('DELETE FROM vendors WHERE id=$1', [id]);
    res.json({ success: true, message: 'Vendor rejected' });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

exports.deleteVendor = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM vendors WHERE id=$1', [id]);
    res.json({ success: true, message: 'Vendor deleted' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── USER MANAGEMENT ────────────────────────────────────────────────────────

exports.getAllUsers = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id,name,email,phone,location,created_at FROM users ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

exports.blockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE users SET is_blocked=1 WHERE id=$1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'User blocked' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.unblockUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE users SET is_blocked=0 WHERE id=$1', [id]);
    res.json({ success: true, message: 'User unblocked' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM bookings WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM favorites WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM reviews WHERE user_id=$1', [id]);
    await pool.query('DELETE FROM users WHERE id=$1', [id]);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params; const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Password must be 6+ chars' });
    const bcrypt = require('bcryptjs');
    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password=$1 WHERE id=$2', [hashed, id]);
    res.json({ success: true, message: 'Password reset' });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

// ── DASHBOARD STATS ────────────────────────────────────────────────────────

exports.getDashboardStats = async (req, res) => {
  try {
    const [totalVendors, pendingVendors, approvedVendors, totalUsers, totalBookings, revenue] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM vendors'),
      pool.query('SELECT COUNT(*) AS count FROM vendors WHERE is_approved=false'),
      pool.query('SELECT COUNT(*) AS count FROM vendors WHERE is_approved=true'),
      pool.query('SELECT COUNT(*) AS count FROM users'),
      pool.query('SELECT COUNT(*) AS count FROM bookings'),
      pool.query(`SELECT COALESCE(SUM(admin_earning),0) AS total FROM bookings WHERE final_payment_status='paid'`),
    ]);
    res.json({
      totalVendors:    parseInt(totalVendors.rows[0].count),
      pendingVendors:  parseInt(pendingVendors.rows[0].count),
      approvedVendors: parseInt(approvedVendors.rows[0].count),
      totalUsers:      parseInt(totalUsers.rows[0].count),
      totalBookings:   parseInt(totalBookings.rows[0].count),
      totalRevenue:    parseFloat(revenue.rows[0].total) || 0,
    });
  } catch (err) { console.error(err); res.status(500).json({ message: 'Server error' }); }
};

// ── PAYMENT MANAGEMENT ─────────────────────────────────────────────────────

// GET /api/admin/payments
exports.getPayments = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        b.id, b.status, b.date, b.created_at,
        b.payment_method, b.payout_status,
        b.quote_amount, b.quote_status, b.advance_amount,
        b.final_amount, b.final_payment_status, b.final_payment_method,
        COALESCE(b.commission_pct, 10)                                           AS commission_pct,
        COALESCE(b.admin_earning,
          ROUND(COALESCE(b.final_amount, b.quote_amount, 0)
                * COALESCE(b.commission_pct, 10) / 100))                         AS admin_earning,
        COALESCE(b.vendor_payout,
          COALESCE(b.final_amount, b.quote_amount, 0)
          - ROUND(COALESCE(b.final_amount, b.quote_amount, 0)
                  * COALESCE(b.commission_pct, 10) / 100))                       AS vendor_payout,
        u.name  AS customer_name,
        u.phone AS customer_phone,
        u.email AS customer_email,
        v.business_name AS vendor_name,
        b.service_name
      FROM bookings b
      LEFT JOIN users   u ON u.id = b.user_id
      LEFT JOIN vendors v ON v.id = b.vendor_id
      ORDER BY b.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    console.error('getPayments error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch payments' });
  }
};

// GET /api/admin/payments/summary
exports.getPaymentSummary = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        COALESCE(SUM(admin_earning), 0)                                          AS "adminTotalEarning",
        COALESCE(SUM(vendor_payout), 0)                                          AS "vendorTotalPayout",
        COALESCE(SUM(
          CASE WHEN payout_status = 'pending'
                AND final_payment_status = 'paid'
               THEN vendor_payout ELSE 0 END), 0)                                AS "pendingVendorPayout",
        COUNT(CASE WHEN final_payment_status = 'paid' THEN 1 END)                AS "paidTransactions"
      FROM bookings
    `);
    res.json(rows[0]);
  } catch (err) {
    console.error('getPaymentSummary error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
};

// PUT /api/admin/payments/global-commission  ← MUST be registered before /:id routes in adminRoutes.js
exports.setGlobalCommission = async (req, res) => {
  try {
    const { commission_pct } = req.body;
    if (commission_pct === undefined || isNaN(commission_pct) || commission_pct < 0 || commission_pct > 100)
      return res.status(400).json({ success: false, message: 'Invalid commission % (must be 0–100)' });

    const { rowCount } = await pool.query(
      `UPDATE bookings
       SET commission_pct = $1,
           admin_earning  = ROUND(COALESCE(final_amount, quote_amount, 0) * $1 / 100),
           vendor_payout  = COALESCE(final_amount, quote_amount, 0)
                            - ROUND(COALESCE(final_amount, quote_amount, 0) * $1 / 100),
           updated_at     = NOW()
       WHERE final_payment_status IS NULL OR final_payment_status = ''`,
      [commission_pct]
    );
    res.json({ success: true, message: `Commission set to ${commission_pct}% for ${rowCount} bookings` });
  } catch (err) {
    console.error('setGlobalCommission error:', err);
    res.status(500).json({ success: false, message: 'Failed to set global commission' });
  }
};

// PUT /api/admin/payments/:id/commission
exports.setCommission = async (req, res) => {
  try {
    const { id } = req.params;
    const { commission_pct } = req.body;
    if (commission_pct === undefined || isNaN(commission_pct) || commission_pct < 0 || commission_pct > 100)
      return res.status(400).json({ success: false, message: 'Invalid commission % (must be 0–100)' });

    const { rows } = await pool.query(
      'SELECT final_amount, quote_amount FROM bookings WHERE id=$1', [id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'Booking not found' });

    const totalAmt  = parseFloat(rows[0].final_amount || rows[0].quote_amount || 0);
    const adminEarn = Math.round(totalAmt * commission_pct / 100);
    const vendorPay = totalAmt - adminEarn;

    await pool.query(
      `UPDATE bookings SET commission_pct=$1, admin_earning=$2, vendor_payout=$3, updated_at=NOW() WHERE id=$4`,
      [commission_pct, adminEarn, vendorPay, id]
    );
    res.json({ success: true, summary: { adminEarning: adminEarn, vendorPayout: vendorPay } });
  } catch (err) {
    console.error('setCommission error:', err);
    res.status(500).json({ success: false, message: 'Failed to update commission' });
  }
};

// PUT /api/admin/payments/:id/payout-done
exports.markPayoutDone = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      `UPDATE bookings SET payout_status='paid', updated_at=NOW() WHERE id=$1`, [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('markPayoutDone error:', err);
    res.status(500).json({ success: false, message: 'Failed to update payout' });
  }
};

// GET /api/admin/bookings  (used by adminBookingsController but kept here as fallback)
exports.getBookings = async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT b.*,
             u.name AS customer_name,
             v.business_name AS vendor_name
      FROM bookings b
      LEFT JOIN users   u ON u.id = b.user_id
      LEFT JOIN vendors v ON v.id = b.vendor_id
      ORDER BY b.created_at DESC
    `);
    res.json({ success: true, bookings: rows });
  } catch (err) { console.error(err); res.status(500).json({ success: false, message: 'Server error' }); }
};

// GET /api/admin/payments/global-commission
// GET /api/admin/payments/global-commission
exports.getGlobalCommission = async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT commission_pct FROM bookings 
       WHERE commission_pct IS NOT NULL
       ORDER BY updated_at DESC LIMIT 1`
    );
    res.json({ commission_pct: rows.length ? rows[0].commission_pct : null });
  } catch (err) {
    console.error('getGlobalCommission error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};