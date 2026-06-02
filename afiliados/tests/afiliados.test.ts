import { describe, it, expect, beforeEach, vi } from 'vitest';
import { buildServer } from '../src/infrastructure/web/server.js';
import {
  InMemoryEmpresaRepository,
  InMemoryRestauranteRepository,
  InMemoryClienteRepository,
  MockEventPublisher
} from './mocks.js';
import { RegisterEmpresa } from '../src/application/use-cases/RegisterEmpresa.js';
import { UniversalLogin } from '../src/application/use-cases/UniversalLogin.js';
import { ChangePassword } from '../src/application/use-cases/ChangePassword.js';
import { ManageRestaurante } from '../src/application/use-cases/ManageRestaurante.js';
import { ManageCliente } from '../src/application/use-cases/ManageCliente.js';
import { ManagePrograma } from '../src/application/use-cases/ManagePrograma.js';
import { RegisterVenta } from '../src/application/use-cases/RegisterVenta.js';
import { generateToken } from '../src/infrastructure/utils/session.js';
import { hashPassword } from '../src/infrastructure/utils/crypto.js';

// Mock dependencies injection module using getters to avoid referencing uninitialized variables during hoisting
vi.mock('../src/infrastructure/config/dependencies.js', () => {
  return {
    get registerEmpresaUseCase() { return (globalThis as any).__mockInstances?.registerEmpresaUseCase; },
    get universalLoginUseCase() { return (globalThis as any).__mockInstances?.universalLoginUseCase; },
    get changePasswordUseCase() { return (globalThis as any).__mockInstances?.changePasswordUseCase; },
    get manageRestauranteUseCase() { return (globalThis as any).__mockInstances?.manageRestauranteUseCase; },
    get manageClienteUseCase() { return (globalThis as any).__mockInstances?.manageClienteUseCase; },
    get manageProgramaUseCase() { return (globalThis as any).__mockInstances?.manageProgramaUseCase; },
    get registerVentaUseCase() { return (globalThis as any).__mockInstances?.registerVentaUseCase; }
  };
});

// Setup mock repositories and use cases sequentially (not hoisted)
const empresaRepo = new InMemoryEmpresaRepository();
const restauranteRepo = new InMemoryRestauranteRepository();
const clienteRepo = new InMemoryClienteRepository();
const eventPublisher = new MockEventPublisher();

const registerEmpresaUseCase = new RegisterEmpresa(empresaRepo, restauranteRepo, clienteRepo);
const universalLoginUseCase = new UniversalLogin(empresaRepo, restauranteRepo, clienteRepo);
const changePasswordUseCase = new ChangePassword(empresaRepo, restauranteRepo, clienteRepo);
const manageRestauranteUseCase = new ManageRestaurante(restauranteRepo, empresaRepo);
const manageClienteUseCase = new ManageCliente(clienteRepo, empresaRepo);
const manageProgramaUseCase = new ManagePrograma(empresaRepo);
const registerVentaUseCase = new RegisterVenta(clienteRepo, eventPublisher);

// Attach the instances to globalThis so the getters can retrieve them
(globalThis as any).__mockInstances = {
  empresaRepo,
  restauranteRepo,
  clienteRepo,
  eventPublisher,
  registerEmpresaUseCase,
  universalLoginUseCase,
  changePasswordUseCase,
  manageRestauranteUseCase,
  manageClienteUseCase,
  manageProgramaUseCase,
  registerVentaUseCase
};

describe('SusoRewards Afiliados API & Use Cases', () => {
  const server = buildServer();

  beforeEach(() => {
    empresaRepo.empresas = [];
    restauranteRepo.restaurantes = [];
    clienteRepo.clientes = [];
    eventPublisher.publishedEvents = [];
  });

  describe('Fábrica del Servidor & Health', () => {
    it('debería retornar OK en /health', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/health'
      });
      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        status: 'OK',
        service: 'afiliados'
      });
    });
  });

  describe('Registro de Empresas', () => {
    it('debería registrar una empresa exitosamente si los datos son correctos', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/empresas/registrar',
        payload: {
          name: 'Empresa Alfa',
          email: 'alfa@empresa.com',
          password: 'password123'
        }
      });
      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.body);
      expect(data.id).toBeDefined();
      expect(data.name).toBe('Empresa Alfa');
      expect(data.email).toBe('alfa@empresa.com');
    });

    it('debería fallar si faltan campos obligatorios', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/empresas/registrar',
        payload: {
          name: 'Empresa Incompleta'
        }
      });
      expect(response.statusCode).toBe(400);
    });

    it('debería fallar si el email ya está registrado', async () => {
      await registerEmpresaUseCase.execute({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        password: '123'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/empresas/registrar',
        payload: {
          name: 'Alfa Duplicada',
          email: 'alfa@empresa.com',
          password: 'password123'
        }
      });
      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body).error).toBe('El correo ya está registrado');
    });
  });

  describe('Login Universal', () => {
    it('debería loguear a una Empresa', async () => {
      const password = 'my-password';
      const email = 'alfa@empresa.com';
      await registerEmpresaUseCase.execute({ name: 'Alfa', email, password });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.role).toBe('empresa');
      expect(data.token).toBeDefined();
    });

    it('debería loguear a un Restaurante', async () => {
      const emp = await empresaRepo.create({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        passwordHash: 'hash',
        active: true,
        programas: []
      });

      const restPass = 'rest123';
      await manageRestauranteUseCase.create(emp.id!, {
        name: 'Restaurante Test',
        email: 'rest@alfa.com',
        password: restPass,
        code: 'REST-01'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'rest@alfa.com', password: restPass }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.role).toBe('restaurante');
      expect(data.user.code).toBe('REST-01');
    });

    it('debería loguear a un Cliente', async () => {
      const emp = await empresaRepo.create({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        passwordHash: 'hash',
        active: true,
        programas: []
      });

      const cliPass = 'cli123';
      await manageClienteUseCase.affiliateOrCreate(emp.id!, {
        name: 'Cliente Juan',
        email: 'juan@cliente.com',
        password: cliPass,
        tarjetaCliente: 'CARD-999'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'juan@cliente.com', password: cliPass }
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.body);
      expect(data.role).toBe('cliente');
      expect(data.user.tarjetaCliente).toBe('CARD-999');
    });

    it('debería rechazar si la contraseña es incorrecta', async () => {
      await registerEmpresaUseCase.execute({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        password: 'correct'
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'alfa@empresa.com', password: 'wrong' }
      });

      expect(response.statusCode).toBe(401);
    });

    it('debería rechazar si la cuenta está deshabilitada', async () => {
      const emp = await empresaRepo.create({
        name: 'Alfa Inactiva',
        email: 'alfa@empresa.com',
        passwordHash: hashPassword('123'),
        active: false,
        programas: []
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'alfa@empresa.com', password: '123' }
      });
      expect(response.statusCode).toBe(401);
    });
  });

  describe('Cambio de Contraseña (Temporal y Normal)', () => {
    it('debería cambiar contraseña temporal sin requerir actual si passwordHash == emailHash', async () => {
      // Registrar restaurante con contraseña por defecto (su correo)
      const emp = await empresaRepo.create({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        passwordHash: 'hash',
        active: true,
        programas: []
      });

      const rest = await manageRestauranteUseCase.create(emp.id!, {
        name: 'Rest Temporal',
        email: 'temp@rest.com',
        code: 'REST-TEMP' // por defecto password es temp@rest.com
      });

      const response = await server.inject({
        method: 'POST',
        url: '/auth/cambio-password',
        payload: {
          email: 'temp@rest.com',
          newPassword: 'securePassword123'
        }
      });

      expect(response.statusCode).toBe(200);
      
      // Probar login con la nueva contraseña
      const loginRes = await server.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email: 'temp@rest.com', password: 'securePassword123' }
      });
      expect(loginRes.statusCode).toBe(200);
    });

    it('debería requerir contraseña actual si no es temporal', async () => {
      await registerEmpresaUseCase.execute({
        name: 'Alfa',
        email: 'alfa@empresa.com',
        password: 'securePassword123' // no temporal
      });

      // Intentar cambiar sin la contraseña actual
      const response = await server.inject({
        method: 'POST',
        url: '/auth/cambio-password',
        payload: {
          email: 'alfa@empresa.com',
          newPassword: 'brandNewPassword'
        }
      });
      expect(response.statusCode).toBe(400);

      // Intentar cambiar con contraseña actual incorrecta
      const response2 = await server.inject({
        method: 'POST',
        url: '/auth/cambio-password',
        payload: {
          email: 'alfa@empresa.com',
          currentPassword: 'wrongCurrentPassword',
          newPassword: 'brandNewPassword'
        }
      });
      expect(response2.statusCode).toBe(400);

      // Cambiar con contraseña actual correcta
      const response3 = await server.inject({
        method: 'POST',
        url: '/auth/cambio-password',
        payload: {
          email: 'alfa@empresa.com',
          currentPassword: 'securePassword123',
          newPassword: 'brandNewPassword'
        }
      });
      expect(response3.statusCode).toBe(200);
    });
  });

  describe('Gestión de Empresas (CRUD de programas, Restaurantes y Clientes)', () => {
    let token: string;
    let empId: string;

    beforeEach(async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'admin@empresa.com',
        passwordHash: 'hash',
        active: true,
        programas: []
      });
      empId = emp.id!;
      token = generateToken({ id: empId, email: emp.email, role: 'empresa' });
    });

    it('debería denegar acceso si el token falta o es inválido', async () => {
      const res = await server.inject({
        method: 'POST',
        url: '/restaurantes',
        payload: {}
      });
      expect(res.statusCode).toBe(401);
    });

    it('debería denegar acceso si el rol no es empresa', async () => {
      const cliToken = generateToken({ id: '123', email: 'cli@test.com', role: 'cliente' });
      const res = await server.inject({
        method: 'POST',
        url: '/restaurantes',
        headers: { authorization: `Bearer ${cliToken}` },
        payload: {}
      });
      expect(res.statusCode).toBe(403);
    });

    it('debería realizar CRUD completo de Programas de Recompensas', async () => {
      // 1. Crear Programa
      const createRes = await server.inject({
        method: 'POST',
        url: '/programas',
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Puntos Platino', pointsRule: 10 }
      });
      expect(createRes.statusCode).toBe(201);
      const prog = JSON.parse(createRes.body);
      expect(prog.name).toBe('Puntos Platino');

      // 2. Obtener Programas
      const listRes = await server.inject({
        method: 'GET',
        url: '/programas',
        headers: { authorization: `Bearer ${token}` }
      });
      expect(listRes.statusCode).toBe(200);
      const list = JSON.parse(listRes.body);
      expect(list.length).toBe(1);

      // 3. Actualizar Programa
      const updateRes = await server.inject({
        method: 'PUT',
        url: `/programas/${prog.id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { name: 'Puntos Oro', pointsRule: 5, active: false }
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.body);
      expect(updated.name).toBe('Puntos Oro');
      expect(updated.active).toBe(false);

      // 4. Eliminar Programa
      const deleteRes = await server.inject({
        method: 'DELETE',
        url: `/programas/${prog.id}`,
        headers: { authorization: `Bearer ${token}` }
      });
      expect(deleteRes.statusCode).toBe(200);
    });

    it('debería afiliar, listar, deshabilitar y desvincular Restaurantes', async () => {
      // 1. Registrar Restaurante
      const registerRes = await server.inject({
        method: 'POST',
        url: '/restaurantes',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'Pizzería Test',
          email: 'pizza@empresa.com',
          code: 'PIZZA-01'
        }
      });
      expect(registerRes.statusCode).toBe(201);
      const rest = JSON.parse(registerRes.body);
      expect(rest.code).toBe('PIZZA-01');

      // 2. Listar Restaurantes
      const listRes = await server.inject({
        method: 'GET',
        url: '/restaurantes',
        headers: { authorization: `Bearer ${token}` }
      });
      expect(listRes.statusCode).toBe(200);
      expect(JSON.parse(listRes.body).length).toBe(1);

      // 3. Cambiar Estado (Deshabilitar)
      const patchRes = await server.inject({
        method: 'PATCH',
        url: `/restaurantes/${rest.id}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { active: false }
      });
      expect(patchRes.statusCode).toBe(200);
      expect(JSON.parse(patchRes.body).active).toBe(false);

      // 4. Desvincular Restaurante
      const deleteRes = await server.inject({
        method: 'DELETE',
        url: `/restaurantes/${rest.id}`,
        headers: { authorization: `Bearer ${token}` }
      });
      expect(deleteRes.statusCode).toBe(200);
    });

    it('debería afiliar, listar, deshabilitar y desvincular Clientes', async () => {
      // 1. Registrar/Afiliar Cliente
      const registerRes = await server.inject({
        method: 'POST',
        url: '/clientes',
        headers: { authorization: `Bearer ${token}` },
        payload: {
          name: 'Cliente Test',
          email: 'cliente@test.com',
          tarjetaCliente: 'CARD-777'
        }
      });
      expect(registerRes.statusCode).toBe(201);
      const client = JSON.parse(registerRes.body);
      expect(client.tarjetaCliente).toBe('CARD-777');

      // 2. Listar Clientes
      const listRes = await server.inject({
        method: 'GET',
        url: '/clientes',
        headers: { authorization: `Bearer ${token}` }
      });
      expect(listRes.statusCode).toBe(200);
      expect(JSON.parse(listRes.body).length).toBe(1);

      // 3. Cambiar Estado
      const patchRes = await server.inject({
        method: 'PATCH',
        url: `/clientes/${client.id}/status`,
        headers: { authorization: `Bearer ${token}` },
        payload: { active: false }
      });
      expect(patchRes.statusCode).toBe(200);
      expect(JSON.parse(patchRes.body).active).toBe(false);

      // 4. Desvincular Cliente
      const deleteRes = await server.inject({
        method: 'DELETE',
        url: `/clientes/${client.id}`,
        headers: { authorization: `Bearer ${token}` }
      });
      expect(deleteRes.statusCode).toBe(200);
    });
  });

  describe('Registro de Ventas y Publicación a Kafka', () => {
    it('debería registrar venta y publicar evento exitosamente si el cliente existe y está activo', async () => {
      // Registrar cliente
      const client = await clienteRepo.create({
        name: 'Juan Vendedor',
        email: 'juanv@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD-SALE-01',
        empresasAfiliadas: ['empresa-abc'],
        active: true
      });

      // Crear token de restaurante
      const restToken = generateToken({
        id: 'rest-123',
        email: 'pizzeria@test.com',
        role: 'restaurante',
        code: 'PIZZ-SALE-01',
        empresasId: ['empresa-abc']
      });

      const response = await server.inject({
        method: 'POST',
        url: '/ventas',
        headers: { authorization: `Bearer ${restToken}` },
        payload: {
          monto: 150.50,
          tarjeta_cliente: 'CARD-SALE-01'
        }
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.codigo_restaurante).toBe('PIZZ-SALE-01');
      expect(body.data.monto).toBe(150.50);

      // Validar evento publicado
      expect(eventPublisher.publishedEvents.length).toBe(1);
      expect(eventPublisher.publishedEvents[0].monto).toBe(150.50);
      expect(eventPublisher.publishedEvents[0].codigo_restaurante).toBe('PIZZ-SALE-01');
    });

    it('debería rechazar si el cliente no existe', async () => {
      const restToken = generateToken({
        id: 'rest-123',
        email: 'pizzeria@test.com',
        role: 'restaurante',
        code: 'PIZZ-SALE-01',
        empresasId: ['empresa-abc']
      });

      const response = await server.inject({
        method: 'POST',
        url: '/ventas',
        headers: { authorization: `Bearer ${restToken}` },
        payload: {
          monto: 150.50,
          tarjeta_cliente: 'CARD-NONEXISTENT'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    it('debería rechazar si el cliente está inactivo', async () => {
      await clienteRepo.create({
        name: 'Juan Vendedor Inactivo',
        email: 'juanv2@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD-SALE-02',
        empresasAfiliadas: ['empresa-abc'],
        active: false
      });

      const restToken = generateToken({
        id: 'rest-123',
        email: 'pizzeria@test.com',
        role: 'restaurante',
        code: 'PIZZ-SALE-01',
        empresasId: ['empresa-abc']
      });

      const response = await server.inject({
        method: 'POST',
        url: '/ventas',
        headers: { authorization: `Bearer ${restToken}` },
        payload: {
          monto: 150.50,
          tarjeta_cliente: 'CARD-SALE-02'
        }
      });

      expect(response.statusCode).toBe(400);
    });
  });
});
