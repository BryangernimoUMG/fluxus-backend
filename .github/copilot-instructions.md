# Copilot Instructions: API de Finanzas Personales (Stack Firebase Auth + Supabase DB)

## 1. Objetivo General y Principios Clave

El objetivo es construir el backend para una aplicación de finanzas personales. La API será RESTful, segura y escalable. Utilizará **Firebase Authentication** para la gestión de usuarios y JWTs, y una base de datos **PostgreSQL alojada en Supabase** como almacén de datos principal.

**Principios Fundamentales (¡Esto es lo más importante!):**
1.  **SOLID:** Seguiremos una arquitectura que promueva el Principio de Responsabilidad Única (SRP) y la Inversión de Dependencias (DIP).
2.  **Código Limpio:** El código debe ser legible, mantenible y estar bien documentado con JSDoc.
3.  **Arquitectura en Capas (Layered Architecture):** La lógica estará estrictamente separada:
    *   **Routes (Rutas):** Define los endpoints de la API.
    *   **Controllers (Controladores):** Manejan las peticiones (request) y respuestas (response) HTTP. No deben contener lógica de negocio.
    *   **Services (Servicios):** Contienen toda la lógica de negocio. **Aquí se debe garantizar que un usuario solo pueda acceder a sus propios datos.**
    *   **Repositories (Repositorios):** Es la única capa que interactúa directamente con la base de datos usando Prisma.
4.  **Seguridad:**
    *   La autenticación se basará en JWTs proporcionados por **Firebase Auth**.
    *   **No se usará la Seguridad a Nivel de Fila (RLS) de Supabase.** Nuestra API es el único guardián de los datos. Cada consulta a la base de datos que acceda a datos de un usuario **DEBE** ser filtrada por el `usuario_id` verificado a través del token.

## 2. Stack Tecnológico Principal

*   **Runtime:** Node.js
*   **Framework:** Express.js
*   **Base de Datos:** PostgreSQL (en Supabase)
*   **ORM:** Prisma (para interactuar con la base de datos).
*   **Validación:** Zod (para validar los cuerpos de las peticiones).
*   **Autenticación:** **Firebase Admin SDK (`firebase-admin`)** para verificar los JWTs.

## 3. Estructura del Proyecto

Genera la siguiente estructura de directorios y archivos. Esta estructura es crucial para mantener el código organizado y escalable.

```
/
├── src/
│   ├── api/
│   │   ├── users/
│   │   │   ├── user.routes.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   └── user.validation.js
│   │   ├── accounts/
│   │   │   └── (similar a los demás)
│   │   ├── categories/
│   │   │   └── (similar a los demás)
│   │   ├── debts/
│   │   │   └── (similar a los demás)
│   │   └── transactions/
│   │       └── (similar a los demás)
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js       # Verifica el JWT de Firebase
│   │   ├── error.handler.js       # Middleware central de errores
│   │   └── validate.request.js    # Valida peticiones con Zod
│   │
│   ├── config/
│   │   ├── prisma.client.js         # Instancia única del cliente de Prisma
│   │   └── firebase.config.js       # Configuración de Firebase Admin SDK
│   │
│   ├── utils/
│   │   ├── AppError.js              # Clase de error personalizada
│   │   └── catchAsync.js            # Wrapper para rutas asíncronas
│   │
│   ├── app.js                     # Configuración principal de Express
│   └── server.js                  # Punto de entrada, inicia el servidor
│
├── prisma/
│   └── schema.prisma              # Generado por introspección de la DB de Supabase
│
├── .env                         # Variables de entorno
├── .env.example
└── serviceAccountKey.json       # Credenciales de Firebase (¡NO SUBIR A GIT!)
```

## 4. Pasos de Implementación

### Paso 4.1: Configuración Inicial y Base de Datos

1.  **Inicializa el proyecto Node.js:** `npm init -y`.
2.  **Instala dependencias:** `express`, `dotenv`, `cors`, `helmet`, `morgan`, `firebase-admin`.
3.  **Instala dependencias de desarrollo:** `nodemon`.
4.  **Instala Prisma y Zod:** `npm install @prisma/client`, `npm install -D prisma`, `npm install zod`.
5.  **Configura el archivo `.env`:**
    *   Obtén la URL de conexión a la base de datos de Supabase (en `Settings > Database`) y añádela como `DATABASE_URL`.
    *   Añade una variable que apunte a tu archivo de credenciales de Firebase: `GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json`.
6.  **Configura Firebase Admin:**
    *   Ve a tu proyecto de Firebase > `Project settings` > `Service accounts`.
    *   Genera una nueva clave privada y descarga el archivo JSON.
    *   Renómbralo a `serviceAccountKey.json` y colócalo en la raíz del proyecto.
    *   **Asegúrate de añadir `serviceAccountKey.json` a tu archivo `.gitignore`**.
7.  **Configura Prisma:**
    *   Ejecuta `npx prisma init`.
    *   Usa la introspección para leer el esquema de tu base de datos en Supabase: `npx prisma db pull`.
    *   Genera el Cliente de Prisma: `npx prisma generate`.

### Paso 4.2: Middleware Esencial

1.  **`firebase.config.js`**:
    *   Inicializa y exporta la instancia del Firebase Admin SDK.
    *   `import admin from 'firebase-admin';`
    *   `import { createRequire } from 'module';`
    *   `const require = createRequire(import.meta.url);`
    *   `const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);`
    *   `admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });`
    *   `export default admin;`

2.  **`auth.middleware.js`**:
    *   Debe exportar una función middleware `authenticate`.
    *   Leerá el `Authorization` header (formato `Bearer <token>`).
    *   Usará `admin.auth().verifyIdToken(token)` para decodificar y verificar el JWT.
    *   Si el token es válido, el resultado (`decodedToken`) contendrá el `uid` del usuario de Firebase.
    *   Usará este `uid` para buscar en nuestra tabla `usuarios` por la columna `firebase_uid`.
    *   Si el usuario existe en nuestra base de datos, lo adjuntará al objeto `req` (ej: `req.user = dbUser`). **Este objeto `req.user` será la fuente de verdad para el ID de usuario en todas las operaciones posteriores.**
    *   Si el token es inválido o el usuario no existe en nuestra DB, lanzará un `AppError` con código 401 o 403.

3.  **`error.handler.js` y `validate.request.js`**:
    *   Implementa estos middlewares de manera genérica. Son cruciales para el manejo de errores y la validación de entradas, respectivamente.

### Paso 4.3: Implementación por Módulo (Recurso)

Para cada recurso, sigue este patrón, prestando especial atención a cómo se usa el `userId`.

#### Módulo: `users` (Lógica de Sincronización)

1.  **`user.service.js` - `getOrCreateUser(firebaseUser)`:**
    *   Recibe los datos del usuario decodificados del token de Firebase (`uid`, `email`, `name`, `picture`).
    *   Busca un usuario en la tabla `usuarios` donde `firebase_uid` coincida con `firebaseUser.uid`.
    *   Si lo encuentra, lo devuelve.
    *   Si no, crea un nuevo usuario con los datos de Firebase y lo devuelve.

2.  **`user.controller.js` - `syncUserHandler(req, res)`:**
    *   Este endpoint es llamado por el frontend después de un login exitoso.
    *   El `auth.middleware` ya habrá verificado el token.
    *   Llama a `userService.getOrCreateUser()` con los datos del token.
    *   Responde con el perfil del usuario de nuestra base de datos.

#### Módulo: `transactions` (Ejemplo de Lógica de Negocio Segura)

1.  **`transaction.service.js` - `createTransaction(userId, transactionData)`:**
    *   **¡Punto de control de seguridad!** El `userId` que se recibe aquí es el ID de nuestra tabla `usuarios`, extraído de `req.user.id`.
    *   **Validación de Pertenencia:** Antes de crear la transacción, verifica que la `cuenta_id` en `transactionData` pertenece al `userId` proporcionado. (`prisma.cuenta.findFirst({ where: { id: transactionData.cuenta_id, usuario_id: userId } })`). Si no se encuentra, lanza un `AppError(403, 'Acceso denegado a la cuenta')`.
    *   **Lógica Transaccional:** Usa `prisma.$transaction([...])` para asegurar que la creación de la transacción y la actualización de los saldos de las cuentas y deudas ocurran de manera atómica.

2.  **`transaction.service.js` - `getTransactionsByUserId(userId, filters)`:**
    *   La consulta principal **DEBE** incluir una cláusula `where` para filtrar por el `userId`.
    *   Ejemplo: `prisma.transaccion.findMany({ where: { usuario_id: userId, ...filters } })`.
    *   Esto garantiza que, sin importar los filtros que envíe el cliente, solo se devolverán los registros que pertenecen al usuario autenticado.

3.  **`transaction.controller.js` - `createTransactionHandler(req, res)`:**
    *   Extrae el `userId` **únicamente** de `req.user.id` (que fue establecido por el `auth.middleware`).
    *   Nunca confíes en un ID de usuario enviado en el `req.body`.
    *   Llama al servicio: `transactionService.createTransaction(req.user.id, req.body)`.

Este conjunto de instrucciones es ahora una guía completa y segura para construir tu backend, respetando tu diseño de base de datos y el flujo de autenticación que has definido.