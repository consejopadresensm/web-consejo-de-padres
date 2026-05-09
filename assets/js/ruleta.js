/**
 * ruleta.js - Motor de la Ruleta de Propósitos Pedagógicos
 */

class Ruleta {
    constructor() {
        this.canvas = document.getElementById('wheelCanvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.btn = document.getElementById('spin-btn');
        this.container = document.getElementById('wheel-container');
        
        this.videoIdle = document.getElementById('video-idle');
        this.videoActive = document.getElementById('video-active');
        
        this.resultOverlay = document.getElementById('result-overlay');
        this.resultContent = document.getElementById('result-content');
        this.resultText = document.getElementById('result-text');
        this.retoText = document.getElementById('reto-text');
        this.closeBtn = document.getElementById('close-result');
        
        this.propositos = [];
        this.angle = 0;
        this.isSpinning = false;
        this.colors = [
            '#1e3a5f', '#2d7d5a', '#f5a623', '#e8792f', 
            '#3a5a8f', '#4d9d7a', '#ffb643', '#f8894f'
        ];
        
        this.init();
    }
    
    async init() {
        // Cargar datos desde sheets.js
        try {
            this.propositos = await getPropositos();
        } catch (e) {
            console.error("Error cargando propósitos:", e);
        }

        // Mostrar todos los propósitos cargados (sin límite de 5)
        
        // Precargar imágenes si existen
        this.loadedImages = {};
        this.propositos.forEach((prop, i) => {
            if (prop.imagen) {
                const img = new Image();
                img.src = prop.imagen;
                this.loadedImages[i] = img;
            }
        });

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        this.btn.addEventListener('click', () => this.spin());
        this.closeBtn.addEventListener('click', () => this.hideResult());
        
        // Dibujar estado inicial
        this.draw();
    }
    
    resize() {
        const parent = this.canvas.parentElement;
        const size = Math.min(parent.offsetWidth, 900);
        this.canvas.width = size;
        this.canvas.height = size;
        this.draw();
    }
    
    draw() {
        const size = this.canvas.width;
        const centerX = size * 0.68; // Equilibrio en la derecha
        const centerY = size / 2 + 10;
        const radius = size * 0.28; // Mismo tamaño visual que el personaje
        const frameRadius = radius + 15; // Radio del aro rojo exterior
        const total = this.propositos.length;
        const arc = 2 * Math.PI / total;
        
        this.ctx.clearRect(0, 0, size, size);
        
        // 1. DIBUJAR EL ARO ROJO DECORATIVO (EL MARCO)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, frameRadius + 10, 0, 2 * Math.PI);
        this.ctx.fillStyle = '#8b0000'; // Rojo oscuro
        this.ctx.fill();
        this.ctx.strokeStyle = '#f5a623'; // Borde dorado
        this.ctx.lineWidth = 5;
        this.ctx.stroke();

        // 2. DIBUJAR LUCES EN EL MARCO (Puntitos amarillos)
        for (let i = 0; i < 24; i++) {
            const lightAngle = i * (Math.PI / 12);
            this.ctx.beginPath();
            this.ctx.arc(
                centerX + (frameRadius + 5) * Math.cos(lightAngle),
                centerY + (frameRadius + 5) * Math.sin(lightAngle),
                3, 0, 2 * Math.PI
            );
            this.ctx.fillStyle = '#fff700'; // Amarillo luz
            this.ctx.shadowColor = '#fff700';
            this.ctx.shadowBlur = 10;
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
        }

        // 3. DIBUJAR LAS REBANADAS DE COLORES
        this.propositos.forEach((prop, i) => {
            const startAngle = this.angle + i * arc;
            const endAngle = startAngle + arc;
            
            // Rebanada
            this.ctx.beginPath();
            this.ctx.fillStyle = this.colors[i % this.colors.length];
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.fill();
            
            // Borde entre rebanadas
            this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            // 4. TEXTOS Y NÚMEROS (Estilo de la imagen de referencia)
            this.ctx.font = "bold 16px 'Inter', sans-serif";
            
            // Usar el 'tema' (columna B) si existe, de lo contrario usar texto corto
            const text = prop.tema ? prop.tema : prop.texto.substring(0, 20);
            const words = text.split(' ');
            let line1 = "";
            let line2 = "";
            
            if (words.length > 1) {
                let mid = Math.ceil(words.length / 2);
                line1 = words.slice(0, mid).join(' ');
                line2 = words.slice(mid).join(' ');
            } else {
                line1 = text;
            }

            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + arc / 2);
            
            // Posicionar cerca del borde exterior
            const textRadius = radius * 0.8; 
            this.ctx.translate(textRadius, 0);
            
            // Rotar 90 grados para que sea horizontal al estar arriba
            this.ctx.rotate(Math.PI / 2);
            
            // a) Círculo oscuro con el número (movido más arriba)
            this.ctx.beginPath();
            this.ctx.arc(0, -35, 12, 0, 2 * Math.PI);
            this.ctx.fillStyle = '#1e3a5f'; // Azul oscuro como en la imagen
            this.ctx.fill();
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 1;
            this.ctx.stroke();
            
            this.ctx.textAlign = "center";
            this.ctx.textBaseline = "middle";
            
            this.ctx.fillStyle = "white";
            this.ctx.font = "bold 12px 'Inter', sans-serif";
            this.ctx.fillText((i + 1).toString(), 0, -34); // Número de sección
            
            // b) Imagen/Emoji si existe
            if (this.loadedImages && this.loadedImages[i] && this.loadedImages[i].complete) {
                const img = this.loadedImages[i];
                // Dibujar la imagen centrada debajo del número
                this.ctx.drawImage(img, -15, -18, 30, 30);
                
                // Bajar el texto para que no pise la imagen
                this.ctx.translate(0, 25);
            }
            
            // c) Texto del tema
            this.ctx.font = "bold 14px 'Inter', sans-serif";
            this.ctx.shadowColor = "rgba(0,0,0,0.6)";
            this.ctx.shadowBlur = 4;
            
            this.ctx.fillText(line1, 0, 0);
            if (line2) this.ctx.fillText(line2, 0, 16);
            
            this.ctx.restore();
        });

        // 5. CÍRCULO CENTRAL (Hub)
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius * 0.15, 0, 2 * Math.PI);
        this.ctx.fillStyle = 'white';
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = 'rgba(0,0,0,0.2)';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // 6. PUNTERO (FLECHA INDICADORA GRANDE Y ELEGANTE)
        this.ctx.save();
        this.ctx.translate(centerX, centerY - frameRadius - 5);
        this.ctx.beginPath();
        this.ctx.moveTo(-25, -40);
        this.ctx.lineTo(25, -40);
        this.ctx.lineTo(0, 15);
        this.ctx.closePath();
        
        // Estilo de la flecha
        const gradient = this.ctx.createLinearGradient(0, -40, 0, 15);
        gradient.addColorStop(0, '#f5a623'); // Dorado
        gradient.addColorStop(1, '#ffcc00'); // Oro brillante
        this.ctx.fillStyle = gradient;
        this.ctx.shadowColor = 'rgba(0,0,0,0.5)';
        this.ctx.shadowBlur = 10;
        this.ctx.fill();
        
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    spin() {
        if (this.isSpinning) return;
        
        this.isSpinning = true;
        this.btn.disabled = true;
        this.container.classList.add('spinning');
        
        // Cambiar GIFs
        if (this.videoIdle && this.videoActive) {
            this.videoIdle.classList.add('hidden');
            this.videoActive.classList.remove('hidden');
            // Reiniciar el GIF de giro para que empiece desde el inicio
            const currentSrc = this.videoActive.src.split('?')[0];
            this.videoActive.src = currentSrc + '?t=' + new Date().getTime();
        }
        
        const extraSpins = 6 + Math.random() * 4;
        const targetRotation = extraSpins * 2 * Math.PI;
        const startTime = performance.now();
        const duration = 6000; // 6 segundos de giro
        const startAngle = this.angle;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing out Quintic para un final muy suave
            const easeOut = 1 - Math.pow(1 - progress, 5);
            this.angle = startAngle + targetRotation * easeOut;
            
            this.draw();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.onFinish();
            }
        };
        
        requestAnimationFrame(animate);
    }
    
    onFinish() {
        this.isSpinning = false;
        this.btn.disabled = false;
        this.container.classList.remove('spinning');
        
        // Calcular ganador
        const total = this.propositos.length;
        const arc = 2 * Math.PI / total;
        const normalizedAngle = (this.angle % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
        const pointerAngle = 1.5 * Math.PI;
        let index = Math.floor((pointerAngle - normalizedAngle + 2 * Math.PI) % (2 * Math.PI) / arc);
        index = index % total;
        
        const winner = this.propositos[index];
        this.showResult(winner.texto, winner.reto);
        
        // Volver al GIF idle
        if (this.videoActive && this.videoIdle) {
            this.videoActive.classList.add('hidden');
            this.videoIdle.classList.remove('hidden');
        }
    }
    
    showResult(text, reto) {
        this.resultText.textContent = text;
        if (this.retoText) this.retoText.textContent = reto || "Sube una foto realizando esta actividad.";
        this.resultOverlay.classList.remove('hidden');
        this.resultOverlay.classList.add('active');
        
        // Sonido de premio si existe
        const premioAudio = new Audio('assets/audio/premio.mp3');
        premioAudio.volume = 0.5;
        premioAudio.play().catch(() => {});
    }
    
    hideResult() {
        this.resultOverlay.classList.remove('active');
        setTimeout(() => {
            this.resultOverlay.classList.add('hidden');
        }, 500);
    }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    window.ruleta = new Ruleta();
});
