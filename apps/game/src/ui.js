const byId = (id) => document.getElementById(id);

export class GameUI {
  constructor() {
    this.title = byId("title-screen");
    this.hud = byId("hud");
    this.pause = byId("pause-screen");
    this.controls = byId("controls-screen");
    this.ending = byId("ending-screen");
    this.toastTimer = 0;
    this.lastValues = new Map();
  }

  setScreen(name) {
    this.title.hidden = name !== "title";
    this.hud.hidden = name !== "game";
    this.pause.hidden = name !== "pause";
    this.controls.hidden = name !== "controls";
    this.ending.hidden = name !== "ending";
  }

  setRoom(name) { this.setText("room-name", name); }

  setText(id, value) {
    if (this.lastValues.get(id) === value) return;
    this.lastValues.set(id, value);
    const element = byId(id);
    if (element) element.textContent = value;
  }

  update(save) {
    const health = Math.round(save.player.health);
    const condition = health > 70 ? "FIRME" : health > 35 ? "FERIDO" : "CRÍTICO";
    this.setText("health-label", condition);
    const bar = byId("health-bar");
    const size = `${health}%`;
    if (bar.style.width !== size) bar.style.width = size;
    bar.classList.toggle("wounded", health <= 70 && health > 35);
    bar.classList.toggle("critical", health <= 35);
    this.setText("ammo-count", String(save.player.ammo).padStart(2, "0"));
    this.setText("ammo-reserve", String(save.player.reserve).padStart(2, "0"));
    const inventory = [save.inventory.fuse ? "FUSÍVEL" : "", save.inventory.keycard ? "CARTÃO" : ""].filter(Boolean).join(" · ") || "VAZIO";
    this.setText("inventory-text", inventory);
    const objective = save.inventory.fuse && save.inventory.keycard
      ? "Vá até o elevador no fim da ala."
      : save.inventory.fuse
        ? "Encontre o cartão de acesso no arquivo clínico."
        : save.inventory.keycard
          ? "Encontre um fusível na ala oeste."
          : "Encontre um fusível e um cartão de acesso.";
    this.setText("objective-text", objective);
    this.setText("game-minute", String(47 + Math.floor(save.elapsed / 60)).padStart(2, "0"));
  }

  setAim(visible) { byId("aim-reticle").hidden = !visible; }

  setInteraction(text) {
    const hint = byId("interaction-hint");
    hint.hidden = !text;
    if (text) this.setText("interaction-text", text);
  }

  toast(message) {
    const element = byId("toast");
    element.textContent = message;
    element.hidden = false;
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { element.hidden = true; }, 2300);
  }

  showEnding(title, copy) {
    this.setScreen("ending");
    this.setText("ending-title", title);
    this.setText("ending-copy", copy);
  }
}
