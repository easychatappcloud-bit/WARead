/**
 * Cloudflare Pages Function
 * This file is automatically picked up by Cloudflare Pages to serve as an API endpoint.
 * Route: /api/hello
 */
export async function onRequest(context: any) {
  const { request } = context;
  
  if (request.method === "POST") {
    try {
      const data = await request.json();
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Data received successfully via POST (Cloudflare Pages)",
        receivedData: data
      }), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        headers: { "Content-Type": "application/json" },
        status: 400
      });
    }
  }

  // Default GET response
  return new Response(JSON.stringify({ 
    message: "Hello from Cloudflare Pages API Endpoint!",
    status: "Active",
    environment: "Cloudflare Pages",
    timestamp: new Date().toISOString()
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
