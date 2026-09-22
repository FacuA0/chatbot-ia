# Chatbot IA

Simple chatbot de IA que utiliza modelos gratuitos de Kilo AI Gateway. Disponible [en vivo acá](https://facua0.github.io/chatbot-ia).

Incluye:

- Conversación multi-turno
- Streaming de respuestas
- Razonamiento de modelos
- Herramientas (calculadora, consulta web, búsqueda).
- Exportar chat en JSON.

No incluye:

- MCP (todavía)
- Historial de chats
- Otros proveedores

Hecho utilizando React, Vite y componentes Material UI de mui.com.

## Instalación y desarrollo

Se requiere Node.js 20.19, o 22.12 o superior.

```bash
# Clonar repo
$ git clone https://github.com/FacuA0/chatbot-ia.git
$ cd chatbot-ia

# Instalar dependencias
$ npm install

# Correr servidor dev
$ npm run dev
```

**Importante:** Iniciar el servidor proxy CORS en `proxy/proxy.js` antes de iniciar la app (el server dev de Vite ya lo inicia automáticamente).

Texto viejo del README:

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
