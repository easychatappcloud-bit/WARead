export async function onRequest(context: any) {
  // Cloudflare Workers (Pages Functions) bersifat stateless.
  // Tanpa database (seperti Cloudflare KV, D1, atau Supabase), 
  // kita tidak bisa menyimpan riwayat webhook yang masuk.
  
  return new Response(JSON.stringify([
    {
      id: "cf-pages-notice",
      timestamp: new Date().toISOString(),
      method: "INFO",
      payload: { 
        notice: "Di environment Cloudflare Pages, Serverless Functions bersifat stateless. Untuk benar-benar menyimpan dan menampilkan history webhook di sini, Anda perlu mengkonfigurasi Cloudflare KV atau D1 Database." 
      }
    }
  ]), {
    headers: { "Content-Type": "application/json" },
    status: 200
  });
}
