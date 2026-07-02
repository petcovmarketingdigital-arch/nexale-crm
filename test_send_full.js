// Test sending a message and see the full response
const number = '5551947907739'; // replace with correct number if needed

async function test() {
  // 1. Check session status
  const sess = await fetch('http://187.77.243.166:3000/api/sessions?all=true', {
    headers: { 'X-Api-Key': '123' }
  });
  const sessData = await sess.json();
  console.log('Session:', JSON.stringify(sessData, null, 2));

  // 2. Try sending to a number
  const res = await fetch('http://187.77.243.166:3000/api/sendText', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' },
    body: JSON.stringify({
      session: 'default',
      chatId: `${number}@c.us`,
      text: 'Teste de disparo - BIP BOP!'
    })
  });
  
  const data = await res.json();
  console.log('Send status:', res.status);
  console.log('Send response:', JSON.stringify(data, null, 2));
}

test().catch(console.error);
