# Bruno Sells frontend

A single purpose item marketplace for verified students near Brown, independent of Brown University.

Run `npm install` and `npm run dev` locally. Build with `npm run build`. Set `VITE_API_BASE` when the API is on another origin.

Visitors can browse `/board`, open `/items/:id`, view seller profiles at `/users/:id`, and read `/help` without an account. Posting, messaging, personal listings, and account settings require sign-in. The login page returns users to the page they requested.

Routes: `/` landing, `/login`, `/board` available items, `/post` new listing, `/items/:id` details and seller controls, `/mine` listings and inquiries, `/messages`, `/chat/:conversationId`, `/account`, `/users/:id`, and `/help`. Payment and handoff are arranged directly in chat.
