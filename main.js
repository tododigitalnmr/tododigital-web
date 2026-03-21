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

    // 3. SCROLL REVEAL (Updated with Advanced Transitions)
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    document.querySelectorAll('.animate-on-scroll').forEach(el => observer.observe(el));

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

    if (chatTrigger) {
        chatTrigger.addEventListener('click', () => {
            chatWidget.classList.add('active');
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

    function botMessage(text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = 'message bot-message';
        msgDiv.innerHTML = text;
        chatMessages.appendChild(msgDiv);
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
        const text = chatInput.value.trim().toLowerCase();
        if (!text) return;
        
        userMessage(chatInput.value);
        chatInput.value = '';

        setTimeout(() => {
            if (text.includes('precio') || text.includes('cuanto') || text.includes('costo')) {
                botMessage('Nuestros precios varían según la complejidad del proyecto. ¿Te gustaría que te enviemos una cotización formal por WhatsApp?');
            } else if (text.includes('web') || text.includes('pagina')) {
                botMessage('Somos expertos en desarrollo web de alto impacto con Next.js y React. ¿Buscas algo similar a este sitio?');
            } else if (text.includes('hola') || text.includes('buenos')) {
                botMessage('¡Hola! Es un gusto saludarte. ¿En qué servicio estás interesado?');
            } else if (text.includes('logo') || text.includes('branding')) {
                botMessage('Creamos identidades visuales que enamoran. ¿Tienes ya un concepto o empezamos de cero?');
            } else {
                botMessage('Esa es una excelente pregunta. Para darte una respuesta detallada, prefiero que hablemos con nuestro especialista. <a href="https://wa.me/528991346198" target="_blank" style="color:var(--accent-blue);font-weight:bold;">Toca aquí para ir a WhatsApp</a>');
            }
        }, 1000);
    };

    if (chatSend) {
        chatSend.addEventListener('click', processInput);
    }
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') processInput();
        });
    }

    window.startChat = (type) => {
        if (type === 'servicios') {
            userMessage('Quiero saber sobre sus servicios');
            setTimeout(() => {
                botMessage('Ofrecemos diseño Web & Apps, Marketing Digital, Branding y Asistentes de IA. ¿Te gustaría ver nuestro portafolio?');
            }, 800);
        } else if (type === 'precio') {
            userMessage('Me gustaría cotizar un proyecto');
            setTimeout(() => {
                botMessage('¡Excelente! Para darte un presupuesto exacto necesito conocer un poco más de tu idea. <a href="https://wa.me/528991346198" target="_blank" style="color:var(--accent-blue);font-weight:bold;">Hablemos por WhatsApp aquí</a>');
            }, 800);
        }
    };
});
