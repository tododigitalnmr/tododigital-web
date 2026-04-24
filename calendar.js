const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const CREDENTIALS_PATH = path.join(__dirname, 'credentials.json');
const TOKEN_PATH = path.join(__dirname, 'token.json');

const SERVICE_ACCOUNT_PATH = path.join(__dirname, 'service-account.json');

async function getAuthClient() {
    let credentials;

    // 1. Intentar cargar Cuenta de Servicio desde variable de entorno (Prioridad Render)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
        try {
            credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
        } catch (e) {
            console.error('❌ Error parseando GOOGLE_SERVICE_ACCOUNT_JSON:', e.message);
        }
    }

    // 2. Fallback a archivo local service-account.json
    if (!credentials && fs.existsSync(SERVICE_ACCOUNT_PATH)) {
        credentials = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH));
    }

    if (credentials && credentials.type === 'service_account') {
        return new google.auth.JWT(
            credentials.client_email,
            null,
            credentials.private_key,
            ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.readonly'],
            'tododigitalnmr@gmail.com' // Suplantar al usuario dueño del calendario
        );
    }

    // 3. Fallback antiguo (OAuth2) si no hay cuenta de servicio
    // [Se mantiene por compatibilidad si fuera necesario, pero la cuenta de servicio es preferida]
    throw new Error('Faltan credenciales de Cuenta de Servicio (service-account.json)');
}

/**
 * Verifica si un hueco está disponible
 * @param {string} startISO - Fecha/hora inicio en formato ISO
 * @param {number} durationMin - Duración en minutos
 */
async function checkAvailability(startISO, durationMin = 30) {
    try {
        const auth = await getAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });
        
        const start = new Date(startISO);
        const end = new Date(start.getTime() + durationMin * 60000);

        const response = await calendar.freebusy.query({
            requestBody: {
                timeMin: start.toISOString(),
                timeMax: end.toISOString(),
                items: [{ id: 'primary' }]
            }
        });

        const busy = response.data.calendars.primary.busy;
        return busy.length === 0;
    } catch (error) {
        console.error('❌ Error verificando disponibilidad:', error.message);
        return true; // Fallback: asumimos disponible si hay error de red/auth
    }
}

/**
 * Crea un evento en el calendario
 */
async function createEvent(cita) {
    try {
        const auth = await getAuthClient();
        const calendar = google.calendar({ version: 'v3', auth });

        // Intentar parsear el día y hora (esto es lo más difícil)
        // Por ahora asumimos que Nath mandó algo que podemos convertir
        // Si no, usamos hoy + 1 hora como fallback para que no crashee
        const start = parseCitaDateTime(cita.dia, cita.hora);
        const end = new Date(start.getTime() + 30 * 60000); // 30 min por defecto

        const event = {
            summary: `Cita: ${cita.nombre} - ${cita.servicio}`,
            location: 'TodoDigital NMR (Online)',
            description: `Cliente: ${cita.nombre}\nServicio: ${cita.servicio}\nWhatsApp: ${cita.whatsapp}\nCanal: ${cita.canal || 'Web Chat'}`,
            start: { dateTime: start.toISOString(), timeZone: 'America/Mexico_City' },
            end: { dateTime: end.toISOString(), timeZone: 'America/Mexico_City' },
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 24 * 60 },
                    { method: 'popup', minutes: 30 },
                ],
            },
        };

        const res = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        console.log('✅ Evento creado en Google Calendar:', res.data.htmlLink);
        return { success: true, link: res.data.htmlLink };
    } catch (error) {
        console.error('❌ Error creando evento en Google Calendar:', error.message);
        return { success: false, error: error.message };
    }
}

function parseCitaDateTime(dia, hora) {
    // Lógica simple para parsear lo que Nath suele mandar: "Lunes", "Martes", o "2024-05-10"
    // Y horas como "10:00 AM", "4pm"
    const now = new Date();
    let targetDate = new Date();

    // Si es un nombre de día (Lunes, Martes...)
    const dias = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
    const diaLower = (dia || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const diaIndex = dias.indexOf(diaLower);

    if (diaIndex !== -1) {
        let diff = diaIndex - now.getDay();
        if (diff < 0) diff += 7; // Próxima semana
        targetDate.setDate(now.getDate() + diff);
    } else if (dia && dia.match(/^\d{4}-\d{2}-\d{2}$/)) {
        targetDate = new Date(dia);
    }

    // Parsear hora (ej: "10:00 AM", "4 PM", "16:00")
    let h = 10, m = 0;
    const timeMatch = (hora || '').match(/(\d+)(?::(\d+))?\s*(am|pm)?/i);
    if (timeMatch) {
        h = parseInt(timeMatch[1]);
        m = parseInt(timeMatch[2] || 0);
        const ampm = (timeMatch[3] || '').toLowerCase();
        if (ampm === 'pm' && h < 12) h += 12;
        if (ampm === 'am' && h === 12) h = 0;
    }
    
    targetDate.setHours(h, m, 0, 0);
    return targetDate;
}

module.exports = { checkAvailability, createEvent };
