/**
 * Script para insertar mensajes de administrador directamente en System UI
 * Usa HTTP request con las credenciales almacenadas en el proyecto
 */

const https = require('https');

const SUPABASE_URL = 'https://zbylezfyagwrxoecioup.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpieWxlemZ5YWd3cnhvZWNpb3VwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1OTMzNjI3MSwiZXhwIjoyMDc0OTEyMjcxfQ.2Btqq8cGSmr4OMKUae8zsHLxQMfs2JJ1ZFgmZYQPFQY';

function insertAdminMessage(params) {
  return new Promise((resolve, reject) => {
    // Escapar valores para SQL seguro
    const escapeSQL = (str) => (str || '').replace(/'/g, "''").replace(/\\/g, '\\\\');
    
    const sql = `
      INSERT INTO admin_messages (
        category, title, message, sender_id, sender_email,
        recipient_role, priority, metadata, status
      ) VALUES (
        '${escapeSQL(params.category)}', 
        '${escapeSQL(params.title)}', 
        '${escapeSQL(params.message)}', 
        ${params.sender_id ? `'${params.sender_id}'` : 'NULL'}, 
        ${params.sender_email ? `'${escapeSQL(params.sender_email)}'` : 'NULL'}, 
        '${escapeSQL(params.recipient_role || 'admin')}', 
        '${escapeSQL(params.priority || 'normal')}', 
        '${JSON.stringify(params.metadata || {}).replace(/'/g, "''")}'::jsonb, 
        'pending'
      ) RETURNING row_to_json(admin_messages.*)::jsonb;
    `;

    const data = JSON.stringify({ query: sql });

    const options = {
      hostname: 'zbylezfyagwrxoecioup.supabase.co',
      port: 443,
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(body);
            resolve(result);
          } catch (e) {
            resolve(body);
          }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    req.write(data);
    req.end();
  });
}

// Si se ejecuta directamente, probar
if (require.main === module) {
  insertAdminMessage({
    category: 'user_unblock_request',
    title: 'Test Unblock',
    message: 'Test message',
    sender_email: 'test@test.com',
    recipient_role: 'admin',
    priority: 'urgent'
  })
    .then(result => {
      console.log('✅ Mensaje insertado:', result);
    })
    .catch(error => {
      console.error('❌ Error:', error.message);
    });
}

module.exports = { insertAdminMessage };

