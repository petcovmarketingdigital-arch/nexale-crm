// Test sending a message with different number formats
const numbers = [
  '5551994790773',   // with 9 digit (formato novo)
  '555194790773',    // without 9 digit (formato antigo - como aparece no WAHA)
];

async function test() {
  for (const number of numbers) {
    console.log(`\n--- Testando: ${number} ---`);
    const res = await fetch('http://187.77.243.166:3000/api/sendText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' },
      body: JSON.stringify({
        session: 'default',
        chatId: `${number}@c.us`,
        text: `🤖 BIP BOP! Teste com número ${number}`
      })
    });
    
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Response:', JSON.stringify(data, null, 2));
  }
}

test().catch(console.error);
