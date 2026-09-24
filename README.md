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
    ├── data/                  # locations.json (Pangasinan municipalities + coordinates), crops.js (the product catalogue)
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

### What sign-up will accept

The form asks for a **First Name** and a **Last Name** rather than one full name, so each can be checked on its own; the server joins them back into the single `name` every other part of the app reads. Each is letters, with spaces allowed between words ("Maria Clara", "Dela Cruz"), and at least two letters long; a digit or a symbol is refused rather than stripped out. Spaces at either end are dropped and a doubled space becomes one, so "Dela  Cruz" is saved as "Dela Cruz".

A **contact number** (Edit Profile) is optional, but when given it is exactly 11 digits and nothing else - 09171234567, no dashes, spaces or +63. The box brings up a number pad, stops at 11 characters and says what is wrong before saving; the server checks it again. A number saved in an older format doesn't stop someone saving other changes, only a new number is checked.

A **username** is letters and digits, at least seven of them and no spaces. A **password** may not contain a space anywhere, on top of the length and strength rules above.

`client/src/utils/accountRules.js` and `client/src/utils/password.js` hold the client's copy so the form can say what is wrong before it is sent; `server/utils/validate.js` holds the real one. The form deliberately carries no `minLength` on these fields: the browser's own message would fire first and say something vaguer than the form can.

Two rules are kept deliberately looser than the sign-up form. `USERNAME_PATTERN` - the shape the `User` schema will save - still allows the dots, underscores and three-character names that accounts made before this rule have, or those people could never save their own profile again. And `validate.password` stays lenient where a password is being *checked* rather than set, so an account whose password predates the no-spaces rule can still prove who it is; `validate.newPassword` is the strict one, used by sign-up, reset and change-password.

The client stores the JWT + user info in `localStorage` via `AuthContext` and attaches it to future API requests automatically.

## Addresses and "nearest"

**AniSave serves Pangasinan only.** The province is fixed and shown but not editable; the address people actually choose is the **Municipality/City**, from that province's own 48 (the same picker appears in Edit Profile). Nobody types a latitude or longitude and the app never asks for a live GPS location: the server looks up the picked city's centre point from its code and saves it on the user (`address.latitude` / `address.longitude`). There is no barangay anywhere - an address is a province and a municipality/city.

The restriction is the data, not a filter: `server/data/locations.json` holds that one province and nothing else, so an address outside the service area has no code to be picked by and `resolveAddress` refuses it whatever a request claims ("AniSave currently serves Pangasinan only"). To serve somewhere else, add its name to `SERVICE_PROVINCES` in `scripts/buildLocations.js` and rebuild - nothing in the client hard-codes "Pangasinan".

- `GET /api/locations/service-area` names the fixed province; `/provinces` and `/provinces/:code/cities` feed the picker.
- "Recommended for You" (`GET /api/products?sort=recommended`) is what this buyer has bought before, first, then genuinely well-reviewed listings (4 stars and up). A guest sees only the well-reviewed ones.
- "Nearest" compares the signed-in buyer's registered city coordinates with each farmer's using the haversine formula, and sorts nearest → farthest: `GET /api/farmers?sort=nearest` and `GET /api/products?sort=nearest`. Each result carries `distanceKm`; farmers' coordinates are never sent to the client.
- Accounts made before this existed only have free-typed `location` text (or a barangay from an earlier version). `node scripts/backfillAddresses.js --dry-run` (then without `--dry-run`) gives them a city-level address where their text names exactly one city/municipality; everyone else can pick one in Edit Profile.
- The address list lives in `server/data/locations.json` and is committed - all 48 of Pangasinan's municipalities and cities, each with coordinates. It is generated, not typed: to rebuild it (PSGC + Wikidata, see `server/data/README.md`) run `node scripts/buildLocations.js`.

## Security

How sign-up, login and sessions are protected. Everything here is enforced on the server, not just in the forms.

- **Input validation** — `server/utils/validate.js` checks every auth request (types, lengths, email/username/phone formats; objects where text is expected get a 400), and the `User` schema repeats the rules. A listing's numbers go through the same file: a quantity or price is digits only, so a browser number box's "100e+" or "24e+" is refused rather than stored as NaN, and the form itself won't accept those characters in the first place. Uploads are limited to JPG/PNG/WebP/GIF, saved under a name the server picks, and their first bytes are checked - an `.html`/`.svg` file dressed up as an image is refused.
- **Passwords and codes** — passwords are bcrypt hashes. One-time codes are made with `crypto.randomInt`, stored as an HMAC, expire in 10-15 minutes, work once, and die after 5 wrong guesses (`server/utils/otp.js`).
- **Brute force** — 5 wrong passwords lock an account for 15 minutes; per-IP rate limits cover failed logins/codes, anything that sends email, sign-ups and chat messages (`server/middleware/rateLimiters.js`).
- **Two-step sign-in** — after the password, an emailed code (`POST /api/auth/login/mfa`). Always on for admins; optional for everyone else under Profile → Privacy & Security. The passwordless "email code" login is switched off for accounts that use two steps, so it can't be used to skip the password.
- **Sessions** — tokens last 7 days (`JWT_EXPIRES_IN`) and carry a version number. Logging out (`POST /api/auth/logout`), changing or resetting a password, or being banned raises it, so every older token stops working at once. The app returns to the login page when the server says a session has ended.
- **Private documents** — a farmer's ID and farm documents live in `server/private/documents`, never in the public `uploads/` folder. Only their owner and admins can open them, through `GET /api/documents/:file`. If you have documents from before this existed, run `node scripts/movePrivateDocuments.js --dry-run` (then without `--dry-run`) once.
- **Uploaded files are kept in the database too** — every photo, document and report photo is also stored in MongoDB (GridFS, the `fileStore.files` and `fileStore.chunks` collections) under the same path (`server/utils/fileStore.js`). The disk copy is read first while it exists, but a host like Render wipes its disk on every deploy and restart, so without the database copy a farmer's ID would be gone by the time an admin opened it. Removing a file removes both copies, and the privacy rules above apply to either. Files uploaded before this existed are only on the disk they were uploaded to. Atlas's free tier holds 512 MB in all, so large photos count against the same space as the data.
- **Privacy** — sign-up requires agreeing to the Terms of Use and Privacy Policy (`/terms`, `/privacy`); farmers also consent to their documents being reviewed. The agreement is saved with a version and time. Users can download their data (`GET /api/auth/me/export`) and delete their account, which also deletes their documents. A farmer's phone number is shown only to signed-in users.
- **Errors and headers** — errors never include stack traces or internal text (details go to the server log), `helmet` sets security headers, and CORS only allows `CLIENT_URL`.
- **Tests** — with `NODE_ENV=test` no email is ever sent (messages are written to a file in the temp folder); add `RATE_LIMIT=off` to run bulk tests. Set `NODE_ENV=production` when deployed.

## The buyer's marketplace

The top of the marketplace is a carousel (`components/buyer/HomeBanner.jsx`, `h-80`) of two fixed slides plus up to three real listings - Flash Sale items first, topped up with the newest, and only ones with a photo to show. It advances itself every four seconds, holds while the pointer or the keyboard is on it, and does not advance at all where the system asks for less motion. The Flash Sale and Nearest to You tiles sit beside it and grow with it. The filter row underneath reaches the same places - All Products, Recommended for You, Nearest to You, Newest Products and Flash Sale - so neither a tile nor the row is the only way to anything.

Sections drift up into place as they are scrolled to. A page marks a single element with `data-reveal` and a list or grid with `data-reveal-children`; `useScrollReveal` watches what is marked, and anything it sees come into view gets `.scroll-reveal-visible`. `data-reveal-children` is what keeps a long grid animating the whole way down instead of arriving in one go at its first row: each item comes in as it is reached, a little after the one to its left on the same row (rows are worked out from `offsetTop`, so the stagger is right at any width). A page that marks nothing has its top-level blocks revealed instead, which is how every page behaved before. Anything already on screen when a page opens is revealed immediately, so nothing below a fold is ever the reason a page looks empty, and `prefers-reduced-motion` turns the whole thing off.

The cart (`pages/buyer/CartPage.jsx`) is a table: a tick, the photo and name, the price per kilo, the quantity, that row's total and a remove button, with the **total expense** of the ticked rows underneath. Quantities can be typed as well as stepped, and are held between 1 and the stock the farmer has. Unticking a row leaves it in the cart but takes it out of the total and out of what Check Out sends on to the checkout page.

The cart opens with **nothing ticked**. It is where a basket is looked over, not a checkout queue: ticking everything on arrival made the total and the Check Out button speak for items the buyer had not chosen yet, and left them unticking row by row.

In the Add to Cart and Checkout dialogs (`components/buyer/QuantityInput.jsx`) an empty box or a typed **0 is refused**, not tidied. It used to be turned into 1 on the way out, so asking for 0 kilos quietly ordered one; now the box says so and the dialog's confirm button is off until it holds a real quantity.

## Marketplace product cards

A card on the buyer marketplace (`components/products/ProductCard.jsx`) shows six things and no more: the photo, the name, the price per kilo, the category, the location and how many kilos are available. White card, near-white page, green used only as an accent.

The photo is the part with work in it. Farmers upload whatever picture they have, and most are produce sitting on a plain backdrop - which on a white card shows up as a visible rectangle, with the produce small and adrift inside it. So **for display only**, `utils/cutout.js` traces each photo in the browser: it samples the corners for the backdrop colour, works inwards from the edges making everything that matches it transparent, fades the blurred rim so nothing is left haloed, then crops to what remains and hands back a PNG. The produce ends up on the card itself, at a good size, with no box around it.

- **The upload is never touched.** Nothing is written, nothing is saved, and the file on the server is the one the farmer sent. Only the buyer's browser does this, only to draw the card.
- **It declines more often than you would think, and that is the point.** A photo whose corners disagree about the colour, one where too little would be removed to bother, one where the trace would eat the produce (a white egg on a white cloth), one that can't be read - each returns nothing and the card shows the original photo, given softened corners so it still sits well. A field or a full crate has no backdrop to remove and is left exactly as it is.
- Photos are traced one at a time and each result is kept for the life of the page, so a grid of twenty doesn't read twenty photos' pixels at once.
- It needs to read the pixels back, which means `/uploads` has to allow it - the CORS middleware in `server.js` already runs before the static folder, so it does. If that ever changed, every photo would quietly fall back to the original rather than break.

## The farmer's dashboard

- **Analytical Demands** plots completed orders over Today / This Week / This Month / This Year / a custom range, and switches between **Revenue (₱)** and **Quantity Sold (KG)** — the same orders read as what they were worth, or as how much produce left the farm.
- **Top Searched Products** is demand as buyers show it, not sales: how often a crop's listings came back in a search and were opened (`ProductInterest`, counted in `utils/interest.js`, read by `GET /api/products/top-searched`). Only buyers and visitors count - a farmer opening their own listing, or an admin moderating one, does not - and nothing in it comes from orders, so a crop everyone looks for and nobody has bought yet still shows up. The same crop listed by several farmers is added together by name. A view is counted only when a buyer opens a listing from somewhere they browse - the marketplace sections or a farmer's shop - which those pages say with `?opened=true`. Loading a product any other way counts for nothing: the ratings page, a report form and the checkout all fetch it, and so does stepping back to a listing already seen, and none of those is a fresh look at it. On top of that, one look counts once - the same person meeting the same listing again within a few seconds is ignored, so a page that asks twice in the same breath, which React does on every mount while developing, can't turn one click into two.
- The sales leaderboards (**Top Purchase this Month**) and **Recommended Flash Sales** are unchanged: those are about what has actually sold.

## The product catalogue

A listing doesn't name its produce in free text. The farmer picks from a searchable catalogue (`crops`) and the listing stores that row's id, so "Mango" means one particular record everywhere in the app.

**The server writes the catalogue itself.** When it starts, it checks that every crop in `server/data/crops.js` is in the database, and writes the catalogue if any are missing - so a new database, such as a fresh Atlas cluster, has one on the first start (the log says `Crop catalogue: 101 crop(s) were missing, so it was written`). If all of them are there, it touches nothing. Without a catalogue the selector says "No product matches" to everything and no farmer can list a product. To push changes to crops that are already in the database, run `node scripts/seedCrops.js`.

- `GET /api/crops?q=man` is the typeahead behind the selector. Both what is stored and what is typed are reduced to the same **match key** (`server/utils/fold.js`): lower case, punctuation as spaces, and every word singularised. So capitalisation and a trailing "s" stop mattering in either direction - "MANGO", "mango" and "mangoes" are one search, "tomatoes" finds Tomato, and "green bean" finds Green Beans - without every spelling having to be listed. It matches a crop's local names too ("ampalaya" and "bitter melon" both reach Ampalaya, "camote" reaches Sweet Potato), and a fuller name still finds the crop ("Talong (Egg Plant)" → Eggplant). A name that matches nothing can't be picked, and the form submits the id, not the text.

  Over-eager singularising is harmless, because the same rule is applied to both sides: "asparagus" becomes "asparagu" whether it is typed or stored, so the two still meet. A handful of words that only look plural ("kamatis", "sitaw", "oats") are left alone.
- The catalogue's own name becomes the listing's title and its `listingCategory` becomes the listing's category, so a mango can't be filed under vegetables.
- **Varieties** are catalogue products of their own - Lakatan, Latundan and Saba Banana, Carabao Mango - so a farmer can list what they actually grow. Each carries `pricesFrom`, the crop it is priced as, because the market records a price for bananas rather than for each variety. The recommendation follows that link and labels the figure **Latest Market Price (Banana)**, so nothing is passed off as the variety's own price, and a price can't be recorded against a variety directly.
- **Eggs, meat and seafood** are in the catalogue too - Chicken, Duck and Quail Egg; Pork, Beef, Chicken, Carabeef and Goat Meat; Milkfish (Bangus), Tilapia, Galunggong, Hito, Shrimp, Crab, Squid, Tahong and Talaba - findable by their local names as well ("itlog", "baboy", "bangus", "hipon"). Each kind is a category of its own for buyers (**Eggs**, **Meat**, **Seafood**) rather than being filed under Vegetables. The farmer's product filters and a shop's tabs show those three only once there is something in them, so a shop selling only produce looks as it always did. Typing "egg" offers the eggs before Eggplant: a whole word of a name ranks above a name that merely starts with what was typed. Like everything else, they are sold by the kilo, and no market price is recorded for them yet.
- `node scripts/seedCrops.js --dry-run` (then without `--dry-run`) fills it from `server/data/crops.js`: 101 products across fruit, vegetable, root crop, grain, egg, meat and seafood, 64 of them supported by the Recommended Price feature (60 of those are what an admin can actually record a price against; the other 4 are varieties). Re-running it is safe - a crop is identified by its slug, its folded name, so a second run updates what it wrote before instead of adding a duplicate, and the unique index on `slug` means the database wouldn't allow one anyway. The catalogue is deliberately wider than the supported list: a farmer can list produce nobody records a market price for, and is simply told no recommendation is available.
- Listings made before the catalogue existed keep working. `node scripts/backfillProductCrops.js --dry-run` (then without `--dry-run`) links each one to the crop its title names, leaving titles as they are; anything it can't match unambiguously is listed and left for the farmer to fix by editing the listing.

## Recommended prices, by municipality

A farmer filling in **Add New Product** is shown what the product they picked last went for at their own municipality's market, as a suggestion. Nothing is hard-coded: every figure comes from a `MarketPrice` record an administrator entered.

- The municipality is the one on their account - the municipality/city they registered. Nothing reads a device's location.
- `GET /api/market-prices/recommendation?crop=<id>` answers with the latest live record for **that crop in that municipality**, matched on the catalogue id and the municipality's own PSGC code rather than on names. The form shows the product, the quantity, the municipality, the latest market price and the recommended selling price, with the date it was recorded and a **Use this price** button. The farmer can ignore it and type anything.
- With no record, the form says **Recommended Price Unavailable** — "No current market-price data is available for this product in your municipality." A price is never invented, averaged, or borrowed from the next town along, so the same crop genuinely reads ₱140/kg in Dagupan City and ₱100/kg in Mangatarem. A crop outside the supported list says so in its own words.
- **Admins keep the price book** at **/admin/market-prices**: add, edit, archive and delete records, filtered by municipality, with a separate Archived list. A record holds the product, the municipality/city, the price per KG and the date recorded (plus an optional source). Only supported products and Pangasinan municipalities can be chosen, and a price can't be dated in the future. Archiving retires a record from recommendations without losing the history; deleting is confirmed separately.
- `node scripts/seedMarketPrices.js --dry-run` (then without `--dry-run`) fills the table with **sample figures** for seven Pangasinan municipalities — marked `source: "Sample data"` so real data can replace them. Run `seedCrops.js` first.

## Orders

An order moves in a straight line: **New** (or **Pre-Order**, for a pre-order listing) → **Processing** → **Ready for Pickup** → **Completed**, or it is declined. The farmer moves it with `PATCH /api/orders/:id/status`; a buyer can cancel their own order while it is still unanswered, and archive it once it is done.

- Every reply about a single order carries the whole order — the buyer, the farmer and the product, not just their ids — so a status change never leaves the page holding an order whose buyer and product are bare ids (that is what once turned an accepted order's pickup card into "Unknown buyer").
- **Undo** (`PATCH /api/orders/:id/undo`, the farmer's own orders only) takes the last change back one step, for a mis-tapped Accept or Ready. The stage's timestamp is cleared with it, and a pre-order goes back to **Pre-Order** with its stock returned — `openedAs` on the order remembers which status it opened in. Two statuses are the end of the line and are never undone: a **Completed** order (it has been picked up, and may already be rated) and a **declined** one (the buyer has been told, and the stock is back). Orders placed before `openedAs` existed are treated as ordinary orders; to fill it in for them, run `node scripts/backfillOrderOpenedAs.js --dry-run` (then without `--dry-run`) once.
- Both Orders pages list **Pre-Order** right after **New** — the two statuses that are still waiting on the farmer's answer.

## Reports

Buyers can report a farmer from the farmer's shop page (the menu at the top right → **Report this user**): pick a reason, describe what happened (up to 320 characters) and optionally attach up to 5 photos.

- Reports go to the admin's **Reports** page (`/admin/reports`, `GET /api/admin/reports`). Each has a status: **Pending** → **Reviewed** (an admin has opened it) → **Dismissed** or **Suspended** (the admin's final decision, `PATCH /api/admin/reports/:id/decision`).
- **Suspending** a farmer restricts their account like a ban (they're signed out immediately and can't log in - they're told the account is *suspended*), and hides their shop and products from buyers. Unbanning them from the Users page lifts it.
- **They are told why.** Suspending needs a reason, and so does banning someone from the Users page (the ban dialog asks for one). When a restricted account tries to log in, the message includes it: "This account has been banned. Reason: Selling fake products. Contact support for more information." The reason is kept in `suspensionReason`, which never appears in any response except that message, and unbanning clears it. Accounts banned before reasons were recorded get the message without one.
- Evidence photos are private (`server/private/reports`), readable only by the buyer who sent them and admins (`GET /api/report-evidence/:file`).
- A buyer can have one open report per farmer and send up to 5 a day. Deleting an account also deletes the reports it sent (or, for a farmer, reports about them).

### Reporting a review

On a product's **Ratings** page every review has a **Report review** button - buyers can report other people's reviews, and a farmer the reviews of their own products. Pick a reason (Adult or Sexual Content, Spam, Rude or Abusive, Exposing Personal Information, Suspected Fake, Misleading or Inaccurate, or **Other Violations**, which has to be explained) and press **Submit**.

- Submitting sends the report straight to the administrators (`POST /api/review-reports`) and shows a thank-you.
- Reports go to the admin's **Review Reports** page (`/admin/review-reports`, `GET /api/admin/review-reports`). Status: **Pending** → **Reviewed** (an admin has opened it) → **Dismissed**, **Removed** (the review is taken down) or **Suspended** (the review is taken down and its author is suspended, like a ban; a note is required) - `PATCH /api/admin/review-reports/:id/decision`.
- A removed review is hidden and no longer counts towards the product's or the farmer's rating (`removedAt` on the rating). Nobody can report the same review twice, and one account can send 10 a day.
- Deleting an account also deletes the review reports it sent or was the subject of.

## Messages (chat between buyers and farmers)

A buyer messages a farmer with **Message Farmer** - on a product's page, beside View Seller, and on the farmer's shop page, beside Call Now. It opens their conversation on the **Messages** page (`/buyer/messages`), carrying on the one they already have if there is one. The farmer replies from **Messages** in their sidebar (`/farmer/messages`). Each page lists the person's conversations - newest first, with a preview and how many are unread - beside the open one, where every message shows who sent it and when. A red count on the Messages link says how many messages are unread in all.

- **Real time with Socket.IO.** A message is sent to the API like any other request (`POST /api/chats/:id/messages`), where it is checked and saved in MongoDB (`conversations`, `messages`). The server then pushes it straight to both people's open tabs (`server/utils/realtime.js`, `client/src/context/ChatContext.jsx`), so it appears without a refresh, and the unread counts update with it. If the connection drops - a free Render server sleeping, say - the page reconnects on its own and reloads what it shows, so nothing sent in the meantime is missed.
- **Only the two of them.** Every chat route answers "not found" to anyone who isn't in the conversation, admins included. A live connection needs the same login token as an API request (a logged-out, banned or replaced token is refused), each person only ever joins their own room, and connections are only accepted from the site itself. Logging out, changing a password, being banned or deleting the account closes that person's open connections at once.
- **Buyers start conversations; farmers reply.** Blocking works both ways: while a buyer has blocked a farmer, neither can message the other, and the conversation says so instead of showing a message box. Nobody can message a banned account.
- **Plain text, up to 1000 characters**, one line; it is always shown as text, never as markup. Sending is limited to 30 messages a minute from one address.
- Endpoints (buyers and farmers only): `GET /api/chats`, `GET /api/chats/unread`, `POST /api/chats` `{ farmerId }` (buyers), `GET /api/chats/:id`, `PATCH /api/chats/:id/read`, `POST /api/chats/:id/messages` `{ text }`.
- A person's messages are part of their data download, and deleting an account deletes their conversations with every message in them.

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

## The buyer's profile page

`pages/buyer/BuyerSettings.jsx` is two columns. On the left, who you are: the photo with a camera button that opens the same dialog the photo is changed in, the name, a Buyer badge, the town, and three figures - orders placed, kilos ordered and what is in the cart right now. All three are counted from this account's own orders and cart; there is nothing decorative in that row.

On the right the settings are grouped the way they are thought about rather than listed as buttons - Personal Information, Account & Security, Privacy & Safety, and a Danger Zone that is bordered and tinted so it doesn't look like the rest. Each row carries a line saying what it does, since "Blocked Users" alone doesn't say whether it blocks someone or lists who is blocked. What is on file - name, phone, email, address - stays readable on the page itself, not only inside the Edit Profile dialog.

Every row opens exactly what the old stack of buttons did, Log Out included. Nothing was added that AniSave doesn't have: the design this follows also offered Notifications and a Language & Region page, and those aren't here because they don't exist.

## Creating an administrator

Nobody can sign themselves up as an admin: `/api/auth/register` refuses the role outright. There are two ways in, and both end at the same place.

**From the site.** Go to `/admin/register`, enter the authorized admin address - the one in `EMAIL_USER`, and only that one - and finish with the six-digit code it emails there. This is the normal route, and it is the only one that works on a deployed site you have no terminal on.

**From a terminal.** `server/scripts/createAdmin.js` writes an admin straight to the database:

```bash
ADMIN_PASSWORD='...' node scripts/createAdmin.js siteadmin "Site Admin" admin@example.com
```

It applies the same username, password and email rules the sign-up form does, keeps the password out of your shell history, and never prints it back. It writes to whatever `MONGO_URI` points at - **the local database unless you say otherwise** - so it prints which database it actually reached before writing anything:

```bash
MONGO_URI='<your deployed database URI>' ADMIN_PASSWORD='...' \
  node scripts/createAdmin.js siteadmin "Site Admin" admin@example.com
```

If that username or email is already taken it stops rather than overwriting. `ADMIN_RESET=true` instead gives that account the new password and makes it an admin, and signs out every session it already had.

**Signing in as an admin always emails a six-digit code**, and unlike everyone else an admin cannot switch that off. So an admin account is only usable where the server can actually send email (see below), and where you can read that mailbox. An admin created on a server that can't send mail can be created and then never used.

## Running it somewhere other than your machine

The two halves deploy separately, and each needs its own settings - `server/.env` is never committed, so a host knows nothing that isn't configured there.

The **server** needs `MONGO_URI` (the deployed database, not localhost), a `JWT_SECRET` of 32 characters or more - it refuses to start in production without one - `NODE_ENV=production`, `CLIENT_URL` set to the website's address so CORS lets it through (comma-separate several), and a way to send email (next section). Behind a proxy or load balancer the app already sets `trust proxy`, so the rate limiter counts real visitors rather than the proxy.

### Sending email from a host

Every one-time code - login by email, password reset, two-step sign-in, account deletion and admin registration - goes through `server/utils/sendEmail.js`, which sends it one of three ways:

- **Gmail over SMTP**, with `EMAIL_USER` and `EMAIL_PASS` (a Gmail App Password). This is what runs on your own machine.
- **Through the mail relay**, whenever `MAIL_RELAY_URL` is set. The relay is `client/api/send-email.js`, a small function Vercel deploys along with the website, and it sends through the same Gmail account from there.
- **Brevo over HTTPS**, whenever `BREVO_API_KEY` is set and `MAIL_RELAY_URL` isn't. `EMAIL_USER` is still the sender; `EMAIL_PASS` isn't used.

Whichever way, `EMAIL_USER` is still the only address admin registration accepts.

**Render's free plan needs the relay or Brevo.** Render's free web services can't send on ports 25, 465 or 587, so from there Gmail's mail server never answers: the server log shows `Connection timeout`, or `ENETUNREACH` for Gmail's IPv6 addresses, and no setting of `EMAIL_PASS` can fix it. Vercel blocks only port 25, and the server reaches the relay over HTTPS like any web request. The server's first lines in the log say which way email will go, and on Render without either of the two, that no email will arrive.

To use the relay, which needs no new account:

1. In the **Vercel** project, under *Settings > Environment Variables*, add `EMAIL_USER` and `EMAIL_PASS` with the same values the server has. Then redeploy (*Deployments*, the latest one, *Redeploy*), because Vercel gives new settings only to new deployments.
2. On **Render**, under *Environment*, add `MAIL_RELAY_URL` set to `https://<your site>.vercel.app/api/send-email`, keep `EMAIL_USER` and `EMAIL_PASS`, and choose *Save, rebuild, and deploy*.

Only the server can use the relay. Each request is signed with `EMAIL_PASS`, a signature is good only for that one message and only for five minutes, and the relay sends nothing it can't verify. That is why `EMAIL_PASS` has to be the same in both places; if it isn't, the server log says so. Neither variable starts with `VITE_`, so neither ever reaches the browser.

To use Brevo instead: make a free account at brevo.com, add the `EMAIL_USER` address as a sender and verify it from the email Brevo sends there, create an API key under *SMTP & API > API Keys*, and put it in the host's environment as `BREVO_API_KEY`. A Gmail address can be verified as a sender but not authenticated as a domain, so Brevo delivers it from an address of its own while keeping *AniSave* as the name - check the spam folder the first time.

A send gives up after 15 seconds (over SMTP, after 15 seconds for each of Gmail's addresses it tries) rather than nodemailer's two minutes, and a failure is logged with the mail service's own reason, never the message, which holds the code. What the person is told depends on whether saying so gives anything away. Admin registration, two-step sign-in and account deletion say plainly that the email couldn't be sent: by then the person has proved who they are, or is using the one address the server already knows. Login-by-email and password reset answer exactly as they would for an address that isn't registered, so a failure there is only in the log. Either way, a code that never went out is taken back, so asking again sends a new one at once instead of being told for a minute that one was sent.

The **client** needs `VITE_API_URL` pointing at the deployed API, ending in `/api`. It is baked in at build time, so changing it means rebuilding, not just restarting. When the client also carries the mail relay, it needs `EMAIL_USER` and `EMAIL_PASS` too (see above).

`GET /api/health` answers `{"status":"ok"}` without a token and without touching the database, which is the quickest way to tell a server that is down from one that is up but refusing you.

A deployed database starts empty. Accounts, products and orders made against a local database are not in it, which is why a local administrator account cannot sign in to a deployed site. The crop catalogue is the exception: the server writes it on its first start (see *The product catalogue*). Market prices are not written automatically, because the seeded ones are sample figures; an admin records real ones on the Market Prices page, and until then the Add Product form says no recommendation is available.

Render's disk doesn't keep anything written to it at runtime - it is wiped on every deploy and whenever a free instance restarts - which is why uploaded files are also stored in the database (see *Security*).

## Viewing the Database

MongoDB Compass (a GUI) is installed on this machine — open it from the Start Menu, connect to `mongodb://127.0.0.1:27017`, then open the `anisave` database → `users` collection to see registered accounts. Passwords are stored bcrypt-hashed, not in plain text.

## Next Steps

Following the system flow, the next pieces to build are:
1. Product listing model/routes (farmer) + marketplace browse/filter (buyer)
2. Order & escrow-style checkout flow
3. Crop Demand Board (buyer requests, farmer offers)
4. Admin dashboard (approve farmers/buyers, manage transactions)
5. Price suggestion tool + demand analytics
