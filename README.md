# flino.link

Acortador de URLs sobre Cloudflare Workers + KV. Los links se sirven en
`flino.link/<slug>`; la raíz y los slugs desconocidos redirigen a
[flino.dev](https://flino.dev).

## Desarrollo

```sh
npm install
npm run dev          # usa la API_KEY de .dev.vars
```

## API

Autenticación: header `Authorization: Bearer <API_KEY>`.

```sh
# Crear link (slug aleatorio)
curl -X POST https://flino.link/api/links \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"url":"https://ejemplo.com/pagina-larga"}'

# Crear link con slug propio
curl -X POST https://flino.link/api/links \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"url":"https://github.com/usuario","slug":"gh"}'

# Consultar / borrar
curl -H "Authorization: Bearer $API_KEY" https://flino.link/api/links/gh
curl -X DELETE -H "Authorization: Bearer $API_KEY" https://flino.link/api/links/gh
```

## Despliegue (una sola vez)

1. En Cloudflare: añadir el sitio `flino.link` y activar la zona
   (cambiar los nameservers en Namecheap a los que indique Cloudflare).
2. `npx wrangler login`
3. `npx wrangler kv namespace create LINKS` y copiar el `id` resultante
   en `wrangler.jsonc`.
4. `npx wrangler secret put API_KEY` (elegir una clave larga y aleatoria,
   p. ej. `openssl rand -hex 32`).
5. `npm run deploy`

Despliegues posteriores: solo `npm run deploy`.
