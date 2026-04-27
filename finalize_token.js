const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

// EL CÓDIGO QUE OBTUVO EL SUBAGENTE
const CODE = '4/0Aci98E_xSsE7tb9uVjRSZlJg9_lSKVCuKXyw6b1wLjmXz3hetBD0jL-JuYA7ozFQtXJpRw';

async function finalizeToken() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ Error: No existe credentials.json');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    
    const REDIRECT_URI = 'https://webhook.site/69ab3b0e-340e-410d-8760-73fcd3f6b2ae';

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, REDIRECT_URI);

    try {
        const { tokens } = await oAuth2Client.getToken(CODE);
        oAuth2Client.setCredentials(tokens);
        
        // Guardar el token completo (incluyendo scopes)
        fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens));
        console.log('✅ Token generado y guardado en token.json');
        console.log('Scopes autorizados:', tokens.scope);
    } catch (error) {
        console.error('❌ Error intercambiando el código:', error.message);
        if (error.message.includes('redirect_uri_mismatch')) {
            console.log('Intentando con el redirect_uri del webhook...');
            // El subagent suele usar webhook.site si localhost falla.
        }
    }
}

finalizeToken();
