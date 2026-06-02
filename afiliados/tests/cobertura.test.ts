import { describe, it, expect, beforeEach } from 'vitest';
import {
  InMemoryEmpresaRepository,
  InMemoryRestauranteRepository,
  InMemoryClienteRepository,
} from './mocks.js';
import { ManageCliente } from '../src/application/use-cases/ManageCliente.js';
import { ManagePrograma } from '../src/application/use-cases/ManagePrograma.js';
import { ManageRestaurante } from '../src/application/use-cases/ManageRestaurante.js';
import { UniversalLogin } from '../src/application/use-cases/UniversalLogin.js';
import { verifyToken, generateToken } from '../src/infrastructure/utils/session.js';
import { hashPassword } from '../src/infrastructure/utils/crypto.js';
import { buildServer } from '../src/infrastructure/web/server.js';

describe('Pruebas unitarias de cobertura adicional', () => {
  let empresaRepo: InMemoryEmpresaRepository;
  let restauranteRepo: InMemoryRestauranteRepository;
  let clienteRepo: InMemoryClienteRepository;

  let manageCliente: ManageCliente;
  let managePrograma: ManagePrograma;
  let manageRestaurante: ManageRestaurante;
  let universalLogin: UniversalLogin;

  beforeEach(() => {
    empresaRepo = new InMemoryEmpresaRepository();
    restauranteRepo = new InMemoryRestauranteRepository();
    clienteRepo = new InMemoryClienteRepository();

    manageCliente = new ManageCliente(clienteRepo, empresaRepo);
    managePrograma = new ManagePrograma(empresaRepo);
    manageRestaurante = new ManageRestaurante(restauranteRepo, empresaRepo);
    universalLogin = new UniversalLogin(empresaRepo, restauranteRepo, clienteRepo);
  });

  describe('ManageCliente Use Case', () => {
    it('debería lanzar error si la empresa no existe al afiliar/crear', async () => {
      await expect(
        manageCliente.affiliateOrCreate('nonexistent-emp', {
          name: 'Cliente Test',
          email: 'cli@test.com',
          tarjetaCliente: 'CARD123',
        })
      ).rejects.toThrow('Empresa no encontrada');
    });

    it('debería retornar el cliente si ya está afiliado', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const cli = await clienteRepo.create({
        name: 'Cliente Test',
        email: 'cli@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD123',
        empresasAfiliadas: [emp.id!],
        active: true,
      });

      const res = await manageCliente.affiliateOrCreate(emp.id!, {
        name: 'Cliente Test',
        email: 'cli@test.com',
        tarjetaCliente: 'CARD123',
      });
      expect(res.id).toBe(cli.id);
    });

    it('debería afiliar a un cliente existente si no está afiliado', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const cli = await clienteRepo.create({
        name: 'Cliente Test',
        email: 'cli@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD123',
        empresasAfiliadas: [],
        active: true,
      });

      const res = await manageCliente.affiliateOrCreate(emp.id!, {
        name: 'Cliente Test',
        email: 'cli@test.com',
        tarjetaCliente: 'CARD123',
      });
      expect(res.empresasAfiliadas).toContain(emp.id!);
    });

    it('debería lanzar error si la tarjeta ya está en uso', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      await clienteRepo.create({
        name: 'Cliente 1',
        email: 'cli1@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD-DUP',
        empresasAfiliadas: [],
        active: true,
      });

      await expect(
        manageCliente.affiliateOrCreate(emp.id!, {
          name: 'Cliente 2',
          email: 'cli2@test.com',
          tarjetaCliente: 'CARD-DUP',
        })
      ).rejects.toThrow('El número de tarjeta de cliente ya está en uso');
    });

    it('debería lanzar error al desvincular si el cliente no existe', async () => {
      await expect(
        manageCliente.disaffiliate('emp-id', 'nonexistent-cli')
      ).rejects.toThrow('Cliente no encontrado');
    });

    it('debería lanzar error al cambiar estado si el cliente no existe', async () => {
      await expect(
        manageCliente.toggleStatus('emp-id', 'nonexistent-cli', true)
      ).rejects.toThrow('Cliente no encontrado');
    });

    it('debería lanzar error al cambiar estado si no está afiliado', async () => {
      const cli = await clienteRepo.create({
        name: 'Cliente',
        email: 'cli@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD123',
        empresasAfiliadas: [],
        active: true,
      });
      await expect(
        manageCliente.toggleStatus('emp-id', cli.id!, true)
      ).rejects.toThrow('No autorizado para modificar este cliente');
    });

    it('debería cambiar el estado toggling cuando no se provee parámetro active', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const cli = await clienteRepo.create({
        name: 'Cliente',
        email: 'cli@test.com',
        passwordHash: 'hash',
        tarjetaCliente: 'CARD123',
        empresasAfiliadas: [emp.id!],
        active: true,
      });
      const res1 = await manageCliente.toggleStatus(emp.id!, cli.id!);
      expect(res1?.active).toBe(false);

      const res2 = await manageCliente.toggleStatus(emp.id!, cli.id!);
      expect(res2?.active).toBe(true);
    });
  });

  describe('ManagePrograma Use Case', () => {
    it('debería lanzar error si la empresa no existe al crear programa', async () => {
      await expect(
        managePrograma.create('nonexistent-emp', { name: 'P1', pointsRule: 1, active: true })
      ).rejects.toThrow('Empresa no encontrada');
    });

    it('debería lanzar error si la empresa no existe al actualizar programa', async () => {
      await expect(
        managePrograma.update('nonexistent-emp', 'p-id', { name: 'P1' })
      ).rejects.toThrow('Empresa no encontrada');
    });

    it('debería retornar null si el programa a actualizar no existe', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const res = await managePrograma.update(emp.id!, 'nonexistent-prog', { name: 'P1' });
      expect(res).toBeNull();
    });

    it('debería mapear correctamente otros programas sin cambiarlos durante update', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [
          { id: 'prog1', name: 'Prog 1', pointsRule: 1, active: true },
          { id: 'prog2', name: 'Prog 2', pointsRule: 2, active: true },
        ],
      });
      const res = await managePrograma.update(emp.id!, 'prog1', { name: 'Prog 1 Mod' });
      expect(res?.name).toBe('Prog 1 Mod');
      const updatedEmp = await empresaRepo.findById(emp.id!);
      const p2 = updatedEmp?.programas.find((p) => p.id === 'prog2');
      expect(p2?.name).toBe('Prog 2');
    });

    it('debería lanzar error si la empresa no existe al eliminar programa', async () => {
      await expect(
        managePrograma.delete('nonexistent-emp', 'prog-id')
      ).rejects.toThrow('Empresa no encontrada');
    });

    it('debería lanzar error si la empresa no existe al obtener programas', async () => {
      await expect(
        managePrograma.get('nonexistent-emp')
      ).rejects.toThrow('Empresa no encontrada');
    });
  });

  describe('ManageRestaurante Use Case', () => {
    it('debería lanzar error si la empresa no existe al crear restaurante', async () => {
      await expect(
        manageRestaurante.create('nonexistent-emp', { name: 'R1', email: 'r1@test.com', code: 'R1' })
      ).rejects.toThrow('Empresa no encontrada');
    });

    it('debería asociar el restaurante existente si el email ya existe', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const emp2 = await empresaRepo.create({
        name: 'Empresa Test 2',
        email: 'emp2@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      await restauranteRepo.create({
        name: 'Rest 1',
        email: 'r1@test.com',
        passwordHash: 'hash',
        empresasId: [emp.id!],
        code: 'R1',
        active: true,
      });

      const res = await manageRestaurante.create(emp2.id!, { name: 'Rest 2', email: 'r1@test.com', code: 'R2' });
      expect(res.empresasId).toContain(emp2.id!);
      expect(res.empresasId).toContain(emp.id!);
    });

    it('debería asociar el restaurante existente si el código ya existe', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa Test',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const emp2 = await empresaRepo.create({
        name: 'Empresa Test 2',
        email: 'emp2@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      await restauranteRepo.create({
        name: 'Rest 1',
        email: 'r1@test.com',
        passwordHash: 'hash',
        empresasId: [emp.id!],
        code: 'R1',
        active: true,
      });

      const res = await manageRestaurante.create(emp2.id!, { name: 'Rest 2', email: 'r2@test.com', code: 'R1' });
      expect(res.empresasId).toContain(emp2.id!);
      expect(res.empresasId).toContain(emp.id!);
    });

    it('debería lanzar error si el restaurante no existe al eliminar', async () => {
      await expect(
        manageRestaurante.delete('emp-id', 'nonexistent-rest')
      ).rejects.toThrow('Restaurante no encontrado');
    });

    it('debería lanzar error si no está autorizado para eliminar', async () => {
      const r = await restauranteRepo.create({
        name: 'Rest 1',
        email: 'r1@test.com',
        passwordHash: 'hash',
        empresasId: ['owner-emp'],
        code: 'R1',
        active: true,
      });
      await expect(
        manageRestaurante.delete('other-emp', r.id!)
      ).rejects.toThrow('No autorizado para modificar este restaurante');
    });

    it('debería lanzar error si el restaurante no existe al cambiar estado', async () => {
      await expect(
        manageRestaurante.toggleStatus('emp-id', 'nonexistent-rest', true)
      ).rejects.toThrow('Restaurante no encontrado');
    });

    it('debería lanzar error si no está autorizado para cambiar estado', async () => {
      const r = await restauranteRepo.create({
        name: 'Rest 1',
        email: 'r1@test.com',
        passwordHash: 'hash',
        empresasId: ['owner-emp'],
        code: 'R1',
        active: true,
      });
      await expect(
        manageRestaurante.toggleStatus('other-emp', r.id!, true)
      ).rejects.toThrow('No autorizado para modificar este restaurante');
    });

    it('debería alternar estado toggling si active es indefinido', async () => {
      const emp = await empresaRepo.create({
        name: 'Empresa',
        email: 'emp@test.com',
        passwordHash: 'hash',
        active: true,
        programas: [],
      });
      const r = await restauranteRepo.create({
        name: 'Rest 1',
        email: 'r1@test.com',
        passwordHash: 'hash',
        empresasId: [emp.id!],
        code: 'R1',
        active: true,
      });
      const res1 = await manageRestaurante.toggleStatus(emp.id!, r.id!);
      expect(res1?.active).toBe(false);

      const res2 = await manageRestaurante.toggleStatus(emp.id!, r.id!);
      expect(res2?.active).toBe(true);
    });
  });

  describe('UniversalLogin Use Case', () => {
    it('debería lanzar error si la empresa está deshabilitada', async () => {
      await empresaRepo.create({
        name: 'Empresa',
        email: 'emp@test.com',
        passwordHash: hashPassword('123'),
        active: false,
        programas: [],
      });
      await expect(
        universalLogin.execute({ email: 'emp@test.com', password: '123' })
      ).rejects.toThrow('La cuenta está deshabilitada');
    });

    it('debería lanzar error si el password de la empresa no coincide', async () => {
      await empresaRepo.create({
        name: 'Empresa',
        email: 'emp@test.com',
        passwordHash: hashPassword('123'),
        active: true,
        programas: [],
      });
      await expect(
        universalLogin.execute({ email: 'emp@test.com', password: 'wrong' })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debería lanzar error si el restaurante está deshabilitado', async () => {
      await restauranteRepo.create({
        name: 'Rest',
        email: 'r@test.com',
        passwordHash: hashPassword('123'),
        empresasId: ['emp-id'],
        code: 'R1',
        active: false,
      });
      await expect(
        universalLogin.execute({ email: 'r@test.com', password: '123' })
      ).rejects.toThrow('La cuenta está deshabilitada');
    });

    it('debería lanzar error si el password del restaurante no coincide', async () => {
      await restauranteRepo.create({
        name: 'Rest',
        email: 'r@test.com',
        passwordHash: hashPassword('123'),
        empresasId: ['emp-id'],
        code: 'R1',
        active: true,
      });
      await expect(
        universalLogin.execute({ email: 'r@test.com', password: 'wrong' })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debería lanzar error si el cliente está deshabilitado', async () => {
      await clienteRepo.create({
        name: 'Cliente',
        email: 'c@test.com',
        passwordHash: hashPassword('123'),
        tarjetaCliente: 'CARD1',
        empresasAfiliadas: [],
        active: false,
      });
      await expect(
        universalLogin.execute({ email: 'c@test.com', password: '123' })
      ).rejects.toThrow('La cuenta está deshabilitada');
    });

    it('debería lanzar error si el password del cliente no coincide', async () => {
      await clienteRepo.create({
        name: 'Cliente',
        email: 'c@test.com',
        passwordHash: hashPassword('123'),
        tarjetaCliente: 'CARD1',
        empresasAfiliadas: [],
        active: true,
      });
      await expect(
        universalLogin.execute({ email: 'c@test.com', password: 'wrong' })
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('debería lanzar error si el email no existe', async () => {
      await expect(
        universalLogin.execute({ email: 'nonexistent@test.com', password: '123' })
      ).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('Session Utils', () => {
    it('debería retornar null en verifyToken si el token es falso o vacío', () => {
      expect(verifyToken('')).toBeNull();
      expect(verifyToken(null as any)).toBeNull();
      expect(verifyToken(undefined as any)).toBeNull();
    });

    it('debería retornar null si el token es inválido', () => {
      expect(verifyToken('invalid-base64-string!')).toBeNull();
      expect(verifyToken(Buffer.from('not-json').toString('base64'))).toBeNull();
    });
  });
});

describe('Rutas API y Middleware Cobertura', () => {
  const server = buildServer();

  it('debería retornar 401 si no hay token de autenticación', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/restaurantes',
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'No autorizado, token ausente' });
  });

  it('debería retornar 401 si el token es inválido', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/restaurantes',
      headers: { authorization: 'Bearer invalid-token' },
    });
    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body)).toEqual({ error: 'Token inválido o expirado' });
  });

  it('debería retornar 403 si el rol no tiene permisos', async () => {
    const token = generateToken({ id: '123', email: 'c@test.com', role: 'cliente' });
    const res = await server.inject({
      method: 'GET',
      url: '/restaurantes',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body)).toEqual({ error: 'Permisos insuficientes' });
  });

  it('debería retornar 400 en login si faltan campos', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email: 'emp@test.com' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('debería retornar 400 en cambio-password si faltan campos', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/auth/cambio-password',
      payload: { email: 'emp@test.com' },
    });
    expect(res.statusCode).toBe(400);
  });
});
