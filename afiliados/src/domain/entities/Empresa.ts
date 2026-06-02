export interface Programa {
  id: string;
  name: string;
  pointsRule: number; // e.g. X puntos por dolar
  active: boolean;
  beneficios?: string;
  requisitos?: string;
  restaurantes?: string[];
}

export interface Empresa {
  id?: string;
  name: string;
  email: string;
  passwordHash: string;
  active: boolean;
  programas: Programa[];
}
