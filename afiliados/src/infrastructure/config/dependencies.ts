import { MongooseEmpresaRepository } from '../database/repositories/MongooseEmpresaRepository.js';
import { MongooseRestauranteRepository } from '../database/repositories/MongooseRestauranteRepository.js';
import { MongooseClienteRepository } from '../database/repositories/MongooseClienteRepository.js';
import { KafkaEventPublisher } from '../messaging/KafkaEventPublisher.js';

import { RegisterEmpresa } from '../../application/use-cases/RegisterEmpresa.js';
import { UniversalLogin } from '../../application/use-cases/UniversalLogin.js';
import { ChangePassword } from '../../application/use-cases/ChangePassword.js';
import { ManageRestaurante } from '../../application/use-cases/ManageRestaurante.js';
import { ManageCliente } from '../../application/use-cases/ManageCliente.js';
import { ManagePrograma } from '../../application/use-cases/ManagePrograma.js';
import { RegisterVenta } from '../../application/use-cases/RegisterVenta.js';

export const empresaRepo = new MongooseEmpresaRepository();
export const restauranteRepo = new MongooseRestauranteRepository();
export const clienteRepo = new MongooseClienteRepository();
const eventPublisher = new KafkaEventPublisher();

export const registerEmpresaUseCase = new RegisterEmpresa(empresaRepo, restauranteRepo, clienteRepo);
export const universalLoginUseCase = new UniversalLogin(empresaRepo, restauranteRepo, clienteRepo);
export const changePasswordUseCase = new ChangePassword(empresaRepo, restauranteRepo, clienteRepo);
export const manageRestauranteUseCase = new ManageRestaurante(restauranteRepo, empresaRepo);
export const manageClienteUseCase = new ManageCliente(clienteRepo, empresaRepo);
export const manageProgramaUseCase = new ManagePrograma(empresaRepo);
export const registerVentaUseCase = new RegisterVenta(clienteRepo, eventPublisher);
