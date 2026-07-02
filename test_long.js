const url = 'http://187.77.243.166:8080/instance';
const apiKey = 'Decisao@3990';

async function test() {
  try {
    const resDel = await fetch(`${url}/delete/test_999`, { method: 'DELETE', headers: { apikey: apiKey }});
    
    const resCreate = await fetch(`${url}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName: 'test_999', qrcode: true, integration: 'WHATSAPP-BAILEYS' })
    });
    console.log('Create:', Object.keys(await resCreate.json()));

    for (let i=0; i<20; i++) {
      await new Promise(r => setTimeout(r, 4000));
      const resConnect = await fetch(`${url}/connect/test_999`, { headers: { apikey: apiKey }});
      const dataConnect = await resConnect.json();
      console.log(`Connect attempt ${i+1}:`, Object.keys(dataConnect));
      if (dataConnect.base64) {
        console.log('GOT BASE64!');
        break;
      }
    }
  } catch (e) { console.error(e); }
}
test();
