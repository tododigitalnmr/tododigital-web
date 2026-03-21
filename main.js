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

    // 3. GSAP ADVANCED ANIMATIONS
    gsap.registerPlugin(ScrollTrigger);

    // Generic Scroll Reveal (Replaces IntersectionObserver)
    const revealElements = document.querySelectorAll('.animate-on-scroll:not(.service-card)');
    revealElements.forEach((el) => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: "top 85%",
                toggleActions: "play none none reverse"
            },
            opacity: 1,
            y: 0,
            scale: 1,
            filter: "blur(0px)",
            duration: 0.8,
            ease: "power3.out"
        });
    });

    // Hero Parallax Effect
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

    // Services Pinning (The Apple Effect)
    const servicesSection = document.querySelector('.services');
    if (servicesSection) {
        const cards = gsap.utils.toArray('.service-card');
        
        // Initial state (Removed blur for MAXIMUM performance and fluidity)
        gsap.set(cards, { opacity: 0, y: 100, scale: 0.95 });

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: servicesSection,
                start: "top 15%", // Ancla la sección en cuanto el título llega arriba
                end: "+=800", // Menos scroll necesario para ver todas las tarjetas
                pin: true,
                scrub: 0.5, // Reacción más rápida, elimina la sensación de "retraso"
            }
        });

        tl.to(cards, {
            y: 0,
            scale: 1,
            opacity: 1,
            stagger: 0.15, // Las tarjetas aparecen más rápido, una tras otra
            ease: "power2.out"
        });
    }

    // Marquee Dynamic Velocity
    const marqueeContent = document.querySelector('.marquee-content');
    if (marqueeContent) {
        marqueeContent.style.animation = 'none'; // Disable vanilla CSS animation
        
        const marqueeAnimation = gsap.to(marqueeContent, {
            xPercent: -50,
            repeat: -1,
            duration: 20,
            ease: "linear"
        });

        ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
                const velocity = Math.abs(self.getVelocity() / 300); // Normalize velocity
                let timeScale = 1 + velocity;
                timeScale = Math.min(timeScale, 8); // Cap max speed
                
                // Smoothly speed up, then return to normal
                gsap.to(marqueeAnimation, { timeScale: timeScale, duration: 0.3, overwrite: true });
                gsap.to(marqueeAnimation, { timeScale: 1, duration: 1.5, delay: 0.3, overwrite: "auto" });
            }
        });
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

    const processInput = () => {
        const text = chatInput.value.trim();
        const lowerText = text.toLowerCase();
        if (!text) return;
        
        userMessage(text);
        chatInput.value = '';

        setTimeout(() => {
            // Theme Switching "Surprise"
            if (lowerText.includes('color') || lowerText.includes('sorpresa') || lowerText.includes('cambia')) {
                const colors = ['#00d2ff', '#ff00d2', '#d2ff00', '#00ff88', '#ff4d4d'];
                const randomColor = colors[Math.floor(Math.random() * colors.length)];
                document.documentElement.style.setProperty('--accent-blue', randomColor);
                botMessage(`¡Zas! He cambiado el color de acento a <span style="color:${randomColor}">${randomColor}</span>. ¿Te gusta cómo se ve el sitio ahora? ✨`);
                return;
            }

            // State Machine for Sales Funnel
            if (userState === 'asking_name') {
                userData.name = text;
                userState = 'asking_business';
                botMessage(`¡Mucho gusto, ${userData.name}! 😊 ¿Qué tipo de negocio tienes o qué proyecto tienes en mente?`);
                return;
            }

            if (userState === 'asking_business') {
                userData.business = text;
                userState = 'idle';
                const waMsg = `Hola Natanael, soy ${userData.name}. Tengo un negocio de ${userData.business} y hablé con tu asistente IA sobre un proyecto. Me gustaría definir los detalles finales.`;
                const encodedMsg = encodeURIComponent(waMsg);
                botMessage(`Perfecto. He recolectado tu información. Para darte el mejor servicio y definir los detalles finales, te conectaré con nuestro director creativo.`);
                setTimeout(() => {
                    botMessage(`<a href="https://wa.me/528991346198?text=${encodedMsg}" target="_blank" class="wa-btn-chat">🚀 Click aquí para agendar detalles</a>`);
                }, 1000);
                return;
            }

            // Keyword Matching with Sales Focus & Expanded Knowledge
            if (lowerText.includes('invitacion') || lowerText.includes('15 años') || lowerText.includes('xv')) {
                botMessage('¡Hacemos invitaciones digitales increíbles! Son interactivas, tienen mapa, confirmación de asistencia y música. ¿Para cuándo es el evento? Dime tu nombre y te mando ejemplos.');
                userState = 'asking_name';
            } else if (lowerText.includes('precio') || lowerText.includes('cuanto') || lowerText.includes('costo')) {
                botMessage('Nuestros proyectos son personalizados para maximizar tu retorno de inversión. Para darte un presupuesto exacto y justo, ¿me dices tu nombre para empezar el briefing?');
                userState = 'asking_name';
            } else if (lowerText.includes('web') || lowerText.includes('pagina')) {
                botMessage('Desarrollamos sitios con tecnología Liquid Glass. Mira este ejemplo:', {
                    image: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400',
                    title: 'Web Apps Premium',
                    desc: 'Sitios ultra-rápidos y modernos que capturan la atención.',
                    link: '#services'
                });
            } else if (lowerText.includes('branding') || lowerText.includes('logo')) {
                botMessage('Diseñamos identidades que dejan huella. ¿Quieres ver nuestra metodología?', {
                    image: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&q=80&w=400',
                    title: 'Identidad Visual',
                    desc: 'Logos y branding que transmiten autoridad y estilo.',
                    link: 'branding-detail.html'
                });
            } else if (lowerText.includes('pos') || lowerText.includes('punto de venta') || lowerText.includes('caja registradora') || lowerText.includes('inventario')) {
                botMessage('Nuestros sistemas de Punto de Venta (POS) tienen tecnología de vanguardia para controlar tu inventario y aumentar tus ventas. Mira esto:', {
                    image: 'assets/pos-mockup.png',
                    title: 'Sistemas POS',
                    desc: 'Control total para tu negocio, restaurante o tienda.',
                    link: 'pos-detail.html'
                });
            } else if (lowerText.includes('marketing') || lowerText.includes('publicidad') || lowerText.includes('redes')) {
                botMessage('Gestionamos tus redes con contenido de alto impacto y campañas publicitarias enfocadas en ventas. ¿Buscas crecer en Instagram, Facebook o TikTok?');
            } else if (lowerText.includes('tiempo') || lowerText.includes('tarda')) {
                botMessage('Un proyecto de alta calidad suele tomar entre 2 a 4 semanas. La velocidad y la calidad son nuestro compromiso. ¿Cuál es tu fecha límite ideal?');
            } else if (lowerText.includes('hola') || lowerText.includes('buenos')) {
                botMessage('¡Hola! Es un gusto saludarte. Soy el asistente de TodoDigital NMR. ¿Buscas escalar tu negocio con tecnología o diseño? Tip: ¡Pídeme un cambio de color!');
            } else if (lowerText.includes('servicios') || lowerText.includes('hacen')) {
                botMessage('Hacemos Web & Apps, Branding, Invitaciones Digitales, Marketing y Automatización con IA. ¿Qué área te interesa explorar hoy?');
            } else {
                botMessage('Esa es una buena pregunta. Para darte la respuesta exacta que necesitas, hablemos directamente. ¿Cómo te llamas?');
                userState = 'asking_name';
            }
        }, 1000);
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
