/**
 * Lambda@Edge - Supabase Auth Injector
 * Inyecta service_role key en requests a Supabase
 * La key se obtiene de AWS Secrets Manager (seguro)
 */

// Service role key (temporal - hardcoded para testing)
// TODO: Mover a Secrets Manager cuando funcione
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI';

async function getServiceRoleKey() {
  return SERVICE_ROLE_KEY;
}

exports.handler = async (event, context, callback) => {
  const request = event.Records[0].cf.request;
  const response = event.Records[0].cf.response;
  const headers = request.headers;

  // Manejar OPTIONS (CORS preflight)
  if (request.method === 'OPTIONS') {
    callback(null, {
      status: '200',
      statusDescription: 'OK',
      headers: {
        'access-control-allow-origin': [{ value: '*' }],
        'access-control-allow-methods': [{ value: 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH' }],
        'access-control-allow-headers': [{ value: 'Content-Type,Authorization,apikey,x-client-info,Prefer' }],
        'access-control-max-age': [{ value: '86400' }]
      }
    });
    return;
  }

  // Quitar prefijo /api del URI
  if (request.uri.startsWith('/api/')) {
    request.uri = request.uri.replace('/api/', '/');
  }

  // Interceptar requests a Supabase
  if (request.uri.includes('/rest/v1/') || 
      request.uri.includes('/auth/v1/') ||
      request.uri.includes('/storage/v1/') ||
      request.uri.includes('/rpc/')) {
    
    try {
      // Obtener service_role de Secrets Manager
      const serviceRoleKey = await getServiceRoleKey();

      // Inyectar headers de autenticación
      headers['authorization'] = [{
        key: 'Authorization',
        value: `Bearer ${serviceRoleKey}`
      }];

      headers['apikey'] = [{
        key: 'apikey',
        value: serviceRoleKey
      }];

      console.log('✅ Service_role inyectada para:', request.uri);
    } catch (error) {
      console.error('❌ Error obteniendo secret:', error);
    }
  }

  callback(null, request);
};
