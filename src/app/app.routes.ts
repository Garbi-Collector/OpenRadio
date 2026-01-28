import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    children: []
  },
  {
    path: 'radio/:stationuuid',
    children: []
  },
  {
    path: '**',
    redirectTo: ''
  }
];
