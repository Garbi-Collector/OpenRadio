import { Component, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RadioStation } from '../../models/radio-browser.model';

@Component({
  selector: 'app-favorites-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './favorites-sidebar.component.html',
  styleUrl: './favorites-sidebar.component.scss'
})
export class FavoritesSidebarComponent {
  @Output() stationSelected = new EventEmitter<RadioStation>();
  @Output() favoriteToggled = new EventEmitter<RadioStation>();
  @Input() currentStation: RadioStation | null = null;

  isOpen = false;
  favorites: RadioStation[] = [];
  private readonly STORAGE_KEY = 'radio_favorites';

  constructor() {
    this.loadFavorites();
  }

  toggleSidebar(): void {
    this.isOpen = !this.isOpen;
  }

  addFavorite(station: RadioStation): void {
    // Evitar duplicados
    if (!this.isFavorite(station)) {
      this.favorites.push(station);
      this.saveFavorites();
      this.showNotification('✅ Agregado a favoritos');
    }
  }

  removeFavorite(station: RadioStation): void {
    this.favorites = this.favorites.filter(
      fav => fav.stationuuid !== station.stationuuid
    );
    this.saveFavorites();
    this.showNotification('❌ Eliminado de favoritos');
  }

  toggleFavorite(station: RadioStation): void {
    if (this.isFavorite(station)) {
      this.removeFavorite(station);
    } else {
      this.addFavorite(station);
    }
    this.favoriteToggled.emit(station);
  }

  isFavorite(station: RadioStation): boolean {
    return this.favorites.some(
      fav => fav.stationuuid === station.stationuuid
    );
  }

  selectStation(station: RadioStation): void {
    this.stationSelected.emit(station);
  }

  clearAll(): void {
    if (confirm('¿Estás seguro de que quieres eliminar todos los favoritos?')) {
      this.favorites = [];
      this.saveFavorites();
      this.showNotification('🗑️ Favoritos eliminados');
    }
  }

  private saveFavorites(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.favorites));
    } catch (error) {
      console.error('Error guardando favoritos:', error);
    }
  }

  private loadFavorites(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.favorites = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error cargando favoritos:', error);
      this.favorites = [];
    }
  }

  private showNotification(message: string): void {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.className = 'favorite-notification';
    notification.textContent = message;
    document.body.appendChild(notification);

    // Animar entrada
    setTimeout(() => notification.classList.add('show'), 10);

    // Remover después de 2 segundos
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  exportFavorites(): void {
    const dataStr = JSON.stringify(this.favorites, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mis-radios-favoritas.json';
    link.click();
    URL.revokeObjectURL(url);
    this.showNotification('📥 Favoritos exportados');
  }

  // ✅ CORREGIDO: Ahora hace merge en vez de reemplazar completamente
  importFavorites(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target?.result as string);
          if (Array.isArray(imported)) {
            // ✅ Hacer merge: agregar solo las radios que no existen
            let addedCount = 0;
            imported.forEach(station => {
              if (!this.isFavorite(station)) {
                this.favorites.push(station);
                addedCount++;
              }
            });

            this.saveFavorites();

            if (addedCount > 0) {
              this.showNotification(`📤 ${addedCount} favorito(s) importado(s)`);
            } else {
              this.showNotification('ℹ️ No hay nuevos favoritos para importar');
            }
          } else {
            alert('Formato de archivo inválido');
          }
        } catch (error) {
          alert('Error al importar el archivo');
        }
        // ✅ Limpiar el input para permitir reimportar el mismo archivo
        input.value = '';
      };
      reader.readAsText(file);
    }
  }
}
