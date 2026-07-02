const url = 'http://187.77.243.166:3000/api/sessions?all=true';

fetch(url, { headers: { 'X-Api-Key': '123' } })
.then(res => res.json())
.then(data => console.log('Sessions:', JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
