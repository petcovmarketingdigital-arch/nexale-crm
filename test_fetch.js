const url = 'http://187.77.243.166:8080/instance/fetchInstances';
fetch(url, { headers: { apikey: 'Decisao@3990' }})
.then(res => res.json())
.then(console.log);
