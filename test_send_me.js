// Send to the exact same number that WAHA shows as "me"
// The session says: 555194790773@c.us
// So sending to ourselves:

async function test() {
  const chatId = '555194790773@c.us'; // the session's own number
  
  console.log('Sending to:', chatId);
  const res = await fetch('http://187.77.243.166:3000/api/sendText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' },
    body: JSON.stringify({
      session: 'default',
      chatId: chatId,
      text: '✅ BIP BOP! Esta mensagem foi enviada pela sua Maquina de Vendas!'
    })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text.substring(0, 500));
}

test().catch(console.error);
