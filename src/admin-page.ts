export const ADMIN_HTML = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>flino.link — admin</title>
<style>
  :root {
    --bg: #f6f7f9; --card: #ffffff; --text: #1a1d21; --muted: #6b7280;
    --border: #e5e7eb; --accent: #2563eb; --accent-text: #ffffff;
    --danger: #dc2626; --ok: #16a34a;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0f1115; --card: #181b21; --text: #e7e9ec; --muted: #9aa1ab;
      --border: #2a2f38; --accent: #3b82f6; --danger: #f87171; --ok: #4ade80;
    }
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    font: 15px/1.5 system-ui, -apple-system, sans-serif;
    background: var(--bg); color: var(--text);
    max-width: 720px; margin: 0 auto; padding: 2rem 1rem 4rem;
  }
  h1 { font-size: 1.3rem; margin-bottom: 1.5rem; }
  h1 span { color: var(--accent); }
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: 10px; padding: 1.25rem; margin-bottom: 1.25rem;
  }
  label { display: block; font-size: .8rem; color: var(--muted); margin-bottom: .3rem; }
  input {
    width: 100%; padding: .55rem .7rem; border: 1px solid var(--border);
    border-radius: 8px; background: var(--bg); color: var(--text); font-size: .95rem;
  }
  input:focus { outline: 2px solid var(--accent); outline-offset: -1px; border-color: transparent; }
  .row { display: flex; gap: .75rem; margin-top: .9rem; }
  .row > div:first-child { flex: 2.5; }
  .row > div:last-child { flex: 1; }
  button {
    border: 0; border-radius: 8px; padding: .55rem 1rem; font-size: .9rem;
    cursor: pointer; background: var(--accent); color: var(--accent-text);
  }
  button:hover { filter: brightness(1.1); }
  button.ghost {
    background: transparent; color: var(--muted);
    border: 1px solid var(--border); padding: .25rem .6rem; font-size: .8rem;
  }
  button.ghost:hover { color: var(--text); }
  button.ghost.danger:hover { color: var(--danger); border-color: var(--danger); }
  .actions { margin-top: 1rem; display: flex; align-items: center; gap: .8rem; }
  #msg { font-size: .85rem; }
  #msg.ok { color: var(--ok); }
  #msg.error { color: var(--danger); }
  table { width: 100%; border-collapse: collapse; }
  th {
    text-align: left; font-size: .75rem; text-transform: uppercase;
    letter-spacing: .04em; color: var(--muted); padding: .4rem .5rem;
    border-bottom: 1px solid var(--border);
  }
  td { padding: .55rem .5rem; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:last-child td { border-bottom: 0; }
  td.url { max-width: 0; width: 55%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  td.url a { color: var(--muted); text-decoration: none; }
  td.url a:hover { color: var(--text); }
  a.slug { color: var(--accent); text-decoration: none; font-weight: 600; }
  td.btns { text-align: right; white-space: nowrap; }
  .empty { color: var(--muted); text-align: center; padding: 1.5rem 0; }
  #keybar { display: flex; gap: .75rem; align-items: end; }
  #keybar > div { flex: 1; }
</style>
</head>
<body>
<h1>flino<span>.link</span> — admin</h1>

<div class="card" id="keycard">
  <div id="keybar">
    <div>
      <label for="key">API key</label>
      <input id="key" type="password" placeholder="pega tu API key" autocomplete="off">
    </div>
    <button id="savekey">Guardar</button>
  </div>
</div>

<div class="card">
  <label for="url">URL larga</label>
  <input id="url" type="url" placeholder="https://ejemplo.com/una/url/muy/larga">
  <div class="row">
    <div>
      <label for="slug">Slug (opcional)</label>
      <input id="slug" placeholder="aleatorio si lo dejas vacío">
    </div>
    <div style="display:flex;align-items:end">
      <button id="create" style="width:100%">Acortar</button>
    </div>
  </div>
  <div class="actions"><span id="msg"></span></div>
</div>

<div class="card">
  <table>
    <thead><tr><th>Link</th><th>Destino</th><th style="text-align:right">Clicks</th><th></th></tr></thead>
    <tbody id="list"><tr><td colspan="4" class="empty">…</td></tr></tbody>
  </table>
</div>

<script>
const $ = (id) => document.getElementById(id);
const keyInput = $("key");
keyInput.value = localStorage.getItem("apiKey") || "";

function headers() {
  return { Authorization: "Bearer " + keyInput.value.trim() };
}
function msg(text, cls) {
  $("msg").textContent = text;
  $("msg").className = cls || "";
}
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
  return data;
}

async function refresh() {
  if (!keyInput.value.trim()) {
    $("list").innerHTML = '<tr><td colspan="4" class="empty">Introduce tu API key para ver los links</td></tr>';
    return;
  }
  try {
    const { links } = await api("/api/links");
    if (!links.length) {
      $("list").innerHTML = '<tr><td colspan="4" class="empty">Todavía no hay links</td></tr>';
      return;
    }
    links.sort((a, b) => (b.clicks - a.clicks) || a.slug.localeCompare(b.slug));
    $("list").innerHTML = "";
    for (const l of links) {
      const tr = document.createElement("tr");
      const short = "https://flino.link/" + l.slug;

      const tdSlug = document.createElement("td");
      const a = document.createElement("a");
      a.className = "slug"; a.href = short; a.target = "_blank"; a.textContent = "/" + l.slug;
      tdSlug.appendChild(a);

      const tdUrl = document.createElement("td");
      tdUrl.className = "url";
      const dest = document.createElement("a");
      dest.href = l.url; dest.target = "_blank"; dest.textContent = l.url; dest.title = l.url;
      tdUrl.appendChild(dest);

      const tdClicks = document.createElement("td");
      tdClicks.style.textAlign = "right";
      tdClicks.style.fontVariantNumeric = "tabular-nums";
      tdClicks.textContent = l.clicks.toLocaleString();
      if (l.lastClick) tdClicks.title = "Último click: " + new Date(l.lastClick).toLocaleString();

      const tdBtns = document.createElement("td");
      tdBtns.className = "btns";
      const copy = document.createElement("button");
      copy.className = "ghost"; copy.textContent = "copiar";
      copy.onclick = async () => {
        await navigator.clipboard.writeText(short);
        copy.textContent = "✓"; setTimeout(() => (copy.textContent = "copiar"), 1200);
      };
      const del = document.createElement("button");
      del.className = "ghost danger"; del.textContent = "borrar"; del.style.marginLeft = ".4rem";
      del.onclick = async () => {
        if (!confirm("¿Borrar /" + l.slug + "? Quien tenga el link recibirá un redirect a flino.dev.")) return;
        try { await api("/api/links/" + encodeURIComponent(l.slug), { method: "DELETE" }); refresh(); }
        catch (e) { msg(e.message, "error"); }
      };
      tdBtns.append(copy, del);

      tr.append(tdSlug, tdUrl, tdClicks, tdBtns);
      $("list").appendChild(tr);
    }
  } catch (e) {
    $("list").innerHTML = '<tr><td colspan="4" class="empty">' +
      (e.message === "unauthorized" ? "API key incorrecta" : "Error: " + e.message) + "</td></tr>";
  }
}

$("savekey").onclick = () => {
  localStorage.setItem("apiKey", keyInput.value.trim());
  msg("Key guardada en este navegador", "ok");
  refresh();
};

$("create").onclick = async () => {
  const url = $("url").value.trim();
  const slug = $("slug").value.trim();
  if (!url) { msg("Falta la URL", "error"); return; }
  try {
    const body = slug ? { url, slug } : { url };
    const r = await api("/api/links", { method: "POST", body: JSON.stringify(body) });
    await navigator.clipboard.writeText(r.shortUrl).catch(() => {});
    msg(r.shortUrl + " creado y copiado ✓", "ok");
    $("url").value = ""; $("slug").value = "";
    refresh();
  } catch (e) {
    msg(e.message === "unauthorized" ? "API key incorrecta" : e.message, "error");
  }
};

$("url").addEventListener("keydown", (e) => { if (e.key === "Enter") $("create").click(); });
$("slug").addEventListener("keydown", (e) => { if (e.key === "Enter") $("create").click(); });

refresh();
</script>
</body>
</html>`;
