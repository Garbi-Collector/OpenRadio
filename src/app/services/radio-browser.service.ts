import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { RadioStation } from '../models/radio-browser.model';

@Injectable({
  providedIn: 'root'
})
export class RadioBrowserService {
  private readonly BASE_URL = 'https://de1.api.radio-browser.info/json';

  constructor(private http: HttpClient) {}

  // ===============================
  // 📻 RADIOS
  // ===============================

  getAllStations(limit = 100000, offset = 0): Observable<RadioStation[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset)
      .set('hidebroken', 'true'); // No mostrar radios rotas

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations`, { params });
  }

  // Obtener estaciones que tienen coordenadas geográficas
  getStationsWithGeoInfo(limit = 100000): Observable<RadioStation[]> {
    const params = new HttpParams()
      .set('limit', limit)
      .set('has_geo_info', 'true')
      .set('hidebroken', 'true')
      .set('order', 'votes')
      .set('reverse', 'true');

    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations/search`, { params });
  }

  // NUEVO: Obtener una estación específica por UUID
  getStationByUuid(uuid: string): Observable<RadioStation[]> {
    return this.http.get<RadioStation[]>(`${this.BASE_URL}/stations/byuuid/${uuid}`);
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
  // 🔍 BÚSQUEDA AVANZADA
  // ===============================

  searchStations(filters: {
    name?: string;
    country?: string;
    tag?: string;
    language?: string;
    limit?: number;
    has_geo_info?: boolean;
    hidebroken?: boolean;
  }): Observable<RadioStation[]> {
    let params = new HttpParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params = params.set(key, value.toString());
      }
    });

    return this.http.get<RadioStation[]>(
      `${this.BASE_URL}/stations/search`,
      { params }
    );
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
}
