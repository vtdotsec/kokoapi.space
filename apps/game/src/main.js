import { SantaBrumaWorld } from "./world.js";
import { GameUI } from "./ui.js";

const ui = new GameUI();
const world = new SantaBrumaWorld(document.getElementById("scene"), ui, {
  onPause: pauseGame,
  onWin: winGame,
  onDeath: loseGame,
  onManualSave: saveGame,
  onAutoSave: saveGame,
  onStateChange: scheduleSave,
});

let latestSave = null;
let saveTimer = 0;
let busy = false;

async function requestSave() {
  const response = await fetch("/api/save", { cache: "no-store", credentials: "same-origin" });
  if (!response.ok) throw new Error(`Save unavailable (${response.status})`);
  const result = await response.json();
  latestSave = result.save;
  document.getElementById("continue-game").hidden = !latestSave || latestSave.player.health <= 0;
  return result;
}

async function saveGame() {
  if (busy) return;
  busy = true;
  try {
    const response = await fetch("/api/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify(world.snapshot()),
    });
    if (!response.ok) throw new Error(`Save failed (${response.status})`);
    latestSave = world.snapshot();
    document.getElementById("continue-game").hidden = false;
  } catch {
    ui.toast("Não foi possível salvar no servidor.");
  } finally {
    busy = false;
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveGame, 650);
  world.requestAutoSave();
}

function pauseGame() {
  if (!world.isActive) return;
  world.setActive(false);
  ui.setScreen("pause");
  saveGame();
}

function startGame(save) {
  if (save) world.restore(save);
  else world.createNewGame();
  world.setActive(true);
  ui.setScreen("game");
  if (!save) saveGame();
}

function winGame(elapsed, escaped) {
  const minutes = Math.max(1, Math.floor(elapsed / 60));
  ui.showEnding("A porta abriu.", `Você saiu da clínica em ${minutes} minuto(s). ${escaped ? `${escaped} infectado(s) ainda vagam lá dentro.` : "A ala ficou em silêncio."}`);
}

function loseGame() {
  ui.showEnding("A clínica ficou em silêncio.", "A cidade ainda precisa de alguém. Tente outra vez.");
}

function exportSave() {
  const blob = new Blob([JSON.stringify(world.snapshot(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "santa-bruma-save.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  ui.toast("Cópia local do arquivo criada.");
}

document.getElementById("new-game").addEventListener("click", () => startGame(null));
document.getElementById("continue-game").addEventListener("click", () => {
  if (latestSave && latestSave.player.health > 0) startGame(latestSave);
});
document.getElementById("show-controls").addEventListener("click", () => ui.setScreen("controls"));
document.getElementById("close-controls").addEventListener("click", () => ui.setScreen("title"));
document.getElementById("resume-game").addEventListener("click", () => {
  world.setActive(true);
  ui.setScreen("game");
});
document.getElementById("save-game").addEventListener("click", exportSave);
document.getElementById("return-title").addEventListener("click", () => {
  world.setActive(false);
  ui.setScreen("title");
});
document.getElementById("ending-restart").addEventListener("click", () => startGame(null));

requestSave().catch(() => {
  ui.toast("O arquivo do jogo está indisponível. Atualize a página.");
}).finally(() => {
  document.getElementById("loading-screen").hidden = true;
  ui.setScreen("title");
});
