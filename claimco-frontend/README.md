# Bruno Sells frontend

A single purpose item marketplace for verified Brown and RISD students in Providence, independent of both schools.

Run `npm install` and `npm run dev` locally. Build with `npm run build`. Set `VITE_API_BASE` when the API is on another origin.

Visitors can browse `/board`, open `/items/:id`, view seller profiles at `/users/:id`, and read `/help` without an account. Posting, messaging, personal listings, and account settings require sign-in. The login page returns users to the page they requested.

Routes: `/` landing, `/login`, `/board` available items, `/post` new listing, `/items/:id` details and seller controls, `/mine` listings and inquiries, `/messages`, `/chat/:conversationId`, `/account`, `/users/:id`, and `/help`. Payment and handoff are arranged directly in chat.

## Free analytics

The Umami Cloud website ID is configured in `src/analytics.js`. It is public by design, and no Vercel environment variable is needed. An optional `VITE_UMAMI_WEBSITE_ID` can override it for a different website.

After deployment, visit `https://www.claimforcampus.com/board` in a browser without Do Not Track or an analytics blocker, then open the Umami dashboard. Browse an item, click **Message seller**, and check **Events**. A listing post and completed email verification also produce events after successful API responses.

The tracker runs only on `claimforcampus.com` and `www.claimforcampus.com` in production builds. It does not run locally. Page routes are grouped (`/items/:id`, `/users/:id`, `/chat/:conversationId`), and the app does not include queries, IDs, emails, search terms, chat text, or form contents in analytics payloads. Do Not Track is enabled. The backend is unchanged.
