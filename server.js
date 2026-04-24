const express = require('express');
const https = require('https');
const fs = require('fs');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
require('dotenv').config();
const calendar = require('./calendar'); // Módulo de Google Calendar

const app = express();
app.use(cors({
    origin: ['https://tododigitalnmr.com', 'https://www.tododigitalnmr.com', 'http://localhost:3000'],
    credentials: false
}));
app.use(express.json());
// Nota: express.static se registra al final para que las rutas explícitas tengan prioridad

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

// ─── LEADS CRM DATABASE ───────────────────────────────────────────────────────
const LEADS_FILE = path.join(__dirname, 'leads.json');

function loadLeads() {
    try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); } catch { return []; }
}
function saveLeads(leads) {
    try { fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2)); } catch(e) { console.error('Error saving leads:', e.message); }
}
function addLead(data) {
    const leads = loadLeads();
    const lead = { id: Date.now().toString(), ...data, status: 'pendiente', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    leads.unshift(lead);
    saveLeads(leads);
    return lead;
}

// Rutas CRM
app.get('/crm', (req, res) => {
    try {
        const html = fs.readFileSync(path.join(__dirname, 'crm.html'), 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html);
    } catch(e) {
        res.status(500).send(`<h1>Error cargando CRM: ${e.message}</h1><p>Directorio: ${__dirname}</p>`);
    }
});

app.get('/api/leads', (req, res) => res.json(loadLeads()));

app.patch('/api/leads/:id', (req, res) => {
    const leads = loadLeads();
    const lead = leads.find(l => l.id === req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead no encontrado' });
    lead.status = req.body.status || lead.status;
    lead.updatedAt = new Date().toISOString();
    saveLeads(leads);
    res.json(lead);
});

// Webhook de Telegram (botones Autorizar/Rechazar)
app.post('/telegram-webhook', async (req, res) => {
    res.sendStatus(200);
    const cb = req.body?.callback_query;
    if (!cb) return;
    const tgToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    // Responder al callback para quitar el loading del botón
    await fetch(`https://api.telegram.org/bot${tgToken}/answerCallbackQuery`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ callback_query_id: cb.id })
    }).catch(() => {});
    const data = cb.data || '';
    const slug = data.replace(/^(auth_send_|reject_)/, '');
    const leads = loadLeads();
    const lead = leads.find(l => l.slug === slug);
    if (!lead) return;
    if (data.startsWith('auth_send_')) {
        lead.status = 'autorizado';
    } else if (data.startsWith('reject_')) {
        lead.status = 'rechazado';
    }
    lead.updatedAt = new Date().toISOString();
    saveLeads(leads);
    console.log(`📝 Lead ${slug} marcado como ${lead.status} vía Telegram`);
    // Editar el mensaje en Telegram para confirmar
    const newText = lead.status === 'autorizado'
        ? `✅ *AUTORIZADO* \n\n*Cliente:* ${lead.nombre}\n*Invitación:* ${lead.invitacionUrl || ''}\n*WhatsApp:* ${lead.whatsapp || ''}`
        : `❌ *RECHAZADO* \n\n*Cliente:* ${lead.nombre}`;
    await fetch(`https://api.telegram.org/bot${tgToken}/editMessageText`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ chat_id: cb.message.chat.id, message_id: cb.message.message_id, text: newText, parse_mode: 'Markdown' })
    }).catch(() => {});
});

// Registrar el webhook de Telegram al iniciar
async function registerTelegramWebhook() {
    const tgToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const serverUrl = process.env.SERVER_URL || 'https://tododigital-web-ok.onrender.com';
    if (!tgToken) return;
    const r = await fetch(`https://api.telegram.org/bot${tgToken}/setWebhook`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ url: `${serverUrl}/telegram-webhook`, allowed_updates: ['callback_query', 'message'] })
    });
    const j = await r.json();
    console.log('📲 Telegram Webhook:', j.ok ? '✅ Registrado' : '❌ ' + j.description);
}

// Verificamos si existe la API Key
if (!process.env.OPENAI_API_KEY) {
    console.error("⚠️  ERROR FATAL: No se encontró la OPENAI_API_KEY en el archivo .env");
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// El "Cerebro" y personalidad de nuestro vendedor
const SYSTEM_PROMPT = `
Eres Nath, Asesora Estrella de TodoDigital NMR, una agencia de tecnología y marketing digital. Atiendes con calidez, profes ionalismo y entusiasmo TODAS las consultas. 🚀

🌟 TONO:
- Amigable, entusiasta, empática. Siempre de "tú". 😊
- Respuestas CORTAS (máx. 3 líneas). Usa emojis con moderación.
- NUNCA rechaces una consulta. Si el cliente pregunta algo, SIEMPRE lo atiendes primero.

🌟 SERVICIOS DE TODODIGITAL NMR:

1️⃣ PUNTOS DE VENTA (POS) 💳 — Sistema de cobro digital para tu negocio. Funciona en tablet, celular o PC. Incluye inventario, reportes y facturación.

2️⃣ PÁGINAS WEB PROFESIONALES 🌐 — Diseño moderno, rápido y responsivo. SEO, WhatsApp integrado y formularios de contacto.

3️⃣ APLICACIONES WEB (Web Apps) 💻 — Sistemas a la medida: CRMs, portales, plataformas, automatizaciones para tu negocio.

4️⃣ ASISTENTES DE INTELIGENCIA ARTIFICIAL 🤖 — Chatbots inteligentes para WhatsApp, Instagram o tu página. Atienden clientes 24/7 y capturan leads.

5️⃣ INVITACIONES DIGITALES PREMIUM 🎉 — Precio especial: $500 MXN. Incluye música, animaciones, cuenta regresiva y panel de confirmación de invitados. Cualquier temática (XV Años, Boda, Harry Potter, Disney, etc.).
   Ejemplo: https://tododigital-invitaciones.netlify.app/isabella-garcia/

🌟 PRECIO DE LOS SERVICIOS:
- Las Invitaciones Digitales tienen precio fijo: $500 MXN. Menciona este precio cuando pregunten.
- TODOS LOS DEMÁS SERVICIOS son HECHOS A LA MEDIDA. NUNCA des precio. Di siempre: "Ese servicio lo hacemos a la medida de tu negocio, necesito conocer tus necesidades para darte una propuesta personalizada."

🌟 FLUJO PRINCIPAL:
1. Saluda cálidamente y pregunta el nombre
2. Escucha qué necesita
3. Si pregunta por INVITACIÓN DIGITAL → activa el Protocolo de Invitación (abajo)
4. Si pregunta por CUALQUIER OTRO SERVICIO → activa el Protocolo de Cita (abajo)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PROTOCOLO A: CITA DE CONSULTORÍA (para POS, Web, App, IA u otro)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el cliente muestra interés en cualquier servicio diferente a la invitación digital:
1. Explica brevemente el servicio en 2 líneas con entusiasmo
2. Di: "Como este servicio es a la medida, me gustaría invitarte a una consulta gratuita de 20 minutos para entender exactamente qué necesitas. ¿Te gustaría agendar una cita? 📅"
3. Si acepta, pregunta UNO POR UNO:
   a. "¿Qué día te viene mejor? Atendemos de Lunes a Sábado. (Los domingos descansamos) 😊"
   b. "¿En qué horario prefieres? Nuestro horario de atención es de 10:00 AM a 6:00 PM "
   c. "¿A qué número de WhatsApp te contactamos? 📱 (Con código de país, ej: +52 899 134 6198)"
4. Confirma la cita con entusiasmo y di que pronto le confirmarán

⚠️ REGLA CRÍTICA — AL CONFIRMAR LA CITA:
Cuando tengas día, hora y WhatsApp del cliente, tu respuesta DEBE empezar con este bloque EXACTO:

[CITA_AGENDADA] Nombre:[nombre del cliente]|Servicio:[servicio de interés]|Dia:[día de la semana, fecha si la mencionó]|Hora:[hora en formato 12h]|Whatsapp:[+52XXXXXXXXXX]

Después del bloque escribe la confirmación al cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 PROTOCOLO B: INVITACIÓN DIGITAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando el cliente confirme que quiere una invitación, recolecta estos datos UNO POR UNO:
1. Nombre completo de la festejada/festejado 🌸
2. Tipo de celebración (si ya lo dijeron, NO preguntar de nuevo) 🎉
3. Fecha del evento 📅
4. Hora de misa o ceremonia ⛪ (o "Sin iglesia")
5. Hora de recepción 🥂
6. Nombre de la iglesia ⛪
7. Nombre del salón y ciudad 🏛️
8. Nombres de los padres 👨‍👩‍👧
9. Foto: "¿Tienes foto de la festejada? Mándanos el link de Google Drive o WhatsApp 📸. Si no, usamos una imagen elegante de nuestro banco."
10. Canción (link YouTube) o la elegimos nosotros 🎵
11. WhatsApp de contacto 📱 (con código de país, ej: +52 899 134 6198)

⚠️ REGLA CRÍTICA — AL TENER LOS 11 DATOS:
Tu respuesta DEBE empezar con este bloque EXACTO (con corchetes [], campos separados por |):

[DATOS_COMPLETOS] Nombre:[nombre]|Tipo:[tipo]|Fecha:[YYYY-MM-DD]|HoraIglesia:[HH:MM AM/PM]|HoraRecepcion:[HH:MM AM/PM]|Iglesia:[nombre o Sin iglesia]|Salon:[nombre y ciudad]|Papas:[nombres]|Whatsapp:[+52XXXXXXXXXX]

Después del bloque escribe el mensaje de confirmación al cliente.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🌟 REGLAS GENERALES:
- Para servicios no listados: "Con gusto podemos ayudarte, ¿me cuentas más sobre lo que necesitas?"
- Si preguntan por precios de POS/Web/App/IA: "Ese servicio es a la medida, en la consulta te damos la propuesta exacta. ¿Agendamos 20 minutos? 😊"
- Siempre termina con una invitación a dar el siguiente paso
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
            model: "gpt-4o-mini",
            messages: apiMessages,
            temperature: 0.7,
            max_tokens: 350
        });

        const replyText = completion.choices[0].message.content;

        // ---- LEAD CAPTURE: Intercept Calendly (legado) ----
        if (replyText.includes("calendly.com")) {
            console.log("🔥 ¡Cierre de venta detectado!");
            let convoSummary = messages.concat({ role: 'assistant', content: replyText })
                .map(m => `<b>${m.role === 'user' ? '👤 Prospecto' : '🤖 IA'}:</b> ${m.content}`)
                .join("\n\n");
            sendLeadReportToDirector(convoSummary, "CONVERSION");
        }

        // 📅 CITA AGENDADA: Detectar cita confirmada
        if (replyText.includes('[CITA_AGENDADA]')) {
            console.log('📅 [WEB CHAT] ¡Cita agendada! Procesando...');
            handleCitaAgendada(replyText).catch(e => console.error('❌ Error en cita:', e));
        }

        // 🎨 MOTOR CREADOR: Detectar datos completos desde el chat WEB
        if (replyText.includes('[DATOS_COMPLETOS]')) {
            console.log('🎨 [WEB CHAT] ¡Datos completos detectados! Activando Motor Creador...');
            triggerMotorCreador('web-chat-' + Date.now(), replyText)
                .catch(e => console.error('❌ Error en Motor Creador (web):', e));
        }

        res.json({ reply: replyText });
    } catch (error) {
        console.error("Error en OpenAI:", error.message || error);
        res.status(500).json({ error: "El servidor de IA está temporalmente fuera de servicio." });
    }
});
// --- ENDPOINT PARA REPORTE DE SESIÓN FINALIZADA ---
app.post('/api/report-lead', async (req, res) => {
    try {
        const { messages, type } = req.body;
        
        if (!messages || messages.length < 2) {
            return res.status(400).json({ error: "No hay suficiente conversación para reportar." });
        }

        console.log(`📊 Generando reporte de tipo: ${type || 'INTERÉS'}`);

        // Usar IA para resumir el interés del cliente
        const analysis = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { 
                    role: 'system', 
                    content: `Eres un Asistente Senior de Ventas. Analiza esta conversación de chat y responde SOLO en formato JSON válido con estos campos exactos:
{
  "nombre": "nombre del cliente o Desconocido",
  "servicio": "servicio que le interesa",
  "whatsapp": "número si lo mencionó o null",
  "resumen": "resumen breve de 2 líneas del interés y situación",
  "objecion": "por qué no cerró o null"
}
No incluyas nada más, solo el JSON.` 
                },
                { role: 'user', content: JSON.stringify(messages) }
            ],
            temperature: 0.3
        });

        let leadData = {};
        try {
            leadData = JSON.parse(analysis.choices[0].message.content);
        } catch(e) {
            leadData = { nombre: 'Prospecto Web', servicio: 'Consulta general', resumen: analysis.choices[0].message.content };
        }

        // 💾 Guardar en CRM
        addLead({
            nombre: leadData.nombre || 'Prospecto Web',
            tipo: leadData.servicio || 'Consulta general',
            whatsapp: leadData.whatsapp || null,
            resumen: leadData.resumen || '',
            objecion: leadData.objecion || null,
            canal: 'web-chat',
            status: type === 'CONVERSION' ? 'autorizado' : 'prospecto'
        });
        console.log(`📊 Lead "${leadData.nombre}" guardado en CRM`);

        // Enviar reportes (Telegram + Email)
        const summaryText = `👤 <b>${leadData.nombre}</b>\n💼 Servicio: ${leadData.servicio}\n${leadData.whatsapp ? '📱 WhatsApp: ' + leadData.whatsapp + '\n' : ''}\n${leadData.resumen}${leadData.objecion ? '\n\n⚠️ Objeción: ' + leadData.objecion : ''}`;
        await sendLeadReportToDirector(summaryText, type || "INTERES");

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

// --- REGISTRO DE PSID EN N8N (para el ciclo HITL) ---
async function notifyN8nNewLead(psid, platform) {
    const webhookUrl = process.env.N8N_WEBHOOK_PSID;
    if (!webhookUrl) {
        console.warn('⚠️ N8N_WEBHOOK_PSID no configurado. PSID no será guardado en CRM.');
        return;
    }
    try {
        await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ psid, platform, timestamp: new Date().toISOString() })
        });
        console.log(`📋 PSID ${psid} (${platform}) notificado a n8n para registro en CRM.`);
    } catch (err) {
        console.error('❌ Error notificando PSID a n8n:', err.message);
    }
}

// Función para procesar con IA y responder a Meta (con Memoria)
async function handleMetaMessage(psid, text, platform = 'facebook') {
    try {
        // 1. Detectar si es un nuevo lead y notificar a n8n para guardar el PSID
        const isNewConversation = !conversationHistory[psid];
        if (isNewConversation) {
            conversationHistory[psid] = [
                { role: 'system', content: SYSTEM_PROMPT }
            ];
            // 🔑 CLAVE: Guardamos el PSID en el CRM vía n8n
            notifyN8nNewLead(psid, platform).catch(e => console.error(e));
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

        // 🎨 MOTOR CREADOR: Detectar si Nath completó la recolección de datos
        if (replyText.includes('[DATOS_COMPLETOS]')) {
            console.log('🎨 ¡Datos completos detectados! Activando Motor Creador...');
            triggerMotorCreador(psid, replyText).catch(e => console.error('❌ Error en Motor Creador:', e));
        }

    } catch (error) {
        console.error("❌ Error en IA para Meta:", error);
    }
}

// --- MOTOR CREADOR: Activar generación automática vía API v2.0 ---
// ─── HANDLER: CITA AGENDADA ──────────────────────────────────────────────────
async function handleCitaAgendada(datosTexto) {
    // Parser ultra-robusto: busca por palabra clave sin importar el formato exacto
    function extraer(claves) {
        for (const clave of claves) {
            const regexes = [
                new RegExp(clave + ':\\s*\\[([^\\]]+)\\]', 'i'),
                new RegExp(clave + ':\\s*([^|\\n\\r\\[]+)', 'i')
            ];
            for (const re of regexes) {
                const m = datosTexto.match(re);
                if (m && m[1].trim()) return m[1].trim();
            }
        }
        return '';
    }

    console.log('📅 [CITA] Procesando texto:', datosTexto.substring(0, 500));

    const cita = {
        nombre:   extraer(['Nombre', 'Cliente']),
        servicio: extraer(['Servicio', 'Interés', 'Interes']),
        dia:      extraer(['Dia', 'Día', 'Fecha']),
        hora:     extraer(['Hora', 'Horario']),
        whatsapp: extraer(['Whatsapp', 'Teléfono', 'Telefono', 'WA']),
        canal:    'web-chat'
    };
    
    console.log('📅 [CITA] Datos extraídos:', JSON.stringify(cita));

    // 💾 Guardar en CRM
    addLead({
        nombre:   cita.nombre   || 'Cliente Web',
        tipo:     `📅 CITA: ${cita.servicio || 'Consulta'}`,
        whatsapp: cita.whatsapp || null,
        salon:    `${cita.dia || '?'} a las ${cita.hora || '?'}`,
        canal:    'web-chat',
        status:   'cita'
    });

    // 📅 Intentar agendar en Google Calendar automáticamente
    let calendarStatus = '⏳ Pendiente (Error de sync)';
    let calendarLink = '';
    
    try {
        const calResult = await calendar.createEvent(cita);
        if (calResult && calResult.success) {
            calendarStatus = '✅ Agendada automáticamente';
            calendarLink = calResult.link;
        } else {
            // Generar link manual como fallback
            const title   = encodeURIComponent(`Consulta TodoDigital - ${cita.nombre || 'Cliente'}`);
            const details = encodeURIComponent(`Cliente: ${cita.nombre}\nServicio: ${cita.servicio}\nWhatsApp: ${cita.whatsapp}`);
            calendarLink = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=Online+%E2%80%94+TodoDigital+NMR`;
            calendarStatus = `❌ Error: ${calResult?.error || 'Permisos insuficientes'}`;
        }
    } catch (e) {
        calendarStatus = `❌ Error inesperado: ${e.message}`;
    }

    // 📲 Notificar por Telegram
    const tgToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
    const chatId  = process.env.TELEGRAM_CHAT_ID;
    if (tgToken && chatId) {
        const nombreDisplay   = cita.nombre   || '—';
        const servicioDisplay = cita.servicio || '—';
        const diaDisplay      = cita.dia      || '—';
        const horaDisplay     = cita.hora     || '—';
        const waDisplay       = cita.whatsapp || '—';
        
        const message = `📅 *NUEVA CITA AGENDADA*\n\n` +
                        `👤 *Cliente:* ${nombreDisplay}\n` +
                        `💼 *Servicio:* ${servicioDisplay}\n` +
                        `🗓 *Día:* ${diaDisplay}\n` +
                        `🕐 *Hora:* ${horaDisplay}\n` +
                        `📱 *WhatsApp:* ${waDisplay}\n\n` +
                        `🤖 *Status Calendar:* ${calendarStatus}\n\n` +
                        `👇 Presiona para ver/agregar:`;

        await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown',
                reply_markup: {
                    inline_keyboard: [[
                        { text: calendarStatus.includes('✅') ? '👁️ Ver en Calendar' : '📅 Agregar Manualmente', url: calendarLink }
                    ]]
                }
            })
        }).catch(e => console.error('❌ Telegram error:', e.message));
    }
}

async function triggerMotorCreador(psid, datosTexto) {
    const apiUrl = 'https://motor-creador-api.onrender.com/generar';
    
    // Extraer datos del texto de Nath usando Regex
    function extraer(clave) {
        // Acepta formato: Clave:[valor] o Clave: [valor] (con/sin espacio)
        const m = datosTexto.match(new RegExp(clave + ':\\s*\\[([^\\]]+)\\]'));
        return m ? m[1].trim() : '';
    }

    const payload = {
        nombre: extraer('Nombre'),
        tipo: extraer('Tipo'),
        fecha: extraer('Fecha'),
        iglesia: extraer('Iglesia'),
        salon: extraer('Salon'),
        papas: extraer('Papas'),
        horaIglesia: extraer('HoraIglesia'),
        horaRecepcion: extraer('HoraRecepcion'),
        whatsapp: extraer('Whatsapp'),
        slug: (extraer('Nombre') || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')
    };

    console.log(`🚀 Enviando datos a Motor Creador API para: ${payload.nombre}`);

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        
        if (result.success) {
            console.log(`✅ Invitación generada automáticamente: ${result.url}`);
            
            // 💾 Guardar lead en el CRM
            addLead({
                nombre: payload.nombre,
                tipo: payload.tipo,
                fecha: payload.fecha,
                iglesia: payload.iglesia,
                salon: payload.salon,
                papas: payload.papas,
                horaIglesia: payload.horaIglesia,
                horaRecepcion: payload.horaRecepcion,
                whatsapp: payload.whatsapp,
                slug: payload.slug,
                invitacionUrl: result.url,
                canal: psid.startsWith('web-chat') ? 'web-chat' : 'facebook'
            });
            console.log(`📊 Lead guardado en CRM: ${payload.nombre}`);
            // Notificar por Telegram con Botones (HITL)
            const tgToken = process.env.TELEGRAM_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;

            if (tgToken && chatId) {
                const telegramUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
                const whatsappLine = payload.whatsapp ? `\n*WhatsApp:* ${payload.whatsapp}` : '';
                await fetch(telegramUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: `🎨 *MOTOR CREADOR: Invitación Lista*\n\n*Cliente:* ${payload.nombre}\n*Evento:* ${payload.tipo}\n*Salón:* ${payload.salon}${whatsappLine}\n\n🔗 *Ver Invitación:*\n${result.url}\n\n_¿Autorizas el envío al cliente?_`,
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [
                                [
                                    { text: "✅ Autorizar y Enviar", callback_data: `auth_send_${payload.slug}` },
                                    { text: "❌ Rechazar", callback_data: `reject_${payload.slug}` }
                                ],
                                [
                                    { text: "👁️ Abrir Invitación", url: result.url }
                                ]
                            ]
                        }
                    })
                });
            }
        } else {
            throw new Error(result.error || 'Fallo desconocido en la API');
        }
    } catch (e) {
        console.error('❌ Error fatal en Motor Creador:', e.message);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Inteligencia Artificial activo en http://localhost:${PORT}`);
    registerTelegramWebhook(); // Registrar webhook de Telegram al iniciar
});
