(() => {
  const MAX_FILES = 20;
  const MAX_BYTES = 10 * 1024 * 1024;
  const ALLOWED = [".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"];

  const dropZone = document.getElementById("drop-zone");
  const fileInput = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");
  const counter = document.getElementById("counter");
  const processBtn = document.getElementById("process-btn");
  const progress = document.getElementById("progress");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  let files = [];

  function getExt(name) {
    const i = name.lastIndexOf(".");
    return i === -1 ? "" : name.slice(i).toLowerCase();
  }

  function addFiles(newFiles) {
    for (const f of newFiles) {
      if (files.length >= MAX_FILES) break;
      const ext = getExt(f.name);
      if (!ALLOWED.includes(ext)) {
        alert(`"${f.name}" tiene una extensión no permitida.`);
        continue;
      }
      if (f.size > MAX_BYTES) {
        alert(`"${f.name}" supera los 10 MB.`);
        continue;
      }
      files.push(f);
    }
    renderFiles();
  }

  function renderFiles() {
    fileList.innerHTML = "";
    files.forEach((f, idx) => {
      const row = document.createElement("div");
      row.className = "flex items-center justify-between bg-white border rounded px-3 py-2 text-sm";
      row.innerHTML = `
        <div class="truncate"><span class="text-slate-400">${idx + 1}.</span> ${f.name}
          <span class="text-slate-400">(${(f.size / 1024).toFixed(0)} KB)</span>
        </div>
        <button data-idx="${idx}" class="text-rose-500 hover:text-rose-700 remove-btn">✕</button>`;
      fileList.appendChild(row);
    });
    counter.textContent = `📄 ${files.length} archivo${files.length === 1 ? "" : "s"} cargado${files.length === 1 ? "" : "s"}`;
    processBtn.disabled = files.length === 0;
    fileList.querySelectorAll(".remove-btn").forEach((b) =>
      b.addEventListener("click", () => {
        files.splice(parseInt(b.dataset.idx, 10), 1);
        renderFiles();
      }),
    );
  }

  dropZone.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", (e) => addFiles(e.target.files));

  ["dragenter", "dragover"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.add("drag-over");
    }),
  );
  ["dragleave", "drop"].forEach((ev) =>
    dropZone.addEventListener(ev, (e) => {
      e.preventDefault();
      dropZone.classList.remove("drag-over");
    }),
  );
  dropZone.addEventListener("drop", (e) => {
    addFiles(e.dataTransfer.files);
  });

  processBtn.addEventListener("click", async () => {
    if (!files.length) return;
    processBtn.disabled = true;
    progress.classList.remove("hidden");
    progressBar.style.width = "10%";
    progressText.textContent = "Subiendo archivos…";

    const fd = new FormData();
    files.forEach((f) => fd.append("files", f));

    let uploadRes;
    try {
      uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      if (!uploadRes.ok) throw new Error(await uploadRes.text());
    } catch (e) {
      alert("Error subiendo: " + e.message);
      processBtn.disabled = false;
      progress.classList.add("hidden");
      return;
    }
    const { session_id, items } = await uploadRes.json();

    // Show duplicates and ask whether to reprocess
    const dups = items.filter((i) => i.duplicate_of);
    let reprocessDup = false;
    if (dups.length) {
      reprocessDup = confirm(
        `${dups.length} albarán(es) ya estaban procesados previamente. ¿Reprocesarlos de todos modos?`,
      );
    }

    progressBar.style.width = "25%";
    progressText.textContent = `Procesando ${items.length} archivo(s) con Claude…`;

    const procRes = await fetch("/api/procesar/" + session_id, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reprocess_duplicates: reprocessDup }),
    });
    if (!procRes.ok) {
      alert("Error procesando: " + (await procRes.text()));
      processBtn.disabled = false;
      return;
    }

    progressBar.style.width = "100%";
    progressText.textContent = "Listo. Redirigiendo…";
    window.location.href = "/resultados/" + session_id;
  });
})();
