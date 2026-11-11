// ===== PROYECTOS DESDE UN ARCHIVO =====
// Las tarjetas de la sección "Proyectos" no están escritas en el HTML:
// salen del archivo proyectos.json. Para sumar un proyecto alcanza con agregar un bloque a ese archivo.

// Texto que se muestra en la etiqueta de estado de cada tarjeta
const ESTADOS = {
  demo:       { texto: "Demo interactiva", clase: "estado--listo" },
  terminado:  { texto: "Terminado",        clase: "estado--listo" },
  desarrollo: { texto: "En desarrollo",    clase: "estado--proceso" },
};

const contenedor = document.getElementById("lista-proyectos");

// Atajo para crear un elemento: crear("p", "etiquetas", "HTML · CSS")
// Usamos textContent (y no innerHTML) para que el texto siempre se muestre como texto, nunca como código.
function crear(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

// Atajo para armar un botón-enlace. Los que van a otro sitio se abren en pestaña nueva.
function enlace(texto, href, clases) {
  const a = crear("a", "boton boton--chico " + clases, texto);
  a.href = href;
  if (href.startsWith("http")) { a.target = "_blank"; a.rel = "noopener"; }
  return a;
}

// Arma UNA tarjeta a partir de un proyecto del JSON
function armarTarjeta(p) {
  const estado = ESTADOS[p.estado] || ESTADOS.desarrollo;
  const tarjeta = crear("article", "proyecto");

  // Captura (solo si el proyecto tiene una). loading="lazy": el navegador la descarga cuando está por verse.
  if (p.captura) {
    const img = crear("img", "proyecto__captura");
    img.src = p.captura;
    img.alt = p.alt || "";
    img.loading = "lazy";
    img.width = 1200;
    img.height = 750; // width y height reservan el lugar y evitan que la página "salte" al cargar
    tarjeta.appendChild(img);
  }

  tarjeta.appendChild(crear("span", "estado " + estado.clase, estado.texto));
  tarjeta.appendChild(crear("h3", "", p.titulo));

  // Problema y solución: cada caso se cuenta con esas dos frases
  const problema = crear("p", "proyecto__dato");
  problema.append(crear("strong", "", "Problema: "), p.problema);
  const solucion = crear("p", "proyecto__dato");
  solucion.append(crear("strong", "", "Solución: "), p.solucion);
  tarjeta.append(problema, solucion);

  tarjeta.appendChild(crear("p", "etiquetas", p.tecnologias.join(" · ")));

  // Botones: aparecen solo los que el proyecto tiene cargados
  const botones = crear("div", "enlaces");
  if (p.enlaceVivo)   botones.appendChild(enlace("Ver demo", p.enlaceVivo, "boton--lleno"));
  if (p.enlaceCaso)   botones.appendChild(enlace("Ver el caso", p.enlaceCaso, "boton--borde"));
  if (p.enlaceCodigo) botones.appendChild(enlace("Código", p.enlaceCodigo, "boton--borde"));
  if (botones.children.length) tarjeta.appendChild(botones);

  return tarjeta;
}

// fetch() pide un archivo al servidor y devuelve una "promesa": algo que se cumple cuando llega la respuesta.
// .then() dice qué hacer cuando llegó. Acá: convertir el texto a objetos (.json()) y dibujar las tarjetas.
fetch("proyectos.json")
  .then((respuesta) => {
    if (!respuesta.ok) throw new Error("No se pudo leer proyectos.json");
    return respuesta.json();
  })
  .then((proyectos) => {
    contenedor.replaceChildren(...proyectos.map(armarTarjeta));
  })
  .catch(() => {
    // Si algo falla, se avisa y se deja un camino alternativo en vez de una sección vacía
    const aviso = crear("p", "cargando", "No pude cargar los proyectos. ");
    const a = crear("a", "", "Mirá el código en GitHub.");
    a.href = "https://github.com/MarcoSaad";
    aviso.appendChild(a);
    contenedor.replaceChildren(aviso);
  });
