/**
 * Revision screen logic.
 * Renders an editable form bound to the extracted JSON and streams changes
 * back into the JSON so the user can confirm the final payload.
 */
(() => {
  const form = document.getElementById("revision-form");
  if (!form) return;

  const SESSION = form.dataset.session;
  const ITEM = form.dataset.item;
  const NEXT = form.dataset.next;
  const data = JSON.parse(form.dataset.original || "{}");
  const dudosos = collectDudosos(data);

  const btnConfirm = document.getElementById("btn-confirmar");
  const btnDescartar = document.getElementById("btn-descartar");

  renderForm();
  bindImageControls();
  bindShortcuts();

  btnConfirm.addEventListener("click", onConfirm);
  btnDescartar.addEventListener("click", onDiscard);

  // ─────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────

  function collectDudosos(d) {
    const list = ((d.confianza || {}).campos_dudosos || []);
    const map = new Map();
    for (const c of list) map.set(c.campo, c);
    return map;
  }

  function isDudoso(path) {
    return dudosos.has(path);
  }

  function dudosoMsg(path) {
    const c = dudosos.get(path);
    if (!c) return "";
    const parts = [];
    if (c.motivo) parts.push(c.motivo);
    if (c.alternativa != null) parts.push(`Alternativa: ${c.alternativa}`);
    return parts.join(" · ");
  }

  function n(val) {
    if (val === null || val === undefined || val === "") return 0;
    const x = typeof val === "string" ? parseFloat(val.replace(",", ".")) : val;
    return isFinite(x) ? x : 0;
  }

  function fmt(x) {
    return (Math.round(x * 100) / 100).toFixed(2);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering
  // ─────────────────────────────────────────────────────────────────────────

  function section(title, bodyHtml) {
    return `
      <details open class="border rounded-lg">
        <summary class="cursor-pointer select-none px-3 py-2 bg-slate-50 font-semibold">${title}</summary>
        <div class="p-3 space-y-2">${bodyHtml}</div>
      </details>`;
  }

  function input(label, path, value, opts = {}) {
    const { type = "text", step = undefined } = opts;
    const dudo = isDudoso(path);
    const msg = dudosoMsg(path);
    const stepAttr = step ? `step="${step}"` : "";
    return `
      <label class="block text-sm">
        <span class="text-slate-600">${label}</span>
        <input type="${type}" ${stepAttr}
               data-path="${path}"
               value="${value ?? ""}"
               title="${msg}"
               class="mt-1 w-full rounded border-slate-300 border px-2 py-1 ${dudo ? "campo-dudoso" : ""}" />
      </label>`;
  }

  function renderForm() {
    const d = data;
    const cab = section("📋 Cabecera",
      input("Nº albarán", "albaran.numero", (d.albaran || {}).numero) +
      input("Fecha (YYYY-MM-DD)", "albaran.fecha", (d.albaran || {}).fecha) +
      input("Serie", "albaran.serie", (d.albaran || {}).serie),
    );

    const prov = section("🏢 Proveedor",
      input("Nombre", "proveedor.nombre", (d.proveedor || {}).nombre) +
      input("CIF/NIF", "proveedor.cif_nif", (d.proveedor || {}).cif_nif) +
      input("Dirección", "proveedor.direccion", (d.proveedor || {}).direccion) +
      input("CP", "proveedor.codigo_postal", (d.proveedor || {}).codigo_postal) +
      input("Población", "proveedor.poblacion", (d.proveedor || {}).poblacion) +
      input("Provincia", "proveedor.provincia", (d.proveedor || {}).provincia) +
      input("Teléfono", "proveedor.telefono", (d.proveedor || {}).telefono) +
      input("Email", "proveedor.email", (d.proveedor || {}).email),
    );

    const cli = section("🧾 Cliente",
      input("Nombre", "cliente.nombre", (d.cliente || {}).nombre) +
      input("CIF/NIF", "cliente.cif_nif", (d.cliente || {}).cif_nif) +
      input("Código cliente", "cliente.codigo_cliente", (d.cliente || {}).codigo_cliente) +
      input("Dirección facturación", "cliente.direccion_facturacion", (d.cliente || {}).direccion_facturacion) +
      input("Dirección entrega", "cliente.direccion_entrega", (d.cliente || {}).direccion_entrega),
    );

    const linHtml = `
      <div class="overflow-auto">
        <table class="w-full text-xs" id="lineas-table">
          <thead class="bg-slate-100 text-slate-600">
            <tr>
              <th class="px-2 py-1 w-8">#</th>
              <th class="px-2 py-1">Tipo</th>
              <th class="px-2 py-1">Ref.</th>
              <th class="px-2 py-1">Descripción</th>
              <th class="px-2 py-1 text-right">Cant.</th>
              <th class="px-2 py-1">Ud.</th>
              <th class="px-2 py-1 text-right">Precio</th>
              <th class="px-2 py-1 text-right">Dto%</th>
              <th class="px-2 py-1 text-right">Importe</th>
              <th class="px-2 py-1 text-right">IVA%</th>
              <th class="px-2 py-1"></th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
        <button type="button" id="add-linea" class="mt-2 text-blue-600 hover:underline text-sm">+ Añadir línea</button>
      </div>`;

    const lin = section(`📦 Líneas (${(d.lineas || []).length})`, linHtml);

    const tot = section("💰 Totales",
      `<div class="grid grid-cols-2 gap-2">` +
      input("Importe bruto", "totales.importe_bruto", (d.totales || {}).importe_bruto, { type: "number", step: "0.01" }) +
      input("Descuento global", "totales.descuento_global", (d.totales || {}).descuento_global, { type: "number", step: "0.01" }) +
      input("Base imponible", "totales.base_imponible", (d.totales || {}).base_imponible, { type: "number", step: "0.01" }) +
      input("Importe IVA", "totales.iva_importe", (d.totales || {}).iva_importe, { type: "number", step: "0.01" }) +
      input("TOTAL", "totales.total", (d.totales || {}).total, { type: "number", step: "0.01" }) +
      `</div>
       <div id="totales-warning" class="text-xs text-rose-600 mt-1"></div>`,
    );

    const obs = section("📝 Observaciones",
      input("Forma de pago", "forma_pago", d.forma_pago) +
      input("Observaciones albarán", "observaciones_albaran", d.observaciones_albaran) +
      `<div class="text-xs text-slate-500 mt-1">Notas del sistema: ${d.observaciones_sistema || "—"}</div>`,
    );

    form.innerHTML = cab + prov + cli + lin + tot + obs;

    // Render line rows
    renderLineas();

    // Wire change listeners
    form.querySelectorAll("input[data-path]").forEach((el) => {
      el.addEventListener("input", (e) => {
        const path = e.target.dataset.path;
        setPath(data, path, castValue(e.target));
        if (path.startsWith("lineas[")) recalcLineas();
        checkTotales();
      });
    });

    document.getElementById("add-linea").addEventListener("click", () => {
      (data.lineas = data.lineas || []).push({
        posicion: data.lineas.length + 1,
        tipo_linea: "producto",
        referencia: null,
        descripcion: "",
        cantidad: 0,
        unidad: null,
        precio_unitario: 0,
        descuento_pct: 0,
        importe_linea: 0,
        iva_pct: 0,
      });
      renderLineas();
    });

    checkTotales();
  }

  function renderLineas() {
    const tbody = form.querySelector("#lineas-table tbody");
    tbody.innerHTML = "";
    (data.lineas || []).forEach((l, i) => {
      const dudoCant = isDudoso(`lineas[${i}].cantidad`);
      const dudoPrecio = isDudoso(`lineas[${i}].precio_unitario`);
      const dudoImporte = isDudoso(`lineas[${i}].importe_linea`);
      const tr = document.createElement("tr");
      tr.className = "border-b";
      tr.innerHTML = `
        <td class="px-2 py-1 text-slate-400">${i + 1}</td>
        <td class="px-2 py-1">
          <select data-path="lineas[${i}].tipo_linea" class="border rounded px-1 py-0.5 w-full">
            ${["producto", "envase", "transporte", "servicio"]
              .map((t) => `<option value="${t}" ${l.tipo_linea === t ? "selected" : ""}>${t}</option>`)
              .join("")}
          </select>
        </td>
        <td class="px-2 py-1"><input data-path="lineas[${i}].referencia" value="${l.referencia ?? ""}" class="border rounded px-1 py-0.5 w-20" /></td>
        <td class="px-2 py-1"><input data-path="lineas[${i}].descripcion" value="${(l.descripcion ?? "").replaceAll('"', "&quot;")}" class="border rounded px-1 py-0.5 w-full" /></td>
        <td class="px-2 py-1"><input type="number" step="0.001" data-path="lineas[${i}].cantidad" value="${l.cantidad ?? 0}" class="border rounded px-1 py-0.5 w-20 text-right ${dudoCant ? "campo-dudoso" : ""}" /></td>
        <td class="px-2 py-1"><input data-path="lineas[${i}].unidad" value="${l.unidad ?? ""}" class="border rounded px-1 py-0.5 w-16" /></td>
        <td class="px-2 py-1"><input type="number" step="0.0001" data-path="lineas[${i}].precio_unitario" value="${l.precio_unitario ?? 0}" class="border rounded px-1 py-0.5 w-24 text-right ${dudoPrecio ? "campo-dudoso" : ""}" /></td>
        <td class="px-2 py-1"><input type="number" step="0.01" data-path="lineas[${i}].descuento_pct" value="${l.descuento_pct ?? 0}" class="border rounded px-1 py-0.5 w-16 text-right" /></td>
        <td class="px-2 py-1"><input type="number" step="0.01" data-path="lineas[${i}].importe_linea" value="${l.importe_linea ?? 0}" class="border rounded px-1 py-0.5 w-24 text-right ${dudoImporte ? "campo-dudoso" : ""}" data-importe="1" /></td>
        <td class="px-2 py-1"><input type="number" step="1" data-path="lineas[${i}].iva_pct" value="${l.iva_pct ?? 0}" class="border rounded px-1 py-0.5 w-16 text-right" /></td>
        <td class="px-2 py-1 text-right">
          <button type="button" data-del="${i}" class="text-rose-500 hover:text-rose-700">🗑</button>
        </td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll("input, select").forEach((el) => {
      el.addEventListener("input", (e) => {
        setPath(data, e.target.dataset.path, castValue(e.target));
        recalcLineas();
        checkTotales();
      });
    });
    tbody.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        data.lineas.splice(parseInt(btn.dataset.del, 10), 1);
        data.lineas.forEach((l, idx) => (l.posicion = idx + 1));
        renderLineas();
        checkTotales();
      });
    });
  }

  function recalcLineas() {
    (data.lineas || []).forEach((l, i) => {
      const esperado = n(l.cantidad) * n(l.precio_unitario) * (1 - n(l.descuento_pct) / 100);
      const actual = n(l.importe_linea);
      const input = form.querySelector(`[data-path="lineas[${i}].importe_linea"]`);
      if (!input) return;
      // Only auto-recalc if the user hasn't set a clearly different value
      if (Math.abs(esperado - actual) > 0.02 && !input.dataset.touched) {
        l.importe_linea = Math.round(esperado * 100) / 100;
        input.value = l.importe_linea;
      }
      input.classList.toggle("campo-error", Math.abs(esperado - n(l.importe_linea)) > 0.05);
    });
  }

  function checkTotales() {
    const warn = document.getElementById("totales-warning");
    if (!warn) return;
    const sumaLineas = (data.lineas || []).reduce((a, l) => a + n(l.importe_linea), 0);
    const base = n((data.totales || {}).base_imponible);
    const iva = n((data.totales || {}).iva_importe);
    const total = n((data.totales || {}).total);
    const issues = [];
    if (base > 0 && Math.abs(sumaLineas - base) > 0.05 && sumaLineas - base > 0.05) {
      issues.push(`Σ líneas = ${fmt(sumaLineas)} ≠ base ${fmt(base)}`);
    }
    if (base > 0 && total > 0 && Math.abs(base + iva - total) > 0.05) {
      issues.push(`base + IVA = ${fmt(base + iva)} ≠ total ${fmt(total)}`);
    }
    warn.textContent = issues.join(" · ");
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Path utils
  // ─────────────────────────────────────────────────────────────────────────

  function setPath(obj, path, value) {
    const segments = [];
    const regex = /([^.[\]]+)|\[(\d+)\]/g;
    let m;
    while ((m = regex.exec(path)) !== null) {
      segments.push(m[1] !== undefined ? m[1] : Number(m[2]));
    }
    let cur = obj;
    for (let i = 0; i < segments.length - 1; i++) {
      const key = segments[i];
      const nextKey = segments[i + 1];
      const nextIsIndex = typeof nextKey === "number";
      if (cur[key] === undefined || cur[key] === null) cur[key] = nextIsIndex ? [] : {};
      cur = cur[key];
    }
    cur[segments[segments.length - 1]] = value;
  }

  function castValue(el) {
    if (el.type === "number") return el.value === "" ? null : parseFloat(el.value);
    if (el.value === "") return null;
    return el.value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Image controls
  // ─────────────────────────────────────────────────────────────────────────

  function bindImageControls() {
    const img = document.getElementById("albaran-image");
    if (!img) return;
    let scale = 1, rotation = 0, pageIdx = 0;
    const pages = img.dataset.pages ? JSON.parse(img.dataset.pages) : null;

    function apply() {
      img.style.transform = `scale(${scale}) rotate(${rotation}deg)`;
    }
    document.getElementById("zoom-in").addEventListener("click", () => { scale = Math.min(5, scale + 0.25); apply(); });
    document.getElementById("zoom-out").addEventListener("click", () => { scale = Math.max(0.25, scale - 0.25); apply(); });
    document.getElementById("rotate").addEventListener("click", () => { rotation = (rotation + 90) % 360; apply(); });
    document.getElementById("fit").addEventListener("click", () => { scale = 1; rotation = 0; apply(); });
    const pn = document.getElementById("page-num");
    const prev = document.getElementById("prev-page");
    const next = document.getElementById("next-page");
    if (prev && next && pages) {
      prev.addEventListener("click", () => {
        pageIdx = Math.max(0, pageIdx - 1);
        img.src = pages[pageIdx];
        pn.textContent = pageIdx + 1;
      });
      next.addEventListener("click", () => {
        pageIdx = Math.min(pages.length - 1, pageIdx + 1);
        img.src = pages[pageIdx];
        pn.textContent = pageIdx + 1;
      });
    }
  }

  function bindShortcuts() {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === "Enter") { e.preventDefault(); onConfirm(); }
      if (e.ctrlKey && (e.key === "d" || e.key === "D")) { e.preventDefault(); onDiscard(); }
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────

  async function onConfirm() {
    btnConfirm.disabled = true;
    const payload = stripMeta(data);
    try {
      const res = await fetch(`/api/confirmar/${SESSION}/${ITEM}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const body = await res.json();
      goNext(body.next_id);
    } catch (e) {
      alert("No se pudo confirmar: " + e.message);
      btnConfirm.disabled = false;
    }
  }

  async function onDiscard() {
    if (!confirm("¿Descartar este albarán? No se incluirá en la exportación.")) return;
    const res = await fetch(`/api/descartar/${SESSION}/${ITEM}`, { method: "POST" });
    if (res.ok) {
      const body = await res.json();
      goNext(body.next_id);
    }
  }

  function goNext(nextId) {
    if (nextId) window.location.href = `/revision/${SESSION}/${nextId}`;
    else window.location.href = `/resumen/${SESSION}`;
  }

  function stripMeta(obj) {
    if (obj && typeof obj === "object") {
      if (Array.isArray(obj)) return obj.map(stripMeta);
      const out = {};
      for (const k of Object.keys(obj)) {
        if (k === "_meta") continue;
        out[k] = stripMeta(obj[k]);
      }
      return out;
    }
    return obj;
  }
})();
