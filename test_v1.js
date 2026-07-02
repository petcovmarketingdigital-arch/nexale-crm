const url = 'http://187.77.243.166:8080/instance';
const apiKey = 'Decisao@3990';

async function test() {
  try {
    const resCreate = await fetch(`${url}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName: 'test_123', qrcode: true })
    });
    console.log('Create:', await resCreate.json());

    const resConnect = await fetch(`${url}/connect/test_123`, { headers: { apikey: apiKey }});
    console.log('Connect:', await resConnect.json());
  } catch (e) { console.error(e); }
}
test();
