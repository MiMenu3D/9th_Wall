// Menu v2.0 - dos páginas html - Over Success04-Copilot 1.09

let current = 0;
let mv = null;
const models = [
  "Plato_01.glb","Plato_02.glb","Plato_03.glb","Plato_04.glb",
  "Plato_05.glb","Plato_06.glb","Plato_07.glb","Plato_08.glb",
  "Plato_09.glb","Plato_10.glb","Plato_11.glb","Plato_12.glb",
  "Plato_13.glb","Plato_14.glb","Plato_15.glb"
];

function createMV(){
  const container = document.getElementById("mvContainer");
  container.innerHTML = `
    <model-viewer
      id="mv"
      src="${models[current]}"
      autoplay
      auto-rotate
      auto-rotate-delay="0"
      rotation-per-second="17deg"
      camera-orbit="0deg 70deg 45%"
      min-camera-orbit="0deg 0deg 45%"
      max-camera-orbit="360deg 90deg 45%"
      camera-controls="false"
      touch-action="none"
      disable-pan
      disable-zoom
      interaction-prompt="none"
      shadow-intensity="0.4"
      exposure="0.80"
      style="background-color:#1f1a17;">
    </model-viewer>`;

  mv = document.getElementById("mv");
  mv.addEventListener("load", () => mv.style.opacity = "1", {once:true});
  document.getElementById("label").innerText = "Plato " + (current + 1);
}

function updateMV(){
  if (!mv) return;
  mv.style.opacity = "0";
  mv.setAttribute("src", models[current]);
  mv.addEventListener("load", () => mv.style.opacity = "1", {once:true});
  document.getElementById("label").innerText = "Plato " + (current + 1);
}

function destroyMV(){
  document.getElementById("mvContainer").innerHTML = "";
  mv = null;
}

function prev(){
  current = (current - 1 + models.length) % models.length;
  if (!mv) {
    createMV();
  }
  updateMV();
}

function next(){
  current = (current + 1) % models.length;
  if (!mv) {
    createMV();
  }
  updateMV();
}

function startAR(){
  destroyMV();
  sessionStorage.setItem("from_ar", "1");
  sessionStorage.setItem("modelo_actual", current);
  window.location.href = "ar-world.html";
}

window.addEventListener("pageshow", () => {
  const fromAR = sessionStorage.getItem("from_ar") === "1";
  sessionStorage.removeItem("from_ar");

  if (fromAR) {
    const saved = sessionStorage.getItem("modelo_actual");
    if (saved !== null) current = parseInt(saved);
  } else {
    current = 0;
  }

  // Siempre recrear model-viewer limpio (evita glitch de BFCache)
  destroyMV();
  createMV();
});
