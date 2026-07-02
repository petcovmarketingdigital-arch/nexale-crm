const { Client } = require('ssh2');

const conn = new Client();
const config = {
  host: '187.77.243.166',
  port: 22,
  username: 'root',
  password: 'Decisao@3990',
  readyTimeout: 99999
};

const commands = [
  'apt-get update -y',
  'apt-get install -y docker.io docker-compose',
  'mkdir -p /opt/evolution',
  `cat << 'EOF' > /opt/evolution/docker-compose.yml
version: '3.3'
services:
  evolution-api:
    image: evolutionapi/evolution-api:latest
    container_name: evolution-api
    ports:
      - "8080:8080"
    environment:
      - SERVER_PORT=8080
      - AUTHENTICATION_API_KEY=Decisao@3990
      - AUTHENTICATION_TYPE=apikey
      - DATABASE_PROVIDER=postgresql
      - DATABASE_CONNECTION_URI=postgresql://postgres:suasenhabanco@postgres:5432/evolution?schema=public
      - DATABASE_CONNECTION_CLIENT_NAME=evolution
    depends_on:
      - postgres
    restart: always
  postgres:
    image: postgres:15-alpine
    container_name: evolution-postgres
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=suasenhabanco
      - POSTGRES_DB=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always
volumes:
  postgres_data:
EOF`,
  'cd /opt/evolution && docker-compose up -d'
];

conn.on('ready', () => {
  console.log('Client :: ready');
  let cmdIndex = 0;

  function runNext() {
    if (cmdIndex >= commands.length) {
      console.log('Done!');
      conn.end();
      return;
    }
    const cmd = commands[cmdIndex++];
    console.log(`Running: ${cmd.substring(0, 50)}...`);
    conn.exec(cmd, (err, stream) => {
      if (err) throw err;
      stream.on('close', (code, signal) => {
        console.log('Stream :: close :: code: ' + code);
        runNext();
      }).on('data', (data) => {
        console.log('STDOUT: ' + data);
      }).stderr.on('data', (data) => {
        console.log('STDERR: ' + data);
      });
    });
  }
  
  runNext();
}).connect(config);
