export async function onRequest(context: any) {
  if (context.env && context.env.GOOGLE_SHEETS_URL) {
    try {
      const resp = await fetch(context.env.GOOGLE_SHEETS_URL);
      const data = await resp.json();
      return new Response(JSON.stringify(data), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    } catch(e: any) {
      return new Response(JSON.stringify([{
        id: "error",
        timestamp: new Date().toISOString(),
        method: "ERROR",
        payload: { notice: "Gagal mengambil data dari Google Sheets API: " + e.message }
      }]), {
        headers: { "Content-Type": "application/json" },
        status: 200
      });
    }
  }

  // Cloudflare Workers (Pages Functions) bersifat stateless.
  // Tanpa database (seperti Cloudflare KV, D1, atau Supabase), 
  // kita tidak bisa menyimpan riwayat webhook yang masuk secara native.
  
  return new Response(JSON.stringify([
    {
      id: "cf-pages-notice",
      timestamp: new Date().toISOString(),
      method: "INFO",
      payload: { 
        notice: "Di environment Cloudflare Pages, Serverless Functions bersifat stateless. Atur Environment Variable GOOGLE_SHEETS_URL di Cloudflare Dashboard yang isinya URL dari Google Apps Script Web App Anda." 
      }
    }
  ]), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
