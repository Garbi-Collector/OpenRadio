import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MapComponent } from './components/map/map.component';
import { RadioPlayerComponent } from './components/radio-player/radio-player.component';
import { RadioStation } from './models/radio-browser.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, MapComponent, RadioPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  @ViewChild(MapComponent) mapComponent!: MapComponent;

  selectedStation: RadioStation | null = null;

  onStationSelected(station: RadioStation): void {
    this.selectedStation = station;
  }

  onRandomRequested(): void {
    if (this.mapComponent) {
      const randomStation = this.mapComponent.getRandomStation();
      if (randomStation) {
        this.selectedStation = randomStation;
      }
    }
  }
}
