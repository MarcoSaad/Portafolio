// ===== Revisado: encontrá el error =====
// Tres casos armados. Cada uno tiene la línea con el error (indice) y una explicación para cada línea.

const CASOS = [
  {
    titulo: "Cálculo de un presupuesto",
    pedido: "Calculame los materiales y la mano de obra de este trabajo de plomería.",
    codigo: false,
    lineas: [
      "Caño termofusión 20 mm: 6 × $8.500 = $51.000",
      "Codo termofusión 20 mm: 10 × $950 = $9.500",
      "Mano de obra: 8 h × $14.000 = $122.000",
      "Total del trabajo: $182.500",
    ],
    indice: 2,
    porque: [
      "6 × 8.500 da 51.000. Esta cuenta está bien.",
      "10 × 950 da 9.500. Esta cuenta está bien.",
      "8 × 14.000 da $112.000, no $122.000. La IA se equivocó por $10.000 y lo dijo con total seguridad.",
      "La suma es correcta con los datos que tiene. El problema nace en la línea anterior y se arrastra hasta el total.",
    ],
    chequeo: "Rehago cada cuenta por separado, empezando por la que más pesa.",
    prueba: "Con la calculadora: 51.000 + 9.500 + 112.000 = 172.500. El total correcto era $172.500, no $182.500.",
  },
  {
    titulo: "Una función de JavaScript",
    pedido: "Escribime una función que sume los precios de un carrito.",
    codigo: true,
    lineas: [
      "function totalCarrito(items) {",
      "  let total = 0;",
      "  for (let i = 0; i <= items.length; i++) {",
      "    total += items[i].precio;",
      "  }",
      "  return total;",
      "}",
    ],
    indice: 2,
    porque: [
      "Declara la función. Está bien.",
      "Arranca el acumulador en cero. Está bien.",
      "Con <= el bucle da una vuelta de más: items[items.length] no existe y la línea siguiente falla. Tiene que ser <.",
      "Esta línea es la que se rompe, pero por culpa del bucle de arriba. El origen está antes.",
      "Cierra el bucle. Está bien.",
      "Devuelve el total. Está bien.",
      "Cierra la función. Está bien.",
    ],
    chequeo: "Pruebo con un caso mínimo antes de confiar: una lista vacía y una con un solo ítem.",
    prueba: "totalCarrito([{ precio: 100 }]) no devuelve 100: lanza «Cannot read properties of undefined» al dar la vuelta de más.",
  },
  {
    titulo: "Una pregunta técnica",
    pedido: "¿Cómo sumo una lista de precios en JavaScript?",
    codigo: false,
    lineas: [
      "Podés sumar los precios con un método del propio array:",
      "const total = precios.sum();",
      "Otra forma, más larga, es usar reduce:",
      "const total = precios.reduce((acc, p) => acc + p, 0);",
    ],
    indice: 1,
    porque: [
      "Es solo una introducción, sin afirmaciones técnicas.",
      "Los arrays de JavaScript no tienen un método sum(). La IA lo inventó: suena razonable, pero no existe.",
      "Esto es correcto: reduce existe y es la forma habitual.",
      "Correcto: reduce recibe una función y el valor inicial 0.",
    ],
    chequeo: "Lo que no conozco lo confirmo en la documentación o lo ejecuto en la consola.",
    prueba: "Al ejecutarlo, la consola responde «precios.sum is not a function». En la documentación de Array no figura ningún método sum().",
  },
];

const $ = (s) => document.querySelector(s);
const estado = { caso: 0, intentos: 0, aciertos: [], resuelto: false };

const ficha = $("#ficha"), lineas = $("#lineas"), sello = $("#sello"), respuesta = $("#respuesta");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

function crear(tag, clase, texto) {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (texto !== undefined) e.textContent = texto;
  return e;
}

function pintarCaso() {
  const c = CASOS[estado.caso];
  estado.intentos = 0;
  estado.resuelto = false;
  $("#progreso").textContent = `Caso ${estado.caso + 1} de ${CASOS.length}`;
  $("#tituloCaso").textContent = c.titulo;
  $("#pedido").textContent = c.pedido;
  $("#documentoCaja").classList.toggle("codigo", c.codigo);
  sello.classList.remove("estampa");
  respuesta.replaceChildren();
  lineas.replaceChildren();
  c.lineas.forEach((texto, i) => {
    const li = document.createElement("li");
    const b = crear("button", "linea", texto);
    b.type = "button";
    b.addEventListener("click", () => tocar(i, b));
    li.appendChild(b);
    lineas.appendChild(li);
  });
}

function tocar(i, boton) {
  if (estado.resuelto) return;
  const c = CASOS[estado.caso];
  if (i === c.indice) return acertar(boton);

  estado.intentos++;
  boton.classList.remove("mal");
  void boton.offsetWidth; // reinicia la animación si se toca la misma línea dos veces
  boton.classList.add("mal");
  respuesta.replaceChildren();
  const nota = crear("div", "nota nota--mal");
  nota.append(crear("strong", "", "Esa no es."), crear("p", "", c.porque[i]));
  if (estado.intentos >= 3) {
    const r = crear("button", "accion accion--suave", "Mostrame el error");
    r.type = "button";
    r.addEventListener("click", () => acertar(lineas.children[c.indice].firstChild, true));
    nota.appendChild(r);
  }
  respuesta.appendChild(nota);
}

function acertar(boton, rendido = false) {
  const c = CASOS[estado.caso];
  estado.resuelto = true;
  estado.aciertos.push(!rendido && estado.intentos === 0);
  lineas.querySelectorAll(".linea").forEach((b) => { b.disabled = true; b.classList.remove("mal"); });
  boton.classList.add("error");

  // El sello cae y la ficha da un golpe
  sello.classList.remove("estampa"); void sello.offsetWidth; sello.classList.add("estampa");
  ficha.classList.remove("golpe"); void ficha.offsetWidth; if (!sinMovimiento) ficha.classList.add("golpe");

  // Marca el chequeo correspondiente en la planilla
  document.querySelector(`#chequeos li[data-c="${estado.caso}"]`).classList.add("hecho");

  respuesta.replaceChildren();
  const nota = crear("div", "nota nota--bien");
  nota.append(
    crear("strong", "", rendido ? "Este era el error." : "Lo encontraste."),
    crear("p", "", c.porque[c.indice]),
    crear("p", "como", "Cómo lo detecto: " + c.chequeo),
    crear("p", "como", "Verificación: " + c.prueba),
  );
  const ultimo = estado.caso === CASOS.length - 1;
  const sig = crear("button", "accion", ultimo ? "Ver resultado" : "Siguiente caso");
  sig.type = "button";
  sig.addEventListener("click", () => { ultimo ? final() : (estado.caso++, pintarCaso(), ficha.scrollIntoView({ behavior: sinMovimiento ? "auto" : "smooth", block: "start" })); });
  nota.appendChild(sig);
  respuesta.appendChild(nota);
}

function final() {
  const primera = estado.aciertos.filter(Boolean).length;
  $("#progreso").textContent = "Resultado";
  $("#tituloCaso").textContent = "Tres casos revisados";
  $("#pedido").textContent = "Revisá siempre lo que devuelve la IA.";
  $("#documentoCaja").hidden = true;
  sello.classList.remove("estampa");
  respuesta.replaceChildren();
  const nota = crear("div", "nota nota--bien final");
  nota.append(
    crear("h3", "", `${primera} de 3 a la primera`),
    crear("p", "", "Los tres errores eran de los que una IA comete con total seguridad: una cuenta mal hecha, un bucle que se pasa de largo y un método que no existe. Ninguno se ve a simple vista."),
    crear("p", "como", "Por eso trabajo así: la IA propone, yo reviso y verifico antes de entregar. Los casos que me pasan de verdad van a la bitácora de errores."),
  );
  const otra = crear("button", "accion accion--suave", "Probar de nuevo");
  otra.type = "button";
  otra.addEventListener("click", reiniciar);
  nota.appendChild(otra);
  respuesta.appendChild(nota);
}

function reiniciar() {
  estado.caso = 0;
  estado.aciertos = [];
  $("#documentoCaja").hidden = false;
  document.querySelectorAll("#chequeos li").forEach((li) => li.classList.remove("hecho"));
  pintarCaso();
}

pintarCaso();
