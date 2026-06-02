export interface Restaurante {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  empresasId: string[];
  code: string;
  active: boolean;
}
