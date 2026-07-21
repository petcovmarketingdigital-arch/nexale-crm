// ============================================================
// NEXALE CRM — Script de Deploy com Um Clique
// Uso: node deploy.cjs
// O que faz:
//   1. Envia o campaign_worker.cjs atualizado para o VPS
//   2. Reinicia o crm-worker via PM2
// ============================================================

const SftpClient = require('ssh2-sftp-client');
const { Client }  = require('ssh2');

const SERVER = {
  host:         '187.77.243.166',
  port:         22,
  username:     'root',
  password:     'Decisao@3990',
  readyTimeout: 20000
};

const FILES = [
  { local: 'campaign_worker.cjs', remote: '/var/www/crm/campaign_worker.cjs' },
  { local: 'C:/Users/petco/OneDrive/Área de Trabalho/NEXALECRM/documentos/guia_antibان_nexale.html', remote: '/var/www/crm/public/guia-antiban-nexale.html' }
];

// ── Helpers ─────────────────────────────────────────────────
const log  = (msg) => console.log(`\n✅ ${msg}`);
const warn = (msg) => console.log(`⚠️  ${msg}`);
const err  = (msg) => console.error(`\n❌ ERRO: ${msg}`);

function runSSH(command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      let output = '';
      conn.exec(command, (e, stream) => {
        if (e) { conn.end(); return reject(e); }
        stream
          .on('close', (code) => { conn.end(); resolve({ code, output }); })
          .on('data',  (d) => { output += d; })
          .stderr.on('data', (d) => { output += d; });
      });
    }).on('error', reject).connect(SERVER);
  });
}

// ── Main ─────────────────────────────────────────────────────
async function deploy() {
  console.log('\n🚀 NEXALE CRM — Deploy Iniciado');
  console.log('════════════════════════════════════════');

  // 0. Garante que a pasta public existe no servidor
  try {
    console.log('\n📁 Criando pasta pública no servidor...');
    await runSSH('mkdir -p /var/www/crm/public');
  } catch (e) {
    warn('Não foi possível verificar/criar a pasta pública: ' + e.message);
  }

  // 1. Upload dos arquivos via SFTP
  const sftp = new SftpClient();
  try {
    console.log('\n📤 Conectando ao servidor via SFTP...');
    await sftp.connect(SERVER);

    for (const file of FILES) {
      process.stdout.write(`   Enviando ${file.local}... `);
      await sftp.put(file.local, file.remote);
      console.log('✅');
    }

    await sftp.end();
    log('Todos os arquivos enviados com sucesso!');
  } catch (e) {
    await sftp.end().catch(() => {});
    err(`Falha no envio SFTP: ${e.message}`);
    process.exit(1);
  }

  // 2. Reinicia o worker via PM2
  console.log('\n🔄 Reiniciando crm-worker no servidor...');
  try {
    const { code, output } = await runSSH('pm2 restart crm-worker && pm2 show crm-worker --no-color');
    if (code !== 0) {
      warn('PM2 retornou código ' + code);
      console.log(output);
    } else {
      // Extrai apenas as linhas relevantes do output
      const lines = output.split('\n').filter(l =>
        l.includes('status') || l.includes('uptime') || l.includes('online') ||
        l.includes('crm-worker') || l.includes('restarts')
      );
      console.log(lines.join('\n'));
      log('crm-worker reiniciado com sucesso!');
    }
  } catch (e) {
    err(`Falha ao reiniciar PM2: ${e.message}`);
    process.exit(1);
  }

  // 3. Verifica se o código novo está no servidor
  console.log('\n🔍 Verificando se as atualizações estão ativas...');
  try {
    const { output } = await runSSH('grep -c "randomDelay" /var/www/crm/campaign_worker.cjs');
    const count = parseInt(output.trim());
    if (count > 0) {
      log(`Proteções anti-ban confirmadas no servidor (${count} referências encontradas).`);
    } else {
      warn('Atenção: proteções anti-ban não encontradas. Verifique o arquivo manualmente.');
    }
  } catch (e) {
    warn('Não foi possível verificar o arquivo no servidor.');
  }

  console.log('\n════════════════════════════════════════');
  console.log('🎉 Deploy concluído! O servidor está atualizado e rodando.\n');
}

deploy();
