# AuraStore

An online shop for tech and workspace gear, priced in naira. Guests can browse, search and fill a cart. Signing in with Google is needed to check out. Orders are saved in a database and a confirmation email is sent.

**Live site:** https://wortsock.github.io/aurastore/

> AuraStore is a demonstration project. Product names and brands are fictional and orders are not fulfilled.

## What it does

- Home, Catalog (search, category filter, price filter, sorting), Product detail with gallery, specifications and related items.
- Cart for guests (kept in the browser) and for signed-in users (kept in the database). The guest cart merges into the account at sign-in.
- Checkout is protected: signed-out visitors are sent to Google sign-in and returned to checkout.
- Pay on Delivery. Delivery is a flat ₦2,500, free from ₦100,000.
- Order confirmation page, order history page, a Mailgun confirmation email, and a 404 page.

## Task brief coverage

| Requirement | How it is met |
|---|---|
| Website for a shop | Pages listed above, 24 products in 6 categories |
| Checkout page | `checkout.html` and `confirmation.html` |
| Data kept in a database | Supabase Postgres (categories, products, profiles, cart_items, orders, order_items) |
| Confirmation emails with Mailgun | Supabase Edge Function `place-order` sends the email after the order is saved |
| Google authentication via Google Cloud Console | Google OAuth client in Google Cloud Console, Google provider in Supabase Auth |

## Tech stack

| Part | Choice |
|---|---|
| Pages | Plain HTML, CSS and JavaScript (no build step) |
| Database and auth | Supabase (Postgres, row-level security, Google sign-in) |
| Server code | One Supabase Edge Function (`supabase/functions/place-order/index.ts`) |
| Email | Mailgun HTTP API |
| Hosting | GitHub Pages |

## Project layout

```
index.html  shop.html  product.html  cart.html  login.html  auth-callback.html
checkout.html  confirmation.html  orders.html  privacy.html  terms.html  404.html
css/    style.css  shop.css  product.css  cart.css  checkout.css  orders.css  auth.css  legal.css
js/     config.js  supabase.js  utils.js  auth.js  products.js  cart.js  layout.js
images/products/<product-slug>/1.jpg 2.jpg 3.jpg
supabase/  schema.sql  seed.sql  functions/place-order/index.ts
```

## Set it up from scratch

1. **Supabase project.** Create one, then copy the project URL and the publishable key into `js/config.js`.
2. **Database.** In the SQL Editor run `supabase/schema.sql`, then `supabase/seed.sql`. Both can be run again safely.
3. **Images.** Put 3 square JPGs per product in `images/products/<slug>/1.jpg`, `2.jpg`, `3.jpg`. Folder names must match the product slugs in `seed.sql`.
4. **Google sign-in.**
   - In Google Cloud Console, open Google Auth Platform and complete Branding (app name, home page, privacy and terms links, authorised domain).
   - Create an OAuth client of type Web application.
     - Authorised JavaScript origin: the site address, for example `https://wortsock.github.io`.
     - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`.
   - In Supabase go to Authentication, Providers, Google. Turn it on and paste the Client ID and Client secret.
   - In Supabase go to Authentication, URL Configuration. Set the Site URL to the live address and add `.../auth-callback.html` to the Redirect URLs.
5. **Mailgun.** Create an account and note the sending domain and the private API key. For a sandbox domain, add each receiving address under Authorized Recipients and confirm it.
6. **Edge Function.** Create a function named `place-order` and paste in `index.ts`. Turn off the built-in Verify JWT option, because the function verifies the sign-in token itself. Add these secrets:

| Secret | Purpose |
|---|---|
| `MAILGUN_API_KEY` | Mailgun private key |
| `MAILGUN_DOMAIN` | Mailgun sending domain |
| `MAILGUN_FROM` | Sender, for example `AuraStore <postmaster@your-domain>` |
| `MAILGUN_REGION` | Optional. `eu` for the EU region. Defaults to US |
| `SITE_URL` | Optional. Live site address, used for the link in the email |
| `ALLOWED_ORIGINS` | Optional. Comma-separated extra site origins allowed to call the function |

7. **Host.** Publish the repository with GitHub Pages (Settings, Pages, deploy from the main branch, root).

## Run locally

Open a terminal inside the project folder and run `python -m http.server 8000`, then visit `http://localhost:8000/`. For sign-in to work locally, add `http://localhost:8000` to the Google JavaScript origins and `http://localhost:8000/**` to the Supabase Redirect URLs.

## Security notes

- The only key in the page code is the Supabase publishable key, which is designed for browsers. Row-level security controls what it can read and change.
- The Mailgun key, the Supabase service key and the Google client secret exist only in server settings and are never in this repository.
- Prices and totals are recalculated on the server from the products table. Prices sent from the browser are never trusted.
- Orders are created only by the server function. A repeated request with the same id returns the same order and does not send a second email.
- Text entered by customers is escaped wherever it is shown, including the email.

## Access for reviewers

- Google: the app is published, so any Google account can sign in. If it is set back to Testing, add each reviewer under Audience, Test users.
- Email: while the Mailgun sandbox domain is used, a confirmation email is delivered only to addresses listed under Authorized Recipients (up to five). Tell the owner which address to add.

## Known limits

- Sandbox emails come from a Mailgun test address, so mail providers may place them in spam. A verified sending domain fixes this.
- Payment is Pay on Delivery only. There is no card payment and no admin dashboard.
- Reviews, wishlists and order cancellation are not included.

## Screenshots

<img width="1581" height="757" alt="image" src="https://github.com/user-attachments/assets/d53268a2-5e4b-40c0-aa82-542ae58dde32" />
