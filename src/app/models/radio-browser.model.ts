// models/radio-browser.model.ts

export interface RadioStation {
  stationuuid: string;
  name: string;
  url: string;
  url_resolved: string;
  homepage: string;
  favicon: string;
  tags: string;
  country: string;
  countrycode: string;
  iso_3166_2?: string;
  state: string;
  language: string;
  languagecodes?: string;
  votes: number;
  bitrate: number;
  codec: string;
  clickcount: number;
  clicktrend: number;
  lastcheckok: number;
  lastchecktime: string;
  lastchecktime_iso8601: string;
  lastcheckoktime: string;
  lastcheckoktime_iso8601: string;
  clicktimestamp?: string;
  clicktimestamp_iso8601?: string;
  geo_lat: number | null;
  geo_long: number | null;
  has_extended_info?: boolean;
}

// Nuevo: Interfaz ligera para carga inicial (solo lo esencial)
export interface RadioStationLight {
  stationuuid: string;
  name: string;
  geo_lat: number | null;
  geo_long: number | null;
  country: string;
  countrycode: string;
  favicon: string;
  votes: number;
  lastcheckok: number;
}

// Parámetros de búsqueda para filtrar
export interface StationSearchParams {
  name?: string;
  country?: string;
  countrycode?: string;
  state?: string;
  language?: string;
  tag?: string;
  tagList?: string;
  codec?: string;
  bitrateMin?: number;
  bitrateMax?: number;
  order?: 'name' | 'url' | 'homepage' | 'favicon' | 'tags' | 'country' |
    'state' | 'language' | 'votes' | 'codec' | 'bitrate' |
    'lastcheckok' | 'lastchecktime' | 'clicktimestamp' |
    'clickcount' | 'clicktrend' | 'random';
  reverse?: boolean;
  offset?: number;
  limit?: number;
  hidebroken?: boolean;
  has_geo_info?: boolean;
}
