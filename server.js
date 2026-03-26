const express = require('express');
const cors = require('cors');
const path = require('path');
const nodemailer = require('nodemailer');
const { OpenAI } = require('openai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Servir los archivos HTML/CSS/JS del proyecto

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
Eres el Asesor y Vendedor Estrella de la agencia tecnológica 'TodoDigital NMR'.
Tono y Personalidad: Háblale al cliente siempre de "tú" (de forma muy amigable, moderna, cercana y empática). Eres experto en tecnología, servicial y persuasivo. Usa emojis. 
Tus respuestas DEBEN SER CORTAS (máximo 2 o 3 líneas por párrafo). NO escribas textos largos.

🌟 TU MISIÓN PRINCIPAL (EL EMBUDO DE VENTAS):
Tu misión es tener una plática natural e irle sacando la siguiente información paso a paso (¡Pregunta las cosas de una en una, no todo al mismo tiempo!):
1. DESDE EL PRIMER MENSAJE: Salúdalo con mucho entusiasmo y pregúntale cuál es su Nombre para generar confianza inmediata.
2. ¿Qué busca el cliente? (Identifica si es Negocio o Evento Social).
3. Si es para un NEGOCIO: Pregunta si operan desde cero o si ya tienen Logotipo. (¡OJO! Si es INVITACIÓN SOCIAL, pregunta solo por la temática).
4. ¿Para cuándo necesitan tener el proyecto listo (urgencia)?
5. El tema del Presupuesto (Manejo Maestro de Ventas):
   - Si quiere una INVITACIÓN DIGITAL SOCIAL: Dile proactivamente: "Nuestros paquetes VIP de invitaciones van desde los $700 hasta los $1,300 pesos, dependiendo de las funciones mágicas que le quieras agregar. ¿Se adapta a lo que tienes en mente?"
   - Si quiere PÁGINA WEB, APPs, LOGOS o POS: Explica que fabricamos "trajes a la medida" para ajustarnos a su bolsillo actual. Pregunta su presupuesto de inversión aproximado.

🌟 REGLAS ESPECÍFICAS PARA PUNTOS DE VENTA (POS):
- Si preguntan por precios de POS: "Nuestras soluciones de Digitalización Integral (control total de tu negocio) suelen iniciar en los $8,000 MXN. No solo te vendemos un software; te entregamos el sistema configurado, inventario cargado, tickets con tu logo, reportes en tu celular y capacitación para que no pierdas ni un centavo más."
- SI EL CLIENTE TIENE VARIOS NEGOCIOS: Menciona que manejamos sistemas **Multi-sucursal (Tipo ERP)**. Podemos centralizar todas sus tiendas para que vea las ventas de todas sus sucursales desde su celular en tiempo real. 
- RECUERDA: Siempre aclara que "Nos ajustamos a cualquier presupuesto" y podemos escalar el proyecto poco a poco.

🌟 CIERRE DE VENTA (ENLACE CALENDLY):
Cuando tengas la información básica, cierra con este link:
"¡Excelente! 🎉 Tu perfil es ideal para TodoDigital NMR. Por favor, reserva tu consultoría gratuita aquí para definir los detalles técnicos: https://calendly.com/tododigitalnmr/30min . ¡Es un placer ayudarte a crecer! 🚀"

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

        // ---- LEAD CAPTURE MAGIC: Interceptar enlace Calendly ----
        if (replyText.includes("calendly.com")) {
            console.log("🔥 ¡Cierre de venta detectado! Guardando Lead y enviando correo...");
            
            // Construir resumen de la conversión
            let convoSummary = messages.map(m => `<b>${m.role === 'user' ? '👤 Prospecto' : '🤖 IA'}:</b> ${m.content}`).join("<br><br>");
            
            // Configurar el correo (Nodemailer) - Contraseña de Aplicación Oficial
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
                subject: '🚨 ¡NUEVO CITA AGENDADA DE LA IA! - TodoDigital NMR',
                html: `<h2 style="color:#007BFF;">¡Felicidades Director! 🎉</h2>
                       <p>Tu Inteligencia Artificial acaba de hacer todo el trabajo de ventas y ha logrado agendar a un posible cliente.</p>
                       <p>El cliente ya recibió tu enlace a Calendly. Aquí tienes el historial completo para que estudies todo su perfil antes de la llamada:</p>
                       <div style="background:#f4f4f4; padding:15px; border-radius:10px; border-left:4px solid #007BFF;">
                           ${convoSummary}
                       </div>
                       <br>
                       <p><i>Reporte automático generado por el Asistente IA de TodoDigital NMR. 🚀</i></p>`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.error("❌ Error enviando email de reporte:", error);
                else console.log("✅ Email de Reporte enviado con éxito:", info.response);
            });

            // Enviar alerta simultánea a TELEGRAM
            const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
            const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
            const tgMessage = `🚨 <b>¡NUEVO LEAD CERRADO DE IA!</b> 🚨\n\nTu Inteligencia Artificial acaba de entregar el enlace oficial de Calendly.\n\nAquí tienes el resumen del cliente:\n\n${convoSummary.replace(/<br>/g, '\n')}`;
            
            fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: CHAT_ID,
                    text: tgMessage,
                    parse_mode: 'HTML'
                })
            }).then(resp => resp.json())
              .then(data => { if(data.ok) console.log('✅ Mensaje de Telegram enviado a tu celular.'); else console.error('❌ Error de Telegram:', data); })
              .catch(err => console.error('❌ Error general Telegram:', err));
        }
        // --------------------------------------------------------

        res.json({ reply: replyText });
    } catch (error) {
        console.error("Error en OpenAI:", error.message || error);
        res.status(500).json({ error: "El servidor de IA está temporalmente fuera de servicio." });
    }
});



app.use(express.static(__dirname));

app.get('/', (req, res) => {
      res.sendFile(path.join(__dirname, 'index.html'));
});

// Servir archivos est
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Inteligencia Artificial activo en http://localhost:${PORT}`);
});
