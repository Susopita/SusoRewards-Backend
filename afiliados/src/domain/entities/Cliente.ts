export interface Cliente {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  tarjetaCliente: string;
  empresasAfiliadas: string[];
  active: boolean;
}
