const url = 'http://187.77.243.166:8080/instance';
const apiKey = 'Decisao@3990';

async function test() {
  try {
    const resDel = await fetch(`${url}/delete/test_456`, { method: 'DELETE', headers: { apikey: apiKey }});
    console.log('Delete:', await resDel.json().catch(e=>'ok'));

    const resCreate = await fetch(`${url}/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: apiKey },
      body: JSON.stringify({ instanceName: 'test_456', qrcode: true })
    });
    console.log('Create:', await resCreate.json());

    await new Promise(r => setTimeout(r, 2000));

    const resConnect = await fetch(`${url}/connect/test_456`, { headers: { apikey: apiKey }});
    console.log('Connect:', await resConnect.json());
  } catch (e) { console.error(e); }
}
test();
