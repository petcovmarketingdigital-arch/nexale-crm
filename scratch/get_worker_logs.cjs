const { Client } = require('ssh2');

const config = {
  host: '187.77.243.166',
  port: 22,
  username: 'root',
  password: 'Decisao@3990',
  readyTimeout: 30000
};

const conn = new Client();
conn.on('ready', () => {
  console.log('SSH Connected. Fetching PM2 logs for crm-worker...');
  conn.exec('pm2 logs crm-worker --lines 100 --nostream', (err, stream) => {
    if (err) throw err;
    let output = '';
    stream.on('data', (data) => { output += data; });
    stream.stderr.on('data', (data) => { output += data; });
    stream.on('close', () => {
      console.log('=== PM2 WORKER LOGS ===');
      console.log(output);
      conn.end();
    });
  });
}).connect(config);
