# AniSave

A farm-to-buyer marketplace connecting farmers directly with buyers — built with the MERN stack (MongoDB, Express, React, Node.js) for our school project.

## Project Structure

```
AniSave/
├── client/                    # React frontend (Vite + Tailwind CSS)
│   ├── public/
│   └── src/
│       ├── components/        # Reusable/shared UI (ProtectedRoute, etc.)
│       ├── context/           # React Context (AuthContext)
│       ├── pages/             # Route-level pages (Login, Register, Dashboard, ...)
│       ├── services/          # API calls (axios)
│       ├── App.jsx            # Routes
│       └── main.jsx           # Entry point
│
└── server/                    # Express backend
    ├── config/                # DB connection
    ├── controllers/           # Route handler logic
    ├── middleware/            # Auth + error handling
    ├── data/                  # locations.json - Province > Municipality/City list + coordinates
    ├── private/               # (git-ignored) farmers' ID and farm documents - never served publicly
    ├── models/                # Mongoose schemas
    ├── routes/                # Express routers
    ├── scripts/               # One-off scripts (build location data, backfill addresses, create admin)
    ├── utils/                 # Helpers (JWT signing, distances, address lookup, etc.)
    └── server.js               # Entry point
```

As we build out the rest of the system flow (product listings, orders, crop demand board, admin dashboard), each feature gets its own model/controller/route on the server and its own page(s)/components on the client — e.g. `models/Product.js`, `controllers/productController.js`, `routes/productRoutes.js`, `pages/farmer/AddProduct.jsx`.

## Roles

The system has three roles, matching the flow doc: **farmer**, **buyer**, **admin**. Farmers and buyers self-register (`role` field on the `User` model); farmer accounts start unverified and need admin approval (`isVerified`) before they can list products.

## Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB running locally (`mongodb://127.0.0.1:27017`) or a MongoDB Atlas connection string

### 1. Backend

```bash
cd server
npm install        # already done if you followed setup with Claude
npm run dev         # starts on http://localhost:5000
```

Copy `.env.example` to `.env` and fill in your own values if you don't already have one (a `.env` with a generated `JWT_SECRET` was created for local dev).

### 2. Frontend

```bash
cd client
npm install         # already done if you followed setup with Claude
npm run dev          # starts on http://localhost:5173
```

Copy `.env.example` to `.env` if needed — it points the client at the local API by default.

### 3. Try it out

Open http://localhost:5173, register as a Farmer or Buyer, then log in.

## Auth Flow (currently implemented)

- `POST /api/auth/register` — creates a user (`farmer` or `buyer`) with the address they picked (`provinceCode`, `cityCode`), hashes the password, returns a JWT
- `POST /api/auth/login` — logs in with **username** (not email) + password, returns a JWT (or, for accounts with two-step sign-in, asks for an emailed code first - see Security)
- `GET /api/auth/me` — returns the logged-in user (requires `Authorization: Bearer <token>`)

Login uses **username**, not email — email is collected at registration only so it's available for a future "forgot password" flow. Passwords must be 6-12 characters with at least one capital letter and one special character (enforced both client-side in `Register.jsx` and server-side in the `User` model, so the API rejects a weak password even if someone bypasses the form).

The client stores the JWT + user info in `localStorage` via `AuthContext` and attaches it to future API requests automatically.

## Addresses and "nearest"

Everyone registers with a **Province → Municipality/City** address picked from dropdowns (the same pickers appear in Edit Profile). Nobody types a latitude or longitude and the app never asks for a live GPS location: the server looks up the picked city's centre point from its code and saves it on the user (`address.latitude` / `address.longitude`).

- `GET /api/locations/provinces` and `/provinces/:code/cities` feed the dropdowns.
- "Nearest" compares the signed-in buyer's registered city coordinates with each farmer's using the haversine formula, and sorts nearest → farthest: `GET /api/farmers?sort=nearest` and `GET /api/products?sort=nearest`. Each result carries `distanceKm`; farmers' coordinates are never sent to the client.
- Accounts made before this existed only have free-typed `location` text (or a barangay from an earlier version). `node scripts/backfillAddresses.js --dry-run` (then without `--dry-run`) gives them a city-level address where their text names exactly one city/municipality; everyone else can pick one in Edit Profile.
- The address list lives in `server/data/locations.json` and is committed - every one of the country's 1,634 cities and municipalities has coordinates in it. It is generated, not typed: to rebuild it (PSGC + Wikidata, see `server/data/README.md`) run `node scripts/buildLocations.js`.

## Security

How sign-up, login and sessions are protected. Everything here is enforced on the server, not just in the forms.

- **Input validation** — `server/utils/validate.js` checks every auth request (types, lengths, email/username/phone formats; objects where text is expected get a 400), and the `User` schema repeats the rules. Uploads are limited to JPG/PNG/WebP/GIF, saved under a name the server picks, and their first bytes are checked - an `.html`/`.svg` file dressed up as an image is refused.
- **Passwords and codes** — passwords are bcrypt hashes. One-time codes are made with `crypto.randomInt`, stored as an HMAC, expire in 10-15 minutes, work once, and die after 5 wrong guesses (`server/utils/otp.js`).
- **Brute force** — 5 wrong passwords lock an account for 15 minutes; per-IP rate limits cover failed logins/codes, anything that sends email, and sign-ups (`server/middleware/rateLimiters.js`).
- **Two-step sign-in** — after the password, an emailed code (`POST /api/auth/login/mfa`). Always on for admins; optional for everyone else under Profile → Privacy & Security. The passwordless "email code" login is switched off for accounts that use two steps, so it can't be used to skip the password.
- **Sessions** — tokens last 7 days (`JWT_EXPIRES_IN`) and carry a version number. Logging out (`POST /api/auth/logout`), changing or resetting a password, or being banned raises it, so every older token stops working at once. The app returns to the login page when the server says a session has ended.
- **Private documents** — a farmer's ID and farm documents live in `server/private/documents`, never in the public `uploads/` folder. Only their owner and admins can open them, through `GET /api/documents/:file`. If you have documents from before this existed, run `node scripts/movePrivateDocuments.js --dry-run` (then without `--dry-run`) once.
- **Privacy** — sign-up requires agreeing to the Terms of Use and Privacy Policy (`/terms`, `/privacy`); farmers also consent to their documents being reviewed. The agreement is saved with a version and time. Users can download their data (`GET /api/auth/me/export`) and delete their account, which also deletes their documents. A farmer's phone number is shown only to signed-in users.
- **Errors and headers** — errors never include stack traces or internal text (details go to the server log), `helmet` sets security headers, and CORS only allows `CLIENT_URL`.
- **Tests** — with `NODE_ENV=test` no email is ever sent (messages are written to a file in the temp folder); add `RATE_LIMIT=off` to run bulk tests. Set `NODE_ENV=production` when deployed.

## Reports

Buyers can report a farmer from the farmer's shop page (the menu at the top right → **Report this user**): pick a reason, describe what happened (up to 320 characters) and optionally attach up to 5 photos.

- Reports go to the admin's **Reports** page (`/admin/reports`, `GET /api/admin/reports`). Each has a status: **Pending** → **Reviewed** (an admin has opened it) → **Dismissed** or **Suspended** (the admin's final decision, `PATCH /api/admin/reports/:id/decision`).
- **Suspending** a farmer restricts their account like a ban (they're signed out immediately and can't log in - they're told the account is *suspended*), and hides their shop and products from buyers. Unbanning them from the Users page lifts it.
- Evidence photos are private (`server/private/reports`), readable only by the buyer who sent them and admins (`GET /api/report-evidence/:file`).
- A buyer can have one open report per farmer and send up to 5 a day. Deleting an account also deletes the reports it sent (or, for a farmer, reports about them).

### Reporting a review

On a product's **Ratings** page every review has a **Report review** button - buyers can report other people's reviews, and a farmer the reviews of their own products. Pick a reason (Adult or Sexual Content, Spam, Rude or Abusive, Exposing Personal Information, Suspected Fake, Misleading or Inaccurate, or **Other Violations**, which has to be explained) and press **Submit**.

- Submitting sends the report straight to the administrators (`POST /api/review-reports`) and shows a thank-you.
- Reports go to the admin's **Review Reports** page (`/admin/review-reports`, `GET /api/admin/review-reports`). Status: **Pending** → **Reviewed** (an admin has opened it) → **Dismissed**, **Removed** (the review is taken down) or **Suspended** (the review is taken down and its author is suspended, like a ban; a note is required) - `PATCH /api/admin/review-reports/:id/decision`.
- A removed review is hidden and no longer counts towards the product's or the farmer's rating (`removedAt` on the rating). Nobody can report the same review twice, and one account can send 10 a day.
- Deleting an account also deletes the review reports it sent or was the subject of.

## Blocking a shop

A buyer blocks a farmer from the shop page — the menu at the top right → **Block this user** — and confirms. The block is kept on the buyer's own account, and the server is what enforces it, not the page:

- **The shop stops reaching that buyer.** It is dropped from the farmers list, from browsing, search and every sort (Recommended, Nearest, Flash Sale); a link straight to one of its listings, or to the reviews on one, returns 404. The shop's own page shows "You blocked ..." with an **Unblock** button instead of the shop.
- **The farmer can no longer sell to them.** `POST /api/orders` is refused with 403 however the buyer reached the listing, and so is reviewing one of their products. Anything of theirs sitting in the cart is taken out when the block is made.
- **Orders placed before the block are left alone** — blocking stops what comes next, it doesn't undo what the two of them already agreed.
- **Profile → Blocked Users** (next to Edit Profile and Change Password) lists every blocked shop; **Unblock** there, or on the shop's page, puts everything back at once.
- Endpoints: `GET /api/blocks`, `POST /api/blocks/:farmerId`, `DELETE /api/blocks/:farmerId`, buyers only. The list is private - it is left out of every other response, an admin's included - and one account can block up to 100 shops. Deleting a farmer's account clears them from everyone's list.

## Deleting a farmer account

Farmer settings → the menu on the profile card → **Delete Account** opens `/farmer/delete-account`:

1. **Choose Deletion Reason** — I no longer want to use AniSave / I want to change my username / I no longer need the account / I found another marketplace / **Others**, which has to be explained.
2. **Request Account Deletion** — the reason (tap it to change), the email address the code will go to, and a tick for the **Terms & Conditions for account deletion** (the clauses open over the form, so nothing typed is lost). Submit is off until all three are in place.
3. **The OTP** — Submit asks the server to email a 6-digit code (`POST /api/auth/delete-account/request-otp`, which checks the reason and the agreement for farmers too). Entering it deletes the account (`POST /api/auth/delete-account/confirm`), and the browser returns to the login page.

Deleting cascades: products and their photos, orders, ratings, reports sent and received, the profile photo, and the ID and farm documents. The reason is never stored - the account it would belong to is being deleted. Buyers keep the shorter dialog in their own settings.

## Viewing the Database

MongoDB Compass (a GUI) is installed on this machine — open it from the Start Menu, connect to `mongodb://127.0.0.1:27017`, then open the `anisave` database → `users` collection to see registered accounts. Passwords are stored bcrypt-hashed, not in plain text.

## Next Steps

Following the system flow, the next pieces to build are:
1. Product listing model/routes (farmer) + marketplace browse/filter (buyer)
2. Order & escrow-style checkout flow
3. Crop Demand Board (buyer requests, farmer offers)
4. Admin dashboard (approve farmers/buyers, manage transactions)
5. Price suggestion tool + demand analytics
