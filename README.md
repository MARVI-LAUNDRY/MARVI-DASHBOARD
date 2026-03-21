# MARVI Dashboard (Angular)

Migracion progresiva del dashboard original a Angular.

## Estado actual

- Proyecto original resguardado en `legacy/`.
- Fase 1 iniciada: login completo migrado (`/login`) con:
  - inicio de sesion,
  - recuperacion de contrasena,
  - restablecimiento de contrasena,
  - alertas visuales y tema similar al legacy.

## Desarrollo local

```bash
npm install
npm start
```

App local: `http://localhost:4200/`

## Build

```bash
npm run build
```

## Estructura relevante

- `legacy/`: version original (HTML/CSS/JS)
- `src/app/features/auth/login/`: pantalla de login migrada
- `src/app/features/auth/auth.service.ts`: llamadas API de autenticacion
- `src/app/core/services/alerts.service.ts`: SweetAlert2
- `src/styles.scss`: estilos globales migrados del legacy

## Proxima fase sugerida

Migrar el shell de `dashboard` (layout + navegacion) y despues modulos funcionales por pantalla.
