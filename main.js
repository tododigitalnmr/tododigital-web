document.addEventListener('DOMContentLoaded', () => {
    // Scroll Reveal Animation
    const observerOptions = {
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
            }
        });
    }, observerOptions);

    const scrollElements = document.querySelectorAll('.animate-on-scroll');
    scrollElements.forEach(el => observer.observe(el));

    // Smooth Scrolling for Nav Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Mouse Following Glow
    const glow = document.querySelector('.glow-bg');
    window.addEventListener('mousemove', (e) => {
        const x = e.clientX;
        const y = e.clientY;
        glow.style.left = `${x}px`;
        glow.style.top = `${y}px`;
    });

    // Typing Effect
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
        
        // Start typing after initial load
        setTimeout(typeWriter, 1000);
    }

    // 3D TILT EFFECT
    document.querySelectorAll('.service-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            
            const rotateX = (y - centerY) / 10;
            const rotateY = (centerX - x) / 10;
            
            card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)`;
        });
    });

    // ANIMATED COUNTERS
    const counters = document.querySelectorAll('.stat-number');
    const countOptions = { threshold: 0.5 };
    
    const countObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = +entry.target.getAttribute('data-target');
                const count = () => {
                    const current = +entry.target.innerText;
                    const increment = target / 100;
                    if (current < target) {
                        entry.target.innerText = Math.ceil(current + increment);
                        setTimeout(count, 20);
                    } else {
                        entry.target.innerText = target;
                    }
                };
                count();
                countObserver.unobserve(entry.target);
            }
        });
    }, countOptions);

    counters.forEach(c => countObserver.observe(c));

    // HAMBURGER MENU
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // Close menu when clicking a link
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.padding = '10px 0';
            navbar.style.background = 'rgba(2, 4, 10, 0.8)';
        } else {
            navbar.style.padding = '20px 0';
            navbar.style.background = 'rgba(2, 4, 10, 0.5)';
        }
    });
});
