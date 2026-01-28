import { Component, Input, OnChanges, SimpleChanges, OnDestroy, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStation } from '../../models/radio-browser.model';

@Component({
  selector: 'app-radio-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './radio-player.component.html',
  styleUrl: './radio-player.component.scss'
})
export class RadioPlayerComponent implements OnChanges, OnDestroy {
  @Input() station: RadioStation | null = null;
  @Input() isFavorite: boolean = false;
  @Output() randomRequested = new EventEmitter<void>();
  @Output() favoriteToggled = new EventEmitter<RadioStation>();

  isPlaying = false;
  isLoading = false;
  hasError = false;
  errorMessage = '';
  private audio: HTMLAudioElement | null = null;
  currentTime: string = '';
  private timeInterval: any;
  private retryCount = 0;
  private readonly MAX_RETRIES = 1; // Reducido a 1 reintento
  private loadTimeout: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['station'] && this.station) {
      this.reset();
      this.loadStation();
      this.updateLocalTime();
    }
  }

  private reset(): void {
    this.hasError = false;
    this.errorMessage = '';
    this.retryCount = 0;
    this.isLoading = false;
    this.isPlaying = false;
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  private loadStation(): void {
    this.stop();
    this.isLoading = true;
    this.hasError = false;

    if (!this.station?.url_resolved) {
      this.showError('URL no disponible');
      return;
    }

    // Timeout de 10 segundos para cargar
    this.loadTimeout = setTimeout(() => {
      if (this.isLoading && !this.isPlaying) {
        this.showError('Tiempo de espera agotado');
      }
    }, 10000);

    this.tryLoadAudio(this.station.url_resolved);
  }

  private tryLoadAudio(url: string): void {
    // Limpiar audio anterior
    if (this.audio) {
      this.cleanupAudio();
    }

    this.audio = new Audio();
    this.audio.preload = 'none';
    this.audio.volume = 1;

    // Intentar sin CORS primero (más compatible)
    // this.audio.crossOrigin = 'anonymous';

    // Event: Comenzó a cargar
    this.audio.addEventListener('loadstart', () => {
      this.isLoading = true;
      this.hasError = false;
    });

    // Event: Listo para reproducir
    this.audio.addEventListener('canplay', () => {
      this.isLoading = false;
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
      }
    });

    // Event: Reproduciendo exitosamente
    this.audio.addEventListener('playing', () => {
      this.isLoading = false;
      this.isPlaying = true;
      this.hasError = false;
      if (this.loadTimeout) {
        clearTimeout(this.loadTimeout);
      }
    });

    // Event: Error de carga
    this.audio.addEventListener('error', (e) => {
      this.isLoading = false;
      this.isPlaying = false;

      // Solo mostrar error en consola en desarrollo
      if (this.retryCount === 0) {
        console.warn('⚠️ Error cargando radio:', this.station?.name);
      }

      this.handleAudioError();
    });

    // Event: Pausado (no hacer nada, es normal)
    this.audio.addEventListener('pause', () => {
      if (this.isPlaying) {
        this.isPlaying = false;
      }
    });

    // Cargar y reproducir
    this.audio.src = url;
    this.audio.load();
    this.play();
  }

  private handleAudioError(): void {
    if (this.retryCount < this.MAX_RETRIES && this.station) {
      this.retryCount++;

      // Intentar con URL original si existe y es diferente
      if (this.station.url && this.station.url !== this.station.url_resolved) {
        setTimeout(() => {
          if (this.station?.url) {
            this.tryLoadAudio(this.station.url);
          }
        }, 1500);
      } else {
        // Dar por perdida
        this.showError('Esta radio no está disponible');
      }
    } else {
      // Determinar tipo de error
      const errorTypes = [
        { keyword: 'CORS', message: 'Radio bloqueada por el servidor' },
        { keyword: '401', message: 'Radio requiere autenticación' },
        { keyword: '404', message: 'Radio no encontrada' },
      ];

      let errorMsg = 'Radio no disponible en este momento';

      // Intentar detectar el tipo de error (opcional, puede comentarse)
      // errorTypes.forEach(type => {
      //   if (this.audio?.error?.message?.includes(type.keyword)) {
      //     errorMsg = type.message;
      //   }
      // });

      this.showError(errorMsg);
    }
  }

  private showError(message: string): void {
    this.hasError = true;
    this.errorMessage = message;
    this.isLoading = false;
    this.isPlaying = false;
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  play(): void {
    if (!this.audio || this.hasError) return;

    this.isLoading = true;

    const playPromise = this.audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          this.isPlaying = true;
          this.isLoading = false;
        })
        .catch(err => {
          this.isLoading = false;

          // Solo errores críticos
          if (err.name === 'NotSupportedError' || err.name === 'MediaError') {
            this.handleAudioError();
          } else if (err.name === 'NotAllowedError') {
            // Error de autoplay, no es crítico
            this.showError('Haz clic en ▶️ para reproducir');
          }
          // Ignorar AbortError (es normal al cambiar de radio)
        });
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
      this.isLoading = false;
    }
  }

  stop(): void {
    if (this.audio) {
      this.cleanupAudio();
    }
  }

  private cleanupAudio(): void {
    if (!this.audio) return;

    this.audio.pause();
    this.audio.currentTime = 0;
    this.audio.src = '';

    // Remover todos los event listeners
    const events = ['loadstart', 'canplay', 'playing', 'error', 'pause', 'stalled', 'waiting'];
    events.forEach(event => {
      this.audio?.removeEventListener(event, () => {});
    });

    this.audio = null;
    this.isPlaying = false;
    this.isLoading = false;
  }

  togglePlay(): void {
    if (this.hasError) {
      // Reintentar desde cero
      this.reset();
      this.loadStation();
    } else if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  toggleFavorite(): void {
    if (this.station) {
      this.favoriteToggled.emit(this.station);
    }
  }

  requestRandom(): void {
    this.randomRequested.emit();
  }

  private updateLocalTime(): void {
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }

    if (!this.station) return;

    this.timeInterval = setInterval(() => {
      if (this.station && this.station.geo_lat !== null && this.station.geo_long !== null) {
        const timezoneOffset = Math.round(this.station.geo_long / 15);
        const localTime = new Date();
        const utc = localTime.getTime() + (localTime.getTimezoneOffset() * 60000);
        const stationTime = new Date(utc + (3600000 * timezoneOffset));

        this.currentTime = stationTime.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else {
        this.currentTime = new Date().toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }, 1000);
  }

  ngOnDestroy(): void {
    this.stop();
    if (this.timeInterval) {
      clearInterval(this.timeInterval);
    }
    if (this.loadTimeout) {
      clearTimeout(this.loadTimeout);
    }
  }

  getStationLocation(): string {
    if (!this.station) return '';

    const parts = [];
    if (this.station.state) parts.push(this.station.state);
    if (this.station.country) parts.push(this.station.country);

    return parts.join(', ') || 'Ubicación desconocida';
  }

  getPlaceholderImage(): string {
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24">
        <rect width="24" height="24" fill="#667eea" rx="4"/>
        <circle cx="12" cy="12" r="6" fill="#fff" opacity="0.3"/>
        <circle cx="12" cy="12" r="3" fill="#fff"/>
        <path d="M8 10 L16 10 M8 14 L16 14" stroke="#fff" stroke-width="1" opacity="0.5"/>
      </svg>
    `);
  }
}
