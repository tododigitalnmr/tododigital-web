const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

const SCOPES = [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.readonly'
];

async function generateAuthUrl() {
    if (!fs.existsSync(CREDENTIALS_PATH)) {
        console.error('❌ Error: No existe credentials.json');
        return;
    }

    const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
    const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES,
        prompt: 'consent'
    });

    console.log('\n🚀 PASO 1: Visita esta URL para autorizar el acceso al Calendario:\n');
    console.log(authUrl);
    console.log('\n🚀 PASO 2: Después de autorizar, copia el código que aparece en la URL de redirección (después de ?code=) y pégalo aquí para generar el nuevo token.\n');
}

if (require.main === module) {
    generateAuthUrl();
}
