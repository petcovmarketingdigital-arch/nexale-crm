const numbers = [
  '5551994790773',
  '555194790773',
];

async function test() {
  for (const number of numbers) {
    console.log(`\n--- Testando: ${number} ---`);
    try {
      const res = await fetch('http://187.77.243.166:3000/api/sendText', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' },
        body: JSON.stringify({
          session: 'default',
          chatId: `${number}@c.us`,
          text: `Teste com numero ${number}`
        })
      });
      
      const text = await res.text();
      console.log('Status:', res.status);
      console.log('Response:', text.substring(0, 500));
    } catch(e) {
      console.log('Erro:', e.message);
    }
    await new Promise(r => setTimeout(r, 2000));
  }
}

test().catch(console.error);
