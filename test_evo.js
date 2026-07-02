const url = 'http://187.77.243.166:8080/instance/create';
const apiKey = 'Decisao@3990';

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': apiKey
  },
  body: JSON.stringify({
    instanceName: "test_123",
    token: "test_123_token",
    qrcode: true,
    integration: "WHATSAPP-BAILEYS"
  })
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
