# Vault — Gestor de Contraseñas Seguro

Aplicación de escritorio construida con **Electron + React + Three.js**, backend **Node.js + Express** y base de datos en la nube **Supabase** (PostgreSQL). Cifrado zero-knowledge: el servidor nunca ve tus contraseñas en texto plano.

---

## Características

- **Cifrado AES-256-GCM** — cada credencial cifrada con IV único
- **Derivación de clave PBKDF2** (100,000 iteraciones, SHA-256)
- **Autenticación JWT** via Supabase Auth
- **Row Level Security (RLS)** — aislamiento total de datos por usuario
- **Auto-lock** por inactividad (5 minutos)
- **Portapapeles seguro** — limpieza automática tras 30 segundos
- **Generador de contraseñas** seguro integrado
- **Logs de auditoría** en Supabase
- **Fondo animado** con Three.js
- Instalador para **Windows, macOS y Linux**

---

## Tecnologías

| Capa | Tecnología |
|------|-----------|
| Escritorio | Electron 40 |
| Frontend | React 18 + Vite + TailwindCSS |
| Animación | Three.js + Framer Motion |
| Estado global | Zustand |
| Backend local | Express.js + Node.js |
| Base de datos | Supabase (PostgreSQL) |
| Cifrado | Web Crypto API (AES-256-GCM / PBKDF2) |
| Empaquetado | electron-builder |

---

## Requisitos

- **Node.js** >= 18
- **npm** >= 8
- Cuenta gratuita en [Supabase](https://supabase.com)

---

## Instalación

### 1. Clonar e instalar dependencias

```bash
git clone https://github.com/fobosdei/o-lo-od-.git
cd o-lo-od-/lock-pass

# Dependencias del frontend / Electron
npm install

# Dependencias del backend
cd backend && npm install && cd ..
```

### 2. Configurar Supabase

1. Crea un proyecto en [supabase.com](https://supabase.com)
2. Ve a **SQL Editor** y ejecuta el contenido de `supabase/schema.sql`
3. En **Project Settings → API** copia tu `URL`, `anon key` y `service_role key`

### 3. Variables de entorno

```bash
cp .env.example .env
# Edita .env con tus claves de Supabase
```

| Variable | Descripción |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL de tu proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Clave pública (segura con RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | Clave admin (solo backend) |
| `BACKEND_PORT` | Puerto Express (default: 4000) |
| `JWT_SECRET` | Secreto para tokens adicionales |

### 4. Ejecutar en desarrollo

```bash
npm run dev
```

Inicia simultáneamente: Vite (`:5173`), Express (`:4000`) y Electron.

---

## Build para producción

```bash
npm run build:electron
# Instalador en lock-pass/dist-electron/
```

---

## Estructura del proyecto

```
lock-pass/
├── electron/
│   ├── main.js          # Proceso principal Electron
│   └── preload.js       # Bridge IPC seguro
├── src/
│   ├── components/      # UI: Auth, Dashboard, Modales, Three.js
│   ├── store/           # Estado global con Zustand
│   └── utils/           # Cifrado AES-256-GCM y cliente Supabase
├── backend/
│   ├── server.js
│   ├── middleware/      # Helmet, rate limiting, auth
│   └── routes/          # Auth y credenciales
└── supabase/
    └── schema.sql       # Tablas + RLS policies
```

---

## Licencia

MIT
