export async function onRequestPost(context: any) {
  try {
    const data = await context.request.json();
    const signature = context.request.headers.get("x-webhook-signature");
    
    // Set up status string depending on if we have a Sheet URL
    let sheetStatus = "No GOOGLE_SHEETS_URL configured";

    // Forward to Google Apps Script if configure
    if (context.env && context.env.GOOGLE_SHEETS_URL) {
      try {
        await fetch(context.env.GOOGLE_SHEETS_URL, {
          method: "POST",
          body: JSON.stringify({
            method: "POST",
            path: "/api/webhook",
            payload: data
          })
        });
        sheetStatus = "Data forwarded to Google Sheets";
      } catch (err: any) {
        sheetStatus = "Failed saving to Google Sheets: " + err.message;
      }
    }

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Webhook payload received securely",
      signature_received: !!signature,
      received_payload: data,
      sheet_status: sheetStatus
    }), {
      headers: { "Content-Type": "application/json" },
      status: 200
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Bad Request: Invalid JSON" }), {
      headers: { "Content-Type": "application/json" },
      status: 400
    });
  }
}
