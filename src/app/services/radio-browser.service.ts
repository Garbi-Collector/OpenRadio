// services/radio-browser.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RadioStation, RadioStationLight, StationSearchParams } from '../models/radio-browser.model';

@Injectable({
  providedIn: 'root'
})
export class RadioBrowserService {
  private readonly BASE_URL = 'https://de1.api.radio-browser.info/json';

  // Cache para evitar llamadas duplicadas
  private stationCache = new Map<string, RadioStation>();

  constructor(private http: HttpClient) {}

  // ===============================
  // 📻 CARGA OPTIMIZADA
  // ===============================

  /**
   * Obtiene radios con datos mínimos para renderizar marcadores
   * Solo las top radios por votos para carga inicial rápida
   */
  getStationsLightweight(limit = 5000): Observable<RadioStationLight[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('has_geo_info', 'true')
      .set('hidebroken', 'true')
      .set('order', 'votes')
      .set('reverse', 'true');

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations/search`, { params })
      .pipe(
        map(stations => stations.map(s => this.toLightStation(s)))
      );
  }

  /**
   * Obtiene radios por región geográfica (bounding box)
   * Para cargar solo las radios visibles en el viewport del mapa
   */
  getStationsByBounds(
    northEast: { lat: number; lng: number },
    southWest: { lat: number; lng: number },
    limit = 1000
  ): Observable<RadioStation[]> {
    // La API no soporta búsqueda por bounds, así que filtramos del lado cliente
    // Para una solución más robusta, considera cachear todas las coordenadas
    return this.getStationsLightweight(10000).pipe(
      map(stations => {
        return stations.filter(s =>
          s.geo_lat !== null && s.geo_long !== null &&
          s.geo_lat <= northEast.lat &&
          s.geo_lat >= southWest.lat &&
          s.geo_long <= northEast.lng &&
          s.geo_long >= southWest.lng
        ) as any[];
      })
    );
  }

  /**
   * Obtiene radios por país (más eficiente que cargar todo)
   */
  getStationsByCountryLight(countryCode: string, limit = 1000): Observable<RadioStationLight[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('has_geo_info', 'true')
      .set('hidebroken', 'true')
      .set('order', 'votes')
      .set('reverse', 'true');

    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/bycountrycodeexact/${countryCode}`,
      { params }
    ).pipe(
      map(stations => stations.map(s => this.toLightStation(s)))
    );
  }

  /**
   * Búsqueda avanzada con parámetros flexibles
   */
  searchStationsAdvanced(params: StationSearchParams): Observable<RadioStation[]> {
    let httpParams = new HttpParams();

    // Construir parámetros dinámicamente
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        httpParams = httpParams.set(key, value.toString());
      }
    });

    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/search`,
      { params: httpParams }
    );
  }

  /**
   * Convierte una estación completa a versión ligera
   */
  private toLightStation(station: RadioStation): RadioStationLight {
    return {
      stationuuid: station.stationuuid,
      name: station.name,
      geo_lat: station.geo_lat,
      geo_long: station.geo_long,
      country: station.country,
      countrycode: station.countrycode,
      favicon: station.favicon,
      votes: station.votes,
      lastcheckok: station.lastcheckok
    };
  }

  // ===============================
  // 📻 RADIOS - Métodos existentes mejorados
  // ===============================

  /**
   * OBSOLETO - Usar getStationsLightweight() o searchStationsAdvanced()
   * @deprecated
   */
  getAllStations(limit = 100000, offset = 0): Observable<RadioStation[]> {
    console.warn('⚠️ getAllStations está obsoleto. Usa getStationsLightweight() o searchStationsAdvanced()');
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset)
      .set('hidebroken', 'true');

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations`, { params });
  }

  /**
   * MEJORADO - Ahora usa límite razonable por defecto
   */
  getStationsWithGeoInfo(limit = 10000): Observable<RadioStation[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('has_geo_info', 'true')
      .set('hidebroken', 'true')
      .set('order', 'votes')
      .set('reverse', 'true');

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations/search`, { params });
  }

  /**
   * Obtener detalles completos de una estación (con cache)
   */
  getStationByUuid(uuid: string, useCache = true): Observable<RadioStation[]> {
    // Verificar cache
    if (useCache && this.stationCache.has(uuid)) {
      return of([this.stationCache.get(uuid)!]);
    }

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations/byuuid/${uuid}`)
      .pipe(
        map(stations => {
          // Guardar en cache
          if (stations.length > 0) {
            this.stationCache.set(uuid, stations[0]);
          }
          return stations;
        }),
        catchError(err => {
          console.error('Error loading station:', err);
          return of([]);
        })
      );
  }

  getStationsByCountry(country: string): Observable<RadioStation[]> {
    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/bycountry/${country}`
    );
  }

  getStationsByTag(tag: string): Observable<RadioStation[]> {
    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/bytag/${tag}`
    );
  }

  getStationsByLanguage(language: string): Observable<RadioStation[]> {
    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/bylanguage/${language}`
    );
  }

  // ===============================
  // 🔍 BÚSQUEDA AVANZADA - Deprecado
  // ===============================

  /**
   * @deprecated Usa searchStationsAdvanced() en su lugar
   */
  searchStations(filters: {
    name?: string;
    country?: string;
    tag?: string;
    language?: string;
    limit?: number;
    has_geo_info?: boolean;
    hidebroken?: boolean;
  }): Observable<RadioStation[]> {
    return this.searchStationsAdvanced(filters as StationSearchParams);
  }

  // ===============================
  // 🌍 METADATOS
  // ===============================

  getCountries(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/countries`);
  }

  getLanguages(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/languages`);
  }

  getTags(): Observable<any[]> {
    return this.http.get<any[]>(`${this.BASE_URL}/tags`);
  }

  // ===============================
  // ❤️ INTERACCIONES
  // ===============================

  voteStation(stationUuid: string): Observable<any> {
    return this.http.post(
      `${this.BASE_URL}/vote/${stationUuid}`,
      {}
    );
  }

  registerClick(stationUuid: string): Observable<any> {
    return this.http.get(
      `${this.BASE_URL}/url/${stationUuid}`
    );
  }

  /**
   * Limpia el cache de estaciones
   */
  clearCache(): void {
    this.stationCache.clear();
  }
}
