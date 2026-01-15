/**
 * CloudFront Function - Inject Supabase Auth
 * Más simple que Lambda@Edge, ejecuta más rápido
 */

// Service role hardcoded (temporal)
var SERVICE_ROLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdsc21pZmhrb2FpZnZhZWdzb3pkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjY4Njc4NywiZXhwIjoyMDY4MjYyNzg3fQ.oyKsFpO_8ulE_m877kpDoxF-htfenoXjq0_GrFThrwI';

function handler(event) {
    var request = event.request;
    var uri = request.uri;
    
    // Quitar prefijo /api
    if (uri.startsWith('/api/')) {
        request.uri = uri.replace('/api/', '/');
    }
    
    // Inyectar service_role en headers
    // (Host header lo maneja CloudFront automáticamente)
    request.headers['authorization'] = {value: 'Bearer ' + SERVICE_ROLE};
    request.headers['apikey'] = {value: SERVICE_ROLE};
    
    return request;
}
