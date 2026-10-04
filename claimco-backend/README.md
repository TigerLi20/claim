# College Hill Market backend

College Hill Market is an independent item marketplace for verified students near Brown. It is not affiliated with Brown University. Buyers and sellers coordinate through item-specific chat and handle payment and handoff directly.

Run `npm install`, copy `.env.example` to `.env`, set `JWT_SECRET`, and run `npm start`. SQLite is used locally unless `DATABASE_URL` points to PostgreSQL. Cloudinary is optional; image data URLs are the fallback. Registration uses `approved_domains`, seeded with `brown.edu`. Email code authentication remains.

## Marketplace insights

Sign in as `tiger_li@brown.edu`, then open `/insights` on the frontend (or use Settings → Marketplace insights). `ANALYTICS_ADMIN_EMAILS` can override or extend the dashboard allowlist with comma-separated emails. The API checks the signed-in user's current database email before returning metrics.

Existing tables provide active account counts, listing counts/statuses, and new conversations/message counts. A startup migration adds `items.sold_at`, plus small aggregate tables for item views and anonymous search sessions. No reset is needed. The dashboard shows current calendar month in UTC for behavior metrics and estimated GMV; account, listing, and sold share counts are current totals. Search exit rate is the share of finished text-search sessions that opened no listing, with no-click sessions considered finished after 30 minutes. Inquiry rate is new item conversations divided by non-seller views of unsold item details. Average conversation length includes zero-message inquiries.

Payments happen off-platform, so estimated GMV is the sum of asking prices for listings currently marked sold during the month, not confirmed payment volume. Listings sold before this migration have no `sold_at` and cannot be assigned to a historical month. Deleted listings and their conversations are excluded from database-derived totals. Search phrases, visitor IDs, and item IDs are not stored in the analytics tables.

Public read API: `GET /items?category=&search=`, `GET /items/:id`, and `GET /users/:id` for active seller profiles.

Authenticated API: `POST /items`, `PATCH /items/:id`, `DELETE /items/:id`, `PATCH /items/:id/status`, `POST /items/:id/interest`, `GET /items/mine/listings`, `GET /items/mine/inquiries`, `/conversations`, `GET /auth/me`, and `PATCH /auth/profile`. Registration and login remain public under `/auth`.

Categories: books, electronics, furniture, clothing, home, art (Art & Unique Finds), other. Conditions: new, like-new, used. Statuses: available, pending, sold. Images are limited to three.

The migration removes old task and tutoring records and their user-pair chats because those chats have no reliable item association. Back up the production database before first deployment if those records need archival.

Removed listings remain in My Listings with a relist action. Removal retains photos and chats and starts a four-calendar-month expiry (month-end dates are clamped). Relisting returns the item to available and clears expiry; removing it again starts a new timer. Repeated removal does not extend expiry. Sold and pending items are retained until explicitly removed.

The backend checks expired removed listings at startup and hourly. Cleanup deletes their messages, conversations, and item records in a transaction and queues Cloudinary asset IDs for deletion. Failed image deletions remain queued for retry, including across restarts. The server must be running for cleanup; downtime is caught up on startup. Existing databases gain the expiry columns and cleanup queue automatically.
