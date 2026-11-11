// ===== Flujo: una automatización simulada =====
// Cada "nodo" del diagrama es un paso real de código: clasifica el texto, extrae datos y arma una respuesta.

const NS = "http://www.w3.org/2000/svg";
const $ = (s) => document.querySelector(s);
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;
const pausa = (ms) => new Promise((r) => setTimeout(r, sinMovimiento ? 0 : ms));

// ---------- 1) El diagrama: datos de nodos y conexiones ----------
const NODOS = [
  { id: "A", tipo: "circulo",   x: 80,  y: 260, t: ["Llega un", "mensaje"] },
  { id: "B", tipo: "triangulo", x: 270, y: 260, t: ["Clasificar"] },
  { id: "C", tipo: "cuadrado",  x: 520, y: 100, t: ["Extraer", "datos"] },
  { id: "D", tipo: "cuadrado",  x: 690, y: 100, t: ["Estimar", "trabajo"] },
  { id: "E", tipo: "circulo",   x: 880, y: 100, t: ["Borrador", "listo"] },
  { id: "F", tipo: "cuadrado",  x: 520, y: 260, t: ["Avisar", "urgente"] },
  { id: "H", tipo: "circulo",   x: 880, y: 260, t: ["Aviso", "enviado"] },
  { id: "G", tipo: "cuadrado",  x: 520, y: 420, t: ["Archivar"] },
  { id: "I", tipo: "circulo",   x: 880, y: 420, t: ["Fin"] },
];
const ARISTAS = [
  ["A", "B"], ["B", "C", "presupuesto"], ["C", "D"], ["D", "E"],
  ["B", "F", "urgente"], ["F", "H"], ["B", "G", "otro"], ["G", "I"],
];
const R = 36, W = 116, H = 64; // radio del círculo, ancho y alto del cuadrado
const porId = Object.fromEntries(NODOS.map((n) => [n.id, n]));

const el = (tag, attrs = {}, padre) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (padre) padre.appendChild(e);
  return e;
};
// Punto donde sale/entra una línea en cada tipo de figura
const salida = (n) => ({ circulo: [n.x + R, n.y], cuadrado: [n.x + W / 2, n.y], triangulo: [n.x + 38, n.y] })[n.tipo];
const entrada = (n) => ({ circulo: [n.x - R, n.y], cuadrado: [n.x - W / 2, n.y], triangulo: [n.x - 30, n.y] })[n.tipo];

const gAristas = $("#aristas"), gEtiquetas = $("#etiquetas"), gNodos = $("#nodos");
const caminos = {}; // "A-B" -> elemento <path> de esa conexión

ARISTAS.forEach(([a, b, nombre]) => {
  const [x1, y1] = salida(porId[a]), [x2, y2] = entrada(porId[b]);
  const dx = (x2 - x1) * 0.5;
  const d = `M${x1} ${y1} C${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
  caminos[a + "-" + b] = el("path", { d, class: "arista" }, gAristas);
  if (nombre) {
    // La etiqueta se ubica sobre la propia curva (al 55% del recorrido) para que no se pisen entre ramas
    const camino = caminos[a + "-" + b];
    const p = camino.getPointAtLength(camino.getTotalLength() * 0.55);
    const arriba = y2 < y1, abajo = y2 > y1;
    const t = el("text", { x: arriba || abajo ? p.x - 14 : p.x, y: arriba ? p.y : abajo ? p.y + 6 : p.y - 14, class: "etiqueta", "text-anchor": arriba || abajo ? "end" : "middle" }, gEtiquetas);
    t.textContent = nombre;
  }
});

NODOS.forEach((n) => {
  const g = el("g", { class: `nodo nodo--${n.tipo}`, id: "nodo-" + n.id }, gNodos);
  if (n.tipo === "circulo") el("circle", { cx: n.x, cy: n.y, r: R, class: "cuerpo" }, g);
  if (n.tipo === "cuadrado") el("rect", { x: n.x - W / 2, y: n.y - H / 2, width: W, height: H, class: "cuerpo" }, g);
  if (n.tipo === "triangulo") el("polygon", { points: `${n.x - 30},${n.y - 40} ${n.x - 30},${n.y + 40} ${n.x + 38},${n.y}`, class: "cuerpo" }, g);
  // Texto: adentro en los cuadrados, abajo en círculos y triángulos
  const dentro = n.tipo === "cuadrado";
  const y0 = dentro ? n.y - (n.t.length - 1) * 9 + 5 : n.y + (n.tipo === "triangulo" ? 66 : 58);
  n.t.forEach((linea, i) => {
    const t = el("text", { x: n.x, y: y0 + i * 19 }, g);
    t.textContent = linea;
  });
});

// ---------- 2) La lógica: clasificar y extraer datos ----------
const limpiar = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const buscar = (texto, lista) => lista.filter((p) => texto.includes(p));

const PALABRAS = {
  urgente: ["urgente", "emergencia", "pierde", "inund", "gotea", "chispa", "cortocircuito", "sin luz", "no funciona", "se rompio", "humo", "olor a gas"],
  presupuesto: ["presupuesto", "cotiz", "precio", "cuanto sale", "cuanto cuesta", "instal", "cambiar", "colocar", "arreglar", "reparar", "construir", "pintar", "revoque", "caneria", "canilla", "tomacorriente", "toma ", "termica", "tablero", "cable", "pared", "bano", "cocina", "techo", "piso", "m2", "metros"],
};
const RUBROS = {
  "electricidad": ["luz", "cable", "tomacorriente", "toma ", "termica", "tablero", "enchuf", "interruptor", "electric"],
  "plomería": ["canilla", "cano", "caneria", "agua", "bano", "inodoro", "plomer", "termotanque", "desague", "griferia"],
  "albañilería": ["pared", "ladrillo", "revoque", "piso", "techo", "albanil", "cemento", "m2", "metros cuadrados"],
};

function clasificar(texto) {
  const t = limpiar(texto) + " ";
  const urg = buscar(t, PALABRAS.urgente);
  if (urg.length) return { categoria: "urgente", claves: urg };
  const pre = buscar(t, PALABRAS.presupuesto);
  if (pre.length) return { categoria: "presupuesto", claves: pre };
  return { categoria: "otro", claves: [] };
}

function extraer(texto) {
  const t = limpiar(texto) + " ";
  let rubro = "arreglos generales", mejor = 0;
  for (const nombre in RUBROS) {
    const n = buscar(t, RUBROS[nombre]).length;
    if (n > mejor) { mejor = n; rubro = nombre; }
  }
  const u = t.match(/(\d+)\s*(tomacorrientes?|tomas?|canillas?|puntos?|ventanas?|luces|lamparas?|bocas?)/);
  const m2 = t.match(/(\d+(?:[.,]\d+)?)\s*(m2|m²|metros cuadrados|mts2)/);
  const tel = texto.match(/(\+?\d[\d\s-]{7,}\d)/);
  const mail = texto.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  const zona = t.match(/(tigre|delta|dique lujan|rincon de milberg|don torcuato|isla|san fernando|nordelta|pacheco)/);
  return {
    rubro,
    unidades: u ? { n: Number(u[1]), tipo: u[2] } : null,
    m2: m2 ? Number(m2[1].replace(",", ".")) : null,
    contacto: mail ? mail[0] : tel ? tel[0].trim() : null,
    zona: zona ? zona[1] : null,
  };
}

function estimarHoras(d) {
  let h;
  if (d.rubro === "electricidad") h = 3 + 0.75 * (d.unidades ? d.unidades.n : 4);
  else if (d.rubro === "plomería") h = 3 + 1 * (d.unidades ? d.unidades.n : 2);
  else if (d.rubro === "albañilería") h = d.m2 ? 0.6 * d.m2 : 8;
  else h = 4;
  h = Math.round(h * 2) / 2;
  return { min: Math.max(1, Math.round(h * 0.8 * 2) / 2), max: Math.round(h * 1.2 * 2) / 2 };
}

// ---------- 3) Animación: la ficha viaja por cada conexión ----------
const ficha = $("#ficha");
const lienzo = $("#lienzo");

function viajar(camino) {
  if (!camino) return Promise.resolve();
  camino.classList.add("recorrida");
  if (sinMovimiento) return Promise.resolve();
  const largo = camino.getTotalLength();
  const dur = Math.max(450, largo / 0.55);
  const viva = camino.cloneNode();
  viva.setAttribute("class", "arista--viva");
  viva.style.strokeDasharray = largo;
  viva.style.strokeDashoffset = largo;
  camino.parentNode.appendChild(viva);
  return new Promise((ok) => {
    const t0 = performance.now();
    (function paso(ahora) {
      const t = Math.min((ahora - t0) / dur, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const p = camino.getPointAtLength(largo * e);
      ficha.setAttribute("cx", p.x);
      ficha.setAttribute("cy", p.y);
      viva.style.strokeDashoffset = largo * (1 - e);
      if (t < 1) requestAnimationFrame(paso);
      else { viva.remove(); ok(); }
    })(t0);
  });
}

// ---------- 4) Registro y resultado (se arman con DOM, nunca con el texto del usuario como HTML) ----------
const registro = $("#registro");
const salidaEl = $("#salida");

function anotar(letra, titulo, detalle) {
  const li = document.createElement("li");
  const l = document.createElement("span"); l.className = "letra"; l.textContent = letra;
  const d = document.createElement("div");
  const s = document.createElement("strong"); s.textContent = titulo;
  const x = document.createElement("span"); x.className = "detalle"; x.textContent = detalle;
  d.append(s, x);
  li.append(l, d);
  registro.appendChild(li);
}
function mostrarSalida(titulo, cuerpo, pie, clase) {
  salidaEl.className = "salida " + (clase || "");
  salidaEl.replaceChildren();
  const h = document.createElement("h3"); h.textContent = titulo;
  const p = document.createElement("p"); p.textContent = cuerpo;
  salidaEl.append(h, p);
  if (pie) { const f = document.createElement("p"); f.className = "pie-salida"; f.textContent = pie; salidaEl.appendChild(f); }
}

async function activar(id, previo) {
  if (previo) await viajar(caminos[previo + "-" + id]);
  document.querySelectorAll(".nodo.activo").forEach((n) => { n.classList.remove("activo"); n.classList.add("visto"); });
  $("#nodo-" + id).classList.add("activo");
}

// ---------- 5) Ejecutar ----------
const EJEMPLOS = [
  "Hola, quiero un presupuesto para cambiar 6 tomacorrientes y la térmica del living. Estoy en Tigre. Mi cel es 11 5555 0123.",
  "Se me rompió un caño y pierde agua en el baño, es urgente!!",
  "Ganá dinero rápido desde casa con este link: http://oferta-increible.example",
];
const mensaje = $("#mensaje");
const boton = $("#ejecutar");
mensaje.value = EJEMPLOS[0];
document.querySelectorAll(".ejemplo").forEach((b) => b.addEventListener("click", () => { mensaje.value = EJEMPLOS[b.dataset.i]; }));

function reiniciar() {
  lienzo.classList.remove("corriendo");
  document.querySelectorAll(".nodo").forEach((n) => n.classList.remove("activo", "visto"));
  document.querySelectorAll(".arista").forEach((a) => a.classList.remove("recorrida"));
  document.querySelectorAll(".arista--viva").forEach((a) => a.remove());
  ficha.setAttribute("cx", -50); ficha.setAttribute("cy", -50);
  registro.replaceChildren();
  salidaEl.className = "salida";
  salidaEl.replaceChildren();
}

boton.addEventListener("click", async () => {
  const texto = mensaje.value.trim();
  if (!texto) { mensaje.focus(); return; }
  boton.disabled = true;
  reiniciar();
  lienzo.classList.add("corriendo");

  const palabras = texto.split(/\s+/).length;
  await activar("A");
  anotar("A", "Llega un mensaje", `${palabras} palabras, ${texto.length} caracteres`);
  await pausa(600);

  await activar("B", "A");
  const c = clasificar(texto);
  anotar("B", "Clasificar", c.claves.length ? `Categoría: ${c.categoria}. Palabras clave: ${c.claves.slice(0, 4).join(", ")}` : "Categoría: otro. No hay palabras de trabajo ni de urgencia.");
  await pausa(650);

  if (c.categoria === "presupuesto") {
    await activar("C", "B");
    const d = extraer(texto);
    const partes = [`rubro: ${d.rubro}`];
    if (d.unidades) partes.push(`cantidad: ${d.unidades.n} ${d.unidades.tipo}`);
    if (d.m2) partes.push(`superficie: ${d.m2} m²`);
    partes.push(`zona: ${d.zona || "sin indicar"}`, `contacto: ${d.contacto || "sin indicar"}`);
    anotar("C", "Extraer datos", partes.join(" · "));
    await pausa(650);

    await activar("D", "C");
    const h = estimarHoras(d);
    anotar("D", "Estimar trabajo", `Entre ${h.min} y ${h.max} horas, más materiales (estimación de ejemplo)`);
    await pausa(650);

    await activar("E", "D");
    const faltan = [];
    if (d.rubro === "arreglos generales") faltan.push("qué trabajo es exactamente");
    if (!d.unidades && !d.m2) faltan.push("la cantidad o las medidas");
    if (!d.contacto) faltan.push("un teléfono o mail");
    if (!d.zona) faltan.push("la zona");
    const pide = faltan.length ? `Para cerrar el presupuesto me falta saber ${faltan.join(", ")}.` : "Con esos datos ya puedo armarte el presupuesto.";
    anotar("E", "Borrador listo", faltan.length ? `Faltan datos: ${faltan.join(", ")}` : "Datos completos");
    mostrarSalida("Borrador de respuesta",
      `Hola, gracias por escribir. Por lo que contás es un trabajo de ${d.rubro}, de entre ${h.min} y ${h.max} horas más materiales. ${pide} Cuando lo tengamos te mando el presupuesto en PDF.`,
      faltan.length ? "Estado: espera respuesta del cliente." : "Estado: listo para generar el presupuesto.", "salida--ok");
  } else if (c.categoria === "urgente") {
    await activar("F", "B");
    const t = limpiar(texto);
    const riesgos = [];
    if (/gas/.test(t)) riesgos.push("gas");
    if (/chispa|cortocircuito|sin luz|humo/.test(t)) riesgos.push("electricidad");
    if (/agua|pierde|gotea|inund|cano/.test(t)) riesgos.push("agua");
    const riesgo = riesgos.length ? riesgos.join(", ") : "sin determinar";
    anotar("F", "Avisar urgente", `Notificación enviada (simulada). Riesgo: ${riesgo}`);
    await pausa(650);
    await activar("H", "F");
    anotar("H", "Aviso enviado", "Pasa al frente de la fila de pendientes");
    mostrarSalida("Aviso urgente",
      `Mensaje: «${texto.length > 110 ? texto.slice(0, 110) + "…" : texto}» Riesgo: ${riesgo}. Respuesta automática al cliente: «Recibimos tu aviso. Si hay riesgo, cortá la llave de paso o la energía y te contactamos enseguida.»`,
      "Estado: avisado, prioridad alta.", "salida--urgente");
  } else {
    await activar("G", "B");
    anotar("G", "Archivar", "No parece una consulta de trabajo. Se guarda sin responder");
    await pausa(650);
    await activar("I", "G");
    anotar("I", "Fin", "Sin acciones pendientes");
    mostrarSalida("Archivado", "El mensaje no se parece a una consulta de trabajo ni a una urgencia, así que no genera respuesta ni avisos.", "Estado: archivado.");
  }

  document.querySelectorAll(".nodo.activo").forEach((n) => { n.classList.remove("activo"); n.classList.add("visto"); });
  ficha.setAttribute("cx", -50); ficha.setAttribute("cy", -50);
  boton.disabled = false;
});

// ---------- 6) Las figuras del título se mueven con el mouse ----------
if (matchMedia("(pointer: fine)").matches && !sinMovimiento) {
  const formas = document.querySelectorAll(".forma");
  window.addEventListener("pointermove", (e) => {
    const x = e.clientX / innerWidth - 0.5, y = e.clientY / innerHeight - 0.5;
    formas.forEach((f) => {
      const k = Number(f.dataset.prof);
      f.style.transform = `translate(${x * k * 2}px, ${y * k * 2}px) rotate(${x * k * 0.6}deg)`;
    });
  });
}
