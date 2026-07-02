const url = 'http://187.77.243.166:3000/api/sessions/start';

fetch(url, {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'X-Api-Key': '123'
  },
  body: JSON.stringify({ name: 'empresa_1' })
})
.then(res => res.json())
.then(data => console.log('Start:', data))
.catch(err => console.error(err));
