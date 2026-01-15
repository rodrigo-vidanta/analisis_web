/**
 * Lambda@Edge - Origin Response
 * Agrega headers CORS a responses de Supabase
 */

exports.handler = async (event, context, callback) => {
  const response = event.Records[0].cf.response;
  const headers = response.headers;

  // Agregar headers CORS a TODAS las responses
  headers['access-control-allow-origin'] = [{
    key: 'Access-Control-Allow-Origin',
    value: '*'
  }];

  headers['access-control-allow-methods'] = [{
    key: 'Access-Control-Allow-Methods',
    value: 'GET,HEAD,POST,PUT,DELETE,OPTIONS,PATCH'
  }];

  headers['access-control-allow-headers'] = [{
    key: 'Access-Control-Allow-Headers',
    value: 'Content-Type,Authorization,apikey,x-client-info,Prefer,x-session-token'
  }];

  headers['access-control-allow-credentials'] = [{
    key: 'Access-Control-Allow-Credentials',
    value: 'true'
  }];

  headers['access-control-max-age'] = [{
    key: 'Access-Control-Max-Age',
    value: '86400'
  }];

  callback(null, response);
};
