# Bruno Sells backend

Bruno Sells is an independent item marketplace for verified students near Brown. It is not affiliated with Brown University. Buyers and sellers coordinate through item-specific chat and handle payment and handoff directly.

Run `npm install`, copy `.env.example` to `.env`, set `JWT_SECRET`, and run `npm start`. SQLite is used locally unless `DATABASE_URL` points to PostgreSQL. Cloudinary is optional; image data URLs are the fallback. Registration uses `approved_domains`, seeded with `brown.edu`. Email code authentication remains.

Public read API: `GET /items?category=&search=`, `GET /items/:id`, and `GET /users/:id` for active seller profiles.

Authenticated API: `POST /items`, `PATCH /items/:id`, `DELETE /items/:id`, `PATCH /items/:id/status`, `POST /items/:id/interest`, `GET /items/mine/listings`, `GET /items/mine/inquiries`, `/conversations`, `GET /auth/me`, and `PATCH /auth/profile`. Registration and login remain public under `/auth`.

Categories: books, electronics, furniture, clothing, home, other. Conditions: new, like-new, used. Statuses: available, pending, sold. Images are limited to three.

The migration removes old task and tutoring records and their user-pair chats because those chats have no reliable item association. Back up the production database before first deployment if those records need archival.
