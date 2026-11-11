// ===== MENÚ DE CELULAR =====
// Al tocar el botón de las tres rayitas, mostramos u ocultamos el menú.

// 1) Buscamos en la página los dos elementos que necesitamos, por su id
const botonMenu = document.getElementById("boton-menu");
const menu = document.getElementById("menu");

// 2) Cuando alguien hace clic en el botón...
botonMenu.addEventListener("click", () => {
  // toggle = si la clase "abierto" está, la saca; si no está, la pone.
  // El CSS (.menu.abierto) es lo que realmente muestra el menú.
  const abierto = menu.classList.toggle("abierto");

  // Avisamos a los lectores de pantalla si el menú quedó abierto o cerrado
  botonMenu.setAttribute("aria-expanded", abierto);
});

// 3) Al tocar cualquier enlace del menú, lo cerramos (si no, tapa la página después de saltar)
menu.querySelectorAll("a").forEach((enlace) => {
  enlace.addEventListener("click", () => {
    menu.classList.remove("abierto");
    botonMenu.setAttribute("aria-expanded", "false");
  });
});
