import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { SnmpService } from 'src/services/snmp.service';

@Component({
  selector: 'app-image-overlay',
  templateUrl: './image-overlay.component.html',
  styleUrls: ['./image-overlay.component.css']
})
export class ImageOverlayComponent implements OnInit {
  imageSrc: string = '';
  ports: { id: number, x: number, y: number, color: string, name?: string, description?: string, adminState?: number, opState?: number }[] = [];
  imageLoaded = false;
  tooltipData: any[] = [];
  selectedColor: string = 'red';

  tooltipText: string = '';
  selectedPort: { id: number, x: number, y: number, color: string, adminState?: number, opState?: number, name?: string, description?: string } | null = null;

  model: string = '';    
  ip: string = '';       
  community: string = ''; 
  oidList: any[]=[]

  @ViewChild('backgroundImage', { static: false }) backgroundImage!: ElementRef<HTMLImageElement>;
  showModal: boolean = false;
newStateText: string = "";
pendingPort: any = null;

openConfirmationModal(port: any) {
  this.pendingPort = port;
  this.newStateText = port.adminState === 1 ? 'Down' : 'Up';
  this.showModal = true;
}

closeModal() {
  this.showModal = false;
  this.pendingPort = null;
}

confirmChange() {
  if (this.pendingPort) {
    this.toggleAdminState(this.pendingPort);
  }
  this.closeModal();
}


  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private snmpService: SnmpService
  ) {}

  ngOnInit() {
    this.route.params.subscribe(params => {
      this.model = params['model'];
      this.ip = params['ip'];
      this.community = params['community'];
      this.loadJson();
    });
  }

  loadJson() {
    if (!this.model) {
      console.error('El modelo no está especificado en la ruta.');
      return;
    }

    this.http.get<any>(`assets/${this.model}.json`).subscribe(
      (jsonData) => {
        this.imageSrc = jsonData.image;
        this.ports = jsonData.ports.map((port: any) => ({
          ...port,
          color: 'grey', 
          adminState: undefined,
          opState: undefined,
          description: ''
        }));

        this.fetchSnmpData();
      },
      (error) => {
        console.error('Error cargando el JSON:', error);
      }
    );
  }
  

  fetchSnmpData() {
    this.oidList = [
      { oid: "1.3.6.1.2.1.2.2.1.2", type: 'name' },       // Nombre del puerto
      { oid: "1.3.6.1.2.1.2.2.1.7", type: 'admin' },      // Estado administrativo
      { oid: "1.3.6.1.2.1.2.2.1.8", type: 'op' },         // Estado operativo
      { oid: "1.3.6.1.2.1.31.1.1.1.18", type: 'description' } // Descripción del puerto
    ];

    this.oidList.forEach(({ oid, type }) => {
      this.snmpService.walkSnmp(this.ip, oid, this.community).subscribe(
        (snmpData) => {
          this.processSnmpData(snmpData, type);
        },
        (error) => {
          console.error(`Error obteniendo datos SNMP para OID ${oid}:`, error);
        }
      );
    });
  }

  processSnmpData(snmpData: any[], type: string) {
    snmpData.forEach(entry => {
      if (!entry.oid) return; // Prevenir errores en caso de datos inválidos
  
      const oidParts = entry.oid.split('.');
      const lastNumber = parseInt(oidParts[oidParts.length - 1], 10);
  
      // Buscar si el ID coincide con algún puerto del JSON
      const matchingPort = this.ports.find(port => port.id === lastNumber);
  
      if (matchingPort) {
        // Actualizar valores según el tipo de OID
        if (type === 'admin') {
          matchingPort.adminState = Number(entry.value);  // Aseguramos que sea un número
        } else if (type === 'op') {
          matchingPort.opState = Number(entry.value);  // Aseguramos que sea un número
        } else if (type === 'name') {
          matchingPort.name = entry.value;
        } else if (type === 'description') {
          matchingPort.description = entry.value;
        }
  
        // Asignar color después de recibir ambos estados
        if (matchingPort.adminState !== undefined && matchingPort.opState !== undefined) {
          matchingPort.color = this.getPortColor(matchingPort.adminState, matchingPort.opState);
        }
      } else {
        // Si no existe el puerto en la lista, agregarlo al tooltipData
        let existingTooltipEntry = this.tooltipData.find(data => data.id === lastNumber);
        if (!existingTooltipEntry) {
          // Si no existe, lo agregamos
          this.tooltipData.push({
            id: lastNumber,
            name: type === "name" ? entry.value : "Desconocido",  // Asignar nombre si es "name"
            description: type === "description" ? entry.value : "Sin descripción",  // Asignar descripción si es "description"
            adminState: type === "admin" ? Number(entry.value) : undefined,  // Asignar adminState
            opState: type === "op" ? Number(entry.value) : undefined  // Asignar opState
          });
        } else {
          // Si ya existe, solo actualizamos los valores
          if (type === "admin") {
            existingTooltipEntry.adminState = Number(entry.value);  // Actualizamos adminState
          }
          if (type === "op") {
            existingTooltipEntry.opState = Number(entry.value);  // Actualizamos opState
          }
          if (type === "description") {
            existingTooltipEntry.description = entry.value;  // Actualizamos description
          }
        }
      }
    });
  
    // Después de procesar todos los datos, actualizamos la tabla
    this.updateTooltipTable();  // Actualizamos la tabla con los nuevos datos
  }
  toggleAdminState(port: any) {
    if (!port) return;
  
    // Cambiar el estado del puerto entre Up (1) y Down (2)
    const newState = port.adminState === 1 ? 2 : 1; // Si está Up (1), cambiar a Down (2) y viceversa
    this.changeAdminState(port, newState);
  }
  
  

  updateTooltipTable() {
    this.tooltipData = this.tooltipData.map(entry => {
      // Determinar el estado del puerto según el estado administrativo y operativo
      let state = '';
      if (entry.adminState === 2) {
        state = 'admin down';
      } else if (entry.adminState === 1) {
        if (entry.opState === 2) {
          state = 'down';
        } else if (entry.opState === 1) {
          state = 'up';
        }
      }
      return {
        ...entry,
        state: state
      };
    });
// Filtrar los puertos cuyo nombre no sea 'Null0' ni 'Desconocido'
this.tooltipData = this.tooltipData
  .filter((entry: { name: string }) => entry.name !== 'Null0' && entry.name !== 'Desconocido');
  }

  // Función para verificar si el puerto está presente en los datos SNMP
  isPortInSnmp(id: number): boolean {
    return this.ports.some(port => port.id === id && port.name);
  }

  getPortColor(adminState?: number, opState?: number): string {
    if (adminState === 2) {
      return 'rgba(255, 255, 0, 0.5)'; 
    } else if (opState === 1) {
      return 'rgba(0, 255, 0, 0.5)';
    } else {
      return 'rgba(255, 0, 0, 0.5)';
    }
  }

  onImageLoad() {
    this.imageLoaded = true;
  }

  getRelativePosition(port: { x: number; y: number }) {
    if (!this.imageLoaded || !this.backgroundImage?.nativeElement) return { left: 0, top: 0 };

    const img = this.backgroundImage.nativeElement;
    return {
      left: (port.x / img.width) * 100,
      top: (port.y / img.height) * 100
    };
  }

  showTooltip(portId: number) {
    this.selectedPort = this.ports.find(p => p.id === portId) || null;

    if (this.selectedPort) {
      const portName = this.selectedPort.name || "Desconocido";
      const portDescription = this.selectedPort.description || "Sin descripción";
      this.tooltipText = `Puerto ${portName}<br>Descripción: ${portDescription}`;
    }
  }
  

  changeAdminState(port: any, newState: number) {
    if (!port) return;
   const oidPort  = this.oidList[1].oid + "." +port.id;
   console.log(oidPort);

    this.snmpService.setSnmp(this.ip, oidPort, newState, "Integer").subscribe(
      (response: any) => {
        console.log('Estado actualizado en el backend:', response);
        this.fetchSnmpData(); // Refrescar datos después de la actualización
      },
      (error: any) => {
        console.error('Error al actualizar el estado:', error);
      }
    );
    

   // POLO: Quitar esto cuando se descomene la funcion de arriba. 
   this.fetchSnmpData();
  }
  
  
  
  
}
