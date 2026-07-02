const url = 'http://187.77.243.166:8080/instance';
const apiKey = 'Decisao@3990';

async function test() {
  try {
    const resCreate = await fetch(`${url}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName: 'test_555', qrcode: true, integration: 'WHATSAPP-BAILEYS' })
    });
    console.log('Create:', Object.keys(await resCreate.json()));

    for (let i=0; i<5; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const resState = await fetch(`${url}/connectionState/test_555`, { headers: { apikey: apiKey }});
      const state = await resState.json();
      console.log(`State attempt ${i+1}:`, state);
    }
  } catch (e) { console.error(e); }
}
test();
