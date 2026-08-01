const { Client } = require('ssh2');

const config = {
  host: '187.77.243.166',
  port: 22,
  username: 'root',
  password: 'Decisao@3990'
};

async function checkAndSetEvolutionWebhook() {
  const c = new Client();
  c.on('ready', () => {
    // 1. Fetch instances
    c.exec(`curl -s http://localhost:8080/instance/fetchInstances -H "apikey: 123"`, (err, s) => {
      let data = '';
      s.stdout.on('data', d => data += d);
      s.on('close', async () => {
        console.log('Instances:', data);
        
        // 2. Set webhook for all instances to http://127.0.0.1:3001/api/webhook/evolution
        const setWebhookCmd = `curl -s -X POST http://localhost:8080/webhook/set/superadmin -H "Content-Type: application/json" -H "apikey: 123" -d '{"webhook": {"enabled": true, "url": "http://127.0.0.1:3001/api/webhook/evolution", "byEvents": false, "events": ["MESSAGES_UPSERT"]}}'`;
        c.exec(setWebhookCmd, (err2, s2) => {
          let res = '';
          s2.stdout.on('data', d => res += d);
          s2.on('close', () => {
            console.log('Webhook set result:', res);
            c.end();
          });
        });
      });
    });
  }).connect(config);
}

checkAndSetEvolutionWebhook();
