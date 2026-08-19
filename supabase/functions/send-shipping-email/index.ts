import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@7.0.6";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return response({ error: "Authentication required" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const secretMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = secretMap.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return response({ error: "Supabase server key is not configured" }, 500);
    const userClient = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return response({ error: "Invalid session" }, 401);
    const admin = createClient(url, serviceKey);
    const { data: staff } = await admin.from("staff_users").select("user_id").eq("user_id", caller.id).maybeSingle();
    if (!staff) return response({ error: "Staff access required" }, 403);

    const { shipment_id } = await req.json();
    if (!shipment_id) return response({ error: "shipment_id is required" }, 400);
    const { data: shipment } = await admin.from("shipments").select("id,sale_id,shipment_type,status,carrier,tracking_number,label_urls,qr_code_urls,shipped_at").eq("id", shipment_id).maybeSingle();
    if (!shipment) return response({ error: "Shipment not found" }, 404);
    const { data: sale } = await admin.from("sales").select("id,sale_reference,user_id").eq("id", shipment.sale_id).maybeSingle();
    if (!sale) return response({ error: "Sale not found" }, 404);
    const { data: customer } = await admin.auth.admin.getUserById(sale.user_id);
    const customerEmail = customer?.user?.email;
    if (!customerEmail) return response({ error: "Customer email address not available" }, 400);

    const smtpUser = Deno.env.get("PURELYMAIL_QUOTE_SMTP_USER") || Deno.env.get("PURELYMAIL_SMTP_USER");
    const smtpPass = Deno.env.get("PURELYMAIL_QUOTE_SMTP_PASS") || Deno.env.get("PURELYMAIL_SMTP_PASS");
    if (!smtpUser || !smtpPass) return response({ error: "Email transport is not configured" }, 503);
    const transporter = nodemailer.createTransport({ host: "smtp.purelymail.com", port: 465, secure: true, auth: { user: smtpUser, pass: smtpPass } });
    await transporter.verify();
    const labelLines = (shipment.label_urls || []).filter((x: unknown) => /^https?:\\/\\//i.test(String(x))).map((x: string, i: number) => `Postal label ${i + 1}: ${x}`).join("\\n");
    const qrLines = (shipment.qr_code_urls || []).filter((x: unknown) => /^https?:\\/\\//i.test(String(x))).map((x: string, i: number) => `QR code ${i + 1}: ${x}`).join("\\n");
    const inbound = shipment.shipment_type === "inbound";
    const subject = inbound ? `Your GearCashOut postal label — ${sale.sale_reference}` : `Your GearCashOut return shipment — ${sale.sale_reference}`;
    const text = inbound
      ? `Thank you for accepting your GearCashOut offer.\n\nYour postal label is ready. You can use the label below, or the QR code if provided. You can also find the same information in your GearCashOut account.\n\nSale: ${sale.sale_reference}\n${shipment.tracking_number ? `Tracking: ${shipment.tracking_number}\n` : ""}${labelLines}\n${qrLines}`
      : `Your GearCashOut return shipment has been arranged.\n\nSale: ${sale.sale_reference}\n${shipment.tracking_number ? `Tracking: ${shipment.tracking_number}\n` : ""}${labelLines}\n${qrLines}`;
    await transporter.sendMail({ from: Deno.env.get("PURELYMAIL_QUOTE_FROM") || smtpUser, to: customerEmail, subject, text });
    return response({ ok: true, sent: true });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Email could not be sent" }, 500);
  }
});
