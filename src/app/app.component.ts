import { Component, ViewChild, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { MapComponent } from './components/map/map.component';
import { RadioPlayerComponent } from './components/radio-player/radio-player.component';
import { FavoritesSidebarComponent } from './components/favorites-sidebar/favorites-sidebar.component';
import { RadioStation } from './models/radio-browser.model';
import { RadioBrowserService } from './services/radio-browser.service';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    MapComponent,
    RadioPlayerComponent,
    FavoritesSidebarComponent
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit, OnDestroy {
  @ViewChild(MapComponent) mapComponent!: MapComponent;
  @ViewChild(FavoritesSidebarComponent) favoritesComponent!: FavoritesSidebarComponent;

  selectedStation: RadioStation | null = null;
  private destroy$ = new Subject<void>();
  private isLoadingStation = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private radioService: RadioBrowserService
  ) {}

  ngOnInit(): void {
    // Escuchar solo cuando termine la navegación
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const stationuuid = this.route.snapshot.firstChild?.paramMap.get('stationuuid');

        if (stationuuid && !this.isLoadingStation) {
          console.log('🔍 URL detectada con UUID:', stationuuid);
          this.loadStationByUuid(stationuuid);
        } else if (!stationuuid && this.selectedStation) {
          console.log('🏠 URL sin UUID, limpiando selección');
          this.selectedStation = null;
        }
      });

    // Cargar inmediatamente si ya hay UUID en la URL inicial
    const initialUuid = this.route.snapshot.firstChild?.paramMap.get('stationuuid');
    if (initialUuid) {
      console.log('🚀 Carga inicial con UUID:', initialUuid);
      this.loadStationByUuid(initialUuid);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga una estación por su UUID directamente desde la API
   * Sin depender de que el mapa haya terminado de cargar
   */
  private loadStationByUuid(uuid: string): void {
    this.isLoadingStation = true;

    console.log(`🔍 Buscando radio con UUID: ${uuid}`);

    // Usar el endpoint específico para obtener la radio por UUID
    this.radioService.getStationByUuid(uuid).subscribe({
      next: (stations) => {
        if (stations && stations.length > 0) {
          const station = stations[0];
          console.log(`✅ Radio encontrada: ${station.name}`);
          this.selectedStation = station;

          // Centrar el mapa en la estación cuando esté disponible
          setTimeout(() => {
            if (this.mapComponent && station.geo_lat !== null && station.geo_long !== null) {
              this.mapComponent.centerOnStation(station);
            }
          }, 500); // Dar tiempo a que el mapa se inicialice
        } else {
          console.warn('⚠️ Estación no encontrada:', uuid);
          // Redirigir a la página principal si no se encuentra
          this.router.navigate(['/']);
        }
        this.isLoadingStation = false;
      },
      error: (err) => {
        console.error('❌ Error cargando estación:', err);
        this.isLoadingStation = false;
        // Redirigir a la página principal en caso de error
        this.router.navigate(['/']);
      }
    });
  }

  /**
   * Maneja la selección de una estación desde el mapa o favoritos
   */
  onStationSelected(station: RadioStation): void {
    this.selectedStation = station;

    // Actualizar la URL sin recargar la página
    this.router.navigate(['/radio', station.stationuuid], {
      replaceUrl: false
    });
  }

  /**
   * Maneja la solicitud de una radio aleatoria
   */
  onRandomRequested(): void {
    if (this.mapComponent) {
      const randomStation = this.mapComponent.getRandomStation();
      if (randomStation) {
        this.onStationSelected(randomStation);
      }
    }
  }

  /**
   * Maneja el toggle de favoritos
   */
  onFavoriteToggled(station: RadioStation): void {
    if (this.favoritesComponent) {
      this.favoritesComponent.toggleFavorite(station);
    }
  }

  /**
   * Verifica si una estación es favorita
   */
  isFavorite(station: RadioStation | null): boolean {
    if (!station || !this.favoritesComponent) return false;
    return this.favoritesComponent.isFavorite(station);
  }
}
