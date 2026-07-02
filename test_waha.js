const url = 'http://187.77.243.166:3000/api/sessions/start';

fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: 'default' })
})
.then(res => res.json())
.then(data => console.log('Start:', data))
.catch(err => console.error(err));
