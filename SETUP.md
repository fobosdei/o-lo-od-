# VAULT — Gestor de Contraseñas Seguro

Aplicación de escritorio construida con **Electron + React + Three.js** y backend **Node.js + Express**, con base de datos **Supabase** (PostgreSQL).

---

## Arquitectura de Seguridad

```
┌─────────────────────────────────────────────────────────────┐
│                      ELECTRON (Desktop)                      │
│  ┌────────────────────┐      ┌─────────────────────────┐    │
│  │   React Frontend   │      │  Express Backend :4000  │    │
│  │                    │      │                         │    │
│  │  Three.js BG       │ IPC  │  Rate Limiting          │    │
│  │  AES-256-GCM       │─────▶│  JWT Auth               │    │
│  │  PBKDF2 Keys       │      │  Audit Logs             │    │
│  │  Zustand Store     │      │  Input Validation       │    │
│  └────────────────────┘      └─────────┬───────────────┘    │
└────────────────────────────────────────┼────────────────────┘
                                         │
                              ┌──────────▼──────────┐
                              │   SUPABASE (Cloud)   │
                              │                      │
                              │  PostgreSQL          │
                              │  RLS Policies        │
                              │  Auth (JWT)          │
                              │  Encrypted at rest   │
                              └──────────────────────┘
```

### Modelo de Cifrado (Zero-Knowledge)

1. **Contraseña Maestra** → nunca almacenada, solo vive en memoria
2. **PBKDF2** (100,000 iteraciones, SHA-256) → deriva clave AES-256
3. **AES-256-GCM** → cifra cada credencial con IV único
4. **El servidor NUNCA ve texto plano** — solo recibe ciphertext

---

## Instalación

### Prerequisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase (gratis)

### Paso 1: Clonar y configurar

```bash
# Instalar dependencias del frontend/electron
npm install

# Instalar dependencias del backend
cd backend && npm install && cd ..
```

### Paso 2: Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) → crea un proyecto nuevo
2. En el Dashboard → **SQL Editor** → pega y ejecuta el contenido de `supabase/schema.sql`
3. En **Project Settings** → **API** copia:
   - `URL`
   - `anon/public` key
   - `service_role` key (secreta)

### Paso 3: Variables de entorno

```bash
cp .env.example .env
# Edita .env con tus claves de Supabase
```

### Paso 4: Ejecutar en desarrollo

```bash
npm run dev
```

Esto inicia simultáneamente:
- Vite dev server (`:5173`)
- Express backend (`:4000`)
- Electron (una vez Vite esté listo)

---

## Estructura del Proyecto

```
password-manager/
├── electron/
│   ├── main.js          # Proceso principal de Electron
│   └── preload.js       # Bridge IPC seguro
├── src/
│   ├── App.jsx           # Router principal
│   ├── components/
│   │   ├── ThreeBackground.jsx  # Animación Three.js
│   │   ├── TitleBar.jsx         # Barra de título custom
│   │   ├── AuthScreen.jsx       # Login / Registro
│   │   ├── LockScreen.jsx       # Pantalla de desbloqueo
│   │   ├── Dashboard.jsx        # Pantalla principal
│   │   ├── CredentialModal.jsx  # Añadir/editar credenciales
│   │   └── PasswordGenerator.jsx# Generador seguro
│   ├── store/
│   │   └── useVaultStore.js     # Estado global (Zustand)
│   └── utils/
│       ├── crypto.js            # AES-256-GCM + PBKDF2
│       └── supabase.js          # Cliente Supabase
├── backend/
│   ├── server.js               # Servidor Express
│   ├── middleware/
│   │   └── security.js         # Helmet, rate limit, auth
│   └── routes/
│       ├── auth.js              # Rutas de autenticación
│       └── credentials.js      # Auditoría y salud del vault
└── supabase/
    └── schema.sql              # Esquema + RLS policies
```

---

## Características de Seguridad

| Feature                     | Implementación                          |
|-----------------------------|-----------------------------------------|
| Cifrado de datos            | AES-256-GCM (Web Crypto API)            |
| Derivación de clave         | PBKDF2 (100,000 iter, SHA-256)          |
| Autenticación               | Supabase Auth (JWT)                     |
| Aislamiento de datos        | Row Level Security (RLS)                |
| Rate limiting               | express-rate-limit (5 unlock/5min)      |
| Headers de seguridad        | Helmet.js                               |
| Auto-lock por inactividad   | 5 minutos sin actividad                 |
| Portapapeles seguro         | Auto-limpieza después de 30 segundos    |
| Proceso aislado             | Electron sandbox + contextIsolation     |
| Logs de auditoría           | Tabla `audit_logs` en Supabase          |

---

## Build para producción

```bash
npm run build:electron
# El instalador estará en dist-electron/
```

---

## Variables de entorno requeridas

| Variable                    | Descripción                              |
|-----------------------------|------------------------------------------|
| `VITE_SUPABASE_URL`         | URL de tu proyecto Supabase              |
| `VITE_SUPABASE_ANON_KEY`    | Clave anon (segura para frontend con RLS)|
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin (solo en backend)            |
| `BACKEND_PORT`              | Puerto del servidor Express (def: 4000)  |
| `JWT_SECRET`                | Secreto para tokens adicionales          |
