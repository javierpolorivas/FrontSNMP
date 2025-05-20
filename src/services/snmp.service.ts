import { HttpClient, HttpHeaders } from '@angular/common/http';
import { compileNgModule } from '@angular/compiler';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SnmpService {
  private apiUrl = 'http://localhost:3000'; // Cambia esto si tu servidor tiene una URL diferente.

  constructor(private http: HttpClient) {}

  private httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json'
    })
  };

  // Este es el método que falta, para actualizar el estado del puerto
  updatePortAdminState(ip: string, portId: number, newState: number, community: string): Observable<any> {
    const oid = `1.3.6.1.2.1.2.2.1.7.${portId}`; // OID específico para el adminState
  
    // Asegúrate de que this.apiUrl esté correctamente configurado
    const apiUrl = 'http://localhost:3000/snmp';  // o la URL base correcta de tu backend
    
    return this.http.post(`${apiUrl}/set?version=v2`, {
      ip,
      oid,
      value: newState,
      type: 'Integer'
    }, {
      headers: { 'x-snmp-community': community }
    });
  }
  
  

  // Otros métodos del servicio
  walkSnmp(ip: string, oid: string, version: string): Observable<any> {
    const url = `${this.apiUrl}/snmp/walk?ip=${ip}&oid=${oid}&version=${version}`;
    const headers = new HttpHeaders({
      'x-snmp-community': 'public',
      'Content-Type': 'application/json'
    });
    return this.http.get(url, { headers: headers });
  }

  setSnmp(ip: string, oid: string, value: any, type: string): Observable<any> {
    const url = `${this.apiUrl}/snmp/set`;
    const body = {
      ip: ip,
      oid: oid,
      value: value,
      type: type
    };
    console.log(body);
    const headers = new HttpHeaders({
      'x-snmp-community': 'private',
      'Content-Type': 'application/json'
    });
    return this.http.post(url, body, { headers: headers });
  }
}
