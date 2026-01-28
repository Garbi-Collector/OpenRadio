import { Component, OnInit, Output, EventEmitter, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import { RadioBrowserService } from '../../services/radio-browser.service';
import { RadioStation } from '../../models/radio-browser.model';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './map.component.html',
  styleUrl: './map.component.scss'
})
export class MapComponent implements OnInit, OnDestroy {
  @Output() stationSelected = new EventEmitter<RadioStation>();

  private map!: L.Map;
  private markerClusterGroup!: L.MarkerClusterGroup;

  stations: RadioStation[] = [];
  isLoading = true;
  loadedCount = 0;
  totalCount = 0;

  constructor(private radioService: RadioBrowserService) {}

  ngOnInit(): void {
    this.initMap();
    this.loadAllStationsWithGeo();
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    // Mapa con wrapping horizontal (circular infinito)
    this.map = L.map('map', {
      center: [20, 0],
      zoom: 2,
      minZoom: 2,
      maxZoom: 18,
      worldCopyJump: true,
      maxBounds: undefined,
      maxBoundsViscosity: 0
    });

    // Tile layer con wrapping infinito
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      noWrap: false,
      bounds: undefined
    }).addTo(this.map);

    // Inicializar cluster group con opciones personalizadas
    this.markerClusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      disableClusteringAtZoom: 10, // Se dispersan a partir del zoom 10
      maxClusterRadius: 80,
      iconCreateFunction: (cluster) => {
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
  }

  private loadAllStationsWithGeo(): void {
    console.log('🌍 Cargando TODAS las radios con coordenadas geográficas...');

    this.isLoading = true;

    // Cargar todas las estaciones que tienen coordenadas
    this.radioService.getStationsWithGeoInfo(100000).subscribe({
      next: (stations) => {
        // Filtrar solo las que tienen coordenadas válidas
        this.stations = stations.filter(s =>
          s.geo_lat !== null &&
          s.geo_long !== null &&
          s.url_resolved &&
          s.lastcheckok === 1 // Solo las que funcionan
        );

        this.totalCount = this.stations.length;
        console.log(`✅ ${this.totalCount} radios con coordenadas cargadas`);

        this.addAllMarkers();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Error cargando radios:', err);
        this.isLoading = false;
      }
    });
  }

  private addAllMarkers(): void {
    const radioIcon = L.icon({
      iconUrl: 'data:image/svg+xml;base64,' + btoa(`
        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" fill="#FF6B6B" stroke="#fff" stroke-width="2.5"/>
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

        // Popup con información mejorada
        const popupContent = `
          <div style="text-align: center; min-width: 180px; font-family: system-ui;">
            <img
              src="${station.favicon || 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0ZGNkI2QiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4='}"
              style="width: 50px; height: 50px; border-radius: 10px; margin-bottom: 10px; object-fit: cover; background: #f0f0f0;"
              onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI1MCIgaGVpZ2h0PSI1MCIgdmlld0JveD0iMCAwIDI0IDI0Ij48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIxMCIgZmlsbD0iI0ZGNkI2QiIvPjxjaXJjbGUgY3g9IjEyIiBjeT0iMTIiIHI9IjQiIGZpbGw9IiNmZmYiLz48L3N2Zz4='"
            />
            <div style="font-weight: 700; margin-bottom: 6px; font-size: 15px; color: #333;">${this.truncate(station.name, 30)}</div>
            <div style="font-size: 13px; color: #666; margin-bottom: 8px;">
              📍 ${station.country}${station.state ? ', ' + station.state : ''}
            </div>
            <div style="display: flex; justify-content: center; gap: 8px; font-size: 11px; color: #999; margin-top: 6px;">
              <span style="background: #f0f0f0; padding: 3px 8px; border-radius: 10px;">${station.codec}</span>
              <span style="background: #f0f0f0; padding: 3px 8px; border-radius: 10px;">${station.bitrate}kbps</span>
              <span style="background: #f0f0f0; padding: 3px 8px; border-radius: 10px;">❤️ ${station.votes}</span>
            </div>
            <button
              onclick="window.playStation('${station.stationuuid}')"
              style="margin-top: 12px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; padding: 8px 20px; border-radius: 20px; cursor: pointer; font-weight: 600; font-size: 13px; width: 100%;"
            >
              ▶️ Reproducir
            </button>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 220,
          className: 'custom-popup'
        });

        // Click en el marcador
        marker.on('click', () => {
          this.stationSelected.emit(station);
          // Registrar el click en la API
          this.radioService.registerClick(station.stationuuid).subscribe();
        });

        // Agregar al cluster group
        this.markerClusterGroup.addLayer(marker);

        this.loadedCount = index + 1;
      }
    });

    console.log(`✅ ${this.loadedCount} marcadores agregados al mapa`);

    // Exponer función global para el botón del popup
    (window as any).playStation = (uuid: string) => {
      const station = this.stations.find(s => s.stationuuid === uuid);
      if (station) {
        this.stationSelected.emit(station);
        this.radioService.registerClick(uuid).subscribe();
      }
    };
  }

  private truncate(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  // Método público para obtener una radio random
  getRandomStation(): RadioStation | null {
    if (this.stations.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * this.stations.length);
    return this.stations[randomIndex];
  }
}
