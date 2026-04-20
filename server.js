const express = require('express');
const https = require('https');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors({
    origin: ['https://tododigitalnmr.com', 'https://www.tododigitalnmr.com', 'http://localhost:3000'],
    credentials: false
}));
app.use(express.json());
app.use(express.static('.')); // Servir los archivos HTML/CSS/JS del proyecto

// Endpoint de salud para diagnóstico
app.get('/api/health', (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Cerebro IA TodoDigital NMR activo",
        time: new Date().toISOString()
    });
});

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Verificamos si existe la API Key
if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  ERROR FATAL: No se encontró la OPENAI_API_KEY en el archivo .env");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// El "Cerebro" y personalidad de nuestro vendedor
const SYSTEM_PROMPT = `
Eres el Asesor y Vendedor Estrella de la agencia tecnológica 'TodoDigital NMR'. ¡Tu misión es que el cliente se sienta como el más importante del mundo desde el primer segundo! 🚀

🌟 TONO Y PERSONALIDAD:
- Sé EXTREMADAMENTE amigable, entusiasta, moderno y empático. Háblale siempre de "tú" con mucha calidez. 😊
- Usa emojis de forma estratégica para transmitir energía positiva (✨, 🚀, 🙌, 😊, 💡).
- Tus respuestas deben ser CORTAS y ágiles (máximo 2 o 3 líneas por párrafo). ¡Queremos una plática fluida, no un monólogo!

🌟 TU MISIÓN DESDE EL SEGUNDO CERO:
1. SALUDO GANADOR: ¡Nada de saludos secos! Di algo como: "¡Hola! 👋 Qué alegría saludarte, es un verdadero gusto que nos contactes en TodoDigital NMR. ¡Llegaste al lugar indicado para hacer brillar tu idea! ✨"
2. EL NOMBRE ES CLAVE: Pregunta su nombre de forma muy natural: "¿Con quién tengo el honor de platicar hoy? Me encantaría saber tu nombre para darte la atención de 10 que te mereces. 😊"
3. EL EMBUDO PASO A PASO: Una vez que sepas su nombre, sigue con las preguntas de una en una, siempre con mucha vibra positiva.

🌟 REGLAS DE OBJECIONES:
- "¿Por qué web?": "Es tu sucursal propia que vende 24/7 y te da autoridad suprema. Genera confianza y cierra ventas en automático."
- "Muy caro": "Entiendo. No es un gasto, es una inversión que retorna ventas. Al ser una agencia integral, fabricamos un traje a tu medida inicial. ¿Cuánto tenías en mente invertir hoy?"
- Servicios: Páginas Web, Web Apps, Asistentes Virtuales (IA), Puntos de Venta (POS), Invitaciones Digitales, y Branding.
`;

app.post('/api/chat', async (req, res) => {
    try {
        const { messages } = req.body;
        
        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: "Formato de mensajes inválido" });
        }

        // Inyectar nuestra directiva maestra antes de la conversación del usuario
        const apiMessages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...messages
        ];

        // Llamada oficial a OpenAI
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Usaremos la versión más rápida y económica por defecto
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 350
        });

        const replyText = completion.choices[0].message.content;

        // ---- LEAD CAPTURE MAGIC: Intercept enlace Calendly ----
        if (replyText.includes("calendly.com")) {
            console.log("🔥 ¡Cierre de venta detectado! Guardando Lead y enviando correo...");
            
            // Construir resumen de la conversión
            let convoSummary = messages.concat({ role: 'assistant', content: replyText })
                .map(m => `<b>${m.role === 'user' ? '👤 Prospecto' : '🤖 IA'}:</b> ${m.content}`)
                .join("\n\n");
            
            sendLeadReportToDirector(convoSummary, "CONVERSION");
        }
        // --------------------------------------------------------
        // --------------------------------------------------------

        res.json({ reply: replyText });
    } catch (error) {
        console.error("Error en OpenAI:", error.message || error);
        res.status(500).json({ error: "El servidor de IA está temporalmente fuera de servicio." });
    }
});
// --- ENDPOINT PARA REPORTE DE SESIÓN FINALIZADA ---
app.post('/api/report-lead', async (req, res) => {
    console.log("📥 [Debug] Solicitud de REPORTE recibida");
    try {
        const { messages, type } = req.body;
        console.log(`📝 [Debug] Analizando ${messages ? messages.length : 0} mensajes. Tipo: ${type}`);
        
        if (!messages || messages.length < 2) {
            console.warn("⚠️ [Debug] Conversación insuficiente para reporte.");
            return res.status(400).json({ error: "No hay suficiente conversación para reportar." });
        }

        console.log(`📊 Generando reporte de tipo: ${type || 'INTERÉS'}`);

        // Usar IA para resumir el interés del cliente
        const analysis = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: 'system', 
                    content: "Eres un Asistente Senior de Ventas. Tu tarea es resumir una conversación de chat para el Director de la agencia. Identifica: 1. Nombre del cliente, 2. Qué servicio le interesa, 3. Por qué no agendó (objeción) y 4. Tu recomendación para cerrarlo. Sé breve, profesional y usa emojis." 
                },
                { role: 'user', content: JSON.stringify(messages) }
            ],
            temperature: 0.5
        });

        const summary = analysis.choices[0].message.content;
        
        // Enviar reportes
        await sendLeadReportToDirector(summary, type || "INTERES");

        res.json({ success: true });
    } catch (error) {
        console.error("Error reportando lead:", error);
        res.status(500).json({ error: "Error al generar el reporte." });
    }
});

// --- HELPER PARA REPORTES (Telegram + Email) ---
async function sendLeadReportToDirector(content, type) {
    const isConversion = type === "CONVERSION";
    const title = isConversion ? "🚨 ¡NUEVA CITA AGENDADA DE IA!" : "🔍 REPORTE DE INTERÉS (Prospecto)";
    const color = isConversion ? "#007BFF" : "#FFC107";

    // 1. Enviar a TELEGRAM usando HTTPS nativo (Solución de compatibilidad)
    const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
    const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
    
    if (TELEGRAM_TOKEN && CHAT_ID) {
        const tgMessage = `<b>${title}</b>\n\n${content}`;
        const data = JSON.stringify({
            chat_id: CHAT_ID,
            text: tgMessage,
            parse_mode: 'HTML'
        });

        const options = {
            hostname: 'api.telegram.org',
            port: 443,
            path: `/bot${TELEGRAM_TOKEN}/sendMessage`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };

        const req = https.request(options, (res) => {
            let resData = '';
            res.on('data', d => resData += d);
            res.on('end', () => {
                const parsed = JSON.parse(resData);
                if (parsed.ok) console.log(`✅ Reporte ${type} enviado a Telegram.`);
                else console.error(`❌ Error Telegram Bot:`, parsed);
            });
        });

        req.on('error', (e) => console.error(`❌ Error conexión Telegram:`, e));
        req.write(data);
        req.end();
    }

    // 2. Enviar a EMAIL si es Conversión (Opcional para Interés para no saturar)
    if (isConversion || true) { // Enviamos ambos por ahora
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.GMAIL_USER,
                    pass: process.env.GMAIL_PASS
                }
            });

            const mailOptions = {
                from: '"🤖 Cerebro IA TodoDigital" <tododigitalnmr@gmail.com>',
                to: 'tododigitalnmr@gmail.com',
                subject: `${title} - TodoDigital NMR`,
                html: `<h2 style="color:${color};">${title} 🎉</h2>
                       <div style="background:#f4f4f4; padding:15px; border-radius:10px; border-left:4px solid ${color};">
                           ${content.replace(/\n/g, '<br>')}
                       </div>
                       <p><i>Reporte automático generado por el Asistente IA de TodoDigital NMR. 🚀</i></p>`
            };

            await transporter.sendMail(mailOptions);
            console.log(`✅ Email de Reporte ${type} enviado.`);
        } catch (error) {
            console.error(`❌ Error enviando email:`, error);
        }
    }
}

// --- META WEBHOOK INTEGRATION (Facebook & Instagram) ---

// Verificación del Webhook (Meta pide esto al configurar)
app.get('/webhook', (req, res) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === process.env.VERIFY_TOKEN) {
            console.log('✅ Webhook verificado por Meta');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// Recepción de eventos (Mensajes o Comentarios)
app.post('/webhook', async (req, res) => {
    const body = req.body;
    console.log('📌 Webhook recibido:', JSON.stringify(body, null, 2));

    if (body.object === 'page' || body.object === 'instagram') {
        for (const entry of body.entry) {
            // 1. Manejo de MENSAJES DIRECTOS (Messenger/IG DM)
            if (entry.messaging) {
                const webhook_event = entry.messaging[0];
                const sender_psid = webhook_event.sender.id;

                if (webhook_event.message && webhook_event.message.text) {
                    const messageText = webhook_event.message.text;
                    console.log(`📩 Mensaje DM de ${sender_psid}: ${messageText}`);
                    await handleMetaMessage(sender_psid, messageText);
                }
            }

            // 2. Manejo de COMENTARIOS (Facebook Feed o Instagram Comments)
            if (entry.changes) {
                const change = entry.changes[0];
                const value = change.value;

                // Caso Facebook: Comentario en el Feed (incluye Anuncios)
                if (change.field === 'feed' && value.item === 'comment' && value.verb === 'add') {
                    const comment_id = value.comment_id;
                    const comment_text = value.message;
                    const commenter_id = value.from.id;
                    
                    // Evitar respondernos a nosotros mismos (si la IA ya comentó)
                    if (commenter_id !== entry.id) {
                        console.log(`💬 Comentario FB de ${value.from.name}: ${comment_text}`);
                        await handleMetaComment(comment_id, comment_text, 'facebook');
                    }
                }

                // Caso Instagram Graph API: Comentarios en posts
                if (change.field === 'comments' && value.text) {
                    const comment_id = value.id;
                    const comment_text = value.text;
                    
                    console.log(`📸 Comentario IG: ${comment_text}`);
                    await handleMetaComment(comment_id, comment_text, 'instagram');
                }
            }
        }
        res.status(200).send('EVENT_RECEIVED');
    } else {
        res.sendStatus(404);
    }
});

// --- MEMORIA TEMPORAL PARA META ---
const conversationHistory = {};

// Función específica para responder a COMENTARIOS
async function handleMetaComment(commentId, text, platform) {
    try {
        // En comentarios usamos respuestas directas y cortas
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: 'system', content: SYSTEM_PROMPT + "\n\nIMPORTANTE: Estás respondiendo un COMENTARIO PÚBLICO. Sé más breve que nunca (1 o 2 líneas máximo) e invita a que te escriban por privado o agenden si están interesados." },
                { role: 'user', content: text }
            ],
            temperature: 0.7,
            max_tokens: 150
        });

        const replyText = completion.choices[0].message.content;
        await callMetaCommentReplyAPI(commentId, replyText, platform);

    } catch (error) {
        console.error("❌ Error en IA para Comentario:", error);
    }
}

// Función para procesar con IA y responder a Meta (con Memoria)
async function handleMetaMessage(psid, text) {
    try {
        // 1. Inicializar historial si no existe para este usuario
        if (!conversationHistory[psid]) {
            conversationHistory[psid] = [
                { role: 'system', content: SYSTEM_PROMPT }
            ];
        }

        // 2. Agregar el mensaje actual del usuario al historial
        conversationHistory[psid].push({ role: 'user', content: text });

        // 3. Mantener solo los últimos 10 mensajes para no saturar la memoria
        if (conversationHistory[psid].length > 11) {
            conversationHistory[psid] = [
                conversationHistory[psid][0], // Mantener siempre el SYSTEM_PROMPT
                ...conversationHistory[psid].slice(-10)
            ];
        }

        // 4. Llamada a OpenAI con TODO el historial acumulado
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: conversationHistory[psid],
            temperature: 0.7,
            max_tokens: 350
        });

        const replyText = completion.choices[0].message.content;

        // 5. Guardar la respuesta de la IA en el historial para el contexto futuro
        conversationHistory[psid].push({ role: 'assistant', content: replyText });

        // 6. Enviar respuesta final a Meta
        await callMetaSendAPI(psid, replyText);

    } catch (error) {
        console.error("❌ Error en IA para Meta:", error);
    }
}

// Envío de la respuesta a la API de Meta
async function callMetaSendAPI(psid, responseText) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${PAGE_ACCESS_TOKEN}`;

    console.log(`📤 Enviando respuesta a ${psid}: "${responseText.substring(0, 50)}..."`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recipient: { id: psid },
                message: { text: responseText }
            })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Respuesta enviada a Meta para el usuario ${psid}`);
        } else {
            console.error('❌ Error enviando a Meta:', JSON.stringify(data));
        }
    } catch (error) {
        console.error('❌ Error de conexión con Meta API (fetch):', error);
    }
}

// Envío de respuesta a un COMENTARIO (FB o IG)
async function callMetaCommentReplyAPI(commentId, responseText, platform) {
    const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
    let url = "";

    if (platform === 'facebook') {
        url = `https://graph.facebook.com/v21.0/${commentId}/comments?access_token=${PAGE_ACCESS_TOKEN}`;
    } else {
        url = `https://graph.facebook.com/v21.0/${commentId}/replies?access_token=${PAGE_ACCESS_TOKEN}`;
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: responseText })
        });

        const data = await response.json();
        if (response.ok) {
            console.log(`✅ Comentario respondido en ${platform} con éxito.`);
        } else {
            console.error(`❌ Error respondiendo comentario en ${platform}:`, JSON.stringify(data));
        }
    } catch (error) {
        console.error(`❌ Error conexión Meta API (Comentario fetch):`, error);
    }
}



app.use(express.static(__dirname));

app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir archivos est
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Inteligencia Artificial activo en http://localhost:${PORT}`);
});
