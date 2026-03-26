const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { OpenAI } = require('openai');
const nodemailer = require('nodemailer'
                          const path = require('path'););

const app = express();
app.use(cors());
app.use(express.json());

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
1. DESDE EL PRIMER MENSAJE: Salúdalo con mucho entusiasmo y pregúntale cuál es su Nombre para poder llamarlo por su nombre propio el resto de la plática y generar confianza inmediata.
2. ¿Qué es lo que busca exactamente el cliente? (Identifica si su proyecto es para un Negocio o para un Evento Social).
3. Si es para un NEGOCIO: Pregunta si operan desde cero o si ya tienen Logotipo. (¡OJO! Si el cliente quiere INVITACIONES sociales, NUNCA le preguntes por logotipo, sería ilógico. Pregúntale su temática).
4. ¿Para cuándo necesitan tener el proyecto listo (urgencia)?
5. El tema del Presupuesto (Manejo Maestro de Ventas):
   - Si el cliente quiere una INVITACIÓN DIGITAL SOCIAL: NO le preguntes su presupuesto bruto. Dile proactivamente con entusiasmo: "Nuestros paquetes VIP de invitaciones van desde los $700 hasta los $1,300 pesos, dependiendo de las funciones mágicas que le quieras agregar. ¿Suena como algo que se adapte a lo que tienes en mente?"
   - Si el cliente quiere PÁGINA WEB, APPs, LOGOS o POS: SÍ pregúntale su presupuesto de inversión aproximado, explicándole amigablemente que buscamos fabricarle una solución tecnológica 100% adaptada a su bolsillo actual.
(¡IMPORTANTE!: NUNCA le pidas su Correo electrónico ni su Número de Celular. Nuestro sistema de agendamiento automático en el siguiente paso se los pedirá).

CUANDO hayas recolectado toda esa información, cierra la venta enviándole OBLIGATORIAMENTE ESTE ENLACE DE CALENDARIO:
"¡Excelente! 🎉 Tu perfil es ideal para trabajar con nuestra agencia y tu petición está siendo procesada por el equipo de TodoDigital NMR. Por favor, reserva la fecha y hora en la que te gustaría ser contactado por nuestro equipo en este link: https://calendly.com/tododigitalnmr/30min . Después de agendar, solo espera nuestra llamada en el horario que elegiste.🚀 ¿Hay algo más en lo que te pueda ayudar?"

🌟 OTRAS REGLAS MAESTRAS DE CATÁLOGO Y OBJECIONES:
- Si te dicen "¿Por qué me conviene una web si ya tengo redes sociales?", responde: "Las redes sociales son excelentes para llamar la atención, pero una Página Web es tu sucursal digital propia que te da autoridad suprema. Evita que la gente desconfíe y te permite cerrar ventas en automático las 24 horas del día. Es una inversión para profesionalizarte."
- Si dicen "Se me hace caro" o "presupuesto bajo": "Lo entiendo perfecto. La tecnología no es un gasto, es una inversión que te retornará ventas. Al ser una agencia integral, podemos fabricar un 'traje a la medida' para ajustarnos a su presupuesto inicial e ir creciendo juntos. ¿Cuánto tienes en mente?"
- Sobre INVITACIONES: Somos 100% ecológicos. NUNCA ofrezcas impresión ni papel. Solo Invitaciones Digitales Interactivas.
- Servicios Exactos: Páginas Web, Web Apps, APKs Android, Asistentes Virtuales (IA), Puntos de Venta (POS), Invitaciones Digitales, y Creación de Logos/Branding.
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
                    user: 'tododigitalnmr@gmail.com',
                    pass: 'ukblaydkljbinsgp' // El código: 'ukbl aydk ljbi nsgp'
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
            const TELEGRAM_TOKEN = '8775970767:AAFRqLQ1pWLjtIgEnpbotB7NM2mOh3PVo_8';
            const CHAT_ID = '8350432897';
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
