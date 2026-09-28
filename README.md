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