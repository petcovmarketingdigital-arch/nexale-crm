// The number 5551998735788 appeared in chats as "264960978464843@lid"
// New WhatsApp uses @lid format instead of @c.us for some contacts
// Let's try both

async function test() {
  const targets = [
    '5551998735788@c.us',
    '264960978464843@lid'  // the lid from chats list
  ];
  
  for (const chatId of targets) {
    console.log(`\n--- Sending to: ${chatId} ---`);
    const res = await fetch('http://187.77.243.166:3000/api/sendText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Api-Key': '123' },
      body: JSON.stringify({
        session: 'default',
        chatId: chatId,
        text: `✅ BIP BOP! Maquina de Vendas funcionando! chatId: ${chatId}`
      })
    });
    
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text.substring(0, 300));
    await new Promise(r => setTimeout(r, 3000));
  }
}

test().catch(console.error);
