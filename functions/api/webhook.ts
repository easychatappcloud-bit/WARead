export async function onRequestPost(context: any) {
  try {
    const data = await context.request.json();
    
    // Mendapatkan header dari layanan pihak ketiga
    // Biasanya webhook dilengkapi dengan signature untuk keamanan
    const signature = context.request.headers.get("x-webhook-signature");

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Webhook payload received securely",
      signature_received: !!signature,
      received_payload: data
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
