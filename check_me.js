// WAHA check my own number
async function test() {
  // Ask WAHA for the actual number
  const res = await fetch('http://187.77.243.166:3000/api/sessions/default/me', {
    headers: { 'X-Api-Key': '123' }
  });
  const text = await res.text();
  console.log('Me status:', res.status);
  console.log('Me response:', text);
  
  // Try sending to ourselves using the @lid format
  const res2 = await fetch('http://187.77.243.166:3000/api/default/chats', {
    headers: { 'X-Api-Key': '123' }
  });
  const text2 = await res2.text();
  console.log('\nChats status:', res2.status);
  console.log('Chats:', text2.substring(0, 1000));
}

test().catch(console.error);
