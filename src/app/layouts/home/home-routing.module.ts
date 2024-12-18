import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { HomeComponent } from './home.component';

import { NotFoundComponent } from '@features/not-found/not-found.component';


const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    children: [
      {
        path: 'dashboard',
        loadChildren: () => import('@features/dashboard/dashboard.module').then(m => m.DashboardModule)
      },
      {
        path: 'gestion-insumo',
        loadChildren: () => import('@features/gestion-insumo/gestion-insumo.module').then(m => m.GestionInsumoModule)
      },
      {
        path: 'gestion-maquina',
        loadChildren: () => import('@features/gestion-maquina/gestion-maquina.module').then(m => m.GestionMaquinaModule)
      },
      {
        path: 'pedido',
        loadChildren: () => import('@features/gestion-pedido/gestion-pedido.module').then(m => m.GestionPedidoModule),
      },
      {
        path: 'tarifario',
        loadComponent: () => import('@features/tarifario/tarifario.component').then(c => c.TarifarioComponent),
      },
      {
        path: 'configuracion',
        loadChildren: () => import('@features/configuracion/configuracion.module').then(m => m.ConfiguracionModule),
      },
      {
        path: 'gestion-modelo',
        loadChildren: () => import('@features/gestion-modelo/gestion-modelo.module').then(m => m.GestionModeloModule),
      },
      {
        path: 'not-found',
        component: NotFoundComponent
      },
      {
        path: '',
        redirectTo: 'tarifario',
        pathMatch: 'full'
      },
      {
        path: '**',
        redirectTo: 'not-found',
        pathMatch: 'full'
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class HomeRoutingModule { }
