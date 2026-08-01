const { Client } = require('ssh2');

const config = {
  host: '187.77.243.166',
  port: 22,
  username: 'root',
  password: 'Decisao@3990'
};

const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /etc/letsencrypt/live/', (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString()));
    stream.on('close', () => conn.end());
  });
}).connect(config);
