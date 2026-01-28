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
  @Output() randomRequested = new EventEmitter<void>();

  isPlaying = false;
  private audio: HTMLAudioElement | null = null;
  currentTime: string = '';
  private timeInterval: any;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['station'] && this.station) {
      this.loadStation();
      this.updateLocalTime();
    }
  }

  private loadStation(): void {
    this.stop();

    if (this.station?.url_resolved) {
      this.audio = new Audio(this.station.url_resolved);
      this.audio.crossOrigin = 'anonymous';

      this.audio.addEventListener('error', (e) => {
        console.error('Error loading audio:', e);
      });

      this.play();
    }
  }

  play(): void {
    if (this.audio) {
      this.audio.play()
        .then(() => this.isPlaying = true)
        .catch(err => {
          console.error('Error playing:', err);
          this.isPlaying = false;
        });
    }
  }

  pause(): void {
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }
  }

  stop(): void {
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
      this.audio = null;
      this.isPlaying = false;
    }
  }

  togglePlay(): void {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
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
        // Calcular timezone aproximado basado en longitud
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
  }

  getStationLocation(): string {
    if (!this.station) return '';

    const parts = [];
    if (this.station.state) parts.push(this.station.state);
    if (this.station.country) parts.push(this.station.country);

    return parts.join(', ') || 'Ubicación desconocida';
  }
}
