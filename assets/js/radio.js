/**
 * radio.js - Reproductor de la Emisora Sonaría (Versión Ultra-Robusta v2)
 * Para el sitio del Consejo de Padres ENSM
 * 
 * Mejoras: Reconexión inteligente, tolerancia a gaps entre canciones,
 * backoff exponencial, y watchdog basado en datos reales.
 */

class SonariaRadio {
    constructor() {
        this.streamUrl = 'https://radio.sonariaradio.online/radio.mp3';
        this.isPlaying = false;
        this.userWantsPlay = false;
        this.audio = null;
        
        // Reconexión inteligente
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 50;
        this.reconnectTimer = null;
        this.watchdogTimer = null;
        this.lastDataTime = 0;
        
        // Audio de emergencia
        this.emergencyAudio = null;
        this.basePath = window.location.pathname.includes('/manual/') ? '../' : '';
        this.emergencyUrl = `${this.basePath}assets/audio/emergencia.mp3`;

        this.createPlayerUI();
        this.initListeners();
    }

    createPlayerUI() {
        const basePath = window.location.pathname.includes('/manual/') ? '../' : '';
        const playerHtml = `
            <div id="sonaria-player" class="fixed bottom-6 left-6 z-[60] bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-2 shadow-2xl transition-all duration-500 hover:bg-white/20 group">
                <div class="flex items-center gap-3 pr-4">
                    <div id="radio-disk" class="w-12 h-12 rounded-full bg-[#1e3a5f] flex items-center justify-center relative overflow-hidden shadow-inner border border-white/30">
                        <img src="${basePath}assets/img/logo_sonaria.png" alt="Sonaria" class="w-full h-full object-cover z-10" id="radio-logo">
                    </div>
                    
                    <div class="flex flex-col bg-black/40 backdrop-blur-sm px-3 py-1 rounded-xl border border-white/10 shadow-lg">
                        <span class="text-[9px] uppercase tracking-widest text-white/90 font-bold leading-none">En Vivo</span>
                        <span class="text-white font-bold text-xs leading-tight" style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">Emisora Sonaría</span>
                    </div>

                    <button id="radio-play-btn" class="w-10 h-10 rounded-full bg-white text-[#1e3a5f] flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                        <span id="radio-icon">▶</span>
                    </button>
                </div>
                <div id="radio-status" class="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 transition-opacity pointer-events-none whitespace-nowrap">
                    Conectando...
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', playerHtml);
    }

    createAudio() {
        if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute('src');
            this.audio.load();
        }
        this.audio = new Audio();
        // this.audio.crossOrigin = "anonymous"; // Desactivado para evitar bloqueos CORS con Icecast nativo
        this.audio.preload = "none";

        this.audio.addEventListener('waiting', () => {
            if (this.userWantsPlay) {
                this.showStatus('Cargando buffer...');
                // Si esperamos más de 7 segundos cargando, disparar emergencia
                if (this.waitingTimer) clearTimeout(this.waitingTimer);
                this.waitingTimer = setTimeout(() => {
                    if (this.userWantsPlay) {
                        this.scheduleReconnect("Buffer agotado");
                    }
                }, 7000);
            }
        });

        this.audio.addEventListener('playing', () => {
            if (this.waitingTimer) clearTimeout(this.waitingTimer);
            this.reconnectAttempts = 0;
            this.lastDataTime = Date.now();
            this.isPlaying = true;
            document.getElementById('radio-icon').textContent = "||";
            document.getElementById('radio-disk').classList.add('animate-spin-slow');
            this.showStatus('Sintonizado ✓');
            this.startWatchdog();
            this.stopEmergency();
        });

        this.audio.addEventListener('error', () => {
            if (this.userWantsPlay) this.scheduleReconnect("Error de señal");
        });

        this.audio.addEventListener('stalled', () => {
            if (this.userWantsPlay && Date.now() - this.lastDataTime > 8000) {
                this.scheduleReconnect("Señal estancada");
            }
        });

        this.audio.addEventListener('timeupdate', () => {
            this.lastDataTime = Date.now();
            this.reconnectAttempts = 0;
        });

        this.audio.addEventListener('progress', () => {
            this.lastDataTime = Date.now();
        });
    }

    initListeners() {
        document.getElementById('radio-play-btn').addEventListener('click', () => {
            if (this.userWantsPlay) {
                this.stop();
            } else {
                this.start();
            }
        });

        // Auto-reanudación si estaba sonando en la página anterior
        if (sessionStorage.getItem('sonariaPlaying') === 'true') {
            console.log("📡 [Radio] Reanudando reproducción de sesión anterior...");
            this.start();
        }
    }

    start() {
        this.userWantsPlay = true;
        sessionStorage.setItem('sonariaPlaying', 'true');
        this.reconnectAttempts = 0;
        this.connectStream();
    }

    connectStream() {
        this.createAudio();
        this.showStatus('Sintonizando...');
        this.audio.src = this.streamUrl + '?nocache=' + Date.now();
        
        this.audio.play().then(() => {
            // OK - el evento 'playing' se encargará
        }).catch(err => {
            console.warn("📡 [Radio] Error al iniciar:", err.message);
            if (this.userWantsPlay) {
                this.scheduleReconnect("Reintentando");
            }
        });
    }

    stop() {
        this.userWantsPlay = false;
        sessionStorage.setItem('sonariaPlaying', 'false');
        this.isPlaying = false;
        this.stopWatchdog();
        this.clearReconnectTimer();
        
        if (this.audio) {
            this.audio.pause();
            this.audio.removeAttribute('src');
            this.audio.load();
        }
        
        document.getElementById('radio-icon').textContent = "▶";
        document.getElementById('radio-disk').classList.remove('animate-spin-slow');
        this.showStatus('Pausado');
        this.reconnectAttempts = 0;
        this.stopEmergency();
    }

    scheduleReconnect(reason) {
        if (!this.userWantsPlay) return;
        if (this.reconnectTimer) return;
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showStatus('Sin señal');
            this.stop();
            return;
        }

        this.reconnectAttempts++;
        const delay = Math.min(3000 + (this.reconnectAttempts * 2000), 10000);
        
        console.warn(`📡 [Radio] ${reason}. Reintento #${this.reconnectAttempts} en ${delay/1000}s`);
        this.showStatus(`Reconectando (#${this.reconnectAttempts})...`);

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            if (this.userWantsPlay) this.connectStream();
        }, delay);

        this.startEmergency();
    }

    startEmergency() {
        if (!this.userWantsPlay) return;
        if (this.emergencyAudio && !this.emergencyAudio.paused) return;

        console.log("📢 [Radio] Iniciando audio de emergencia...");
        if (!this.emergencyAudio) {
            this.emergencyAudio = new Audio(this.emergencyUrl);
            this.emergencyAudio.loop = true;
            this.emergencyAudio.volume = 0.8;
        }
        
        this.emergencyAudio.play().catch(err => {
            console.warn("⚠️ [Radio] No se pudo reproducir el audio de emergencia:", err.message);
        });
    }

    stopEmergency() {
        if (this.emergencyAudio) {
            console.log("⏹️ [Radio] Deteniendo audio de emergencia.");
            this.emergencyAudio.pause();
            this.emergencyAudio.currentTime = 0;
        }
    }

    startWatchdog() {
        this.stopWatchdog();
        this.lastDataTime = Date.now();
        
        this.watchdogTimer = setInterval(() => {
            if (!this.userWantsPlay || !this.isPlaying) return;
            
            if (Date.now() - this.lastDataTime > 15000) {
                console.warn("📡 Watchdog: Sin datos por 15s");
                this.stopWatchdog();
                this.scheduleReconnect("Señal perdida");
            }
        }, 5000);
    }

    stopWatchdog() {
        if (this.watchdogTimer) {
            clearInterval(this.watchdogTimer);
            this.watchdogTimer = null;
        }
    }

    clearReconnectTimer() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    showStatus(text) {
        const status = document.getElementById('radio-status');
        if (!status) return;
        status.textContent = text;
        status.classList.remove('opacity-0');
        setTimeout(() => {
            if (status) status.classList.add('opacity-0');
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SonariaRadio();
});
