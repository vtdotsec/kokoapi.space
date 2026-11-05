import * as THREE from "three";

const ROOM_NAMES = ["CORREDOR OESTE", "RECEPÇÃO", "ARQUIVO CLÍNICO"];
const START_SAVE = {
  version: 1,
  player: { x: 1.6, z: 0, rotation: Math.PI / 2, health: 100, ammo: 6, reserve: 18 },
  inventory: { fuse: false, keycard: false },
  zombies: [
    { x: 5.8, z: 0.4, health: 2 },
    { x: 12.6, z: -1.7, health: 2 },
    { x: 19.6, z: 1.2, health: 2 },
  ],
  elapsed: 0,
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const distanceXZ = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

export class SantaBrumaWorld {
  constructor(canvas, ui, callbacks = {}) {
    this.canvas = canvas;
    this.ui = ui;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color("#151a17");
    this.scene.fog = new THREE.Fog("#151a17", 14, 34);
    this.camera = new THREE.PerspectiveCamera(40, 16 / 9, 0.1, 70);
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: "low-power" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.keys = new Set();
    this.player = { x: START_SAVE.player.x, z: START_SAVE.player.z, rotation: START_SAVE.player.rotation, health: 100, ammo: 6, reserve: 18 };
    this.inventory = { fuse: false, keycard: false };
    this.elapsed = 0;
    this.isActive = false;
    this.isAiming = false;
    this.isDead = false;
    this.cooldown = 0;
    this.toastCooldown = 0;
    this.damageCooldown = 0;
    this.saveCooldown = 0;
    this.currentRoom = -1;
    this.items = {};
    this.zombies = [];
    this.lastFrame = performance.now();
    this.buildScene();
    this.bindControls();
    this.resize();
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
    window.addEventListener("resize", () => this.resize());
  }

  material(color, roughness = 0.88, options = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness, ...options });
  }

  addBox(parent, x, y, z, sx, sy, sz, material, cast = true, receive = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    parent.add(mesh);
    return mesh;
  }

  buildScene() {
    const m = {
      floorA: this.material("#4a4a3f"), floorB: this.material("#393d36"),
      wall: this.material("#62645a"), wallDark: this.material("#383c36"),
      trim: this.material("#888879"), tile: this.material("#55574b"),
      steel: this.material("#5c625c", 0.48, { metalness: 0.45 }),
      wood: this.material("#493c30"), cloth: this.material("#3c504b"),
      paper: this.material("#b7b19a"), red: this.material("#672f2b"),
      glass: this.material("#697b72", 0.22, { metalness: 0.2, transparent: true, opacity: 0.55 }),
    };
    this.materials = m;
    this.scene.add(new THREE.HemisphereLight("#c2d1c2", "#28231e", 1.15));
    const moon = new THREE.DirectionalLight("#9ca995", 1.35);
    moon.position.set(-5, 9, 7);
    moon.castShadow = true;
    moon.shadow.mapSize.set(512, 512);
    moon.shadow.camera.left = -14;
    moon.shadow.camera.right = 14;
    moon.shadow.camera.top = 12;
    moon.shadow.camera.bottom = -12;
    this.scene.add(moon);

    for (let room = 0; room < 3; room++) {
      const x0 = room * 8;
      const xCenter = x0 + 4;
      this.addBox(this.scene, xCenter, -0.13, 0, 8, 0.25, 8, m.floorA, false);
      for (let x = 0; x < 8; x++) {
        for (let z = 0; z < 8; z++) {
          if ((x + z) % 2 === 0) this.addBox(this.scene, x0 + x + 0.5, 0.002, z - 3.5, 0.96, 0.015, 0.96, m.floorB, false, false);
        }
      }
      this.addBox(this.scene, xCenter, 1.5, -4.05, 8, 3, 0.22, m.wall);
      this.addBox(this.scene, xCenter, 1.5, 4.05, 8, 3, 0.22, m.wall);
      this.addBox(this.scene, xCenter, 3.08, 0, 8, 0.16, 8, m.wallDark, false);
      const light = new THREE.PointLight(room === 1 ? "#c9b68b" : "#9fae9b", room === 1 ? 20 : 14, 10, 2);
      light.position.set(xCenter, 2.75, 0);
      this.scene.add(light);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.08, 0.28), this.material(room === 1 ? "#bfad7c" : "#8b9b87", 0.4, { emissive: room === 1 ? "#665231" : "#3e5543", emissiveIntensity: 0.65 }));
      lamp.position.set(xCenter, 2.92, 0);
      this.scene.add(lamp);
      this.addBox(this.scene, xCenter, 0.82, -3.89, 7.8, 0.13, 0.12, m.trim, false);
      this.addBox(this.scene, xCenter, 0.82, 3.89, 7.8, 0.13, 0.12, m.trim, false);
    }

    this.addBox(this.scene, 0.05, 1.5, 0, 0.2, 3, 8.2, m.wall);
    this.addBox(this.scene, 23.95, 1.5, 0, 0.2, 3, 8.2, m.wall);
    for (const x of [8, 16]) {
      this.addBox(this.scene, x, 1.5, -2.55, 0.25, 3, 2.9, m.wall);
      this.addBox(this.scene, x, 1.5, 2.55, 0.25, 3, 2.9, m.wall);
      this.addBox(this.scene, x, 2.75, 0, 0.26, 0.48, 2.2, m.wall);
      this.addBox(this.scene, x - 0.28, 1.25, -1.4, 0.55, 2.5, 0.12, m.trim);
      this.addBox(this.scene, x - 0.28, 1.25, 1.4, 0.55, 2.5, 0.12, m.trim);
    }

    this.buildHallFixtures(m);
    this.buildReceptionFixtures(m);
    this.buildArchiveFixtures(m);
    this.buildItems();
    this.buildPlayer();
    this.buildZombies();
    this.setCameraRoom(0, true);
  }

  buildHallFixtures(m) {
    // A gurney, a toppled medicine cart and a dark blood trail suggest what happened.
    this.addBox(this.scene, 2.9, 0.44, 2.55, 2.6, 0.13, 1.1, m.steel);
    this.addBox(this.scene, 2.05, 0.64, 2.55, 0.42, 0.16, 0.9, m.paper);
    for (const x of [1.85, 3.95]) for (const z of [2.2, 2.9]) this.addBox(this.scene, x, 0.19, z, 0.09, 0.4, 0.09, m.steel);
    this.addBox(this.scene, 6.6, 0.5, -2.5, 0.72, 0.9, 0.75, m.red, true);
    this.addBox(this.scene, 6.1, 0.015, -1.95, 1.1, 0.025, 0.65, this.material("#3f201e", 1), false);
    this.addBox(this.scene, 1.2, 2, -3.91, 1.2, 0.92, 0.08, m.wallDark);
    this.addBox(this.scene, 1.2, 2, -3.84, 0.06, 0.9, 0.05, m.trim, false);
    this.addBox(this.scene, 1.2, 2, -3.8, 0.82, 0.03, 0.02, m.paper, false);
  }

  buildReceptionFixtures(m) {
    this.addBox(this.scene, 11.9, 0.68, -2.6, 3.3, 1.3, 0.8, m.wood);
    this.addBox(this.scene, 11.9, 1.38, -2.6, 3.4, 0.12, 0.9, m.trim);
    this.addBox(this.scene, 12.9, 1.47, -2.6, 0.45, 0.08, 0.3, m.steel);
    for (const x of [9.4, 10.7, 14.3]) {
      this.addBox(this.scene, x, 0.25, 2.6, 0.55, 0.1, 0.55, m.wood);
      this.addBox(this.scene, x, 0.65, 2.9, 0.54, 0.72, 0.12, m.cloth);
      this.addBox(this.scene, x, 0.38, 2.6, 0.07, 0.5, 0.07, m.steel);
    }
    this.addBox(this.scene, 9.2, 1.1, -3.82, 1.4, 1.8, 0.09, m.glass, false);
    this.addBox(this.scene, 13.7, 0.1, 0.3, 1.2, 0.2, 1, m.red, true);
  }

  buildArchiveFixtures(m) {
    for (const x of [17.3, 19.1, 21.2, 22.7]) {
      this.addBox(this.scene, x, 1.35, -3.2, 1.05, 2.55, 0.48, m.wood);
      for (const y of [0.5, 1.15, 1.8, 2.43]) this.addBox(this.scene, x, y, -2.93, 0.92, 0.05, 0.38, m.steel, false);
      for (let row = 0; row < 3; row++) this.addBox(this.scene, x - 0.22 + row * 0.2, 0.7 + row * 0.48, -2.88, 0.17, 0.35, 0.27, row % 2 ? m.paper : m.red, false);
    }
    this.addBox(this.scene, 20, 0.58, 2.35, 1.55, 1.1, 0.74, m.wood);
    this.addBox(this.scene, 20, 1.2, 2.35, 1.6, 0.09, 0.78, m.trim);
    this.addBox(this.scene, 20.25, 1.3, 2.3, 0.6, 0.12, 0.42, m.steel);
    this.addBox(this.scene, 23.4, 1.15, 0, 0.12, 2.3, 2.1, this.material("#303a32", 0.5, { emissive: "#172419", emissiveIntensity: 0.5 }));
    this.addBox(this.scene, 23.3, 1.25, -0.72, 0.06, 0.24, 0.16, m.gold || this.material("#c4b57b"), false);
    this.addBox(this.scene, 23.3, 1.25, 0.72, 0.06, 0.24, 0.16, this.material("#7d3430"), false);
  }

  createItem(color, shape = "box") {
    const group = new THREE.Group();
    const glow = new THREE.PointLight(color, 4, 2.6, 2);
    glow.position.y = 0.55;
    group.add(glow);
    const mesh = shape === "cylinder"
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.45, 6), this.material(color, 0.35, { emissive: color, emissiveIntensity: 0.25 }))
      : new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.1, 0.38), this.material(color, 0.38, { emissive: color, emissiveIntensity: 0.2 }));
    mesh.position.y = 0.42;
    mesh.castShadow = true;
    group.add(mesh);
    this.scene.add(group);
    return group;
  }

  buildItems() {
    this.items.fuse = { mesh: this.createItem("#c3aa54", "cylinder"), x: 4.2, z: -2.45, taken: false };
    this.items.keycard = { mesh: this.createItem("#6d9e88"), x: 12.65, z: -2.47, taken: false };
    const typewriter = new THREE.Group();
    const dark = this.material("#292d29", 0.6, { metalness: 0.25 });
    this.addBox(typewriter, 0, 0.03, 0, 0.62, 0.24, 0.42, dark);
    this.addBox(typewriter, 0, 0.19, -0.1, 0.55, 0.1, 0.22, this.material("#aaa58f", 0.75));
    this.addBox(typewriter, 0, 0.32, -0.12, 0.48, 0.12, 0.1, this.material("#4d5149", 0.55, { metalness: 0.35 }));
    for (let row = 0; row < 2; row++) for (let key = 0; key < 5; key++) {
      this.addBox(typewriter, -0.2 + key * 0.1, 0.26, 0.03 + row * 0.09, 0.055, 0.035, 0.04, this.material("#c0b99f", 0.7));
    }
    typewriter.position.set(20.25, 1.29, 2.45);
    this.scene.add(typewriter);
    this.items.typewriter = { mesh: typewriter, x: 20.25, z: 2.45, taken: false, station: true };
  }

  makeHumanoid({ player = false } = {}) {
    const group = new THREE.Group();
    const colors = player
      ? { body: "#536456", pants: "#242a28", skin: "#a78d75", hair: "#342b26", boots: "#211f1c" }
      : { body: "#6b6557", pants: "#383b33", skin: "#7e8b75", hair: "#343b35", boots: "#292b27" };
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.72, 0.31), this.material(colors.body));
    torso.position.y = 1.08;
    torso.castShadow = true;
    group.add(torso);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 7, 5), this.material(colors.skin));
    head.position.set(0, 1.62, 0.04);
    head.castShadow = true;
    group.add(head);
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.37, 0.13, 0.35), this.material(colors.hair));
    hair.position.set(0, 1.75, 0.02);
    group.add(hair);
    for (const side of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.62, 0.18), this.material(colors.body));
      arm.position.set(side * 0.32, 1.06, 0.02);
      arm.rotation.z = side * -0.12;
      arm.castShadow = true;
      group.add(arm);
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.67, 0.2), this.material(colors.pants));
      leg.position.set(side * 0.13, 0.37, 0);
      leg.castShadow = true;
      group.add(leg);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.13, 0.32), this.material(colors.boots));
      boot.position.set(side * 0.13, 0.08, 0.045);
      group.add(boot);
    }
    if (!player) {
      const stain = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.13, 0.025), this.material("#512b27"));
      stain.position.set(0.08, 1.13, 0.17);
      group.add(stain);
      group.rotation.z = 0.12;
    }
    this.scene.add(group);
    return group;
  }

  buildPlayer() {
    this.playerModel = this.makeHumanoid({ player: true });
    this.playerModel.scale.setScalar(0.78);
    this.playerModel.position.set(this.player.x, 0, this.player.z);
    this.playerModel.rotation.y = this.player.rotation;
  }

  buildZombies() {
    const spawns = START_SAVE.zombies;
    this.zombies = spawns.map((spawn, index) => {
      const model = this.makeHumanoid();
      model.scale.setScalar(0.82);
      model.position.set(spawn.x, 0, spawn.z);
      return { model, x: spawn.x, z: spawn.z, health: spawn.health, cooldown: 0, index, alive: true };
    });
  }

  resize() {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    const scale = Math.min(window.devicePixelRatio || 1, 1.15) * 0.68;
    this.renderer.setSize(Math.max(320, Math.floor(width * scale)), Math.max(180, Math.floor(height * scale)), false);
  }

  setCameraRoom(room, immediate = false) {
    const centerX = room * 8 + 4;
    this.cameraTarget = new THREE.Vector3(centerX, 6.8, 8.8);
    this.lookTarget = new THREE.Vector3(centerX, 0.45, 0);
    if (immediate) {
      this.camera.position.copy(this.cameraTarget);
      this.camera.lookAt(this.lookTarget);
    }
    this.currentRoom = room;
    this.ui.setRoom(ROOM_NAMES[room]);
  }

  bindControls() {
    const accepted = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "KeyE", "KeyF", "KeyR", "Escape"]);
    window.addEventListener("keydown", (event) => {
      if (!this.isActive || !accepted.has(event.code)) return;
      event.preventDefault();
      if (event.code === "Escape") return this.callbacks.onPause?.();
      if (event.code === "KeyE" && !event.repeat) return this.interact();
      if (event.code === "KeyF" && !event.repeat) return this.fire();
      if (event.code === "KeyR" && !event.repeat) return this.reload();
      this.keys.add(event.code);
    });
    window.addEventListener("keyup", (event) => {
      this.keys.delete(event.code);
      if (event.code === "Space") this.isAiming = false;
    });
    window.addEventListener("blur", () => { this.keys.clear(); this.isAiming = false; });
    document.getElementById("pause-button").addEventListener("click", () => this.callbacks.onPause?.());
    document.getElementById("reload-button").addEventListener("click", () => this.reload());
    document.getElementById("touch-aim").addEventListener("pointerdown", (event) => { event.preventDefault(); this.isAiming = true; });
    document.getElementById("touch-aim").addEventListener("pointerup", () => { this.isAiming = false; });
    document.getElementById("touch-aim").addEventListener("pointerleave", () => { this.isAiming = false; });
    document.getElementById("touch-fire").addEventListener("pointerdown", (event) => { event.preventDefault(); this.fire(); });
    document.getElementById("touch-use").addEventListener("pointerdown", (event) => { event.preventDefault(); this.interact(); });
    document.querySelectorAll("[data-move]").forEach((button) => {
      const codes = { up: "KeyW", down: "KeyS", left: "KeyA", right: "KeyD" };
      const code = codes[button.dataset.move];
      button.addEventListener("pointerdown", (event) => { event.preventDefault(); button.setPointerCapture(event.pointerId); this.keys.add(code); });
      const release = () => this.keys.delete(code);
      button.addEventListener("pointerup", release);
      button.addEventListener("pointercancel", release);
      button.addEventListener("lostpointercapture", release);
    });
  }

  createNewGame() {
    this.restore(START_SAVE);
    this.isDead = false;
    this.setActive(true);
    this.callbacks.onStateChange?.();
  }

  restore(save) {
    const source = save || START_SAVE;
    this.player = { ...START_SAVE.player, ...(source.player || {}) };
    this.inventory = { ...START_SAVE.inventory, ...(source.inventory || {}) };
    this.elapsed = Number(source.elapsed) || 0;
    const zombieSaves = source.zombies || START_SAVE.zombies;
    this.zombies.forEach((zombie, index) => {
      const saved = zombieSaves[index] || START_SAVE.zombies[index];
      zombie.x = saved.x;
      zombie.z = saved.z;
      zombie.health = saved.health;
      zombie.alive = zombie.health > 0;
      zombie.model.visible = zombie.alive;
      zombie.model.position.set(zombie.x, 0, zombie.z);
    });
    this.playerModel.position.set(this.player.x, 0, this.player.z);
    this.playerModel.rotation.y = this.player.rotation;
    this.items.fuse.taken = this.inventory.fuse;
    this.items.fuse.mesh.visible = !this.inventory.fuse;
    this.items.keycard.taken = this.inventory.keycard;
    this.items.keycard.mesh.visible = !this.inventory.keycard;
    this.isDead = this.player.health <= 0;
    const room = clamp(Math.floor(this.player.x / 8), 0, 2);
    this.setCameraRoom(room, true);
    this.ui.update(this.snapshot());
  }

  setActive(active) {
    this.isActive = active;
    this.keys.clear();
    this.isAiming = false;
  }

  snapshot() {
    return {
      version: 1,
      player: { x: this.player.x, z: this.player.z, rotation: this.player.rotation, health: this.player.health, ammo: this.player.ammo, reserve: this.player.reserve },
      inventory: { fuse: !!this.inventory.fuse, keycard: !!this.inventory.keycard },
      zombies: this.zombies.map((z) => ({ x: z.x, z: z.z, health: z.health })),
      elapsed: this.elapsed,
    };
  }

  validMove(x, z) {
    if (x < 0.55 || x > 23.45 || z < -3.38 || z > 3.38) return false;
    for (const partition of [8, 16]) {
      if (Math.abs(x - partition) < 0.32 && Math.abs(z) > 1.25) return false;
    }
    return true;
  }

  move(dt) {
    let dx = 0;
    let dz = 0;
    if (this.keys.has("KeyW") || this.keys.has("ArrowUp")) dz -= 1;
    if (this.keys.has("KeyS") || this.keys.has("ArrowDown")) dz += 1;
    if (this.keys.has("KeyA") || this.keys.has("ArrowLeft")) dx -= 1;
    if (this.keys.has("KeyD") || this.keys.has("ArrowRight")) dx += 1;
    if (dx || dz) {
      const length = Math.hypot(dx, dz);
      dx /= length;
      dz /= length;
      const speed = this.isAiming ? 1.15 : 2.05;
      const nextX = this.player.x + dx * speed * dt;
      const nextZ = this.player.z + dz * speed * dt;
      if (this.validMove(nextX, this.player.z)) this.player.x = nextX;
      if (this.validMove(this.player.x, nextZ)) this.player.z = nextZ;
      this.player.rotation = Math.atan2(dx, -dz);
      this.playerModel.rotation.y = this.player.rotation;
      this.playerModel.position.set(this.player.x, Math.sin(this.elapsed * 12) * 0.015, this.player.z);
    }
    const room = clamp(Math.floor(this.player.x / 8), 0, 2);
    if (room !== this.currentRoom) {
      this.setCameraRoom(room);
      this.ui.toast(ROOM_NAMES[room]);
      this.callbacks.onStateChange?.();
    }
  }

  nearestZombie() {
    let target = null;
    let best = 8.5;
    for (const zombie of this.zombies) {
      if (!zombie.alive) continue;
      const d = distanceXZ(this.player, zombie);
      if (d < best) { best = d; target = zombie; }
    }
    return target;
  }

  updateZombies(dt) {
    for (const zombie of this.zombies) {
      if (!zombie.alive) continue;
      const dx = this.player.x - zombie.x;
      const dz = this.player.z - zombie.z;
      const dist = Math.hypot(dx, dz) || 1;
      if (dist < 7.2 && dist > 0.9) {
        const nx = zombie.x + (dx / dist) * 0.58 * dt;
        const nz = zombie.z + (dz / dist) * 0.58 * dt;
        if (this.validMove(nx, zombie.z)) zombie.x = nx;
        if (this.validMove(zombie.x, nz)) zombie.z = nz;
        zombie.model.rotation.y = Math.atan2(dx, -dz);
        zombie.model.position.set(zombie.x, Math.sin(this.elapsed * 7 + zombie.index) * 0.025, zombie.z);
      }
      zombie.cooldown -= dt;
      if (dist < 0.93 && zombie.cooldown <= 0) {
        zombie.cooldown = 1.25;
        this.player.health = Math.max(0, this.player.health - 16);
        this.ui.toast("O infectado agarrou você.");
        this.ui.update(this.snapshot());
        this.callbacks.onStateChange?.();
        if (this.player.health === 0) {
          this.isDead = true;
          this.setActive(false);
          this.callbacks.onDeath?.();
          return;
        }
      }
    }
  }

  fire() {
    if (!this.isActive || this.isDead || this.cooldown > 0) return;
    if (!this.isAiming) {
      this.ui.toast("Segure ESPAÇO para mirar.");
      return;
    }
    if (this.player.ammo <= 0) {
      this.ui.toast("Sem munição no carregador. Pressione R.");
      return;
    }
    this.player.ammo -= 1;
    this.cooldown = 0.42;
    const target = this.nearestZombie();
    if (target) {
      target.health = Math.max(0, target.health - 1);
      if (target.health === 0) {
        target.alive = false;
        target.model.visible = false;
        this.ui.toast("O infectado caiu.");
      } else {
        this.ui.toast("O disparo atingiu o alvo.");
      }
    } else {
      this.ui.toast("O tiro se perde na escuridão.");
    }
    this.ui.update(this.snapshot());
    this.callbacks.onStateChange?.();
  }

  reload() {
    if (!this.isActive || this.player.ammo >= 6 || this.player.reserve <= 0) return;
    const needed = 6 - this.player.ammo;
    const loaded = Math.min(needed, this.player.reserve);
    this.player.ammo += loaded;
    this.player.reserve -= loaded;
    this.ui.update(this.snapshot());
    this.ui.toast("Carregador pronto.");
    this.callbacks.onStateChange?.();
  }

  getInteraction() {
    const options = [];
    for (const [key, item] of Object.entries(this.items)) {
      if (item.taken) continue;
      const d = distanceXZ(this.player, item);
      if (d < 1.28) options.push({ key, item, d });
    }
    if (this.player.x > 22.35 && Math.abs(this.player.z) < 1.55) options.push({ key: "exit", d: 0.4 });
    options.sort((a, b) => a.d - b.d);
    return options[0] || null;
  }

  interact() {
    if (!this.isActive || this.isDead) return;
    const target = this.getInteraction();
    if (!target) return;
    if (target.key === "fuse") {
      this.inventory.fuse = true;
      target.item.taken = true;
      target.item.mesh.visible = false;
      this.ui.toast("Fusível industrial guardado.");
    } else if (target.key === "keycard") {
      this.inventory.keycard = true;
      target.item.taken = true;
      target.item.mesh.visible = false;
      this.ui.toast("Cartão de acesso da enfermaria.");
    } else if (target.key === "typewriter") {
      this.ui.toast("Arquivo salvo no servidor privado.");
      this.callbacks.onManualSave?.();
    } else if (target.key === "exit") {
      if (this.inventory.fuse && this.inventory.keycard) {
        this.setActive(false);
        this.callbacks.onWin?.(this.elapsed, this.zombies.filter((z) => z.alive).length);
      } else {
        const missing = [!this.inventory.fuse ? "um fusível" : "", !this.inventory.keycard ? "um cartão de acesso" : ""].filter(Boolean).join(" e ");
        this.ui.toast(`O elevador precisa de ${missing}.`);
      }
    }
    this.ui.update(this.snapshot());
    this.callbacks.onStateChange?.();
  }

  updateWorld(dt) {
    if (!this.isActive || this.isDead) return;
    this.elapsed += dt;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.move(dt);
    this.isAiming = this.keys.has("Space") || this.isAiming;
    const target = this.isAiming ? this.nearestZombie() : null;
    if (target) {
      const dx = target.x - this.player.x;
      const dz = target.z - this.player.z;
      this.player.rotation = Math.atan2(dx, -dz);
      this.playerModel.rotation.y = this.player.rotation;
    }
    this.ui.setAim(this.isAiming && !!target);
    this.updateZombies(dt);
    const interaction = this.getInteraction();
    this.ui.setInteraction(interaction ? this.interactionText(interaction.key) : "");
    if (this.toastCooldown > 0) this.toastCooldown -= dt;
    if (this.saveCooldown > 0) {
      this.saveCooldown -= dt;
      if (this.saveCooldown <= 0) this.callbacks.onAutoSave?.();
    }
    this.ui.update(this.snapshot());
  }

  interactionText(key) {
    return ({ fuse: "Pegar fusível industrial", keycard: "Pegar cartão de acesso", typewriter: "Salvar arquivo", exit: "Usar elevador" })[key] || "Examinar";
  }

  requestAutoSave() { this.saveCooldown = 12; }

  animate(now) {
    requestAnimationFrame(this.animate);
    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    this.updateWorld(dt);
    if (this.cameraTarget) {
      this.camera.position.lerp(this.cameraTarget, 0.06);
      this.camera.lookAt(this.lookTarget);
    }
    const bob = Math.sin(now * 0.0017) * 0.018;
    for (const item of [this.items.fuse, this.items.keycard]) {
      if (item && !item.taken) item.mesh.position.y = bob;
    }
    this.renderer.render(this.scene, this.camera);
  }
}

export function newGameState() { return structuredClone(START_SAVE); }
