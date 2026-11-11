// ===== Auditoría exprés: comparador antes/después =====

const marco = document.getElementById("marco");
const lienzo = document.getElementById("lienzo");
const control = document.getElementById("control");
const sinMovimiento = matchMedia("(prefers-reduced-motion: reduce)").matches;

// 1) El "lienzo" mide 960x600 fijos y se escala para entrar en cualquier ancho de pantalla.
function escalar() {
  marco.style.setProperty("--escala", marco.clientWidth / 960);
}
new ResizeObserver(escalar).observe(marco);
escalar();

// 2) La posición de la línea (0 a 100) viaja a CSS como variable: CSS recorta la capa "después" con clip-path.
function mover(valor) {
  marco.style.setProperty("--pos", valor + "%");
  control.value = valor;
}
control.addEventListener("input", () => {
  cancelarBarrido();
  mover(control.value);
});

// 3) Momento de entrada: la línea arranca en 100 (todo "antes") y barre hasta 50 cuando el marco aparece en pantalla.
let barrido = null;
function cancelarBarrido() {
  if (barrido) cancelAnimationFrame(barrido);
  barrido = null;
}
function barrerHasta(destino, duracion) {
  const inicio = performance.now();
  const desde = Number(control.value);
  const suave = (t) => 1 - Math.pow(1 - t, 3); // ease-out cúbico
  function paso(ahora) {
    const t = Math.min((ahora - inicio) / duracion, 1);
    mover(desde + (destino - desde) * suave(t));
    barrido = t < 1 ? requestAnimationFrame(paso) : null;
  }
  barrido = requestAnimationFrame(paso);
}

const vigia = new IntersectionObserver((entradas) => {
  if (!entradas[0].isIntersecting) return;
  vigia.disconnect();
  marco.classList.add("escrito"); // dispara el dibujo de las anotaciones
  if (sinMovimiento) { mover(50); return; }
  setTimeout(() => { if (barrido === null && Number(control.value) === 100) barrerHasta(50, 1800); }, 2600);
}, { threshold: 0.35 });
vigia.observe(marco);

// 4) Cifras: cuentan desde el valor "antes" hasta el valor "después" al aparecer.
const cifras = document.querySelectorAll("[data-desde]");
const vigiaCifras = new IntersectionObserver((entradas) => {
  entradas.forEach((e) => {
    if (!e.isIntersecting) return;
    vigiaCifras.unobserve(e.target);
    const desde = Number(e.target.dataset.desde);
    const hasta = Number(e.target.dataset.hasta);
    if (sinMovimiento) { e.target.textContent = hasta; return; }
    const inicio = performance.now();
    (function paso(ahora) {
      const t = Math.min((ahora - inicio) / 1400, 1);
      e.target.textContent = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - t, 3)));
      if (t < 1) requestAnimationFrame(paso);
    })(inicio);
  });
}, { threshold: 0.6 });
cifras.forEach((c) => vigiaCifras.observe(c));

// 5) Luz que sigue al mouse (solo con mouse, no en celulares)
if (matchMedia("(pointer: fine)").matches && !sinMovimiento) {
  window.addEventListener("pointermove", (e) => {
    document.documentElement.style.setProperty("--mx", e.clientX + "px");
    document.documentElement.style.setProperty("--my", e.clientY + "px");
  });
}
