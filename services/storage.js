const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'reviews.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    rating INTEGER NOT NULL,
    text TEXT NOT NULL,
    sentiment TEXT NOT NULL,
    created_at TEXT NOT NULL,
    track TEXT,
    delivery_date TEXT,
    office_address TEXT,
    office_date TEXT,
    staff_name TEXT,
    staff_address TEXT,
    staff_datetime TEXT
  )
`);

const insertReviewStmt = db.prepare(`
  INSERT INTO reviews (
    user_id,
    category,
    rating,
    text,
    sentiment,
    created_at,
    track,
    delivery_date,
    office_address,
    office_date,
    staff_name,
    staff_address,
    staff_datetime
  ) VALUES (
    @user_id,
    @category,
    @rating,
    @text,
    @sentiment,
    @created_at,
    @track,
    @delivery_date,
    @office_address,
    @office_date,
    @staff_name,
    @staff_address,
    @staff_datetime
  )
`);

function saveReview(review) {
  return insertReviewStmt.run({
    user_id: review.user_id,
    category: review.category,
    rating: review.rating,
    text: review.text,
    sentiment: review.sentiment,
    created_at: review.created_at,
    track: review.track || null,
    delivery_date: review.deliveryDate || null,
    office_address: review.officeAddress || null,
    office_date: review.officeDate || null,
    staff_name: review.staffName || null,
    staff_address: review.staffAddress || null,
    staff_datetime: review.staffDatetime || null,
  });
}

function getStats() {
  const total = db.prepare(`SELECT COUNT(*) as count FROM reviews`).get();
  const avg = db.prepare(`SELECT ROUND(AVG(rating), 2) as avgRating FROM reviews`).get();

  const today = db.prepare(`
    SELECT COUNT(*) as count
    FROM reviews
    WHERE date(created_at) = date('now', 'localtime')
  `).get();

  const week = db.prepare(`
    SELECT COUNT(*) as count
    FROM reviews
    WHERE datetime(created_at) >= datetime('now', '-7 days', 'localtime')
  `).get();

  const sentiments = db.prepare(`
    SELECT sentiment, COUNT(*) as count
    FROM reviews
    GROUP BY sentiment
  `).all();

  return {
    today: today.count || 0,
    week: week.count || 0,
    total: total.count || 0,
    avgRating: avg.avgRating || 0,
    sentiments,
  };
}

function getAllReviews() {
  return db.prepare(`
    SELECT *
    FROM reviews
    ORDER BY datetime(created_at) DESC
  `).all();
}

module.exports = {
  saveReview,
  getStats,
  getAllReviews,
};