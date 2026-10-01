# AuraStore final checklist

Tick each box on the live site (https://wortsock.github.io/aurastore/), using a real Google account and a real inbox.

## 1. End-to-end flow
- [ ] As a guest: browse, search, add items, refresh. The cart is still there.
- [ ] As a guest: click Checkout. Login page says the cart is saved.
- [ ] Sign in with Google. Back at checkout, the cart is merged and the details are prefilled.
- [ ] Place an order. Confirmation page shows the right items, totals and address.
- [ ] Database: a row in `orders`, rows in `order_items`, stock reduced, `cart_items` emptied.
- [ ] Email received with the right order number and totals (check spam too).
- [ ] Orders page lists the order with status Placed.
- [ ] Refreshing the confirmation page does not create another order.
- [ ] Double-clicking Place order creates only one order.
- [ ] A second Google account cannot see the first account's orders.
- [ ] Ordering more than the stock left shows a clear message and no order is created.
- [ ] Out-of-stock product cannot be added to the cart.
- [ ] Signed-out visit to `checkout.html` or `orders.html` goes to login and returns afterwards.
- [ ] Wrong Mailgun key (test on purpose, then restore it): the order is still saved and the confirmation page says the email could not be sent.
- [ ] Sign out empties the visible cart; signing in again brings the saved cart back.
- [ ] A made-up address shows the 404 page.

## 2. Security
- [ ] Search the repo for `service_role`, `sb_secret`, `key-` and `client_secret`. Nothing found.
- [ ] `config.js` contains only the URL and the publishable key.
- [ ] `.gitignore` is in the repo and no `.env` file is committed.
- [ ] Calling the function without a token returns an error (401).

## 3. Mobile and browsers
- [ ] Every page checked at about 360 px, 768 px and 1280 px wide. No sideways scrolling.
- [ ] Header, cart drawer, filters and checkout form work on a real phone.
- [ ] Checked in Chrome and one other browser (Firefox, Edge or Safari).

## 4. Accessibility and speed
- [ ] The header, cart drawer, forms and product gallery work with the keyboard only (Tab, Enter, Escape).
- [ ] Every image has alt text and every input has a label.
- [ ] Lighthouse run once on Home and Product. Scores noted: ______

## 5. Launch settings
- [ ] Live address is in Google JavaScript origins, Supabase Site URL and Redirect URLs, and the `SITE_URL` secret.
- [ ] Google app is published, or every reviewer is a test user.
- [ ] Reviewer emails are Mailgun authorized recipients.
- [ ] README has the live link and screenshots.

## 6. Task brief
- [ ] Shop website
- [ ] Checkout page
- [ ] Data saved in the database
- [ ] Confirmation email sent through Mailgun
- [ ] Google sign-in set up through Google Cloud Console
