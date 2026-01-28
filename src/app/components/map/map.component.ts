// components/map/map.component.ts

import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioBrowserService } from '../../services/radio-browser.service';
import { RadioStation, RadioStationLight } from '../../models/radio-browser.model';
import { ThemeService } from '../../services/theme.service';

declare const L: any;

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, OnDestroy {
  @Output() stationSelected = new EventEmitter<RadioStation>();

  private map: any;
  private markerClusterGroup: any;

  // Almacenar estaciones ligeras para marcadores
  stations: RadioStationLight[] = [];

  // Cache de estaciones completas cargadas bajo demanda
  private fullStationsCache = new Map<string, RadioStation>();

  isLoading = true;
  loadedCount = 0;
  totalCount = 0;

  // Control de carga progresiva
  private currentLimit = 5000; // Empezar con 5000 radios top
  private hasMoreStations = true;

  // Theme control
  isDarkMode = false;

  constructor(
    private radioService: RadioBrowserService,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    // Obtener tema actual
    this.isDarkMode = this.themeService.isDarkMode();

    // Suscribirse a cambios de tema
    this.themeService.theme$.subscribe(theme => {
      this.isDarkMode = theme === 'dark';
    });

    this.initMap();
    this.loadInitialStations();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  /**
   * Cambia entre light y dark mode
   */
  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  private initMap(): void {
    this.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      maxBounds: undefined,
      maxBoundsViscosity: 0,
      zoomControl: false,
      attributionControl: false
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: false,
      bounds: undefined
    }).addTo(this.map);

    this.markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 10,
      maxClusterRadius: 80,
      iconCreateFunction: (cluster: any) => {
        const count = cluster.getChildCount();
        let size = 'small';
        let sizeNum = 40;

        if (count > 100) {
          size = 'large';
          sizeNum = 60;
        } else if (count > 20) {
          size = 'medium';
          sizeNum = 50;
        }

        return L.divIcon({
          html: `<div><span>${count}</span></div>`,
          className: 'marker-cluster marker-cluster-' + size,
          iconSize: L.point(sizeNum, sizeNum)
        });
      }
    });

    this.markerClusterGroup.addTo(this.map);

    // Listener para cargar más estaciones al hacer zoom
    this.map.on('zoomend moveend', () => {
      this.onMapViewChange();
    });
  }

  /**
   * Carga inicial: solo las top 5000 radios más votadas
   * Esto reduce dramáticamente el tiempo de carga inicial
   */
  private loadInitialStations(): void {
    console.log('🌍 Cargando top 5000 radios más populares...');
    this.isLoading = true;

    this.radioService.getStationsLightweight(this.currentLimit).subscribe({
      next: (stations) => {
        // Filtrar radios válidas
        this.stations = stations.filter(s =>
          s.geo_lat !== null &&
          s.geo_long !== null &&
          s.lastcheckok === 1
        );

        this.totalCount = this.stations.length;
        console.log(`✅ ${this.totalCount} radios cargadas (modo ligero)`);

        this.addLightweightMarkers();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando radios:', err);
        this.isLoading = false;
      }
    });
  }

  /**
   * Detecta cambios en el viewport del mapa
   * Puede usarse para cargar radios adicionales según la región visible
   */
  private onMapViewChange(): void {
    const zoom = this.map.getZoom();

    // Solo cargar más estaciones si el zoom es alto (vista regional)
    if (zoom >= 6 && this.hasMoreStations && this.stations.length < 10000) {
      console.log('🔍 Zoom alto detectado, considerar carga de más radios...');
      // Aquí podrías implementar carga adicional por región
    }
  }

  /**
   * Agrega marcadores usando datos ligeros
   * Mucho más rápido que cargar datos completos
   */
  private addLightweightMarkers(): void {
    const radioIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#FF487C" stroke="#fff" stroke-width="2.5"/>
          <circle cx="12" cy="12" r="4" fill="#fff"/>
          <circle cx="12" cy="12" r="6" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>
        </svg>
      `),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -16]
    });

    console.log(`📍 Agregando ${this.stations.length} marcadores al mapa...`);

    this.stations.forEach((station, index) => {
      if (station.geo_lat !== null && station.geo_long !== null) {
        const marker = L.marker(
          [station.geo_lat, station.geo_long],
          { icon: radioIcon }
        );

        // Popup ligero - carga detalles solo al hacer click
        const popupContent = this.createLightPopup(station);

        marker.bindPopup(popupContent, {
          maxWidth: 220,
          className: 'custom-popup'
        });

        marker.on('click', () => {
          this.loadAndSelectStation(station.stationuuid);
        });

        this.markerClusterGroup.addLayer(marker);
        this.loadedCount = index + 1;
      }
    });

    console.log(`✅ ${this.loadedCount} marcadores agregados`);

    // Exponer función global para el popup
    (window as any).playStation = (uuid: string) => {
      this.loadAndSelectStation(uuid);
    };
  }

  /**
   * Crea un popup ligero sin todos los detalles
   */
  private createLightPopup(station: RadioStationLight): string {
    return `
      <div style="text-align: center; min-width: 180px; font-family: system-ui;">
        <img
          src="${station.favicon || this.getDefaultIcon()}"
          style="width: 50px; height: 50px; border-radius: 10px; margin-bottom: 10px; object-fit: cover; background: #f0f0f0;"
          onerror="this.src='${this.getDefaultIcon()}'"
        />
        <div style="font-weight: 700; margin-bottom: 6px; font-size: 15px;">
          ${this.truncate(station.name, 30)}
        </div>
        <div style="font-size: 13px; opacity: 0.8; margin-bottom: 8px;">
          📍 ${station.country}
        </div>
        <div style="display: flex; justify-content: center; gap: 8px; font-size: 11px; opacity: 0.7; margin-top: 6px;">
          <span style="background: rgba(0,0,0,0.1); padding: 3px 8px; border-radius: 10px;">❤️ ${station.votes}</span>
        </div>
        <button
          onclick="window.playStation('${station.stationuuid}')"
          style="margin-top: 12px; background: linear-gradient(135deg, #FF6A98 0%, #FF376E 100%); color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%;"
        >
          ▶️ Reproducir
        </button>
      </div>
    `;
  }

  /**
   * Carga los detalles completos de una estación bajo demanda
   */
  private loadAndSelectStation(uuid: string): void {
    // Verificar cache primero
    if (this.fullStationsCache.has(uuid)) {
      const station = this.fullStationsCache.get(uuid)!;
      this.selectStation(station);
      return;
    }

    // Cargar desde API
    console.log(`🔍 Cargando detalles de estación: ${uuid}`);
    this.radioService.getStationByUuid(uuid).subscribe({
      next: (stations) => {
        if (stations && stations.length > 0) {
          const station = stations[0];
          // Guardar en cache
          this.fullStationsCache.set(uuid, station);
          this.selectStation(station);
        }
      },
      error: (err) => {
        console.error('❌ Error cargando detalles de estación:', err);
      }
    });
  }

  /**
   * Selecciona una estación y emite el evento
   */
  private selectStation(station: RadioStation): void {
    this.stationSelected.emit(station);
    this.radioService.registerClick(station.stationuuid).subscribe();
  }

  private getDefaultIcon(): string {
    return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0ZGNDg3QyIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4=';
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Obtiene una estación aleatoria del mapa
   */
  getRandomStation(): RadioStation | null {
    if (this.stations.length === 0) return null;

    const randomIndex = Math.floor(Math.random() * this.stations.length);
    const lightStation = this.stations[randomIndex];

    // Cargar detalles completos
    this.loadAndSelectStation(lightStation.stationuuid);
    return null; // Se emitirá cuando se cargue
  }

  /**
   * Centra el mapa en una estación específica
   */
  centerOnStation(station: RadioStation | RadioStationLight): void {
    if (station.geo_lat !== null && station.geo_long !== null) {
      this.map.setView([station.geo_lat, station.geo_long], 10);
    }
  }

  /**
   * Obtiene una estación completa por UUID (para uso externo)
   */
  getStationByUuid(uuid: string): RadioStation | null {
    return this.fullStationsCache.get(uuid) || null;
  }
}
