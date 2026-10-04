// AuraStore place-order Edge Function (tickets O-01 to O-08)
// Secrets needed (Supabase > Edge Functions > Secrets):
//   MAILGUN_API_KEY, MAILGUN_DOMAIN, MAILGUN_FROM
// Optional: MAILGUN_REGION ("us" default, or "eu"), SITE_URL, ALLOWED_ORIGINS
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided by Supabase automatically.
import { createClient } from "npm:@supabase/supabase-js@2";

const STATES = ["Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno","Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT (Abuja)","Gombe","Imo","Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa","Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba","Yobe","Zamfara"];
const SITE_URL = (Deno.env.get("SITE_URL") ?? "https://wortsock.github.io/aurastore/").replace(/\/?$/, "/");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://wortsock.github.io").split(",").map((s) => s.trim());
const naira = (n: number) => "₦" + Number(n).toLocaleString("en-NG");
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function cors(origin: string | null) {
  const ok = !!origin && (ALLOWED.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  return {
    ok,
    headers: {
      "Access-Control-Allow-Origin": ok ? origin! : ALLOWED[0],
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Vary": "Origin",
    } as Record<string, string>,
  };
}

function validate(b: Record<string, unknown>) {
  const f: Record<string, string> = {};
  const name = String(b.name ?? "").trim(), email = String(b.email ?? "").trim();
  const phone = String(b.phone ?? "").replace(/[\s-]/g, ""), address = String(b.address ?? "").trim();
  const city = String(b.city ?? "").trim(), state = String(b.state ?? "").trim(), rid = String(b.request_id ?? "");
  if (name.length < 2 || name.length > 80) f.name = "Enter your full name.";
  if (!/^(\+234|0)[789][01]\d{8}$/.test(phone)) f.phone = "Enter a valid Nigerian phone number.";
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) f.email = "Enter a valid email address.";
  if (address.length < 5 || address.length > 200) f.address = "Enter your delivery address.";
  if (city.length < 2 || city.length > 80) f.city = "Enter your city or town.";
  if (!STATES.includes(state)) f.state = "Choose your state.";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rid)) f.request_id = "Bad request id.";
  return { f, v: { name, email, phone, address, city, state, rid } };
}

type Order = Record<string, any>;
type Item = { product_name: string; quantity: number; unit_price: number; line_total: number };

function buildEmail(o: Order, items: Item[]) {
  const date = new Date(o.created_at).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" });
  const addr = `${o.ship_name}, ${o.ship_address}, ${o.ship_city}, ${o.ship_state}. Phone: ${o.ship_phone}`;
  const link = SITE_URL + "orders.html";
  const text = [
    `Thank you for your order, ${o.ship_name}!`, `Order number: ${o.order_number}`, `Date: ${date}`, "",
    ...items.map((i) => `${i.quantity} x ${i.product_name}  ${naira(i.unit_price)} each = ${naira(i.line_total)}`), "",
    `Subtotal: ${naira(o.subtotal)}`, `Delivery: ${o.delivery_fee === 0 ? "Free" : naira(o.delivery_fee)}`, `Total: ${naira(o.total)}`, "",
    `Payment: Pay on Delivery`, `Delivering to: ${addr}`, "", `View your orders: ${link}`,
  ].join("\n");
  const F = "'Outfit','Plus Jakarta Sans',Arial,Helvetica,sans-serif", B = "'Plus Jakarta Sans',Arial,Helvetica,sans-serif";
  const logo = SITE_URL + "images/brand/icon-192.png";
  const rows = items.map((i) => `<tr><td style="padding:12px 0;border-bottom:1px solid #334155;font-family:${B};font-size:15px;color:#f8fafc">${esc(i.product_name)}<br><span style="color:#94a3b8;font-size:13px">${i.quantity} x ${naira(i.unit_price)}</span></td><td align="right" valign="top" style="padding:12px 0;border-bottom:1px solid #334155;white-space:nowrap;font-family:${B};font-size:15px;color:#f8fafc">${naira(i.line_total)}</td></tr>`).join("");
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="color-scheme" content="dark light"><meta name="supported-color-schemes" content="dark light"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:${B};color:#f8fafc">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0f172a" style="background:#0f172a"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#1e293b" style="max-width:560px;background:#1e293b;border:1px solid #334155;border-radius:16px">
<tr><td style="padding:24px 24px 4px"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td valign="middle"><img src="${esc(logo)}" width="36" height="36" alt="" style="display:block;border-radius:8px"></td>
<td valign="middle" style="padding-left:10px;font-family:${F};font-size:22px;font-weight:bold;color:#38bdf8">AuraStore</td></tr></table></td></tr>
<tr><td style="padding:20px 24px 8px">
<span style="display:inline-block;background:#064e3b;color:#34d399;border-radius:999px;padding:4px 12px;font-family:${F};font-size:12px;font-weight:bold;letter-spacing:.5px">ORDER CONFIRMED</span>
<h1 style="margin:14px 0 6px;font-family:${F};font-size:26px;line-height:1.25;color:#f8fafc">Thank you, ${esc(o.ship_name)}!</h1>
<p style="margin:0;color:#94a3b8;font-size:14px">Order <b style="color:#f8fafc">${esc(o.order_number)}</b> &middot; ${esc(date)}</p></td></tr>
<tr><td style="padding:12px 24px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}
<tr><td style="padding:14px 0 2px;color:#94a3b8;font-size:14px">Subtotal</td><td align="right" style="padding:14px 0 2px;font-size:14px;color:#f8fafc">${naira(o.subtotal)}</td></tr>
<tr><td style="padding:2px 0;color:#94a3b8;font-size:14px">Delivery</td><td align="right" style="padding:2px 0;font-size:14px;color:#f8fafc">${o.delivery_fee === 0 ? "Free" : naira(o.delivery_fee)}</td></tr>
<tr><td style="padding:10px 0 0;font-family:${F};font-weight:bold;font-size:18px;color:#f8fafc">Total</td><td align="right" style="padding:10px 0 0;font-family:${F};font-weight:bold;font-size:20px;color:#38bdf8">${naira(o.total)}</td></tr></table></td></tr>
<tr><td style="padding:8px 24px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#131d31" style="background:#131d31;border:1px solid #334155;border-radius:12px"><tr><td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#cbd5e1">
<b style="color:#f8fafc">Payment</b><br>Pay on Delivery<br><br><b style="color:#f8fafc">Delivering to</b><br>${esc(addr)}</td></tr></table></td></tr>
<tr><td style="padding:0 24px 28px"><a href="${esc(link)}" style="display:inline-block;background:#38bdf8;color:#0f172a;text-decoration:none;padding:13px 22px;border-radius:10px;font-family:${F};font-weight:bold;font-size:15px">View my orders</a></td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid #334155;font-size:12px;color:#94a3b8">AuraStore &middot; Thank you for shopping with us.</td></tr>
</table></td></tr></table></body></html>`;
  return { text, html };
}

async function sendMail(o: Order, items: Item[]): Promise<boolean> {
  const key = Deno.env.get("MAILGUN_API_KEY"), domain = Deno.env.get("MAILGUN_DOMAIN"), from = Deno.env.get("MAILGUN_FROM");
  if (!key || !domain || !from) { console.error("Mailgun secrets are missing"); return false; }
  const base = (Deno.env.get("MAILGUN_REGION") ?? "us").toLowerCase() === "eu" ? "https://api.eu.mailgun.net" : "https://api.mailgun.net";
  const { text, html } = buildEmail(o, items);
  const form = new FormData();
  form.set("from", from); form.set("to", o.contact_email);
  form.set("subject", `Your AuraStore order ${o.order_number} is confirmed`);
  form.set("text", text); form.set("html", html);
  try {
    const res = await fetch(`${base}/v3/${domain}/messages`, { method: "POST", headers: { Authorization: "Basic " + btoa("api:" + key) }, body: form });
    if (!res.ok) { console.error("Mailgun error", res.status, (await res.text()).slice(0, 300)); return false; }
    return true;
  } catch (e) { console.error("Mailgun request failed", String(e)); return false; }
}

Deno.serve(async (req) => {
  const c = cors(req.headers.get("origin"));
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...c.headers, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: c.headers });
  if (req.method !== "POST") return json({ error: "METHOD_NOT_ALLOWED" }, 405);
  if (req.headers.get("origin") && !c.ok) return json({ error: "ORIGIN_NOT_ALLOWED" }, 403);   // native apps send no Origin

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "UNAUTHORIZED" }, 401);
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { data: u, error: ue } = await admin.auth.getUser(token);
  if (ue || !u?.user) return json({ error: "UNAUTHORIZED" }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "BAD_JSON" }, 400); }
  const { f, v } = validate(body);
  if (Object.keys(f).length) return json({ error: "VALIDATION", fields: f }, 400);

  const { data: orderId, error: re } = await admin.rpc("place_order", {
    p_user_id: u.user.id, p_contact_email: v.email, p_ship_name: v.name, p_ship_phone: v.phone,
    p_ship_address: v.address, p_ship_city: v.city, p_ship_state: v.state, p_request_id: v.rid,
  });
  if (re) {
    const m = re.message ?? "";
    if (m.includes("EMPTY_CART")) return json({ error: "EMPTY_CART" }, 400);
    if (m.includes("STOCK_PROBLEM")) { let items: unknown = []; try { items = JSON.parse(re.details ?? "[]"); } catch { /* ignore */ } return json({ error: "STOCK_PROBLEM", items }, 409); }
    console.error("place_order failed", m);
    return json({ error: "SERVER_ERROR" }, 500);
  }

  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).single();
  const { data: items } = await admin.from("order_items").select("product_name,quantity,unit_price,line_total").eq("order_id", orderId);
  if (!order) return json({ error: "SERVER_ERROR" }, 500);

  let emailStatus = order.email_status as string;
  if (emailStatus === "pending") {          // only the first request sends the email (O-08)
    emailStatus = (await sendMail(order, items ?? [])) ? "sent" : "failed";
    await admin.from("orders").update({ email_status: emailStatus }).eq("id", orderId);
  }
  return json({ order_id: order.id, order_number: order.order_number, subtotal: order.subtotal, delivery_fee: order.delivery_fee, total: order.total, email_status: emailStatus });
});
