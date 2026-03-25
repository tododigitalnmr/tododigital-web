document.addEventListener('DOMContentLoaded', () => {
    // 1. CUSTOM CURSOR LOGIC
    const cursor = document.querySelector('.cursor');
    let mouseX = 0, mouseY = 0;
    let cursorX = 0, cursorY = 0;

    document.addEventListener('mousemove', (e) => {
        mouseX = e.clientX;
        mouseY = e.clientY;
    });

    function animateCursor() {
        // Smooth interpolation (lerp)
        const lerp = 0.15;
        cursorX += (mouseX - cursorX) * lerp;
        cursorY += (mouseY - cursorY) * lerp;

        cursor.style.left = `${cursorX}px`;
        cursor.style.top = `${cursorY}px`;

        requestAnimationFrame(animateCursor);
    }
    animateCursor();

    // Cursor interactivity
    const interactiveElements = document.querySelectorAll('a, button, .service-card, .portfolio-item');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('active'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('active'));
    });

    // 2. PARTICLES ENGINE (Lightweight Canvas)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const particlesContainer = document.getElementById('particles-js');
    if (particlesContainer) {
        particlesContainer.appendChild(canvas);
        let particles = [];
        
        function resize() {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }
        window.addEventListener('resize', resize);
        resize();

        class Particle {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.size = Math.random() * 2 + 0.5;
                this.speedX = Math.random() * 1 - 0.5;
                this.speedY = Math.random() * 1 - 0.5;
                this.opacity = Math.random() * 0.5;
            }
            update() {
                this.x += this.speedX;
                this.y += this.speedY;

                if (this.x > canvas.width) this.x = 0;
                if (this.x < 0) this.x = canvas.width;
                if (this.y > canvas.height) this.y = 0;
                if (this.y < 0) this.y = canvas.height;

                // Move slightly towards mouse
                const dx = mouseX - this.x;
                const dy = mouseY - this.y;
                const distance = Math.sqrt(dx*dx + dy*dy);
                if (distance < 200) {
                    this.x += dx * 0.01;
                    this.y += dy * 0.01;
                }
            }
            draw() {
                ctx.fillStyle = `rgba(0, 210, 255, ${this.opacity})`;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }

    // --- ANALYTICS TRACKING HELPER ---
    function trackEvent(name, detail = {}) {
        console.log(`[Event] ${name}`, detail);
        if (typeof fbq === 'function') fbq('trackCustom', name, detail);
        if (typeof gtag === 'function') gtag('event', name, detail);
    }
        function initParticles() {
            particles = [];
            for (let i = 0; i < 80; i++) {
                particles.push(new Particle());
            }
        }
        initParticles();

        function animateParticles() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            particles.forEach(p => {
                p.update();
                p.draw();
            });
            requestAnimationFrame(animateParticles);
        }
        animateParticles();
    }

    // 3. SCROLL REVEAL (NATIVE CSS FOR MAX FLUIDITY)
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

    // 3.1 HERO PARALLAX (GSAP - Ligero y optimizado)
    gsap.registerPlugin(ScrollTrigger);

    gsap.to(".hero-logo", {
        scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: true
        },
        y: 150,
        scale: 1.1,
        opacity: 0
    });
    
    gsap.to(".hero h1, .hero p, .hero-btns", {
        scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "center top",
            scrub: true
        },
        y: -100,
        opacity: 0
    });

    // Footer Title Split Animation (Apple-like side reveal)
    const footerTitle = document.querySelector('.footer-title');
    if (footerTitle) {
        // Izquierda entra de la izquierda
        gsap.fromTo('.left-word', 
            { x: -150, opacity: 0 },
            { 
                scrollTrigger: {
                    trigger: '.footer',
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                },
                x: 0, 
                opacity: 1, 
                duration: 1, 
                ease: "power3.out" 
            }
        );
        // Derecha entra de la derecha
        gsap.fromTo('.right-word', 
            { x: 150, opacity: 0 },
            { 
                scrollTrigger: {
                    trigger: '.footer',
                    start: "top 85%",
                    toggleActions: "play none none reverse"
                },
                x: 0, 
                opacity: 1, 
                duration: 1, 
                ease: "power3.out" 
            }
        );
    }

    // 4. SMOOTH SCROLLING
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // 5. 3D TILT EFFECT (Optimized)
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rotateX = (y - rect.height/2) / 15;
            const rotateY = (rect.width/2 - x) / 15;
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });

    // 6. HAMBURGER MENU
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const closeBtn = document.querySelector('.close-menu');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    }

    // 7. BULLETPROOF SCROLL RESTORATION
    // Desactiva la restauración nativa confusa del navegador
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    // Guarda exactamente en qué pixel estábamos al dar clic en un servicio
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('click', () => {
            sessionStorage.setItem('exactScrollPosition', window.scrollY);
        });
    });

    // Cuando regresamos a la página, forza al navegador a ir a ese pixel
    window.addEventListener('pageshow', () => {
        const savedPosition = sessionStorage.getItem('exactScrollPosition');
        if (savedPosition !== null) {
            sessionStorage.removeItem('exactScrollPosition');
            // Un micro-retraso para asegurar que el DOM cargó
            setTimeout(() => {
                window.scrollTo({
                    top: parseInt(savedPosition, 10),
                    behavior: 'instant'
                });
            }, 50);
        }
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // 7. ANIMATED COUNTERS
    const counters = document.querySelectorAll('.stat-number');
    const countOptions = { threshold: 0.5 };
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = +entry.target.getAttribute('data-target');
                const updateCount = () => {
                    const current = +entry.target.innerText;
                    const increment = target / 100;
                    if (current < target) {
                        entry.target.innerText = Math.ceil(current + increment);
                        setTimeout(updateCount, 20);
                    } else {
                        entry.target.innerText = target;
                    }
                };
                updateCount();
                countObserver.unobserve(entry.target);
            }
        });
    }, countOptions);
    counters.forEach(c => countObserver.observe(c));

    // 8. TYPING EFFECT
    const typingText = document.querySelector('.hero p');
    if (typingText) {
        const text = "Diseño web, marketing y branding de alto impacto para tu negocio.";
        typingText.textContent = '';
        let i = 0;
        function typeWriter() {
            if (i < text.length) {
                typingText.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 50);
            }
        }
        setTimeout(typeWriter, 1200);
    }

    // 8. NAVBAR SCROLL
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 100) {
            navbar.style.background = 'rgba(2, 4, 10, 0.9)';
            navbar.style.padding = '8px 30px';
        } else {
            navbar.style.background = 'rgba(2, 4, 10, 0.6)';
            navbar.style.padding = '12px 30px';
        }
    });

    // 9. AI CHAT WIDGET LOGIC
    const chatTrigger = document.querySelector('.chat-trigger');
    const chatWidget = document.querySelector('.chat-widget');
    const chatClose = document.querySelector('.chat-close');
    const chatMessages = document.getElementById('chat-messages');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');

    let userState = 'idle';
    let userData = { name: '', business: '', interest: '' };
    let conversationHistory = []; // Almacena contexto para la IA inteligente

    if (chatTrigger) {
        chatTrigger.addEventListener('click', () => {
            chatWidget.classList.add('active');
            trackEvent('Chat_Opened');
            if (chatMessages.children.length === 0) {
                setTimeout(() => {
                    botMessage('¡Hola! 👋 Soy el asistente IA de TodoDigital NMR. ¿En qué podemos ayudarte hoy?');
                }, 500);
            }
        });
    }

    if (chatClose) {
        chatClose.addEventListener('click', () => {
            chatWidget.classList.remove('active');
        });
    }

    function botMessage(text, card = null) {
        const msgContainer = document.createElement('div');
        msgContainer.className = 'bot-msg-group';
        msgContainer.style.display = 'flex';
        msgContainer.style.flexDirection = 'column';
        msgContainer.style.gap = '5px';
        
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot-message';
        msgDiv.innerHTML = text;
        msgContainer.appendChild(msgDiv);

        if (card) {
            const cardDiv = document.createElement('div');
            cardDiv.className = 'chat-card';
            cardDiv.innerHTML = `
                <img src="${card.image}" alt="${card.title}">
                <h4>${card.title}</h4>
                <p>${card.desc}</p>
                <button onclick="window.location.href='${card.link}'" class="chat-card-btn">Ver más</button>
            `;
            msgContainer.appendChild(cardDiv);
        }

        chatMessages.appendChild(msgContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function userMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message user-message';
        msgDiv.innerHTML = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    const processInput = async () => {
        const text = chatInput.value.trim();
        const lowerText = text.toLowerCase();
        if (!text) return;
        
        userMessage(text);
        chatInput.value = '';

        // Easter Egg de Colores
        if (lowerText.includes('color') || lowerText.includes('sorpresa') || lowerText.includes('cambia')) {
            const colors = ['#00d2ff', '#ff00d2', '#d2ff00', '#00ff88', '#ff4d4d'];
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            document.documentElement.style.setProperty('--accent-blue', randomColor);
            botMessage(`¡Zas! He cambiado el color de acento a <span style="color:${randomColor}">${randomColor}</span>. ¿Te gusta cómo se ve el sitio ahora? ✨`);
            return;
        }

        // Agregar mensaje de usuario al historial
        conversationHistory.push({ role: 'user', content: text });

        // Mostrar indicador de "Escribiendo..."
        const typingId = 'typing-' + Date.now();
        const msgContainer = document.createElement('div');
        msgContainer.className = 'bot-msg-group';
        msgContainer.id = typingId;
        const typingMsg = document.createElement('div');
        typingMsg.className = 'message bot-message';
        typingMsg.innerHTML = '<i>Escribiendo inteligente... 🤖</i>';
        msgContainer.appendChild(typingMsg);
        chatMessages.appendChild(msgContainer);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        let wokeUpMessageShown = false;
        const coffeeTimeout = setTimeout(() => {
            if (!wokeUpMessageShown) {
                botMessage('¡Hola! ☕ Dame un segundito, nuestro Asistente IA está preparando su café para atenderte como te mereces... ya casi está aquí.');
                wokeUpMessageShown = true;
            }
        }, 3500); // 3.5 segundos para detectar el "despertado" de Render

        try {
            // Conectar con el BRAIN (Servidor Node.js -> OpenAI)
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: conversationHistory })
            });
            
            clearTimeout(coffeeTimeout); // Cancelar el mensaje si respondió rápido
            
            if (!response.ok) throw new Error('Error en conexión con el Cerebro');
            
            const data = await response.json();
            
            // Quitar indicador de "Escribiendo..."
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            
            if (data.reply) {
                // Parsear Markdown a HTML para que el link sea cliqueable
                let htmlReply = data.reply
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Negritas
                    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color: var(--accent-blue); text-decoration: underline; font-weight: bold;">$1</a>'); // Enlaces
                
                // Si la IA mandó el enlace crudo (sin formato Markdown)
                if (!htmlReply.includes('<a href')) {
                    htmlReply = htmlReply.replace(/(https:\/\/calendly\.com[^\s]+?)([\.\?\!])?(\s|$)/g, '<a href="$1" target="_blank" style="color: var(--accent-blue); text-decoration: underline; font-weight: bold;">$1</a>$2$3');
                }

                botMessage(htmlReply);
                conversationHistory.push({ role: 'assistant', content: data.reply });
            } else {
                botMessage('Tuve una interferencia de conexión. ¿Puedes repetirlo?');
            }
        } catch (error) {
            clearTimeout(coffeeTimeout);
            console.error('Error de IA:', error);
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            botMessage('⚠️ Alerta: El motor cerebral (Servidor Backend) está desconectado. Por favor enciende el servidor `node server.js` para que pueda hablar.');
        }
    };

    if (chatSend) chatSend.addEventListener('click', processInput);
    if (chatInput) chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') processInput(); });

    window.startChat = (type) => {
        if (type === 'servicios') {
            userMessage('Quiero saber sobre sus servicios');
            setTimeout(() => {
                botMessage('Ofrecemos soluciones integrales: desde Web Apps hasta Asistentes de IA. ¿En qué área está tu mayor desafío actual?');
            }, 800);
        } else if (type === 'precio') {
            userMessage('Me gustaría cotizar un proyecto');
            setTimeout(() => {
                botMessage('¡Excelente elección! Para darte una propuesta que realmente aporte valor, ¿me podrías decir tu nombre?');
                userState = 'asking_name';
            }, 800);
        }
    };

    const shareBtn = document.getElementById('share-website');
    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            const shareData = {
                title: 'TodoDigital NMR',
                text: 'hola te comparto el nuevo portal de TodoDigital NMR',
                url: window.location.href
            };
            
            if (navigator.share) {
                navigator.share(shareData).catch(err => console.log('Error sharing', err));
            } else {
                // Fallback: Copy to clipboard
                const dummy = document.createElement('input');
                document.body.appendChild(dummy);
                dummy.value = `${shareData.text} ${shareData.url}`;
                dummy.select();
                document.execCommand('copy');
                document.body.removeChild(dummy);
                alert('¡Mensaje elegante copiado al portapapeles para WhatsApp!');
            }
            const viewCardBtn = document.getElementById('view-card');
    const cardModal = document.getElementById('card-modal');
    const closeModal = document.querySelector('.close-modal');
    const businessCard = document.getElementById('business-card');

    if (viewCardBtn) {
        viewCardBtn.addEventListener('click', () => {
            cardModal.classList.add('active');
            trackEvent('DigitalCard_Viewed');
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            cardModal.classList.remove('active');
        });
    }

    if (businessCard) {
        businessCard.addEventListener('click', () => {
            businessCard.classList.toggle('flipped');
        });
    }

    // Close modal on outside click
    window.addEventListener('click', (e) => {
        if (e.target === cardModal) {
            cardModal.classList.remove('active');
        }
    });
});
    }
});
