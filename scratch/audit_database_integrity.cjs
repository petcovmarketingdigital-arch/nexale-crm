const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://zdlybiifkambebscydsp.supabase.co';
const SUPABASE_SERVICE_ROLE = 'sb_secret_rZjQZ_LjkggdTlcA5c9RJQ_BxIy78qy';
const supabaseAdmin = createClient(supabaseUrl, SUPABASE_SERVICE_ROLE);

async function runDatabaseAudit() {
  console.log('=== SYSTEM AUDIT: Supabase Database Integrity Check ===\n');

  // 1. Companies check
  const { data: companies, error: compErr } = await supabaseAdmin.from('companies').select('*');
  if (compErr) {
    console.error('❌ Error reading companies table:', compErr);
  } else {
    console.log(`✅ Companies Table: ${companies.length} records found.`);
    companies.forEach(c => {
      console.log(`  - Company [${c.name}] (ID: ${c.id}) | Status: ${c.status} | Niche: ${c.niche || 'padrão'} | Trial Ends: ${c.trial_ends_at || 'N/A'}`);
    });
  }

  // 2. User Roles check
  console.log('\n--- User Roles Audit ---');
  const { data: userRoles, error: rolesErr } = await supabaseAdmin.from('user_roles').select('*');
  if (rolesErr) {
    console.error('❌ Error reading user_roles:', rolesErr);
  } else {
    console.log(`✅ User Roles Table: ${userRoles.length} users registered.`);
    userRoles.forEach(u => {
      console.log(`  - User [${u.email}] | Role: ${u.role} | Company ID: ${u.company_id}`);
    });
  }

  // 3. Leads Audit
  console.log('\n--- Leads Table Audit ---');
  const { data: leads, error: leadsErr } = await supabaseAdmin.from('leads').select('*');
  if (leadsErr) {
    console.error('❌ Error reading leads table:', leadsErr);
  } else {
    console.log(`✅ Leads Table: ${leads.length} leads in database.`);
    let orphanedLeads = 0;
    let missingNicho = 0;
    let inBolsaoCount = 0;
    let retidoGestorCount = 0;

    leads.forEach(l => {
      if (!l.company_id) orphanedLeads++;
      if (!l.dados_nicho) missingNicho++;
      const nicho = l.dados_nicho || {};
      if (l.bolsao_entered_at || nicho.in_bolsao) inBolsaoCount++;
      if (nicho.retido_gestor || l.origem === 'Retido pelo Gestor') retidoGestorCount++;
    });

    console.log(`  - Summary:`);
    console.log(`    • Orphaned (No company_id): ${orphanedLeads}`);
    console.log(`    • Missing dados_nicho JSONB: ${missingNicho}`);
    console.log(`    • Currently in Bolsão: ${inBolsaoCount}`);
    console.log(`    • Retained by Manager: ${retidoGestorCount}`);
  }

  // 4. Campaigns Audit
  console.log('\n--- Campaigns Table Audit ---');
  const { data: campaigns, error: campErr } = await supabaseAdmin.from('campaigns').select('*').limit(20);
  if (campErr) {
    console.error('❌ Error reading campaigns:', campErr);
  } else {
    console.log(`✅ Campaigns Table: ${campaigns.length} campaigns checked.`);
    campaigns.forEach(c => {
      console.log(`  - Campaign [${c.title}] | Status: ${c.status} | Mode: ${c.mode} | Target Date: ${c.scheduled_at || c.created_at}`);
    });
  }

  console.log('\n=== Database Audit Complete ===');
}

runDatabaseAudit();
