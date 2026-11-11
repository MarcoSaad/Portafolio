// ===== Regla: lógica del presupuesto =====
// Todo el estado vive en un objeto; cada cambio recalcula y vuelve a pintar el total.

const $ = (selector) => document.querySelector(selector);
const pesos = (n) => Math.round(n).toLocaleString("es-AR");

// Precios de ejemplo (editables en pantalla). No son una lista de precios real.
const PLANTILLAS = {
  plomeria: {
    trabajo: "Cambio de cañerías en cocina",
    horas: 8, valorHora: 14000,
    items: [
      ["Caño termofusión 20 mm (barra 4 m)", 6, 8500],
      ["Codo termofusión 20 mm", 10, 950],
      ["Canilla mezcladora para cocina", 1, 78000],
      ["Cinta teflón", 3, 1200],
    ],
  },
  electricidad: {
    trabajo: "Tablero y tomas nuevas en living",
    horas: 10, valorHora: 14000,
    items: [
      ["Cable unipolar 2,5 mm (rollo 100 m)", 1, 96000],
      ["Térmica bipolar 20 A", 2, 14500],
      ["Tomacorriente doble", 6, 4800],
      ["Caño corrugado 20 mm (rollo)", 2, 9500],
    ],
  },
  albanileria: {
    trabajo: "Pared de ladrillo hueco en galería",
    horas: 24, valorHora: 12000,
    items: [
      ["Cemento (bolsa 50 kg)", 8, 11000],
      ["Arena (m³)", 2, 38000],
      ["Ladrillo hueco 12x18x33", 150, 1100],
      ["Cal (bolsa)", 4, 6500],
    ],
  },
};

const estado = { rubro: "plomeria", items: [], horas: 0, valorHora: 0, margen: 20, iva: 0 };

// ---------- Cálculo ----------
function calcular() {
  const materiales = estado.items.reduce((suma, it) => suma + it.cant * it.precio, 0);
  const mano = estado.horas * estado.valorHora;
  const costo = materiales + mano;
  const conMargen = costo * (1 + estado.margen / 100);
  const total = conMargen * (1 + estado.iva / 100);
  return { materiales, mano, costo, conMargen, total };
}

// ---------- Odómetro: cada dígito es una columna del 0 al 9 que sube o baja ----------
function pintarOdometro(valor) {
  const caja = $("#odometro");
  const texto = pesos(valor);
  if (caja.dataset.largo !== String(texto.length)) {
    // Cambió la cantidad de dígitos: se rearma. Los dígitos nuevos arrancan en 0 y ruedan hasta su valor.
    caja.dataset.largo = texto.length;
    caja.innerHTML = "";
    [...texto].forEach((ch) => {
      if (/\d/.test(ch)) {
        const dig = document.createElement("span");
        dig.className = "dig";
        const rueda = document.createElement("span");
        rueda.className = "rueda";
        rueda.innerHTML = "0123456789".split("").map((d) => `<span>${d}</span>`).join("");
        dig.appendChild(rueda);
        caja.appendChild(dig);
      } else {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = ch;
        caja.appendChild(sep);
      }
    });
    void caja.offsetWidth; // fuerza al navegador a registrar el 0 inicial antes de animar
  }
  let i = 0;
  caja.querySelectorAll(".rueda").forEach((rueda) => {
    const digitos = texto.replace(/\D/g, "");
    rueda.style.transitionDelay = `${i * 40}ms`;
    rueda.style.transform = `translateY(${-Number(digitos[i])}em)`;
    i++;
  });
  caja.setAttribute("aria-label", `Total: ${texto} pesos`);
}

// ---------- Pintar ----------
function pintarFilas() {
  const cuerpo = $("#filas");
  cuerpo.innerHTML = "";
  estado.items.forEach((it, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="desc"><input type="text" value="" aria-label="Material" data-i="${i}" data-campo="desc"></td>
      <td class="num cant"><input type="number" min="0" step="1" inputmode="decimal" aria-label="Cantidad" data-i="${i}" data-campo="cant"></td>
      <td class="num precio"><input type="number" min="0" step="100" inputmode="numeric" aria-label="Precio unitario" data-i="${i}" data-campo="precio"></td>
      <td class="num sub" data-sub="${i}"></td>
      <td class="del"><button class="quitar" type="button" aria-label="Quitar este material" data-quitar="${i}">&times;</button></td>`;
    // value se asigna por JS (no por HTML) para que las comillas del texto no rompan nada
    tr.querySelector('[data-campo="desc"]').value = it.desc;
    tr.querySelector('[data-campo="cant"]').value = it.cant;
    tr.querySelector('[data-campo="precio"]').value = it.precio;
    cuerpo.appendChild(tr);
  });
}

function pintarTotales() {
  const c = calcular();
  estado.items.forEach((it, i) => {
    const celda = document.querySelector(`[data-sub="${i}"]`);
    if (celda) celda.textContent = "$" + pesos(it.cant * it.precio);
  });
  $("#subMano").textContent = "$" + pesos(c.mano);
  $("#margenSalida").textContent = estado.margen + "%";
  pintarOdometro(c.total);
  $("#formulaLinea").innerHTML =
    `(<b>$${pesos(c.materiales)}</b> materiales + <b>$${pesos(c.mano)}</b> mano de obra)` +
    ` &times; ${(1 + estado.margen / 100).toFixed(2).replace(".", ",")} de margen` +
    ` &times; ${(1 + estado.iva / 100).toFixed(2).replace(".", ",")} de IVA` +
    ` = <b>$${pesos(c.total)}</b>`;
}

function cargarRubro(nombre) {
  const p = PLANTILLAS[nombre];
  estado.rubro = nombre;
  estado.items = p.items.map(([desc, cant, precio]) => ({ desc, cant, precio }));
  estado.horas = p.horas;
  estado.valorHora = p.valorHora;
  $("#trabajo").value = p.trabajo;
  $("#horas").value = p.horas;
  $("#valorHora").value = p.valorHora;
  document.querySelectorAll(".rubro").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.rubro === nombre)));
  pintarFilas();
  pintarTotales();
}

// ---------- Eventos ----------
document.addEventListener("DOMContentLoaded", () => {
  const hoy = new Date();
  $("#fechaHoy").textContent = hoy.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });

  document.querySelectorAll(".rubro").forEach((b) => b.addEventListener("click", () => cargarRubro(b.dataset.rubro)));

  // Un solo oyente para todas las filas (delegación de eventos)
  $("#filas").addEventListener("input", (e) => {
    const campo = e.target.dataset.campo;
    if (!campo) return;
    const it = estado.items[e.target.dataset.i];
    it[campo] = campo === "desc" ? e.target.value : Math.max(0, Number(e.target.value) || 0);
    if (campo !== "desc") pintarTotales();
  });
  $("#filas").addEventListener("click", (e) => {
    const q = e.target.closest("[data-quitar]");
    if (!q) return;
    estado.items.splice(Number(q.dataset.quitar), 1);
    pintarFilas();
    pintarTotales();
  });
  $("#agregar").addEventListener("click", () => {
    estado.items.push({ desc: "", cant: 1, precio: 0 });
    pintarFilas();
    pintarTotales();
    const ultima = $("#filas").lastElementChild;
    ultima.classList.add("fila-nueva");
    ultima.querySelector("input").focus();
  });

  $("#horas").addEventListener("input", (e) => { estado.horas = Math.max(0, Number(e.target.value) || 0); pintarTotales(); });
  $("#valorHora").addEventListener("input", (e) => { estado.valorHora = Math.max(0, Number(e.target.value) || 0); pintarTotales(); });
  $("#margen").addEventListener("input", (e) => { estado.margen = Number(e.target.value); pintarTotales(); });
  $("#iva").addEventListener("change", (e) => { estado.iva = Number(e.target.value); pintarTotales(); });
  $("#pdf").addEventListener("click", () => window.print()); // el CSS de impresión deja solo la hoja

  // Cinta métrica: sigue al mouse. 37,8 px = 1 cm en pantalla (96 dpi)
  const cinta = document.querySelector(".cinta");
  const puntero = $("#punteroCinta");
  const medida = $("#medidaCinta");
  if (matchMedia("(pointer: fine)").matches) {
    window.addEventListener("mousemove", (e) => {
      cinta.classList.add("activa");
      puntero.style.left = e.clientX + "px";
      medida.textContent = (e.clientX / 37.8).toFixed(1).replace(".", ",") + " cm";
    });
    document.addEventListener("mouseleave", () => cinta.classList.remove("activa"));
  }

  // Inclinación de la hoja según el mouse (se apaga al escribir o si el usuario pidió menos movimiento)
  const escena = document.querySelector(".escena");
  const hoja = $("#hoja");
  const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (matchMedia("(pointer: fine)").matches && !sinMovimiento) {
    escena.addEventListener("mousemove", (e) => {
      if (hoja.matches(":focus-within")) return;
      const r = escena.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      escena.style.setProperty("--ry", (x * 4).toFixed(2) + "deg");
      escena.style.setProperty("--rx", (-y * 3).toFixed(2) + "deg");
    });
    escena.addEventListener("mouseleave", () => {
      escena.style.setProperty("--ry", "0deg");
      escena.style.setProperty("--rx", "0deg");
    });
  }

  cargarRubro("plomeria");
});
