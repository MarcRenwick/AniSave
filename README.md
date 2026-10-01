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
    ├── private/               # (git-ignored) farmers' ID and farm documents, report and chat photos - never served publicly
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

Open http://localhost:5173, register as a Farmer or Buyer, enter the code emailed to you, and you're in.

## Auth Flow (currently implemented)

- `POST /api/auth/register` — creates a user (`farmer` or `buyer`) with the address they picked (`provinceCode`, `cityCode`) and hashes the password. It does **not** sign them in: it emails a 6-digit code to verify the address and answers `{ verificationRequired, username, email (masked), emailSent }`
- `POST /api/auth/verify-email` `{ username, code }` — the code from that email (15 minutes, 5 tries). It verifies the account and returns a JWT: this is a new account's first sign-in. `POST /api/auth/verify-email/resend` `{ username }` sends a new code
- `POST /api/auth/login` — logs in with **username** (not email) + password, returns a JWT (or, for accounts with two-step sign-in, asks for an emailed code first - see Security). An account that never verified its email gets a fresh code and the same "Verify your email" step instead of a session
- `GET /api/auth/me` — returns the logged-in user (requires `Authorization: Bearer <token>`)

**Email verification.** A new account has `emailVerified: false` until its code is entered; accounts made before this existed have no value and count as verified, so nobody already using the site is locked out. Signing in with an email code or resetting the password also verifies it, since both prove the inbox is theirs. An account nobody verified doesn't keep its username or email: signing up again with either (after a typo in the email, or a lost message) replaces it, documents and all - the sign-up page's "Wrong email? Go back and change it" does exactly that. Unverified sign-ups are left out of the admin's Users list.

Login uses **username**, not email — email is collected at registration only so it's available for a future "forgot password" flow. Passwords must be 6-12 characters with at least one capital letter and one special character (enforced both client-side in `Register.jsx` and server-side in the `User` model, so the API rejects a weak password even if someone bypasses the form).

### What sign-up will accept

The form asks for a **First Name** and a **Last Name** rather than one full name, so each can be checked on its own; the server joins them back into the single `name` every other part of the app reads. Each is letters, with spaces allowed between words ("Maria Clara", "Dela Cruz"), and at least two letters long; a digit or a symbol is refused rather than stripped out. Spaces at either end are dropped and a doubled space becomes one, so "Dela  Cruz" is saved as "Dela Cruz".

A **contact number** (Edit Profile) is optional, but when given it is exactly 11 digits and nothing else - 09171234567, no dashes, spaces or +63. The box brings up a number pad, stops at 11 characters and says what is wrong before saving; the server checks it again. A number saved in an older format doesn't stop someone saving other changes, only a new number is checked.

A **username** is letters and digits, at least seven of them and no spaces. A **password** may not contain a space anywhere, on top of the length and strength rules above.

**Capitals count in a username.** It is kept exactly as it was typed, and signing in has to match it: an account registered as Wikcute signs in as Wikcute, and wikcute or WIKCUTE is refused with the usual "Invalid username or password". No two accounts may differ only in capitals - a second unique index on `username` ignores case - so nobody can register wikcute once Wikcute exists, and a mistyped capital can never lock the real account out. Accounts made before this were saved in lowercase (the app used to fold every username down), and that lowercase spelling, which is also how the admin's Users list shows them, is the one they sign in with. The username boxes tell phone keyboards not to capitalise or autocorrect.

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
- **Verified email** — a new account only gets a session once it enters the code emailed at sign-up (see Auth Flow).
- **Passwords and codes** — passwords are bcrypt hashes. One-time codes are made with `crypto.randomInt`, stored as an HMAC, expire in 10-15 minutes, work once, and die after 5 wrong guesses (`server/utils/otp.js`).
- **Brute force** — 5 wrong passwords lock an account for 15 minutes; per-IP rate limits cover failed logins/codes, anything that sends email, sign-ups and chat messages (`server/middleware/rateLimiters.js`).
- **Two-step sign-in** — after the password, an emailed code (`POST /api/auth/login/mfa`). Always on for admins; optional for everyone else under Profile → Privacy & Security. The passwordless "email code" login is switched off for accounts that use two steps, so it can't be used to skip the password.
- **Sessions** — tokens last 7 days (`JWT_EXPIRES_IN`) and carry a version number. Logging out (`POST /api/auth/logout`), changing or resetting a password, or being banned raises it, so every older token stops working at once. The app returns to the login page when the server says a session has ended.
- **Private documents** — a farmer's ID and farm documents live in `server/private/documents`, never in the public `uploads/` folder. Only their owner and admins can open them, through `GET /api/documents/:file`. If you have documents from before this existed, run `node scripts/movePrivateDocuments.js --dry-run` (then without `--dry-run`) once.
- **Uploaded files are kept in the database too** — every photo, document, report photo and chat photo is also stored in MongoDB (GridFS, the `fileStore.files` and `fileStore.chunks` collections) under the same path (`server/utils/fileStore.js`). The disk copy is read first while it exists, but a host like Render wipes its disk on every deploy and restart, so without the database copy a farmer's ID would be gone by the time an admin opened it. Removing a file removes both copies, and the privacy rules above apply to either. Files uploaded before this existed are only on the disk they were uploaded to. Atlas's free tier holds 512 MB in all, so large photos count against the same space as the data.
- **Privacy** — sign-up requires agreeing to the Terms of Use and Privacy Policy (`/terms`, `/privacy`); farmers also consent to their documents being reviewed. The agreement is saved with a version and time. Users can delete their account, which also deletes their documents. (The server still answers `GET /api/auth/me/export` with a copy of a person's own data, but the profile no longer has a button for it: Privacy & Security is two-step sign-in only.) A farmer's phone number is shown only to signed-in users.
- **Errors and headers** — errors never include stack traces or internal text (details go to the server log), `helmet` sets security headers, and CORS only allows `CLIENT_URL`.
- **Tests** — with `NODE_ENV=test` no email is ever sent (messages are written to a file in the temp folder); add `RATE_LIMIT=off` to run bulk tests. Set `NODE_ENV=production` when deployed.

## Phones, tablets and desktop

The desktop layout is the design; smaller screens adapt it with Tailwind's breakpoints (`sm` 640px, `md` 768px, `lg` 1024px), so from 1024px up every page renders exactly as it did before this was added.

- **Navigation.** Below 768px the buyer's top bar keeps the logo, search and cart, and the page links move into a menu that drops down from a menu button (with a red dot for unread messages). The farmer and admin portals turn their sidebar into a green bar across the top with a menu button; the sidebar slides in over a dimmed page as a drawer and closes on a link, the close button, Escape or a tap outside. On a phone the drawer is always full width - the farmer's collapse button is a wider-screen feature (`hooks/useMediaQuery.js` tells the two apart).
- **Grids** drop columns as the screen narrows: products 4 → 3 → 2 across, the farmer's dashboard and notifications to one column, product detail's photo and details one under the other. Page padding goes from 32px to 16px on phones.
- **Tables.** The cart becomes a list of cards on phones (My Orders is cards at every size - see *Orders*) (every action still there - Cancel, Archive, the quantity stepper, the bin that asks first). The admin tables keep their columns and scroll sideways inside their card instead of being cut off.
- **Messages** shows the list and the conversation side by side from 1024px; below that, one at a time, with a back arrow.
- Nothing scrolls sideways on any page at 360px or wider.

## The "Premium Harvest" look (landing page and farmer pages)

The landing page and the farmer's pages share one look: deep forest green, harvest gold and ripe-tomato accents on warm cream (never pure white), near-black green for dark sections, soil and clay for warm details, a fine film grain, and headings in **Fraunces** over **Plus Jakarta Sans** (Google Fonts - a font file is only downloaded by a page that uses it, so other pages don't pay for it).

- **Tokens** live in `client/src/theme/harvest.css` as Tailwind theme variables, so they are ordinary utilities (`bg-forest-800`, `text-gold-300`, `font-display`, `ease-harvest`, `shadow-lift`, `animate-float`...), and in `client/src/theme/harvest.js` for code that animates or draws in JavaScript (Motion, GSAP, Recharts). One colour per category: Vegetables green, Fruits tomato, Eggs gold, Meat deep red, Seafood ocean teal.
- **Scoped, not global.** A page turns the look on with `useHarvestTheme()` (`theme/useHarvestTheme.js`), which puts `harvest` on `<html>` while it is showing - on `<html>` so that what it draws on `<body>` (a modal) gets it too. Only then do the overrides apply; buyer and admin pages, and a buyer's copy of shared pieces like the chat or a modal, look exactly as before. `bg-brand` / `text-brand` are the app's original green (#2f8f66) everywhere else and the harvest green under `harvest`.
- **Contrast.** Gold is only used on dark backgrounds or behind dark text (gold text on cream fails AA). Buttons with white text use the deeper tomato `tomato-600` (5.1:1), not `tomato-500` (3.7:1). Every grey used for text passes AA on cream.
- **Animation.** `motion` (Framer Motion) for components, `gsap` with ScrollTrigger for the landing page's scroll story, `lenis` for its smooth scrolling. The reusable pieces are in `client/src/components/motion/`: FadeIn, Stagger/StaggerItem, CountUp, TextReveal, Magnetic, TiltCard, MouseParallax/ParallaxLayer, Marquee, SproutLoader, Shimmer, SuccessCheck and EmptyState. Only transform and opacity are animated. **Reduced motion** (the system setting) is honoured everywhere: `<MotionConfig reducedMotion="user">` around the app, GSAP and Lenis switched off, looping animations stopped, and every reveal shown straight away.

## The landing page

`pages/Landing.jsx` with its sections in `components/landing/`. It is loaded on its own (`React.lazy` in `App.jsx`), so GSAP and Lenis are never downloaded by someone signed in.

- **Bar.** See-through over the hero, then frosted glass once the page has scrolled - dark over the dark sections and light over the light ones (each section says which it is with `data-nav-tone`). Links get an underline that grows in; on a phone they fold into a menu.
- **Hero.** A sunrise drawn in layers - a sky that slowly warms, the sun, far mountains, terraced hills with a nipa hut, rice in front leaning in the wind - with produce drifting through it. Scrolling, the far layers hang back while the near ones go with the page (GSAP); with a mouse the layers also lean toward the pointer. The headline rises word by word with a brush stroke painted under "straight to you."; **Get started** leans toward the cursor and glows.
- **In numbers.** How many verified farmers, products buyers can order now, buyers and towns with farms, counting up as they come into view - real numbers from `GET /api/public/overview` (counts only, cached 10 minutes). If they can't be had, or there is nothing to count yet, the strip isn't shown rather than showing a made-up number.
- **How AniSave works.** On a wide screen the section holds still while a vine grows from step to step as you scroll - Farmer lists → Buyer orders → Pick up at the farm → Farmer earns - each step lighting up as the vine reaches it, leaves sprouting along the way. On a narrower screen it is a list with a stem that grows down beside it.
- **Shop by category.** The market's own five categories, each a big card in its colour that tilts toward the mouse, its drawing growing and a glow coming up behind it. Each opens the market (`/buyer/home`); on a phone they swipe sideways.
- **Why AniSave.** Six real features (verified farmers, local recommended prices, flash sales, chat with live order updates, pre-orders, profit tracking) arriving one after another on a dark section.
- **About.** The rice-terrace photo drifting slower than the page, with a turning badge.
- **What buyers are saying.** Real 4- and 5-star reviews with a comment - the same ones already public on each product's ratings page - by first name, with the farm and its town (nothing about where the buyer lives), in two rows passing each other that stop while one is pointed at. With fewer than three reviews the section isn't shown.
- **Join AniSave** over a field of wheat swaying in the wind, then the footer.

## The buyer's marketplace

The top of the marketplace is a carousel (`components/buyer/HomeBanner.jsx`, `h-80`) of two fixed slides plus up to three real listings - Flash Sale items first, topped up with the newest, and only ones with a photo to show. It advances itself every four seconds, holds while the pointer or the keyboard is on it, and does not advance at all where the system asks for less motion. The Flash Sale and Nearest to You tiles sit beside it and grow with it. The filter row underneath reaches the same places - All Products, Recommended for You, Nearest to You, Newest Products and Flash Sale - so neither a tile nor the row is the only way to anything.

Sections drift up into place as they are scrolled to. A page marks a single element with `data-reveal` and a list or grid with `data-reveal-children`; `useScrollReveal` watches what is marked, and anything it sees come into view gets `.scroll-reveal-visible`. `data-reveal-children` is what keeps a long grid animating the whole way down instead of arriving in one go at its first row: each item comes in as it is reached, a little after the one to its left on the same row (rows are worked out from `offsetTop`, so the stagger is right at any width). A page that marks nothing has its top-level blocks revealed instead, which is how every page behaved before. Anything already on screen when a page opens is revealed immediately, so nothing below a fold is ever the reason a page looks empty, and `prefers-reduced-motion` turns the whole thing off.

The cart (`pages/buyer/CartPage.jsx`) is a table: a tick, the photo and name, the price per kilo, the quantity, that row's total and a remove button, with the **total expense** of the ticked rows underneath. The remove button asks first - "Remove this item?", with the item's photo, kilos and subtotal - and "No, keep it" has the focus, so an Enter pressed out of habit keeps it. Quantities can be typed as well as stepped, and are held between 1 and the stock the farmer has. Unticking a row leaves it in the cart but takes it out of the total and out of what Check Out sends on to the checkout page.

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

The dashboard opens with four figures side by side, each a card in its own colour so they can be told apart at a glance: **Today's sales** (green) with the kilos and orders beside it and a line of the last seven days; **Revenue this month** (blue), set against last month, with how many days sold and a bar for each day so far; **Profit** (amber, see *Expense, income and profit*); and **Stock** (purple), with a bar splitting the products into in stock, low and out. Something that needs doing, like a product with no expense per kg or stock running low, is a box with the link that fixes it. The header greets the farmer with the date and has a bell that counts the notifications and a **My account** button - the same header every farmer page has.

- **Analytical Demands** reads the farm's completed orders six ways, picked with **View** - tabs on a computer, a dropdown on a phone - and the farmer's last choice is remembered on that device. The **Period** (Today / This week / This month / This year / a custom range) applies to whichever view is showing. The figures are added up by the server, `GET /api/orders/farmer/analytics`, grouped by hour, day or month in the farmer's own time zone - so a sale at 00:05 is today's, not yesterday's in UTC - for the period and the one before it. The charts are drawn with Recharts, loaded only when a farmer opens the dashboard.
  - **Revenue**: one orange line, the running total over the period, with each day's own figure in its readout, and four figures above - total, best day, average per sale day and top product. Today is marked on the line with a hollow dashed dot, the days still to come are shaded as upcoming, and **tapping the line** at a day (or Enter, after the arrow keys) lists that day's orders. **Show** switches it between **Revenue (₱)** and **Quantity sold (kg)**.
  - **Trend vs last period**: this period as a blue line against the last as a dashed grey one, point for point (weeks of the month, days of the week, months of the year). The badge compares like with like - this month so far against the same days of last month - and says "No data to compare" when there is nothing before.
  - **Demand vs Stock**: each product placed by its stock on hand and by how often buyers searched for and opened it (`GET /api/products/mine/demand`), in four quadrants split at the middle of each axis - Restock soon, Selling well, Promote / discount and Low priority - with each quadrant's products named underneath. Stock is only known as it is now, and searches and views are running totals rather than dated, so this one view has no period.
  - **Sales calendar**: a month at a time, each day shaded by what it brought in, in five shades; today is outlined and the days to come are dashed. Tapping a day lists its orders. The badge names the weekday that brings in the most on average.
  - **Product share**: a donut of the kilos sold by product - the top five and the rest as "Other" - with the total in the middle.
  - **Best days**: the average revenue for each day of the week, the best in dark green with its figure, and a badge saying which day to harvest for it.

  A view without enough to go on - fewer than three days with sales for the calendar and best days, nothing in either period for the trend - says so instead of drawing an empty chart.
- **What buyers look for** is demand as buyers show it, not sales: how often a crop's listings came back in a search and were opened (`ProductInterest`, counted in `utils/interest.js`, read by `GET /api/products/top-searched`). Only buyers and visitors count - a farmer opening their own listing, or an admin moderating one, does not - and nothing in it comes from orders, so a crop everyone looks for and nobody has bought yet still shows up. The same crop listed by several farmers is added together by name. A view is counted only when a buyer opens a listing from somewhere they browse - the marketplace sections or a farmer's shop - which those pages say with `?opened=true`. Loading a product any other way counts for nothing: the ratings page, a report form and the checkout all fetch it, and so does stepping back to a listing already seen, and none of those is a fresh look at it. On top of that, one look counts once - the same person meeting the same listing again within a few seconds is ignored, so a page that asks twice in the same breath, which React does on every mount while developing, can't turn one click into two.
- **Flash sale suggestions** sits right under What buyers look for, on the first screen: stock nobody has ordered for a week - counted from its last order that wasn't cancelled, or from when it was listed if it has never had one - longest idle first, each with a **Discount** button that opens it for a sale price. (The Best sellers this month list was taken out to make room; the Product share view covers what sold.)
- **Recent notifications** shows the latest three, each with a small photo of the product it is about (an icon for a product without a photo) and the one thing to do about it - **View order** on a new order opens that order, **Restock** on low or no stock opens that product's Product Details.

**Notifications open what they are about**, wherever they are shown: on the dashboard, in the bell's list (which also has **See all notifications**) and on the Notifications page, pressing a new order opens that order - who ordered what, and how much - and pressing a stock warning opens that product. A stock warning is one per product ("Broccoli is out of stock", "Okra is running low (4 kg left)"), so each one leads to its own product (`client/src/utils/notifications.js`).

## The product catalogue

A listing doesn't name its produce in free text. The farmer picks from a searchable catalogue (`crops`) and the listing stores that row's id, so "Mango" means one particular record everywhere in the app.

**The server writes the catalogue itself.** When it starts, it checks that every crop in `server/data/crops.js` is in the database, and writes the catalogue if any are missing - so a new database, such as a fresh Atlas cluster, has one on the first start (the log says `Crop catalogue: 163 crop(s) were missing and 0 out of date, so it was written`). The same goes for later changes to the list: a product added, or one already there stored differently from what the list now says (made priceable, say, or given another local name) - the deployed server writes the catalogue on its next start, and the products already there keep their ids. If everything matches, it touches nothing. Without a catalogue the selector says "No product matches" to everything and no farmer can list a product. To push changes to crops that are already in the database, run `node scripts/seedCrops.js`.

- `GET /api/crops?q=man` is the typeahead behind the selector. Both what is stored and what is typed are reduced to the same **match key** (`server/utils/fold.js`): lower case, punctuation as spaces, and every word singularised. So capitalisation and a trailing "s" stop mattering in either direction - "MANGO", "mango" and "mangoes" are one search, "tomatoes" finds Tomato, and "green bean" finds Green Beans - without every spelling having to be listed. It matches a crop's local names too ("ampalaya" and "bitter melon" both reach Ampalaya, "camote" reaches Sweet Potato), and a fuller name still finds the crop ("Talong (Egg Plant)" → Eggplant). A name that matches nothing can't be picked, and the form submits the id, not the text.

  Over-eager singularising is harmless, because the same rule is applied to both sides: "asparagus" becomes "asparagu" whether it is typed or stored, so the two still meet. A handful of words that only look plural ("kamatis", "sitaw", "oats") are left alone.
- The catalogue's own name becomes the listing's title and its `listingCategory` becomes the listing's category, so a mango can't be filed under vegetables.
- A listing's **description** is at most 100 characters: the form counts them and stops there, and the server refuses a longer one. Listings written before the limit keep theirs until they are next edited, and can still be restocked.
- **Varieties** are catalogue products of their own - Lakatan, Latundan, Saba and Señorita Banana, Carabao and Pico Mango - so a farmer can list what they actually grow. Each carries `pricesFrom`, the crop it is priced as, because the market records a price for bananas rather than for each variety. The recommendation follows that link and labels the figure **Latest Market Price (Banana)**, so nothing is passed off as the variety's own price, and a price can't be recorded against a variety directly.
- **Eggs, meat and seafood** are in the catalogue too - Chicken, Duck and Quail Egg; Pork, Beef, Chicken, Carabeef and Goat Meat; Milkfish (Bangus), Tilapia, Galunggong, Hito, Shrimp, Crab, Squid, Tahong and Talaba - findable by their local names as well ("itlog", "baboy", "bangus", "hipon"). Each kind is a category of its own for buyers (**Eggs**, **Meat**, **Seafood**) rather than being filed under Vegetables. The farmer's product filters and a shop's tabs show those three only once there is something in them, so a shop selling only produce looks as it always did. Typing "egg" offers the eggs before Eggplant: a whole word of a name ranks above a name that merely starts with what was typed. Eggs are sold **by the tray**, not the kilo; meat and seafood by the kilo like everything else (see *Eggs by the tray*).
- **Added later**, to fill gaps farmers would notice (Apple wasn't in the list): Apple, Grapes (Ubas), Lemon, Lime (Dayap), Ponkan, Marang, Longan, Macopa, Kamias, Siniguelas, Chesa, Bignay, Aratiles, Pili Nut and Honeydew Melon; Chinese Cabbage (Pechay Baguio), Saluyot, Talbos ng Kamote, Bataw, Patani, Kadyos, Sitsaro, Labong, Puso ng Saging, Oyster Mushroom, Siling Haba, Tanglad, Wansoy, Leeks, Asparagus and Zucchini; Turmeric (Luyang Dilaw); Adlai, Black Rice, Red Rice and White Corn; Duck, Quail, Turkey, Rabbit and Mutton; and nineteen fish and seafood - Tambakol, Tulingan, Alumahan, Hasa-hasa, Tanigue, Tamban, Dilis, Dalagang Bukid, Lapu-lapu, Maya-maya, Bisugo, Talakitok, Pompano, Dalag, Karpa, Gourami, Ulang, Halaan and Lato. Fish is filed under **Seafood**. Each has no recommended price until an admin records one.
- **Every product can be priced.** All 163 are supported by the Recommended Price feature - pork, fish, eggs and the rest included - so an admin can record a market price for any of them (157 in the admin's list; the other 6 are varieties, priced as the crop they are a variety of).
- `node scripts/seedCrops.js --dry-run` (then without `--dry-run`) fills it from `server/data/crops.js`: 163 products across fruit, vegetable, root crop, grain, egg, meat and seafood. Re-running it is safe - a crop is identified by its slug, its folded name, so a second run updates what it wrote before instead of adding a duplicate, and the unique index on `slug` means the database wouldn't allow one anyway.
- Listings made before the catalogue existed keep working. `node scripts/backfillProductCrops.js --dry-run` (then without `--dry-run`) links each one to the crop its title names, leaving titles as they are; anything it can't match unambiguously is listed and left for the farmer to fix by editing the listing.

## Adding a product

**Add New Product** (and Edit) is one form in six numbered steps - Photos, What are you selling?, Stock & your cost, Set your price, Listing details, and the optional Extras (a flash sale price, and the pickup address). Each step's number turns into a tick once it is filled in. Beside the form, **Before you publish** counts off the six things a listing needs, and **Buyer preview** shows the listing as a buyer will see it, as it is typed.

- **Photos**: up to five; the first is the cover. A photo is moved by dragging it onto another's place - with a mouse, or sideways with a finger (swiping up and down still scrolls the page) - or with the arrow keys once it has focus. Pressing a photo shows it in the preview. The order is what gets saved.
- **Product type** is two cards, For Sale (ready now) and For Pre-Order (buyers reserve ahead). The description counts up to its 100 characters beside its label.
- On a phone the form comes first, with the checklist and preview under it.

## Recommended prices, by municipality

A farmer filling in **Add New Product** is shown what the product they picked last went for at their own municipality's market, as a suggestion. Nothing is hard-coded: every figure comes from a `MarketPrice` record an administrator entered.

- The municipality is the one on their account - the municipality/city they registered. Nothing reads a device's location.
- `GET /api/market-prices/recommendation?crop=<id>` answers with the latest live record for **that crop in that municipality**, matched on the catalogue id and the municipality's own PSGC code rather than on names. The form's **Price guide** shows the recommended selling price with a **Use ₱70 / kg** button, the latest market price, what the kilos being listed would bring in at it, and the municipality and date it was recorded. The farmer can ignore it and type anything.
- With no record, the form says **Recommended Price Unavailable** — "No current market-price data is available for this product in your municipality." A price is never invented, averaged, or borrowed from the next town along, so the same crop genuinely reads ₱140/kg in Dagupan City and ₱100/kg in Mangatarem.
- **Admins keep the price book** at **/admin/market-prices**: add, edit, archive and delete records, filtered by municipality, with a separate Archived list. A record holds the product, the municipality/city, the price per KG and the date recorded (plus an optional source). Any catalogue product (other than a variety) and any Pangasinan municipality can be chosen, and a price can't be dated in the future. Archiving retires a record from recommendations without losing the history; deleting is confirmed separately.
- `node scripts/seedMarketPrices.js --dry-run` (then without `--dry-run`) fills the table with **sample figures** for seven Pangasinan municipalities — marked `source: "Sample data"` so real data can replace them. Run `seedCrops.js` first.

## Eggs by the tray

Eggs are sold by the tray; everything else by the kilo. A listing's unit follows from its category (`unitOf` in `client/src/utils/units.js` and `server/utils/units.js`), and every order records the unit it was placed in (`unit` on the order: `"kg"` or `"tray"`), so its quantity and price per unit keep meaning the same thing.

- Everywhere a quantity or price is shown it says which: "₱250 / tray", "7 trays available", "How many trays of Chicken Egg", "x3 trays" on My Orders, "Trays available" on the farmer's form, a market price per tray for eggs on the admin's Market Prices page, and so on.
- A tray is whole: an order for half a tray is refused ("Eggs are sold by the whole tray"), and stock messages say trays ("Only 10 trays of Chicken Egg left in stock").
- Kilos and trays are never added together. The cart's total says "12 kg · 2 trays"; the Profit page and the dashboard say "40 kg and 3 trays sold"; the analytics count `kg` and `trays` apart, so the kilo charts (Quantity sold, Product share) leave eggs out and Product share says how many trays there were.
- Egg orders placed before orders recorded their unit are marked as trays by the same startup migration as the expenses.

## Expense, income and profit

A farmer says what all the kilos (or trays) of a product cost them to produce, and AniSave works out what their stock would bring in and what their sales have actually made.

- **Total Expense (₱)** is a required field on **Add New Product** (and Edit), beside the kilos available and marked Private: everything the kilos being listed cost - seeds, fertilizer, labor, transport. It is stored as `totalExpense`, with `initialQuantity`, the kilos listed when the product was created. **The cost of one kilo is always `totalExpense / initialQuantity`** - never divided by the stock left, which falls as it sells, so it stays the same however much has sold; restocking doesn't change it either. Under the boxes the form shows it ("That's ₱3,000 ÷ 200 kg = ₱15 per kilo"; when editing, over the kilos first listed). Then in the price guide **Estimated income** (quantity × the recommended price for their municipality) and **Estimated profit** (income − expense). The recommended price is only the reference for the estimate: it never becomes the selling price, and the selling price isn't used for the estimate. Separately, under the selling price, the form says what each kilo leaves the farmer at *their* price once the cost is taken off ("You make ₱40 per kilo at this price", or in red when the price is below the cost).
- **Only the farmer ever sees it.** `totalExpense` and `initialQuantity` are `select: false`, so no query returns them unless it asks for them by name, the marketplace's aggregations drop them explicitly, and `GET /api/products/:id` includes them only for the listing's owner (their editor fills the box from there). Their data export includes them.
- **Only the total expense and the kilos it was for are stored.** Every other figure is worked out when it is asked for (`server/utils/profit.js`) from the listing's stock, the latest market price for the farmer's municipality (the same lookup the recommendation uses, `recommendationsFor` in `marketPriceController.js`) and their orders - so nothing goes stale when stock sells, the farmer restocks, or an admin records a new price. Every kilo is in one of three places and is counted once:
  - **Estimated on stock** - the kilos still in stock, valued at the recommended price, or at the farmer's own selling price where their municipality has no market price for it (the row is tagged **Market** or **Yours**, and the page says how many used each): Expense (the kilos left × the cost of one kilo), Estimated Income, Estimated Profit. Before anything has sold that is (quantity × price) − the total expense.
  - **Actual sales** - completed orders: Income is what buyers paid (a Flash Sale price included), Expense is the kilos sold × (total expense ÷ initial quantity), and Profit is the difference - so a sale's profit is kilos sold × (price − total expense ÷ initial quantity).
  - Kilos in orders that haven't been picked up yet count in neither until the order is completed; Product Details shows them as "awaiting pick-up".
- **Product Details** (the farmer's) puts the listing on the left and an **Expense, Income & Profit** panel ("Only you") on the right, held in view while scrolling; on a phone the panel comes after the details. The panel has the profit from completed sales in a solid green card (red for a loss) with its income and expense, then the total expense and the kilos it was for, then per kilo: your cost (total ÷ kilos first listed), selling price ("usually ₱80" during a flash sale), margin and the market price. A stock bar shows every listed kilo as sold, or in stock - split into ordered but not completed yet, and not ordered yet - and **Remaining stock** gives the capital in it and what it would make at the market price. Only here, when no market price is recorded, it uses the farmer's own selling price instead and says so. The figures are worked out by `productFinancials` in `client/src/utils/profit.js` from `GET /api/products/:id/profit`, the owner's only.
- **The dashboard's Profit card** shows the profit on completed sales so far, with the estimate on stock underneath. Clicking it opens **/farmer/dashboard/profit**: the two totals side by side, each as Income − Expense = Profit (actual in green, the estimate in blue so it is never read as money made); **Profit per product**, a table of each costed product's actual sales and estimate (a card per product below 1280px wide, where the sidebar leaves the table too little room) - see below; then the products still missing a total expense, each with **+ Add expense**; and a folded **How are these numbers computed?**. `GET /api/products/mine/profit`.
- A product listed before this feature has no expense yet and asks for it. It is left out of the totals, and the page says how many, so every total profit is exactly its total income less its total expense.
- **Profit per product** (`components/farmer/ProfitTable.jsx`) is a white card with two tinted bands over its columns: **Actual sales** (green: Income, Expense, Profit) and **Estimated on stock** (blue: Price used, Income, Expense, Est. profit), with a hairline between them. Each product shows its photo (or its initials on a tint), its name, then a stock pill ("236 kg in stock", or an orange "Out of stock"), the kilos sold and "₱33,600 cost (₱140/kg)". Under each profit is its margin (profit ÷ income); an estimated margin under 20% is bold orange. **Price used** is the price per kilo with a **Market** (blue) or **Yours** (grey) tag. A product never sold says "No completed sales yet", and one sold out "Out of stock · nothing left to estimate", as a dashed pill across that group. Along the top: **All / In stock / Out of stock** (with counts), a search, and a sort - highest profit (the default), highest estimated profit, most sold, most in stock, or by name. Underneath, a legend for the tags and the orange margin, and **Export CSV**, which downloads the rows shown with every figure. The page's two totals show Income − Expense = Profit across on a tablet and up, and one under the other on a phone, so no amount is ever cut short.
- **Products from when the expense was per kilo** are moved over by the server on its next start (`utils/expenseMigration.js`, also `node scripts/migrateExpenses.js --dry-run`): the batch is taken as the stock now plus what its orders took off it (sold or still waiting - not cancelled orders or unaccepted pre-orders), `initialQuantity` is that batch and `totalExpense` is the old expense per kg × it, so the cost of a kilo - and every past sale's profit - comes out exactly as before. A product without an expense gets its batch and asks for the expense when next edited. It only touches products with no `initialQuantity` yet, so it runs once.

## Orders

An order moves in a straight line: **New** (or **Pre-Order**, for a pre-order listing) → **Processing** → **Ready for Pickup** → **Completed**, or it is declined. The farmer moves it with `PATCH /api/orders/:id/status`; a buyer can cancel their own order while it is still unanswered, and archive it once it is done.

- **Stock comes off only when an order is completed.** Placing, accepting or readying an order leaves the product's stock as it is - the kilos are still at the farm - and so does declining, cancelling or undoing one; marking it done takes its quantity off (never below 0), once (`stockTaken` on the order). Accepting promises the kilos, so an order can only be accepted - and a new one placed - for what is in stock and not already promised to another accepted order ("You need 8 kg in stock to accept this order - you have 6 kg not already promised to other accepted orders"); a pre-order needs the farmer to have restocked first, as before. **Sold** - on the buyer's product page, the farmer's Product Details and the ranking of recommendations - counts completed orders only. Orders from when stock was taken the moment an order was placed are moved over by the server on its next start (`utils/stockMigration.js`, also `node scripts/migrateStock.js --dry-run`): each one not completed yet gives its quantity back to the product, to be taken when it is completed; until it has run, such an order is still handled the old way. It only touches orders with no `stockTaken`, so it runs once.

- Every reply about a single order carries the whole order — the buyer, the farmer and the product, not just their ids — so a status change never leaves the page holding an order whose buyer and product are bare ids (that is what once turned an accepted order's pickup card into "Unknown buyer").
- **Undo** (`PATCH /api/orders/:id/undo`, the farmer's own orders only) takes the last change back one step, for a mis-tapped Accept or Ready. The stage's timestamp is cleared with it, and a pre-order goes back to **Pre-Order** — `openedAs` on the order remembers which status it opened in. Two statuses are the end of the line and are never undone: a **Completed** order (it has been picked up, and may already be rated) and a **declined** one (the buyer has been told). Orders placed before `openedAs` existed are treated as ordinary orders; to fill it in for them, run `node scripts/backfillOrderOpenedAs.js --dry-run` (then without `--dry-run`) once.
- Both Orders pages list **Pre-Order** right after **New** — the two statuses that are still waiting on the farmer's answer.
- **The two sides of one order look different on purpose**, so nobody testing both accounts mistakes one for the other. The farmer's (`pages/farmer/FarmerOrderDetail.jsx`) sits in the farmer portal, sidebar and all: "Order from *buyer*", a **Customer** card (name, phone, location), **Order items**, and beside them **Order progress** - the steps top to bottom (`components/orders/OrderTimeline.jsx`) with a status badge and the next action. The buyer's (`pages/buyer/OrderDetail.jsx`) sits under the marketplace's green navigation and opens straight on a coloured banner saying where it stands in the buyer's words ("Waiting for the farmer", "Ready for pickup!"), then the steps across the page (`OrderStatusTracker`), **Pick up from** (the farm, with View Shop) and **Your item**. The order number (`#` and the last 8 characters of its id) is on the farmer's page.

**My Orders** (the buyer's) shows each order as a card: the farm with **Chat** (opens the conversation with it) and **View Farm**, where the order stands ("Waiting for farmer to accept | NEW"), then the product's photo, unit price, kilos, total and date - pressing it opens the order - and Cancel or Archive where they apply. Tabs along the top carry a count wherever there are orders, and the search finds orders by farm, product or order id.

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

The buyer's page fills the screen under the top bar as **Chats**: rounded rows with a green count and a green time on a chat with unread messages, the day written between messages from different days (Today, Yesterday, Sep 24), and the farmer's own profile photo beside what they write - the plain person icon for anyone who hasn't uploaded one. On a phone, View Shop shrinks to its shop icon so the farm's name has room. The farmer's Messages page keeps its original layout.

Inside a conversation:

- **Sent / Seen.** Under your last message it says **Sent** (one tick) until the other person has read it, then **Seen** (two green ticks) - live, without a refresh. It only turns to Seen when they have actually looked: a message that arrives while their tab is in the background waits until they come back to it. Replying counts as reading. (It comes from the unread counts: the other side's count only ever holds your messages, so when it is 0 they have seen them all.)
- **Photos.** The picture button beside the message box sends a photo, with an optional caption - JPG, PNG, WebP or GIF, up to 5 MB. The browser scales a photo down to at most 1600 pixels and saves it as a JPEG before sending (a phone photo goes from a few MB to a few hundred KB), since every one is kept in the database. Photos are private like a farmer's documents: they are kept in `server/private/chat` and the database's file store, and only the two people in the conversation can open one (`GET /api/chat-images/:file`); pressing a photo shows it full size. Whether someone may write in the conversation at all is checked before a photo is accepted, and a photo that turns out not to be one, or comes with a caption that is refused, is deleted again.
- **Active now / Active 5 minutes ago.** The header shows whether the other person has AniSave open right now (**Active now**, and a green dot on their picture here and in the list), or how long ago they last did - in minutes, hours, then days, up to 7 days; after that it says nothing rather than something stale. It comes from the live connection: opening the site connects, and closing it - or leaving the site in that tab - disconnects, and the people they have conversations with are told at once. The last time is kept on the account (`lastActiveAt`).
- **typing...** While one of them types, the other sees three moving dots at the bottom of the conversation and "typing..." in their list. It goes away when they send, stop for a few seconds, or close the tab. Nothing about typing is saved, and it is only passed on to someone they could message.
- **Order progress cards.** When the farmer moves an order on - **Accept Order** (accepted, and being prepared), **Mark as ready to pick up**, **Mark as done order** (picked up, and done) - the buyer gets a card in their conversation with that farmer, straight away and counted as unread: the product's photo and name, the quantity and total (in trays for eggs), the order number, and the order's steps top to bottom (Order Placed, Order Accepted, Preparing, Ready for Pickup, Picked Up, Order Done), each reached step ticked with its date and time and the one just reached highlighted. **View order** opens the order. The app writes the card from the order itself - the farmer types nothing and sends no photo - and sends it as the farmer, so it sits on the farmer's side and the farmer sees it too, headed in their words ("Order accepted - preparing"). A card keeps the order as it was when it was sent, so the conversation reads as a history, the newest card being where the order is now; the orders panel at the top catches up as each one arrives. If the conversation doesn't exist yet, the first card starts it.
  - **Undo** takes back the card the undone step sent - deleted for everyone, like an unsent message - since that step never happened. Declining an order sends no card, and neither does anything to a buyer who has blocked the shop, or to a banned account. A card that can't be sent never holds up the status change (`postOrderUpdate` and `retractOrderUpdate` in `server/controllers/chatController.js`; the card is `orderUpdate` on the message, and `client/src/components/chat/OrderUpdateCard.jsx`).
- **Your orders from this farmer.** Like the order card in a Shopee chat, a buyer sees at the top of the conversation their latest order from that farmer that is still open - product photo, quantity, total, date and status, coloured as on My Orders - and **All orders** opens the rest. Each one opens that order's page. A completed or cancelled order drops out of it (My Orders keeps them all), and the panel disappears when there is nothing open. The farmer doesn't see this panel.
- **Deleting a message.** The bin beside a message (it shows when the pointer is over the message, and all the time on a touch screen) asks how. Your own message can be deleted **for everyone** - its words and photo are gone for both of you, and both see "This message was deleted" in its place, live - or **for me**, which takes it out of your Messages only. A message you received can be deleted for you only. The list's preview follows: "You deleted a message", or the newest message you still have.
- **Deleting a conversation.** The bin at the top of a conversation deletes it from your Messages, with every message and photo in it - for you only. The other person keeps their copy, and if a new message is sent, the conversation comes back to your list with just the new messages.
- **What neither of you can see is deleted for good.** Once both people have deleted a message (for themselves, or with the whole conversation), it is removed from the database with its photo. A deleted photo can't be opened any more by whoever deleted it (`GET /api/chat-images/:file` answers 404). Deleting is always allowed, blocked or not.
- **Blocking hides all of it.** While a buyer has blocked a farmer, neither sees when the other is active or typing, as well as not being able to message.

- **Real time with Socket.IO.** A message is sent to the API like any other request (`POST /api/chats/:id/messages`), where it is checked and saved in MongoDB (`conversations`, `messages`). The server then pushes it straight to both people's open tabs (`server/utils/realtime.js`, `client/src/context/ChatContext.jsx`), so it appears without a refresh, and the unread counts update with it. If the connection drops - a free Render server sleeping, say - the page reconnects on its own and reloads what it shows, so nothing sent in the meantime is missed.
- **Only the two of them.** Every chat route answers "not found" to anyone who isn't in the conversation, admins included. A live connection needs the same login token as an API request (a logged-out, banned or replaced token is refused), each person only ever joins their own room, and connections are only accepted from the site itself. Logging out, changing a password, being banned or deleting the account closes that person's open connections at once.
- **Buyers start conversations; farmers reply.** Blocking works both ways: while a buyer has blocked a farmer, neither can message the other, and the conversation says so instead of showing a message box. Nobody can message a banned account.
- **Text up to 1000 characters**, one line, or a photo; text is always shown as text, never as markup. Sending is limited to 30 messages a minute from one address, photos included.
- Endpoints (buyers and farmers only): `GET /api/chats`, `GET /api/chats/unread`, `POST /api/chats` `{ farmerId }` (buyers), `GET /api/chats/:id`, `PATCH /api/chats/:id/read`, `POST /api/chats/:id/messages` `{ text }` or multipart `{ image, text? }`, `POST /api/chats/:id/messages/:messageId/unsend` (your own message, for everyone), `DELETE /api/chats/:id/messages/:messageId` (for you), `DELETE /api/chats/:id` (the conversation, for you), `GET /api/chats/:id/orders` (buyers), `GET /api/chat-images/:file`. Over the live connection the server sends `chat:message`, `chat:read`, `chat:seen`, `chat:typing`, `chat:presence`, `chat:deleted` and `chat:cleared`, and the browser sends `chat:typing`.
- A person's messages are included in `GET /api/auth/me/export` (photos are marked `photo: true`, order cards `orderUpdate` with the product and status, messages deleted for everyone `deleted: true`), and deleting an account deletes their conversations with every message and photo in them.

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

## The admin's Users page

The Users page lists farmer and buyer accounts for moderation: verification, ban and unban. Its **Activity** column shows who is on AniSave right now - **Active now**, with a green dot, from the same live connection that shows it in chat - and otherwise when each person was last around ("Active 3 hours ago", from `lastActiveAt`) or **No activity yet**. The **Active now (N)** chip beside All / Farmers / Buyers narrows the list to those people, and the page quietly asks again every 30 seconds, so someone arriving or leaving shows up without a reload. The **Status** column is unchanged: **Active** there still means the account isn't banned.

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

**Put the server in the same region as the database.** Every request makes two or three trips to MongoDB one after the other (checking the login, then the data), so the distance between the two is paid several times over on every page. With the database on Atlas in Hong Kong, a Render server in Singapore is about 35 ms from it; one in the US is about 150 ms, which adds most of a second to each page. Render can't move an existing service to another region, so moving means a new service: create it from the same repository in the new region with the same environment variables (above, and the email ones below - `EMAIL_PASS` must still match Vercel's, and the same `JWT_SECRET` keeps everyone signed in), wait for `/api/health` to answer, point Vercel's `VITE_API_URL` at the new address and redeploy, check the site, and only then delete the old service. Nothing is lost by deleting it: the data, photos and documents are all in the database, and a Render disk is wiped on every deploy anyway.

The website also saves trips of its own: the farmer's pages share the requests they have in common (the dashboard and the notification bell both want the products and orders), and an answer from the last 20 seconds is reused when moving between pages, until anything is changed (`client/src/services/api.js`).

### Sending email from a host

Every one-time code - verifying a new account's email, login by email, password reset, two-step sign-in, account deletion and admin registration - goes through `server/utils/sendEmail.js`, which sends it one of three ways:

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
