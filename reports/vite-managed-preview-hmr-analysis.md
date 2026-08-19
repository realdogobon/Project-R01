# Managed Preview Vite HMR Analysis

## Reported Symptom

The managed preview loaded the Vite client from the public Manus preview origin, but its HMR WebSocket attempted a direct connection to `localhost:5173`. That localhost endpoint is not reachable from the user’s browser, so Vite surfaced a failed WebSocket error.

## Verified Vite Guidance

Vite documents that a reverse proxy is expected to proxy the default WebSocket connection. When this fails, the client attempts a direct fallback connection and reports a WebSocket failure. Vite supports `server.ws.clientPort` to override the client-side WebSocket port and `server.ws.protocol` to select `ws` or `wss`.[1]

For the managed HTTPS preview, the intended browser endpoint is the existing public preview hostname over secure WebSocket on the standard HTTPS port. The correction will therefore leave the server listening normally, avoid a hard-coded ephemeral preview hostname, and set only the client-facing secure WebSocket protocol and public client port.

## Source

[1] [Vite — Server Options: `server.hmr` / `server.ws`](https://vite.dev/config/server-options.html#server-hmr)
