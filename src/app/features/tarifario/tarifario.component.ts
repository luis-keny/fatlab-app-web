import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, Renderer2, ViewChild } from '@angular/core';

import { DatosPedidoComponent } from "./components/datos-pedido/datos-pedido.component";
import { DatosConsiderarComponent } from './components/datos-considerar/datos-considerar.component';
import { ResultadoCalculadoraComponent } from "./components/resultado-calculadora/resultado-calculadora.component";
import { CustomSelectComponent } from '@shared/components/custom-select/custom-select.component';

import { SelectItem } from '@core/index.model.system';
import { DatoCalculadora, DatoConsiderado, DatoPedido, Insumo, Maquina } from '@core/index.data.model';
import { InventarioService, MaquinaService } from '@core/index.service.http';
import { NotificationService } from '@core/index.service.trigger';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-tarifario',
  templateUrl: './tarifario.component.html',
  styleUrl: './tarifario.component.css',
  standalone: true,
  imports: [
    CustomSelectComponent,
    DatosPedidoComponent,
    DatosConsiderarComponent,
    ResultadoCalculadoraComponent,
    ResultadoCalculadoraComponent,
  ],
})
export class TarifarioComponent implements OnInit,AfterViewInit, OnDestroy {
  @ViewChild('Calculadora__header') calculadoraHeaderElement!: ElementRef<any>;
  @ViewChild('Calculadora__body') calculadoraBodyElement!: ElementRef<any>;

  public unidadMedida: string = 'g';

  public categoriasMaquina: SelectItem[] = [
    { value: 1, viewValue: 'Impresiones 3D' },
    { value: 2, viewValue: 'Papelería / Ploteo' },
    { value: 3, viewValue: 'Laser 3D' },
    { value: 4, viewValue: 'Escaneo 3D' },
  ];

  public maquinasSelected: SelectItem[] = [];
  public insumosSelected: SelectItem[] = [];

  public maquinas: Maquina[] = [];
  public insumos: Insumo[] = [];
  public categoriaInsumoMaquina: string = "";
  
  public categoriaMaquinaSelected: SelectItem = this.categoriasMaquina[0];
  public maquinaSeleccionada: SelectItem | undefined;
  public insumoSelected: SelectItem | undefined;
  public roleSelect: SelectItem | undefined;

  public datosConsiderado: DatoConsiderado = this.initializateConsiderar();
  public calculadora: DatoCalculadora = this.initializateCalculadora();
  public datosPedido: DatoPedido = this.initializatePedido();

  private maquinaSub = new Subscription();
  private inventarioSub = new Subscription();

  constructor(
    private render: Renderer2,
    private inventarioSrv: InventarioService,
    private maquinaSrv: MaquinaService,
    private notificationSrv: NotificationService,
  ){ }

  ngOnInit(): void {
    this.maquinaSub = this.maquinaSrv.getAllMaquinas().subscribe({
      next: (maquinas) => {
        this.maquinas = maquinas;
        this.maquinasSelected = [];
        this.realizarCalculo(this.datosPedido);
        for(let maquina of maquinas) {
          const { id, nombre } = maquina;
          this.maquinasSelected.push({ value: id, viewValue: nombre })
        }
      },
      error: () => {
        this.notificationSrv.addNotification("error","Error al obtener datos");
      }
    });
  }

  ngAfterViewInit(): void {
    if(!this.calculadoraHeaderElement && !this.calculadoraBodyElement) return;

    const elem = this.calculadoraBodyElement.nativeElement;
    const height = this.calculadoraHeaderElement.nativeElement.clientHeight;
    
    const heightWindow = '100vh';
    const gap = '32px';
    const paddingY = '40px';

    this.render.setStyle(elem, 'height', `calc(${heightWindow} - ${height}px - ${gap} - ${paddingY})`);
  }

  ngOnDestroy(): void {
    if(this.maquinaSub) this.maquinaSub.unsubscribe();
    if(this.inventarioSub) this.inventarioSub.unsubscribe();
  }

  private initializateCalculadora(): DatoCalculadora {
    return {
      costoMateriales: 0,
      costoAmortizacion: 0,
      costoGanancia: 0,
      costoOperario: 0,
      costoFallo: 0,
      costoIgv: 0,
      costoTotal: 0,
    };
  }

  private initializatePedido(): DatoPedido {
     return {
      cantidadUsada: 0,
      tiempoImpresion: 0,
      porcentajeGanancia: 0,
      porcentajeTasaFallo: 0,
      costoOperador: 0,
      usarIgv: false,
    };
  }

  private initializateConsiderar(): DatoConsiderado {
    return {
      porcentajeDesperdicioMaquina: 0,
      costoInsumo: 0,
      costoPorHoraElectricidad: 0,
      costoAmortizuacionPorHora: 0,
    }
  }

  public filstrarInsumoPorMaquina(){
    if(this.maquinaSeleccionada === undefined) return;
    const { value } = this.maquinaSeleccionada;
    const maquina = this.maquinas.filter(m => m.id == value)[0];
    
    if(!maquina.categoriaInsumo) {
      this.notificationSrv.addNotification('error', 'No existe un categoria de insumo')
      return;
    } else {
      this.notificationSrv.addNotification('success', 'Categoria de insumo encontrada')
    }

    if(!maquina.categoriaMaquina.maquina3D) {
      this.notificationSrv.addNotification('warning', 'No existe configuracion de maquina 3d');
      return;
    }

    const { id, nombre } = maquina.categoriaInsumo;
    const { costeLuzPorHora, porcentajeDesperdicio } = maquina.categoriaMaquina.maquina3D;
    this.categoriaInsumoMaquina = nombre;
    this.datosConsiderado.porcentajeDesperdicioMaquina = porcentajeDesperdicio;
    this.datosConsiderado.costoPorHoraElectricidad = costeLuzPorHora;
    this.datosConsiderado.costoAmortizuacionPorHora = maquina.costeAmortizacion;

    this.inventarioSub = this.inventarioSrv.getAllInsumoByIdCategoria(id).subscribe({
      next: insumos => {
        this.realizarCalculo(this.datosPedido);
        this.insumos = insumos;
        this.insumosSelected = [];
        for(let insumo of insumos) {
          const { id, nombre } = insumo;
          this.insumosSelected.push({ value: id, viewValue: nombre });
        }
      }
    })
  }

  public definirVariablesDePresupuesto(){
    if(!this.insumoSelected) return;
    this.realizarCalculo(this.datosPedido);
    const { value } = this.insumoSelected;
    const insumo = this.insumos.filter(i => i.id == value)[0];
    this.unidadMedida = insumo.unidadMedida;
    this.datosConsiderado.costoInsumo = insumo.precioUnitario;

  }

  public realizarCalculo(pedido: DatoPedido): void {
    const { usarIgv } = pedido;
    const { amortizacion, ganancia, materiales, operario, tasaFallo } = this.calcularPrecioPedido(pedido);

    if(usarIgv) {
      this.calculadora.costoIgv = (amortizacion + tasaFallo + ganancia + materiales + operario) * 0.18;
    } else {
      this.calculadora.costoIgv = 0;
    }

    const total = amortizacion + tasaFallo + ganancia + this.calculadora.costoIgv + materiales + operario;

    this.calculadora.costoAmortizacion = amortizacion;
    this.calculadora.costoFallo = tasaFallo;
    this.calculadora.costoGanancia = ganancia;
    this.calculadora.costoMateriales = materiales;
    this.calculadora.costoOperario = operario;
    this.calculadora.costoTotal = total;
  }

  private calcularPrecioPedido(pedido: DatoPedido){
    const { cantidadUsada, costoOperador, porcentajeGanancia, porcentajeTasaFallo, tiempoImpresion } = pedido;
    const { costoAmortizuacionPorHora, costoInsumo, costoPorHoraElectricidad, porcentajeDesperdicioMaquina } = this.datosConsiderado;
  
    const decimalDesperdicioMaquina = porcentajeDesperdicioMaquina / 100;
    const decimalTasaFallo = porcentajeTasaFallo / 100;
    const decimalGanancia = porcentajeGanancia / 100;
    
    const precioDesperdicioInsumo = (cantidadUsada * decimalDesperdicioMaquina) * costoInsumo;
    const precioInsumo = cantidadUsada * costoInsumo;
    const precioElectricidadInsumo = costoPorHoraElectricidad * tiempoImpresion;

    const costoMaterial = precioDesperdicioInsumo + precioInsumo + precioElectricidadInsumo;
    
    let amortizacion = costoAmortizuacionPorHora * tiempoImpresion;
    let tasaFallo = (costoMaterial + costoOperador + amortizacion) * decimalTasaFallo;
    let ganancia = (costoMaterial + costoOperador) * decimalGanancia;
    let materiales = costoMaterial;
    let operario = costoOperador;

    amortizacion = parseFloat(amortizacion.toFixed(2));
    tasaFallo = parseFloat(tasaFallo.toFixed(2));
    ganancia = parseFloat(ganancia.toFixed(2));
    materiales = parseFloat(materiales.toFixed(2));
    operario = parseFloat(operario.toFixed(2));

    return {
      amortizacion,
      tasaFallo,
      ganancia,
      materiales,
      operario,
    };
  }

  public limpiarPedido(){
    this.datosPedido = this.initializatePedido();
    this.datosConsiderado = this.initializateConsiderar();
    this.calculadora = this.initializateCalculadora();
    this.insumos = [];
    this.insumoSelected = undefined;
    this.maquinaSeleccionada = undefined;
    this.roleSelect = undefined;
  }
}
