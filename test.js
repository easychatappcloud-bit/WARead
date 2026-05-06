fetch('https://n8n-wexrffsqeapb.sate.sumopod.my.id/webhook-test/terima-pengiriman-pesan', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ to: "+628123456789", text: "test" })
}).then(async res => {
  console.log(res.status);
  console.log(await res.text());
}).catch(console.error);
