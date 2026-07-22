# Roadmap · flino.link como motor de contenido

Plan de seguimiento: extensiones del proyecto y calendario de publicaciones
para LinkedIn. Principio rector: **números concretos + historia + datos
propios** — cada feature nueva debe generar datos que solo yo tengo, y cada
dato propio es un post que nadie puede replicar.

Cadencia objetivo: **1 post/semana**, alternando dato propio → técnica → opinión.
Todo link compartido pasa por flino.link (un slug por canal/campaña para medir).

---

## Fase 1 — Exprimir lo ya construido (sin código nuevo)

- [ ] **Post: "Un mes después: los datos"** — clicks reales por red social
      (LinkedIn vs X) medidos con el propio dashboard. Publicar ~18 de agosto
      de 2026 (un mes después del lanzamiento).
- [ ] **Post: serie "decisión técnica de la semana"** — un post por decisión
      de diseño, en este orden:
  - [ ] `ctx.waitUntil()`: analítica con latencia cero
  - [ ] KV vs Durable Objects: elegir storage por semántica
  - [ ] Dashboard sin framework: cuándo un framework es más infraestructura
        que producto (post de opinión — busca debate en comentarios)
- [ ] Cerrar cada post con una **pregunta concreta** y dejar el **primer
      comentario propio** con un dato extra (aprendizaje del post #1: 0
      comentarios = distribución truncada).

## Fase 2 — Anti-abuso: el proyecto diferenciador (dev + seguridad)

Los acortadores atraen spam y phishing. Instrumentar el propio:

- [ ] Validar URLs destino contra **Google Safe Browsing** y/o **URLhaus**
      al crear el link (y en re-chequeo periódico vía cron trigger).
- [ ] **Rate limiting** por IP en la API y en creación de links.
- [ ] Logging de intentos maliciosos (URLs rechazadas, IPs, user-agents)
      en el Durable Object o Analytics Engine.
- [ ] Dejar el sistema corriendo 30 días.
- [ ] **Post: "Puse un acortador en internet. Esto es lo que intentaron
      hacerle en 30 días"** — cruza los writeups de seguridad (THM) con un
      sistema propio en producción. De aquí salen 2–3 posts.

## Fase 3 — Analytics más ricos

- [ ] Integrar **Workers Analytics Engine**: país, referrer, user-agent por
      click (el contador actual en DO se queda como fuente de verdad simple).
- [ ] Exponer top países/referrers en el dashboard.
- [ ] **Post: "Le agregué analytics geográficos a mi acortador sin añadir
      ni un servidor"**.

## Fase 4 — Infraestructura personal en el edge (proyectos hermanos)

- [ ] **Uptime monitor / status page**: Worker con cron que mide
      flino.dev, flino.link y Habitus desde el edge; histórico en KV;
      página pública de status.
  - [ ] Post: latencias por región / primer incidente detectado.
- [ ] **Email en `@flino.link`** con Cloudflare Email Routing (una tarde).
  - [ ] Post: "email en mi dominio sin pagar hosting de correo".
- [ ] **Caso de estudio de Habitus**: "lo que nadie te cuenta de publicar
      tu primera app en Play Store" — con números honestos (descargas,
      retención, errores). Los números modestos y honestos generan más
      conversación que los éxitos.

## Banco de posts sin código (para semanas sin tiempo)

- [ ] Reciclar writeups de THM a formato LinkedIn: "3 cosas que aprendí
      explotando <técnica>".
- [ ] Comentar con sustancia en posts del nicho (acortadores, Workers,
      serverless LATAM) — expone al público correcto sin publicar nada.
- [ ] En X: tweet mencionando a @CloudflareDev citando el hilo del
      proyecto; compartir en el Discord de Cloudflare (canal showcase).

---

## Métricas de referencia (lanzamiento, julio 2026)

Para comparar el rendimiento de posts futuros:

| Métrica | Post lanzamiento (LinkedIn) |
| --- | --- |
| Impresiones | 4.144 (89% fuera de red) |
| Miembros alcanzados | 2.261 |
| Clicks al link | 39 (~1% CTR) |
| Interacciones | 15 (11 reacciones, 3 guardados, 1 compartido, 0 comentarios) |
| Seguidores ganados | 5 |
| X (mismo contenido en hilo) | 13/10/8 impresiones — la audiencia está en LinkedIn |
