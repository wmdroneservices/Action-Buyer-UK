import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import nodemailer from "npm:nodemailer@7.0.6";
import { createClient, corsHeaders } from "npm:@supabase/supabase-js@2";

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  let admin: any = null;
  let queueIds: string[] = [];

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return response({ error: "Authentication required" }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const secretMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
    const serviceKey = secretMap.default || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!serviceKey) return response({ error: "Supabase server key is not configured" }, 500);

    const userClient = createClient(url, anon, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: caller },
      error: callerError,
    } = await userClient.auth.getUser();
    if (callerError || !caller) return response({ error: "Invalid session" }, 401);

    admin = createClient(url, serviceKey);

    const { offer_id, event_type } = await req.json();
    if (
      !offer_id ||
      !["offer_published", "offer_accepted", "offer_refused"].includes(event_type)
    ) {
      return response({ error: "Invalid email request" }, 400);
    }

    const { data: offer, error: offerError } = await admin
      .from("quote_offers")
      .select(
        "id,offer_type,amount,status,customer_message,item_id,quote_items!inner(id,model,manufacturer,valuation_id,valuations!inner(user_id,quote_reference))"
      )
      .eq("id", offer_id)
      .maybeSingle();

    if (offerError || !offer) return response({ error: "Offer not found" }, 404);

    const item = Array.isArray(offer.quote_items)
      ? offer.quote_items[0]
      : offer.quote_items;
    const valuation = Array.isArray(item?.valuations)
      ? item.valuations[0]
      : item?.valuations;
    const customerId = valuation?.user_id;

    const { data: staffRow } = await admin
      .from("staff_users")
      .select("user_id")
      .eq("user_id", caller.id)
      .maybeSingle();

    if (!staffRow && customerId !== caller.id) {
      return response({ error: "Not authorised for this offer" }, 403);
    }

    const { data: customerUser } = customerId
      ? await admin.auth.admin.getUserById(customerId)
      : { data: null };
    const customerEmail =
      customerUser?.user?.email || (customerId === caller.id ? caller.email : null);
    if (!customerEmail) {
      return response({ error: "Customer email address not available" }, 400);
    }

    const { count: itemCount } = await admin
      .from("quote_items")
      .select("id", { count: "exact", head: true })
      .eq("valuation_id", item?.valuation_id);
    const isBatch = (itemCount || 0) > 1;

    const { data: queueRows, error: queueError } = await admin
      .from("email_queue")
      .select("id,status,attempts,user_id,subject,body")
      .eq("offer_id", offer_id)
      .eq("event_type", event_type)
      .eq("status", "queued");

    if (queueError) return response({ error: queueError.message }, 500);
    if (!queueRows?.length) {
      return response({ ok: true, sent: false, already_sent: true });
    }

    queueIds = queueRows.map((r: any) => r.id);

    const quoteUser = Deno.env.get("PURELYMAIL_QUOTE_SMTP_USER");
    const quotePass = Deno.env.get("PURELYMAIL_QUOTE_SMTP_PASS");
    const infoUser = Deno.env.get("PURELYMAIL_SMTP_USER");
    const infoPass = Deno.env.get("PURELYMAIL_SMTP_PASS");

    if (!quoteUser || !quotePass) {
      await admin
        .from("email_queue")
        .update({
          attempts: (queueRows[0].attempts || 0) + 1,
          last_error: "Quote email transport is not configured yet",
        })
        .in("id", queueIds);
      return response(
        { error: "Quote email transport is not configured yet", sent: false },
        503
      );
    }

    const quoteTransporter = nodemailer.createTransport({
      host: "smtp.purelymail.com",
      port: 465,
      secure: true,
      auth: { user: quoteUser, pass: quotePass },
    });
    await quoteTransporter.verify();

    const fromQuote = Deno.env.get("PURELYMAIL_QUOTE_FROM") || quoteUser;
    const fromInfo = Deno.env.get("PURELYMAIL_FROM") || infoUser || quoteUser;
    const model = item?.model || item?.manufacturer || "your equipment";
    const reference = valuation?.quote_reference || "";
    const amount = `£${Number(offer.amount || 0).toFixed(2)}`;

    let subject: string;
    let text: string;

    if (isBatch && event_type === "offer_published") {
      const row = queueRows[0];
      subject = row.subject || `GearCashOut quote ready — ${reference}`;
      text =
        row.body ||
        `Your GearCashOut quote is ready to review.\n\nQuote: ${reference}\n\nSign in to your GearCashOut account to review each item.`;
    } else if (event_type === "offer_published") {
      subject = `GearCashOut offer ready — ${reference}`;
      text = `${offer.customer_message || "Your offer is ready to review."}\n\nItem: ${model}\nOffer: ${amount}\nQuote: ${reference}\n\nSign in to your GearCashOut account to accept or refuse the offer.`;
    } else {
      const accepted = event_type === "offer_accepted";
      subject = accepted
        ? `GearCashOut offer accepted — ${reference}`
        : `GearCashOut offer refused — ${reference}`;
      text = accepted
        ? `You accepted the ${amount} GearCashOut offer for ${model}. We will now continue with the next stage.\n\nQuote: ${reference}`
        : `You refused the ${amount} GearCashOut offer for ${model}.\n\nQuote: ${reference}`;
    }

    await quoteTransporter.sendMail({
      from: fromQuote,
      to: customerEmail,
      subject,
      text,
    });

    if (!isBatch && event_type !== "offer_published" && infoUser && infoPass) {
      const infoTransporter = nodemailer.createTransport({
        host: "smtp.purelymail.com",
        port: 465,
        secure: true,
        auth: { user: infoUser, pass: infoPass },
      });
      await infoTransporter.verify();

      const { data: staffUsers } = await admin.from("staff_users").select("user_id");
      for (const staff of staffUsers || []) {
        const { data: staffUser } = await admin.auth.admin.getUserById(staff.user_id);
        const staffEmail = staffUser?.user?.email;
        if (!staffEmail || staffEmail === customerEmail) continue;

        await infoTransporter.sendMail({
          from: fromInfo,
          to: staffEmail,
          subject,
          text: `Customer response: ${event_type === "offer_accepted" ? "ACCEPTED" : "REFUSED"}\n\nItem: ${model}\nOffer: ${amount}\nQuote: ${reference}\nCustomer: ${customerEmail}`,
        });
      }
    }

    await admin
      .from("email_queue")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
        last_error: null,
      })
      .in("id", queueIds);

    return response({ ok: true, sent: true, batch: isBatch });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Email could not be sent";
    console.error(message);

    if (admin && queueIds.length) {
      await admin
        .from("email_queue")
        .update({ attempts: 1, last_error: message })
        .in("id", queueIds);
    }

    return response({ error: message, sent: false }, 500);
  }
});
