const urlQR = 'http://187.77.243.166:3000/api/default/auth/qr';

fetch(urlQR, {
  headers: { 
    'Accept': 'image/png',
    'X-Api-Key': '123'
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.text();
})
.then(data => console.log('Data length:', data.length))
.catch(err => console.error(err));
