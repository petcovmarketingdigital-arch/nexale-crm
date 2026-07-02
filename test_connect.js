const url = 'http://187.77.243.166:8080/instance/connect/test_123';
const apiKey = 'Decisao@3990';

fetch(url, {
  method: 'GET',
  headers: {
    'apikey': apiKey
  }
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
