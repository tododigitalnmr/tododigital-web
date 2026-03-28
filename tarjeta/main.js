// Optimización para Pantalla Completa en Chrome/Safari
function lockViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
    document.body.style.height = `${window.innerHeight}px`;
}

window.addEventListener('resize', lockViewportHeight);
window.addEventListener('orientationchange', lockViewportHeight);
lockViewportHeight();

document.addEventListener('DOMContentLoaded', () => {
    // Configuración de Particles.js
    const particlesConfig = {
        "particles": {
            "number": {"value": 250, "density": {"enable": true, "value_area": 800}},
            "color": {"value": ["#00d2ff", "#ffffff", "#00a2ff"]},
            "shape": {"type": "circle"},
            "opacity": {"value": 0.8, "random": true},
            "size": {"value": 3, "random": true},
            "line_linked": {"enable": true, "distance": 100, "color": "#00d2ff", "opacity": 0.5, "width": 1.2},
            "move": {"enable": true, "speed": 1.5, "direction": "none", "random": true, "straight": false, "out_mode": "out", "bounce": false}
        },
        "interactivity": {
            "detect_on": "canvas",
            "events": {
                "onhover": {"enable": false},
                "onclick": {"enable": false},
                "resize": true
            }
        },
        "retina_detect": true
    };
    
    if (typeof particlesJS !== 'undefined') {
        particlesJS('particles-front', particlesConfig);
        particlesJS('particles-back', particlesConfig);
    }
    
    const card = document.getElementById('card');
    let isFlipped = false;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Función para actualizar la rotación (Tilt + Flip)
    function updateRotation(tiltX = 0, tiltY = 0) {
        const baseRotationY = isFlipped ? 180 : 0;
        // Si está volteada, el tiltY debe invertirse para que se sienta natural
        const finalY = baseRotationY + (isFlipped ? -tiltY : tiltY);
        card.style.transform = `rotateX(${-tiltX}deg) rotateY(${finalY}deg)`;
    }

    const startBtn = document.getElementById('start-btn');
    const overlay = document.getElementById('welcome-overlay');

    // Función para activar pantalla completa
    function activateFullscreen() {
        const docEl = document.documentElement;
        if (docEl.requestFullscreen) {
            docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
            docEl.webkitRequestFullscreen();
        } else if (docEl.msRequestFullscreen) {
            docEl.msRequestFullscreen();
        }
    }

    if (startBtn) {
        startBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            
            // 1. Activar Fullscreen API
            activateFullscreen();
            
            // 2. Hack Agresivo Repetitivo para ocultar URL Bar
            let attempts = 0;
            const scrollHack = setInterval(() => {
                window.scrollTo(0, 1);
                attempts++;
                if (attempts > 10) clearInterval(scrollHack);
            }, 100);

            overlay.classList.add('hidden');
        });
    }

    // Asegurar que si el usuario hace scroll manual, se intente ocultar de nuevo
    window.addEventListener('load', () => {
        setTimeout(() => {
            window.scrollTo(0, 1);
        }, 1000);
    });

    // Guardar Contacto de forma rápida (Blob hack)
    const vcfBtn = document.querySelector('a[href$=".vcf"]');
    if (vcfBtn) {
        vcfBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            try {
                const response = await fetch(vcfBtn.href);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = 'Contacto_TodoDigital.vcf';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                // Fallback si fetch falla (por ejemplo en local sin servidor real)
                window.location.href = vcfBtn.href;
            }
        });
    }

    // Datos de Servicios (Contenido de la Web Principal)
    const serviceData = {
        web: {
            title: "Plataformas Web Premium",
            content: "Desarrollamos sitios web de alto impacto con UI/UX de nivel mundial. Optimizados para SEO, velocidad máxima y conversión de leads. Tu negocio merece una presencia digital que venda sola."
        },
        marketing: {
            title: "Marketing & Facebook Ads",
            content: "Estrategias agresivas de crecimiento mediante pautas publicitarias optimizadas. No solo generamos clics, generamos clientes potenciales calificados para que tu equipo de ventas no pare."
        },
        branding: {
            title: "Branding & Identidad",
            content: "Diseñamos marcas que se quedan en la mente. Desde logotipos minimalistas hasta manuales de identidad completos. Construimos la autoridad visual que tu empresa necesita."
        },
        ia: {
            title: "Asistentes de IA (Bots)",
            content: "Automatización total de tus canales de venta. Bots inteligentes con GPT-4 que atienden 24/7, cierran citas y responden dudas frecuentes en WhatsApp e Instagram."
        },
        invitaciones: {
            title: "Invitaciones Digitales",
            content: "Experiencias interactivas para eventos premium. Confirmación de asistencia (RSVP), ubicación en tiempo real, música personalizada y diseños cinematográficos inolvidables."
        }
    };

    const detailOverlay = document.getElementById('service-detail');
    const detailContent = document.getElementById('detail-content');

    window.showService = function(type) {
        const data = serviceData[type];
        if (data) {
            detailContent.innerHTML = `<h3>${data.title}</h3><p>${data.content}</p>`;
            detailOverlay.classList.add('active');
        }
    };

    window.hideService = function() {
        detailOverlay.classList.remove('active');
    };

    // Compartir URL
    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
        shareBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const url = window.location.href;
            navigator.clipboard.writeText(url).then(() => {
                const originalText = shareBtn.innerHTML;
                shareBtn.innerText = '¡Copiado!';
                shareBtn.style.background = '#28a745';
                setTimeout(() => {
                    shareBtn.innerHTML = originalText;
                    shareBtn.style.background = '';
                }, 2000);
            });
        });
    }

    // Girar la tarjeta al hacer clic
    card.addEventListener('click', (e) => {
        // DETECCIÓN MAESTRA: Si el clic toca un botón de acción, una caja de servicio o el modal
        const actionBtn = e.target.closest('.share-btn, .service-box, .service-detail, .social-link');
        if (actionBtn) {
            // Detenemos el giro de la tarjeta si es un elemento interactivo
            if (!e.target.classList.contains('close-detail')) {
                e.stopPropagation();
            }
            return;
        }

        isFlipped = !isFlipped;
        card.classList.toggle('flipped');
        updateRotation();
    });

    // Inclinación (Tilt) suave - SOLO para escritorio
    if (!isTouchDevice) {
        document.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            
            const tiltX = (clientY / innerHeight - 0.5) * 15;
            const tiltY = (clientX / innerWidth - 0.5) * 15;
            
            updateRotation(tiltX, tiltY);
        });

        document.addEventListener('mouseleave', () => {
            updateRotation(0, 0);
        });
    }

    // Barra espaciadora para girar
    window.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            isFlipped = !isFlipped;
            card.classList.toggle('flipped');
            updateRotation();
        }
    });
});
