# Contexto de Backend: SusoRewards

## Estructura de Carpetas
El backend está unificado en la carpeta `SusoRewards-Backend` y se divide en tres microservicios en sus respectivas carpetas:
- `SusoRewards-Backend/afiliados`
- `SusoRewards-Backend/recompensas`
- `SusoRewards-Backend/notificaciones`

## Arquitectura del Backend
Se debe aplicar **Clean Architecture** de manera rigurosa en cada uno de los microservicios:
- **Capa de Dominio (Domain)**: Entidades y reglas de negocio puras, sin dependencias de frameworks ni drivers de bases de datos.
- **Capa de Aplicación (Application)**: Casos de uso específicos de la aplicación.
- **Capa de Infraestructura (Infrastructure)**: Controladores HTTP, adaptadores de base de datos (mongoose, sqlx, redis), conectores de Kafka y configuraciones de framework.

## Estándares de Arquitectura y Módulos en Rust
Para los servicios escritos en Rust (`recompensas` y `notificaciones`), se deben seguir de forma estricta las siguientes reglas:

1. **Uso estricto de Rust 2018+ (Edición Moderna):**
   * Está terminantemente **PROHIBIDO** utilizar el archivo `mod.rs` para declarar submódulos.
   * Para estructurar un módulo con archivos hijos, debes colocar el archivo declarador `.rs` al mismo nivel y con el mismo nombre que la carpeta que contiene los submódulos.

2. **Ejemplo de Estructura de Carpetas requerida:**
   ```text
   src/
   ├── main.rs
   ├── dominio.rs        <-- Archivo declarador del módulo principal
   └── dominio/          <-- Carpeta con el mismo nombre para submódulos
       ├── afiliados.rs
       └── recompensas.rs
   ```

## Microservicios a Implementar:

### 1. Afiliados (Node.js / TypeScript)
- **Ubicación**: `SusoRewards-Backend/afiliados`
- **Responsabilidad**: Gestión de Empresas, Restaurantes y Clientes. Es un sistema Multi-Tenant.
- **Stack**: TypeScript, Fastify, MongoDB (Mongoose).
- **Kafka**: `kafkajs`.
- **Patrones**: Clean Architecture. Exponer endpoints para registro, login y gestión.

### 2. Recompensas (Rust)
- **Ubicación**: `SusoRewards-Backend/recompensas`
- **Responsabilidad**: Escuchar eventos de consumos (desde Kafka) y calcular automáticamente puntos, cashback o beneficios para el cliente.
- **Stack**: Rust, Tokio (Runtime), Axum (HTTP), CockroachDB (sqlx).
- **Kafka**: `rdkafka` (consumidor y productor).
- **Serialización**: `serde`, `serde_json`.

### 3. Notificaciones (Rust)
- **Ubicación**: `SusoRewards-Backend/notificaciones`
- **Responsabilidad**: Gestión de notificaciones a clientes usando SSE (Server-Sent Events) y servir como API orquestadora para consultas rápidas.
- **Stack**: Rust, Tokio, Axum, Redis (driver redis).
- **Kafka**: `rdkafka` (consumidor).

## Reglas de Desarrollo, Calidad y Pruebas
> [!IMPORTANT]
> **Obligatoriedad de Pruebas Automatizadas:**
> Cada microservicio debe contar de manera mandatoria con un conjunto integral de pruebas unitarias y de integración.
> Se exige alcanzar y mantener un **Test Coverage mínimo del 85%** en cada uno de los tres componentes del backend de manera independiente.
> Los reportes de cobertura deben generarse en formatos estándar (LCOV para Node/TypeScript y Cobertura/LCOV para Rust) para su correcta ingestión en el servidor de SonarQube.

- Configuración de SonarQube a nivel unificado en `SusoRewards-Backend` con la key `susorewards_backend`.
- Configurar Dockerfiles para cada servicio y un docker-compose general para levantar Kafka y las bases de datos localmente.
