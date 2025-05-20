import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ImageOverlayComponent } from './image-overlay/image-overlay.component';

const routes: Routes = [
  {
    path: ':model/:ip/:community',  // Ruta con los parámetros model, ip y community
    component: ImageOverlayComponent
  },
  // otras rutas aquí...
  { path: '', redirectTo: 'cisco_2960/10.241.59.17/public', pathMatch: 'full' } // Ruta por defecto
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
