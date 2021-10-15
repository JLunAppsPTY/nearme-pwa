import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MapPage } from './map';
import { SharedModule } from '../../shared.module';
import { GoogleMapsModule } from '@angular/google-maps';
 
@NgModule({
  declarations: [
    MapPage,
  ],
  imports: [
    SharedModule,
    GoogleMapsModule,
    RouterModule.forChild([
      {
        path: '',
        component: MapPage
      }
    ])
  ]
})
export class MapPageModule {}
