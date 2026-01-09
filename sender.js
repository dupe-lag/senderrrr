// ============ CONFIGURATION ============
// YOUR BACKEND URL - CHANGE NOTHING ELSE!
const BOT_BACKEND_URL = 'https://telegram-bot-protector.andrei2011el.workers.dev/';
const SECRET_TOKEN = 'LOTBLOX_PROTECTED_EXTENSION7X9A2P5R8S3V6Y1Z4';
const WEBHOOK_PATH = 'webhook';

// ============ MAIN PROTECTOR CODE ============
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // Show info page for GET requests
    if (request.method === 'GET') {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>🔒 Telegram Webhook Protector</title>
          <style>
            body { font-family: Arial; padding: 20px; max-width: 600px; margin: 0 auto; }
            .card { background: #f0f8ff; padding: 20px; border-radius: 10px; margin: 20px 0; }
            code { background: #e0e0e0; padding: 2px 6px; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>🔒 Telegram Webhook Protector</h1>
          
          <div class="card">
            <h3>✅ Protection Active</h3>
            <p><strong>Webhook Endpoint:</strong> <code>POST /${WEBHOOK_PATH}</code></p>
            <p><strong>Protecting:</strong> ${BOT_BACKEND_URL}</p>
            <p><strong>Secret Token:</strong> ${SECRET_TOKEN.substring(0, 10)}...</p>
          </div>
          
          <div class="card">
            <h3>📡 Set Telegram Webhook</h3>
            <pre><code>curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://[YOUR-PROTECTOR-URL]/${WEBHOOK_PATH}",
    "secret_token": "${SECRET_TOKEN}",
    "drop_pending_updates": true
  }'</code></pre>
          </div>
        </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      );
    }
    
    // Handle webhook (POST /webhook)
    if (url.pathname === `/${WEBHOOK_PATH}` && request.method === 'POST') {
      try {
        // 1. Check secret token
        const incomingToken = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
        if (!incomingToken || incomingToken !== SECRET_TOKEN) {
          console.log('❌ Invalid token attempt');
          return new Response('Unauthorized', { 
            status: 401,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        
        // 2. Validate request is JSON
        const contentType = request.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          return new Response('Invalid content type', { 
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
          });
        }
        
        // 3. Log the request (optional)
        const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
        console.log(`✅ Valid webhook from ${clientIP}`);
        
        // 4. Add security headers for forwarded request
        const forwardHeaders = new Headers(request.headers);
        forwardHeaders.set('X-Forwarded-For', clientIP);
        forwardHeaders.set('X-Protector-Validated', 'true');
        
        // 5. FORWARD TO YOUR BACKEND
        const forwardRequest = new Request(BOT_BACKEND_URL, {
          method: 'POST',
          headers: forwardHeaders,
          body: request.body
        });
        
        const response = await fetch(forwardRequest);
        
        // 6. Add security headers to response
        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('X-Content-Type-Options', 'nosniff');
        responseHeaders.set('X-Frame-Options', 'DENY');
        
        return new Response(response.body, {
          status: response.status,
          headers: responseHeaders
        });
        
      } catch (error) {
        console.error('🛑 Protector error:', error);
        return new Response('Internal Server Error', { 
          status: 500,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
    
    // API proxy for Telegram API (optional)
    if (url.pathname.startsWith('/bot') || url.pathname.startsWith('/file/bot')) {
      const telegramUrl = `https://api.telegram.org${url.pathname}${url.search}`;
      
      try {
        const response = await fetch(telegramUrl, {
          method: request.method,
          headers: request.headers,
          body: request.body
        });
        
        const newResponse = new Response(response.body, response);
        newResponse.headers.set('Access-Control-Allow-Origin', '*');
        return newResponse;
      } catch (error) {
        return new Response(`Proxy error: ${error.message}`, { status: 502 });
      }
    }
    
    // 404 for other routes
    return new Response('Not Found', { 
      status: 404,
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
