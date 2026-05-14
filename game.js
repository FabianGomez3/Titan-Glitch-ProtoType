"use strict";

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const libraryScene = new Image();
libraryScene.src = "./assets/pollak-library-second-floor.png";

const ui = {
  wrap: document.querySelector(".game-wrap"),
  menuPanel: document.getElementById("menuPanel"),
  lobbyPanel: document.getElementById("lobbyPanel"),
  soloButton: document.getElementById("soloButton"),
  multiplayerButton: document.getElementById("multiplayerButton"),
  scanButton: document.getElementById("scanButton"),
  settingsButton: document.getElementById("settingsButton"),
  quitButton: document.getElementById("quitButton"),
  leaveLobbyButton: document.getElementById("leaveLobbyButton"),
  startLobbyButton: document.getElementById("startLobbyButton"),
  outcomePanel: document.getElementById("outcomePanel"),
  outcomeTitle: document.getElementById("outcomeTitle"),
  outcomeSubtitle: document.getElementById("outcomeSubtitle"),
  failureReason: document.getElementById("failureReason"),
  failureTip: document.getElementById("failureTip"),
  levelBreakdown: document.getElementById("levelBreakdown"),
  levelBreakdownItems: document.getElementById("levelBreakdownItems"),
  statTime: document.getElementById("statTime"),
  statTwoLabel: document.getElementById("statTwoLabel"),
  statTwoValue: document.getElementById("statTwoValue"),
  statTwoSub: document.getElementById("statTwoSub"),
  statThreeLabel: document.getElementById("statThreeLabel"),
  statThreeValue: document.getElementById("statThreeValue"),
  statThreeSub: document.getElementById("statThreeSub"),
  statAccuracy: document.getElementById("statAccuracy"),
  outcomeMenuButton: document.getElementById("outcomeMenuButton"),
  outcomeRetryButton: document.getElementById("outcomeRetryButton"),
  settingsPanel: document.getElementById("settingsPanel"),
  settingsBackButton: document.getElementById("settingsBackButton"),
  settingsSaveButton: document.getElementById("settingsSaveButton"),
  settingsResetButton: document.getElementById("settingsResetButton"),
  settingsMessage: document.getElementById("settingsMessage"),
  scanPanel: document.getElementById("scanPanel"),
  scanMask: document.getElementById("scanMask"),
  scanHotspot: document.getElementById("scanHotspot"),
  scanPopup: document.getElementById("scanPopup"),
  scanReportButton: document.getElementById("scanReportButton"),
  scanContinueButton: document.getElementById("scanContinueButton"),
  scanFound: document.getElementById("scanFound"),
  scanAgainButton: document.getElementById("scanAgainButton"),
  scanMenuButton: document.getElementById("scanMenuButton"),
  prompt: document.getElementById("prompt"),
  targetLabel: document.getElementById("targetLabel"),
  reportButton: document.getElementById("reportButton"),
  clearButton: document.getElementById("clearButton"),
  resetButton: document.getElementById("resetButton"),
  locationLabel: document.getElementById("locationLabel"),
  floorLabel: document.getElementById("floorLabel"),
  livesLabel: document.getElementById("livesLabel"),
  batteryLabel: document.getElementById("batteryLabel"),
  streakLabel: document.getElementById("streakLabel"),
  accuracyLabel: document.getElementById("accuracyLabel"),
  timerLabel: document.getElementById("timerLabel"),
  toolLabel: document.getElementById("toolLabel"),
};

const TILE = 64;
const FOV = Math.PI / 3;
const RAYS = 260;
const MAX_DEPTH = TILE * 16;
const WALL = "#44515e";
const WALL_ALT = "#52606f";
const WORLD_W = 1400;
const WORLD_H = 900;
const ANOMALY = { x: 1040, y: 360, radius: 62 };
const ANOMALY_PROGRESS = 0.66;

const map = [
  "1111111111111111",
  "1000000000000001",
  "1011110111110101",
  "1000010000010001",
  "1111011111011101",
  "1000000001000001",
  "1011111101011101",
  "1000000101000001",
  "1011110101111101",
  "1000000100000001",
  "1011111111011101",
  "1000000001000001",
  "1011111101110101",
  "1000000000000001",
  "1000000000000001",
  "1111111111111111",
];

const floors = [
  {
    name: "Pollak Library",
    floor: "First Floor",
    image: "./assets/pollak-library-second-floor.png",
    signText: "POLLAK 1F",
    expectedPanel: "FLOOR 1",
    hasAnomaly: false,
    accent: "#70e4ff",
    normal: "Normal Pollak Library first floor: floor markers should read FLOOR 1.",
  },
  {
    name: "Pollak Library",
    floor: "Second Floor",
    image: "./assets/pollak-library-second-floor.png",
    signText: "POLLAK 2F",
    expectedPanel: "FLOOR 2",
    hasAnomaly: true,
    anomalyLabel: "NO SIGNAL Monitor",
    anomalyText: "NO SIGNAL",
    accent: "#c5ef6f",
    normal: "Normal Pollak Library second floor: monitors should show normal desktop activity.",
  },
];

const anomalyTypes = [
  {
    id: "wrong-floor",
    label: "Wrong Floor Number",
    description: "The elevator panel near the glass study room shows the wrong floor number.",
    apply(objects, floor) {
      const sign = objects.find((object) => object.id === "elevator-panel");
      sign.text = floor.anomalyText || "FLOOR 8";
      sign.color = "#ff556a";
      sign.scale = 1.42;
      sign.anomaly = true;
    },
  },
];

const state = {
  running: false,
  screen: "menu",
  player: { x: 160, y: 720, angle: -Math.PI / 2 },
  keys: new Set(),
  floorIndex: 0,
  lives: 3,
  streak: 0,
  attempts: 0,
  correct: 0,
  completed: false,
  hudVisible: false,
  battery: 100,
  flashlight: false,
  magnify: false,
  currentAnomaly: null,
  objects: [],
  promptTimer: 0,
  promptText: "Choose Play Solo or enter the lobby.",
  startTime: performance.now(),
  lastTime: performance.now(),
  botAlert: false,
  target: null,
  viewX: 0.5,
  viewY: 0.5,
  sceneZoom: 1,
};

function makeSprite(id, gx, gy, text, color, kind, scale = 1, anomaly = false) {
  return {
    id,
    x: gx * TILE,
    y: gy * TILE,
    text,
    color,
    kind,
    scale,
    anomaly,
    hidden: false,
  };
}

function buildBaseObjects(floor) {
  return [
    makeSprite("entrance-sign", 2.5, 11.5, floor.signText, floor.accent, "sign", 1.18),
    makeSprite("directory", 8.5, 10.8, "DIRECTORY", floor.accent, "sign", 1.05),
    makeSprite("elevator-panel", 12.8, 10.9, floor.expectedPanel, floor.accent, "sign", 1.16),
    makeSprite("poster-titans", 3.4, 2.6, "TITANS", "#f6c751", "poster", 0.95),
    makeSprite("poster-csuf", 5.6, 2.6, "CSUF", "#70e4ff", "poster", 0.95),
    makeSprite("poster-library", 7.8, 2.6, "QUIET ZONE", "#a688ff", "poster", 0.92),
    makeSprite("study-chair", 11.9, 5.2, "CHAIR", "#b6c2cd", "object", 1),
    makeSprite("study-table", 13.2, 4.8, "TABLE", "#c7d5dc", "object", 1.05),
    makeSprite("vending", 2.4, 6.8, "VENDING", "#ff8d5c", "object", 1.1),
    makeSprite("exit", 13.4, 13.6, "MAIN EXIT", "#c5ef6f", "exit", 1.1),
  ];
}

function resetRun() {
  state.floorIndex = 0;
  state.lives = 3;
  state.streak = 0;
  state.attempts = 0;
  state.correct = 0;
  state.completed = false;
  state.battery = 100;
  state.startTime = performance.now();
  startFloor();
}

function startFloor() {
  const floor = floors[state.floorIndex];
  libraryScene.src = floor.image;
  state.player.x = 160;
  state.player.y = 720;
  state.player.angle = -Math.PI / 2;
  state.viewX = 0.5;
  state.viewY = 0.5;
  state.sceneZoom = 1;
  state.botAlert = false;
  state.objects = buildBaseObjects(floor);
  state.currentAnomaly = floor.hasAnomaly ? anomalyTypes[0] : null;
  if (state.currentAnomaly) {
    state.currentAnomaly.apply(state.objects, floor);
  }
  setPrompt(
    floor.hasAnomaly
      ? `${floor.floor}: report the anomaly. Look for a corrupted monitor or sign.`
      : `${floor.floor}: no anomaly is present. Clear the floor when it looks normal.`,
    6200
  );

  updateHud();
}

function setPrompt(text, duration = 2600) {
  state.promptText = text;
  state.promptTimer = duration;
  ui.prompt.textContent = text;
}

function isWall(x, y) {
  const gx = Math.floor(x / TILE);
  const gy = Math.floor(y / TILE);
  if (gx < 0 || gy < 0 || gy >= map.length || gx >= map[0].length) return true;
  return map[gy][gx] === "1";
}

function castRay(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  for (let depth = 0; depth < MAX_DEPTH; depth += 3) {
    const x = state.player.x + cos * depth;
    const y = state.player.y + sin * depth;
    if (isWall(x, y)) {
      const gx = Math.floor(x / TILE);
      const gy = Math.floor(y / TILE);
      return { depth, x, y, shade: (gx + gy) % 2 === 0 ? WALL : WALL_ALT };
    }
  }
  return { depth: MAX_DEPTH, x: state.player.x + cos * MAX_DEPTH, y: state.player.y + sin * MAX_DEPTH, shade: WALL };
}

function drawWorld() {
  drawImageBasedLibraryScene();
}

function drawImageBasedLibraryScene() {
  const w = canvas.width;
  const h = canvas.height;
  state.target = null;

  ctx.fillStyle = "#020407";
  ctx.fillRect(0, 0, w, h);

  if (!libraryScene.complete || !libraryScene.naturalWidth) {
    ctx.fillStyle = "#eef4f8";
    ctx.font = "700 22px ui-sans-serif, system-ui";
    ctx.fillText("Loading Pollak Library scene...", 40, 60);
    return;
  }

  const imgW = libraryScene.naturalWidth;
  const imgH = libraryScene.naturalHeight;
  const baseScale = Math.max(w / imgW, h / imgH);
  const scale = baseScale * state.sceneZoom;
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const maxOffsetX = Math.max(0, drawW - w);
  const maxOffsetY = Math.max(0, drawH - h);
  const offsetX = -maxOffsetX * state.viewX;
  const offsetY = -maxOffsetY * state.viewY;

  ctx.drawImage(libraryScene, offsetX, offsetY, drawW, drawH);

  drawSceneAnomalyOverlay(offsetX, offsetY, scale);
  drawPhotorealHudFX();
  drawNearbyPrompt();
}

function drawSceneAnomalyOverlay(offsetX, offsetY, scale) {
  const floor = floors[state.floorIndex];
  if (!floor.hasAnomaly) return;

  const w = canvas.width;
  const h = canvas.height;
  const anomaly = {
    x: 1790,
    y: 770,
    width: 190,
    height: 110,
  };
  const sx = offsetX + anomaly.x * scale;
  const sy = offsetY + anomaly.y * scale;
  const sw = anomaly.width * scale;
  const sh = anomaly.height * scale;
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;
  const distanceFromCrosshair = Math.hypot(cx - w / 2, cy - h / 2);

  if (distanceFromCrosshair < Math.max(70, sw * 0.8)) {
    state.target = { anomaly: true, text: floor.anomalyText || "NO SIGNAL" };
  }

  if (state.target) {
    ctx.save();
    ctx.strokeStyle = "rgba(255, 85, 106, 0.82)";
    ctx.lineWidth = 3;
    ctx.shadowColor = "#ff556a";
    ctx.shadowBlur = 16;
    ctx.strokeRect(sx - 8, sy - 8, sw + 16, sh + 16);
    ctx.restore();
  }
}

function drawPhotorealHudFX() {
  const w = canvas.width;
  const h = canvas.height;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.72);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.42)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  if (state.flashlight) {
    const glow = ctx.createRadialGradient(w / 2, h / 2, 20, w / 2, h / 2, Math.min(w, h) * 0.38);
    glow.addColorStop(0, "rgba(255, 244, 196, 0.16)");
    glow.addColorStop(1, "rgba(255, 244, 196, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
}

function drawExitStyleLibraryCorridor() {
  const w = canvas.width;
  const h = canvas.height;
  const progress = getCorridorProgress();
  const pan = normalizeAngle(state.player.angle + Math.PI / 2);
  const look = clamp(pan, -0.55, 0.55);
  const centerX = w * (0.5 - look * 0.28 + (state.player.x - 160) * 0.00045);
  const horizon = h * 0.43;
  const vanishingY = horizon + Math.sin(progress * Math.PI * 2) * 8;

  state.target = null;
  ctx.fillStyle = "#030506";
  ctx.fillRect(0, 0, w, h);

  drawCorridorShell(centerX, vanishingY);
  drawCorridorLights(centerX, vanishingY, progress);
  drawGlassLibraryWall(centerX, vanishingY, progress);
  drawLeftLibraryWall(centerX, vanishingY, progress);
  drawCorridorFloorDetail(centerX, vanishingY, progress);
  drawDistantHallFigure(centerX, vanishingY, progress);
  drawExitStyleAnomaly(centerX, vanishingY, progress, look);
  drawFirstPersonHands();
  drawCorridorVignette();
  drawNearbyPrompt();
}

function getCorridorProgress() {
  return clamp((780 - state.player.y) / 620, 0, 1);
}

function drawCorridorShell(centerX, vanishingY) {
  const w = canvas.width;
  const h = canvas.height;
  const farW = w * 0.12;

  const ceiling = ctx.createLinearGradient(0, 0, 0, vanishingY);
  ceiling.addColorStop(0, "#050709");
  ceiling.addColorStop(1, "#16242c");
  ctx.fillStyle = ceiling;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(centerX + farW, vanishingY);
  ctx.lineTo(centerX - farW, vanishingY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#071014";
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(centerX - farW, vanishingY);
  ctx.lineTo(centerX - w * 0.34, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#17272f";
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(centerX + farW, vanishingY);
  ctx.lineTo(centerX + w * 0.36, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  const floor = ctx.createLinearGradient(0, vanishingY, 0, h);
  floor.addColorStop(0, "#121b1f");
  floor.addColorStop(0.55, "#071013");
  floor.addColorStop(1, "#020303");
  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(centerX - farW, vanishingY);
  ctx.lineTo(centerX + farW, vanishingY);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();
}

function drawCorridorLights(centerX, vanishingY, progress) {
  const w = canvas.width;
  const h = canvas.height;
  for (let i = 0; i < 7; i += 1) {
    const t = (i / 6 + progress * 0.5) % 1;
    const depth = t * t;
    const y = vanishingY * (1 - depth) + h * 0.12 * depth;
    const width = 45 + 180 * depth;
    const x = centerX + (i % 2 ? w * 0.08 : -w * 0.12) * depth;
    drawCeilingLight(x, y, width, i % 3 === 0 ? "#ff7878" : "#bcefff");
  }
}

function drawGlassLibraryWall(centerX, vanishingY, progress) {
  const w = canvas.width;
  const h = canvas.height;
  const rightNear = centerX + w * 0.43;
  const rightFar = centerX + w * 0.12;
  const topNear = h * 0.23;
  const bottomNear = h * 0.79;

  ctx.fillStyle = "rgba(92, 145, 164, 0.18)";
  ctx.strokeStyle = "rgba(154, 224, 240, 0.32)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(rightFar, vanishingY - h * 0.18);
  ctx.lineTo(rightNear, topNear);
  ctx.lineTo(rightNear, bottomNear);
  ctx.lineTo(rightFar, vanishingY + h * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  for (let i = 0; i < 5; i += 1) {
    const t = i / 4;
    ctx.beginPath();
    ctx.moveTo(rightFar + (rightNear - rightFar) * t, vanishingY - h * 0.18 + (topNear - (vanishingY - h * 0.18)) * t);
    ctx.lineTo(rightFar + (rightNear - rightFar) * t - 40, vanishingY + h * 0.16 + (bottomNear - (vanishingY + h * 0.16)) * t);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(225, 242, 248, 0.35)";
  ctx.font = `800 ${Math.max(16, w * 0.017)}px ui-sans-serif, system-ui`;
  ctx.fillText("POLLAK LIBRARY STUDY ROOMS", rightFar + 30, vanishingY - h * 0.11);

  for (let i = 0; i < 5; i += 1) {
    const x = rightFar + 80 + i * 120 - progress * 80;
    const y = h * 0.58 + (i % 2) * 32;
    drawPerspectiveTable(x, y, 0.75 + i * 0.09);
  }
}

function drawLeftLibraryWall(centerX, vanishingY, progress) {
  const w = canvas.width;
  const h = canvas.height;
  const leftNear = centerX - w * 0.5;
  const leftFar = centerX - w * 0.14;

  ctx.fillStyle = "rgba(14, 9, 8, 0.92)";
  ctx.beginPath();
  ctx.moveTo(leftNear, h * 0.18);
  ctx.lineTo(leftFar, vanishingY - h * 0.1);
  ctx.lineTo(leftFar, vanishingY + h * 0.19);
  ctx.lineTo(leftNear, h * 0.82);
  ctx.closePath();
  ctx.fill();

  for (let i = 0; i < 4; i += 1) {
    const t = (i / 4 + progress * 0.4) % 1;
    const y = h * (0.27 + t * 0.28);
    const x = leftNear + (leftFar - leftNear) * t;
    drawDoor(x, y, 74 * (1 + t), 160 * (1 + t), true);
  }

  ctx.fillStyle = "rgba(190, 190, 190, 0.26)";
  ctx.font = `800 ${Math.max(22, w * 0.026)}px ui-sans-serif, system-ui`;
  ctx.fillText("THEY HEAR", centerX - w * 0.29, h * 0.43);
  ctx.fillText("WHAT YOU IGNORE", centerX - w * 0.31, h * 0.49);
}

function drawCorridorFloorDetail(centerX, vanishingY, progress) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.strokeStyle = "rgba(120, 210, 230, 0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 12; i += 1) {
    const t = i / 11;
    const y = vanishingY + (h - vanishingY) * t * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  for (let i = -4; i <= 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(centerX + i * 24, vanishingY);
    ctx.lineTo(centerX + i * w * 0.16, h);
    ctx.stroke();
  }

  const reflection = ctx.createRadialGradient(centerX, h * 0.88, 10, centerX, h * 0.88, w * 0.34);
  reflection.addColorStop(0, "rgba(160, 25, 25, 0.24)");
  reflection.addColorStop(0.5, "rgba(95, 170, 190, 0.08)");
  reflection.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = reflection;
  ctx.fillRect(0, vanishingY, w, h - vanishingY);
}

function drawDistantHallFigure(centerX, vanishingY, progress) {
  const scale = 0.55 + progress * 0.2;
  drawDistantFigure(centerX - canvas.width * 0.18, vanishingY + canvas.height * 0.18, scale);
}

function drawExitStyleAnomaly(centerX, vanishingY, progress, look) {
  const w = canvas.width;
  const h = canvas.height;
  const delta = progress - ANOMALY_PROGRESS;
  const visible = Math.abs(delta) < 0.34;
  if (!visible) return;

  const closeness = 1 - Math.abs(delta) / 0.34;
  const x = centerX + w * (0.24 + delta * -0.2);
  const y = h * (0.42 + delta * 0.16);
  const panelW = 74 + closeness * 70;
  const panelH = 112 + closeness * 100;

  ctx.fillStyle = "rgba(18, 8, 9, 0.94)";
  ctx.strokeStyle = "#ff556a";
  ctx.lineWidth = 3 + closeness * 3;
  ctx.fillRect(x, y, panelW, panelH);
  ctx.strokeRect(x, y, panelW, panelH);
  ctx.fillStyle = "rgba(255, 85, 106, 0.55)";
  ctx.font = `800 ${13 + closeness * 6}px ui-sans-serif, system-ui`;
  ctx.fillText("ELEVATOR", x + panelW * 0.16, y + panelH * 0.34);
  ctx.fillStyle = "#ff556a";
  ctx.font = `900 ${22 + closeness * 15}px ui-sans-serif, system-ui`;
  ctx.fillText("FLOOR 8", x + panelW * 0.08, y + panelH * 0.62);

  if (closeness > 0.55 && Math.abs(look) < 0.38) {
    state.target = { anomaly: true, text: "FLOOR 8" };
  }
}

function drawPerspectiveTable(x, y, scale) {
  ctx.fillStyle = "rgba(32, 38, 39, 0.92)";
  ctx.beginPath();
  ctx.ellipse(x, y, 54 * scale, 18 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  drawMapChair(x - 42 * scale, y + 18 * scale, "#93503f");
  drawMapChair(x + 46 * scale, y + 16 * scale, "#af994d");
}

function drawFirstPersonHands() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "rgba(5, 5, 6, 0.72)";
  ctx.beginPath();
  ctx.ellipse(w * 0.33, h * 1.04, w * 0.18, h * 0.12, -0.2, 0, Math.PI * 2);
  ctx.ellipse(w * 0.67, h * 1.04, w * 0.18, h * 0.12, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawCorridorVignette() {
  const w = canvas.width;
  const h = canvas.height;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.68);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, "rgba(0, 0, 0, 0.72)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawPlayableLibraryMap() {
  const w = canvas.width;
  const h = canvas.height;
  const viewW = Math.min(WORLD_W, w / 0.82);
  const viewH = Math.min(WORLD_H, h / 0.82);
  const cameraX = clamp(state.player.x - viewW / 2, 0, WORLD_W - viewW);
  const cameraY = clamp(state.player.y - viewH / 2, 0, WORLD_H - viewH);
  const scale = Math.min(w / viewW, h / viewH);

  state.target = null;

  ctx.save();
  ctx.fillStyle = "#030608";
  ctx.fillRect(0, 0, w, h);
  ctx.scale(scale, scale);
  ctx.translate(-cameraX, -cameraY);

  drawLibraryFloorPlan();
  drawLibraryFurniture();
  drawLibraryAnomaly();
  drawPlayerMarker();

  ctx.restore();
  drawLibraryDarkness(scale, cameraX, cameraY);
  drawNearbyPrompt();
}

function drawLibraryFloorPlan() {
  ctx.fillStyle = "#10181c";
  ctx.fillRect(0, 0, WORLD_W, WORLD_H);

  const floor = ctx.createLinearGradient(0, 0, WORLD_W, WORLD_H);
  floor.addColorStop(0, "#17252c");
  floor.addColorStop(0.52, "#0c1519");
  floor.addColorStop(1, "#050709");
  ctx.fillStyle = floor;
  ctx.fillRect(40, 60, WORLD_W - 80, WORLD_H - 110);

  ctx.strokeStyle = "rgba(125, 180, 196, 0.11)";
  ctx.lineWidth = 1;
  for (let x = 70; x < WORLD_W - 70; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 70);
    ctx.lineTo(x, WORLD_H - 70);
    ctx.stroke();
  }
  for (let y = 90; y < WORLD_H - 80; y += 42) {
    ctx.beginPath();
    ctx.moveTo(60, y);
    ctx.lineTo(WORLD_W - 60, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#071013";
  ctx.fillRect(45, 60, 68, WORLD_H - 130);
  ctx.fillRect(50, 58, WORLD_W - 100, 32);
  ctx.fillRect(50, WORLD_H - 90, WORLD_W - 100, 32);
  ctx.fillRect(WORLD_W - 92, 58, 42, WORLD_H - 125);

  ctx.fillStyle = "rgba(80, 130, 148, 0.18)";
  ctx.strokeStyle = "rgba(155, 225, 242, 0.38)";
  ctx.lineWidth = 4;
  ctx.fillRect(790, 120, 430, 300);
  ctx.strokeRect(790, 120, 430, 300);
  for (let x = 900; x <= 1120; x += 110) {
    ctx.beginPath();
    ctx.moveTo(x, 120);
    ctx.lineTo(x - 26, 420);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(220, 244, 250, 0.38)";
  ctx.font = "700 22px ui-sans-serif, system-ui";
  ctx.fillText("GLASS STUDY ROOMS", 840, 158);

  ctx.fillStyle = "#18130f";
  ctx.fillRect(280, 120, 290, 250);
  ctx.fillStyle = "rgba(124, 168, 188, 0.18)";
  ctx.fillRect(315, 160, 110, 90);
  ctx.fillRect(445, 160, 82, 90);
  ctx.fillStyle = "rgba(210, 210, 210, 0.28)";
  ctx.font = "700 26px ui-sans-serif, system-ui";
  ctx.fillText("THEY HEAR", 420, 285);
  ctx.fillText("WHAT YOU IGNORE", 388, 320);

  ctx.fillStyle = "#101113";
  ctx.fillRect(1000, 285, 120, 190);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.strokeRect(1000, 285, 120, 190);
  ctx.fillStyle = "rgba(235, 244, 247, 0.42)";
  ctx.font = "700 18px ui-sans-serif, system-ui";
  ctx.fillText("ELEVATORS", 1008, 278);

  for (const column of [
    [210, 180], [650, 170], [1250, 190], [225, 610],
    [615, 600], [900, 640], [1180, 620],
  ]) {
    drawColumn(column[0], column[1]);
  }
}

function drawLibraryFurniture() {
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      const x = 285 + col * 170 + (row % 2) * 35;
      const y = 520 + row * 100;
      drawMapTable(x, y, 112, 42);
      drawMapChair(x - 74, y + 18, col % 2 ? "#a94635" : "#6f8b9a");
      drawMapChair(x + 72, y + 18, col % 3 ? "#c0a64d" : "#315876");
      drawMapChair(x - 12, y - 52, row % 2 ? "#7d4742" : "#8d9ba2");
    }
  }

  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      drawComputerDesk(120 + col * 135, 400 + row * 100);
    }
  }

  drawComputerDesk(920, 520);
  drawComputerDesk(1080, 530);
  drawComputerDesk(1220, 515);

  ctx.fillStyle = "rgba(0, 0, 0, 0.9)";
  ctx.fillRect(115, 655, 118, 84);
  ctx.strokeStyle = "#70e4ff";
  ctx.strokeRect(115, 655, 118, 84);
  ctx.fillStyle = "#70e4ff";
  ctx.font = "700 14px ui-sans-serif, system-ui";
  ctx.fillText("ANOMALY", 138, 692);
  ctx.fillText("DETECTED", 136, 712);

  ctx.fillStyle = "rgba(12, 14, 16, 0.92)";
  ctx.fillRect(1230, 330, 72, 172);
  ctx.fillStyle = "rgba(238, 244, 248, 0.45)";
  ctx.font = "800 23px ui-sans-serif, system-ui";
  ctx.save();
  ctx.translate(1268, 470);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText("COLLEGE OF ARTS", 0, 0);
  ctx.restore();
}

function drawLibraryAnomaly() {
  ctx.fillStyle = "rgba(18, 8, 9, 0.96)";
  ctx.strokeStyle = "#ff556a";
  ctx.lineWidth = 5;
  ctx.fillRect(ANOMALY.x - 54, ANOMALY.y - 68, 108, 136);
  ctx.strokeRect(ANOMALY.x - 54, ANOMALY.y - 68, 108, 136);
  ctx.fillStyle = "rgba(255, 85, 106, 0.38)";
  ctx.font = "700 15px ui-sans-serif, system-ui";
  ctx.fillText("ELEVATOR", ANOMALY.x - 34, ANOMALY.y - 25);
  ctx.fillStyle = "#ff556a";
  ctx.font = "900 30px ui-sans-serif, system-ui";
  ctx.fillText("FLOOR 8", ANOMALY.x - 49, ANOMALY.y + 18);

  const distance = Math.hypot(state.player.x - ANOMALY.x, state.player.y - ANOMALY.y);
  if (distance < ANOMALY.radius) {
    state.target = { anomaly: true, text: "FLOOR 8" };
    ctx.strokeStyle = "rgba(255, 85, 106, 0.65)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(ANOMALY.x, ANOMALY.y, ANOMALY.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawPlayerMarker() {
  const coneLength = state.flashlight ? 245 : 145;
  ctx.save();
  ctx.translate(state.player.x, state.player.y);
  ctx.rotate(state.player.angle);
  const beam = ctx.createRadialGradient(0, 0, 8, coneLength, 0, coneLength);
  beam.addColorStop(0, state.flashlight ? "rgba(255, 244, 196, 0.3)" : "rgba(112, 228, 255, 0.08)");
  beam.addColorStop(1, "rgba(255, 244, 196, 0)");
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(coneLength, -70);
  ctx.lineTo(coneLength, 70);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = "#f6c751";
  ctx.strokeStyle = "#080808";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(state.player.x, state.player.y, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = "#f6c751";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(state.player.x, state.player.y);
  ctx.lineTo(state.player.x + Math.cos(state.player.angle) * 34, state.player.y + Math.sin(state.player.angle) * 34);
  ctx.stroke();
}

function drawLibraryDarkness(scale, cameraX, cameraY) {
  const px = (state.player.x - cameraX) * scale;
  const py = (state.player.y - cameraY) * scale;
  const radius = state.flashlight ? 410 : 285;
  const shade = ctx.createRadialGradient(px, py, 40, px, py, radius);
  shade.addColorStop(0, "rgba(0, 0, 0, 0)");
  shade.addColorStop(0.58, "rgba(0, 0, 0, 0.08)");
  shade.addColorStop(1, "rgba(0, 0, 0, 0.46)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawNearbyPrompt() {
  ui.targetLabel.textContent = state.target ? `${state.target.text} - report this anomaly` : "";
  ui.targetLabel.classList.toggle("is-visible", Boolean(state.target));
}

function drawColumn(x, y) {
  ctx.fillStyle = "#222b30";
  ctx.fillRect(x - 22, y - 36, 44, 72);
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.fillRect(x - 18, y - 32, 8, 64);
}

function drawMapTable(x, y, width, height) {
  ctx.fillStyle = "#303838";
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.ellipse(x - width * 0.12, y - height * 0.16, width * 0.2, height * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawMapChair(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x - 18, y - 14, 36, 28);
  ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
  ctx.fillRect(x - 14, y + 12, 6, 18);
  ctx.fillRect(x + 8, y + 12, 6, 18);
}

function drawComputerDesk(x, y) {
  ctx.fillStyle = "#d8dde0";
  ctx.fillRect(x - 50, y - 25, 100, 50);
  ctx.fillStyle = "#071013";
  ctx.fillRect(x - 24, y - 36, 48, 27);
  ctx.strokeStyle = "rgba(112, 228, 255, 0.4)";
  ctx.strokeRect(x - 24, y - 36, 48, 27);
}

function drawMenuScene() {
  const w = canvas.width;
  const h = canvas.height;
  const pulse = Math.sin(performance.now() / 650) * 0.06;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#020202");
  bg.addColorStop(0.55, "#111111");
  bg.addColorStop(1, "#030303");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  drawPerspectiveHall({
    vanishingX: w * 0.5,
    vanishingY: h * 0.38,
    leftWall: "#171313",
    rightWall: "#151313",
    floor: "#17100f",
    ceiling: "#0b0b0b",
    red: true,
  });

  for (let i = 0; i < 5; i += 1) {
    const y = h * (0.2 + i * 0.12);
    const scale = 1 - i * 0.1;
    drawDoor(w * (0.21 + i * 0.045), y, 84 * scale, 190 * scale, true);
    drawDoor(w * (0.79 - i * 0.045), y, 84 * scale, 190 * scale, false);
  }

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const glow = ctx.createRadialGradient(w * 0.5, h * 0.8, 10, w * 0.5, h * 0.8, w * 0.36);
  glow.addColorStop(0, `rgba(210, 25, 20, ${0.28 + pulse})`);
  glow.addColorStop(0.45, "rgba(120, 10, 10, 0.12)");
  glow.addColorStop(1, "rgba(120, 10, 10, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  drawVignette(0.72);
}

function drawLobbyScene() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = "#080808";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "rgba(140, 18, 20, 0.08)";
  ctx.fillRect(0, h * 0.16, w, 2);
  drawVignette(0.45);
}

function drawCampusScene() {
  const zone = getLibraryZone();
  if (zone === "study") {
    drawStudyFloor();
  } else {
    drawLibraryHall(zone);
  }
  drawVignette(state.flashlight ? 0.42 : 0.62);
}

function getLibraryZone() {
  if (state.player.x > TILE * 9.4 && state.player.y < TILE * 8.1) return "study";
  if (state.player.x > TILE * 9.2) return "elevator";
  if (state.player.y < TILE * 7.2) return "north";
  return "entrance";
}

function drawLibraryHall(zone) {
  const w = canvas.width;
  const h = canvas.height;
  const turn = normalizeAngle(state.player.angle + Math.PI / 2) * 42;
  const bob = Math.sin((state.player.x + state.player.y) / 38) * 5;
  const progress = Math.max(0, Math.min(1, (TILE * 13.2 - state.player.y) / (TILE * 11)));

  const ceiling = ctx.createLinearGradient(0, 0, 0, h / 2);
  ceiling.addColorStop(0, "#030506");
  ceiling.addColorStop(1, "#17242c");
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, w, h / 2);

  const floorGradient = ctx.createLinearGradient(0, h / 2, 0, h);
  floorGradient.addColorStop(0, "#11191d");
  floorGradient.addColorStop(0.58, "#081012");
  floorGradient.addColorStop(1, "#020303");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, h / 2, w, h / 2);

  drawPerspectiveHall({
    vanishingX: w * (zone === "elevator" ? 0.54 : 0.24 + progress * 0.18) + turn,
    vanishingY: h * (0.47 - progress * 0.06) + bob,
    leftWall: "#081016",
    rightWall: "#1c2a30",
    floor: "#071012",
    ceiling: "#0f1a20",
    red: zone === "elevator",
  });

  ctx.save();
  ctx.translate(turn * -0.45, bob);

  ctx.fillStyle = "rgba(125, 180, 196, 0.18)";
  ctx.strokeStyle = "rgba(178, 230, 242, 0.28)";
  ctx.lineWidth = 3;
  const glassX = w * 0.48;
  const glassY = h * 0.22;
  const glassW = w * 0.42;
  const glassH = h * 0.56;
  ctx.fillRect(glassX, glassY, glassW, glassH);
  ctx.strokeRect(glassX, glassY, glassW, glassH);
  for (let i = 1; i < 4; i += 1) {
    const x = glassX + (glassW / 4) * i;
    ctx.beginPath();
    ctx.moveTo(x, glassY);
    ctx.lineTo(x - 22, glassY + glassH);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(220, 242, 248, 0.12)";
  ctx.fillRect(glassX + glassW * 0.14, glassY + glassH * 0.45, glassW * 0.76, 14);
  ctx.fillRect(glassX + glassW * 0.2, glassY + glassH * 0.53, glassW * 0.55, 10);
  ctx.fillStyle = "rgba(235, 244, 247, 0.42)";
  ctx.font = `700 ${Math.max(15, w * 0.014)}px ui-sans-serif, system-ui`;
  ctx.fillText(zone === "elevator" ? "ELEVATORS" : "GLASS STUDY ROOMS", glassX + glassW * 0.1, glassY + 34);

  for (let i = 0; i < 6; i += 1) {
    const x = w * (0.2 + i * 0.115);
    const y = h * (0.16 + i * 0.03);
    drawCeilingLight(x, y, 86 - i * 7, i % 2 ? "#c7f5ff" : "#ff7878");
  }

  drawDistantFigure(w * 0.2, h * 0.52, 0.62);
  drawReflection(w * 0.2, h * 0.68, 46, 130, "rgba(120, 210, 230, 0.16)");
  if (zone === "elevator") {
    ctx.fillStyle = "rgba(12, 14, 16, 0.92)";
    ctx.fillRect(w * 0.74, h * 0.36, w * 0.09, h * 0.28);
    ctx.strokeStyle = "#ff556a";
    ctx.strokeRect(w * 0.74, h * 0.36, w * 0.09, h * 0.28);
    ctx.fillStyle = "#ff556a";
    ctx.font = `800 ${Math.max(16, w * 0.018)}px ui-sans-serif, system-ui`;
    ctx.fillText("FLOOR 8", w * 0.755, h * 0.49);
  }
  ctx.restore();
}

function drawStudyFloor() {
  const w = canvas.width;
  const h = canvas.height;
  const turn = normalizeAngle(state.player.angle + Math.PI / 2) * 30;

  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, "#091017");
  bg.addColorStop(0.48, "#17242b");
  bg.addColorStop(1, "#05080a");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  ctx.translate(turn * -0.35, 0);
  for (let i = 0; i < 12; i += 1) {
    drawCeilingLight(w * (0.12 + i * 0.09), h * (0.14 + (i % 3) * 0.045), 120 - i * 3, "#bcefff");
  }

  ctx.fillStyle = "#11191b";
  ctx.fillRect(0, h * 0.36, w, h * 0.1);
  ctx.fillStyle = "rgba(142, 87, 58, 0.52)";
  ctx.fillRect(w * 0.19, h * 0.36, w * 0.24, h * 0.25);
  ctx.fillStyle = "rgba(124, 168, 188, 0.18)";
  ctx.fillRect(w * 0.08, h * 0.38, w * 0.14, h * 0.17);
  ctx.fillRect(w * 0.56, h * 0.35, w * 0.22, h * 0.2);
  ctx.fillStyle = "rgba(18, 18, 18, 0.82)";
  ctx.fillRect(w * 0.82, h * 0.28, w * 0.07, h * 0.38);

  ctx.fillStyle = "rgba(10, 12, 13, 0.78)";
  ctx.fillRect(0, h * 0.58, w, h * 0.42);

  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 5; col += 1) {
      const x = w * (0.12 + col * 0.18) + (row % 2) * 34;
      const y = h * (0.62 + row * 0.12);
      const s = 1 + row * 0.18;
      drawTable(x, y, 86 * s, 28 * s);
      drawChair(x - 48 * s, y + 16 * s, s, col % 2 ? "#a94635" : "#7c93a0");
      drawChair(x + 52 * s, y + 14 * s, s, col % 3 ? "#c3a24a" : "#375b77");
    }
  }

  ctx.fillStyle = "rgba(0, 0, 0, 0.88)";
  ctx.fillRect(w * 0.08, h * 0.68, w * 0.1, h * 0.13);
  ctx.strokeStyle = "#70e4ff";
  ctx.strokeRect(w * 0.08, h * 0.68, w * 0.1, h * 0.13);
  ctx.fillStyle = "#70e4ff";
  ctx.font = `${Math.max(13, w * 0.012)}px ui-sans-serif, system-ui`;
  ctx.fillText("ANOMALY", w * 0.095, h * 0.725);
  ctx.fillText("DETECTED", w * 0.095, h * 0.75);

  ctx.fillStyle = "rgba(210, 210, 210, 0.35)";
  ctx.font = `700 ${Math.max(22, w * 0.026)}px ui-sans-serif, system-ui`;
  ctx.fillText("THEY HEAR", w * 0.47, h * 0.46);
  ctx.fillText("WHAT YOU IGNORE", w * 0.46, h * 0.51);
  drawDistantFigure(w * 0.66, h * 0.45, 0.72);
  ctx.restore();
}

function drawPerspectiveHall({ vanishingX, vanishingY, leftWall, rightWall, floor, ceiling, red }) {
  const w = canvas.width;
  const h = canvas.height;
  ctx.fillStyle = ceiling;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(w, 0);
  ctx.lineTo(vanishingX + w * 0.16, vanishingY);
  ctx.lineTo(vanishingX - w * 0.16, vanishingY);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = leftWall;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(vanishingX - w * 0.16, vanishingY);
  ctx.lineTo(vanishingX - w * 0.16, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = rightWall;
  ctx.beginPath();
  ctx.moveTo(w, 0);
  ctx.lineTo(vanishingX + w * 0.16, vanishingY);
  ctx.lineTo(vanishingX + w * 0.22, h);
  ctx.lineTo(w, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = floor;
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(w, h);
  ctx.lineTo(vanishingX + w * 0.16, vanishingY);
  ctx.lineTo(vanishingX - w * 0.16, vanishingY);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = red ? "rgba(190, 30, 30, 0.16)" : "rgba(160, 220, 235, 0.12)";
  ctx.lineWidth = 2;
  for (let i = 0; i < 11; i += 1) {
    const t = i / 10;
    const y = vanishingY + (h - vanishingY) * t * t;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawDoor(x, y, width, height, left) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(3, 3, 3, 0.9)";
  ctx.strokeStyle = "rgba(120, 75, 70, 0.34)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(left ? 0 : width, 0);
  ctx.lineTo(left ? width : 0, 20);
  ctx.lineTo(left ? width : 0, height);
  ctx.lineTo(left ? 0 : width, height + 34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCeilingLight(x, y, width, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.moveTo(x - width / 2, y);
  ctx.lineTo(x + width / 2, y);
  ctx.stroke();
  ctx.restore();
}

function drawDistantFigure(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "rgba(2, 4, 5, 0.86)";
  ctx.beginPath();
  ctx.arc(0, -38, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-10, -26, 20, 52);
  ctx.fillRect(-18, -12, 9, 52);
  ctx.fillRect(9, -12, 9, 52);
  ctx.restore();
}

function drawReflection(x, y, width, height, color) {
  const gradient = ctx.createRadialGradient(x, y, 4, x, y + height * 0.5, height);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(x - width / 2, y, width, height);
}

function drawTable(x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "rgba(38, 42, 42, 0.94)";
  ctx.beginPath();
  ctx.ellipse(x, y, width / 2, height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(5, 5, 5, 0.72)";
  ctx.fillRect(x - 7, y, 14, height * 1.5);
  ctx.restore();
}

function drawChair(x, y, scale, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 22 * scale, 28 * scale);
  ctx.fillStyle = "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(x + 4 * scale, y + 26 * scale, 5 * scale, 22 * scale);
  ctx.fillRect(x + 16 * scale, y + 26 * scale, 5 * scale, 22 * scale);
  ctx.restore();
}

function drawVignette(strength) {
  const w = canvas.width;
  const h = canvas.height;
  const vignette = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.max(w, h) * 0.7);
  vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
  vignette.addColorStop(1, `rgba(0, 0, 0, ${strength})`);
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);
}

function drawMapOverlay() {
  const scale = 7;
  const pad = 18;
  const mapW = map[0].length * scale;
  const mapH = map.length * scale;
  const x0 = pad;
  const y0 = canvas.height - mapH - pad;

  ctx.save();
  ctx.fillStyle = "rgba(4, 6, 8, 0.72)";
  ctx.strokeStyle = "rgba(112, 228, 255, 0.28)";
  ctx.lineWidth = 1;
  ctx.fillRect(x0 - 10, y0 - 30, mapW + 20, mapH + 40);
  ctx.strokeRect(x0 - 10, y0 - 30, mapW + 20, mapH + 40);
  ctx.fillStyle = "#70e4ff";
  ctx.font = "700 12px ui-sans-serif, system-ui";
  ctx.fillText("Pollak Library 1F", x0, y0 - 12);

  for (let y = 0; y < map.length; y += 1) {
    for (let x = 0; x < map[y].length; x += 1) {
      ctx.fillStyle = map[y][x] === "1" ? "rgba(128, 154, 164, 0.34)" : "rgba(34, 54, 62, 0.72)";
      ctx.fillRect(x0 + x * scale, y0 + y * scale, scale - 1, scale - 1);
    }
  }

  const px = x0 + (state.player.x / TILE) * scale;
  const py = y0 + (state.player.y / TILE) * scale;
  ctx.fillStyle = "#f6c751";
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#f6c751";
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.lineTo(px + Math.cos(state.player.angle) * 12, py + Math.sin(state.player.angle) * 12);
  ctx.stroke();
  ctx.restore();
}

function tint(hex, amount) {
  const clean = hex.slice(1);
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgb(${Math.floor(r * amount)}, ${Math.floor(g * amount)}, ${Math.floor(b * amount)})`;
}

function drawSprites(rayData, fov) {
  const w = canvas.width;
  const h = canvas.height;
  const visible = state.objects
    .filter((object) => !object.hidden)
    .map((object) => {
      const dx = object.x - state.player.x;
      const dy = object.y - state.player.y;
      const distance = Math.hypot(dx, dy);
      const angle = normalizeAngle(Math.atan2(dy, dx) - state.player.angle);
      return { ...object, distance, angle };
    })
    .filter((object) => Math.abs(object.angle) < fov / 2 + 0.22 && object.distance > 12)
    .sort((a, b) => b.distance - a.distance);

  state.target = null;

  for (const object of visible) {
    const screenX = (0.5 + object.angle / fov) * w;
    const perspective = Math.min(2.2, (TILE * 5.8) / object.distance);
    const spriteW = 62 * perspective * object.scale;
    const spriteH = (object.kind === "bot" ? 118 : 78) * perspective * object.scale;
    const y = h / 2 - spriteH * 0.34;
    const x = screenX - spriteW / 2;
    const rayIndex = Math.floor((screenX / w) * rayData.length);
    if (rayData[rayIndex] && object.distance > rayData[rayIndex] + 18) continue;

    drawSpriteCard(object, x, y, spriteW, spriteH);

    if (Math.abs(object.angle) < 0.055 && object.distance < TILE * (state.magnify ? 7 : 4.2)) {
      state.target = object;
    }
  }

  ui.targetLabel.textContent = state.target
    ? `${state.target.text}${state.target.anomaly && state.magnify ? " - inconsistent" : ""}`
    : "";
  ui.targetLabel.classList.toggle("is-visible", Boolean(state.target));
}

function drawSpriteCard(object, x, y, width, height) {
  ctx.save();
  ctx.globalAlpha = object.kind === "spooky" ? 0.78 + Math.sin(performance.now() / 120) * 0.18 : 1;
  ctx.fillStyle = object.kind === "bot" ? "rgba(8, 10, 12, 0.92)" : "rgba(10, 14, 20, 0.84)";
  ctx.strokeStyle = object.color;
  ctx.lineWidth = Math.max(2, width / 34);
  ctx.fillRect(x, y, width, height);
  ctx.strokeRect(x, y, width, height);
  ctx.fillStyle = object.color;
  ctx.font = `700 ${Math.max(11, Math.floor(width / 8))}px ui-sans-serif, system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const label = object.text.length > 14 ? object.text.slice(0, 14) : object.text;
  ctx.fillText(label, x + width / 2, y + height / 2);

  if (object.kind === "bot") {
    ctx.strokeStyle = "#ff556a";
    ctx.beginPath();
    ctx.arc(x + width * 0.33, y + height * 0.25, width * 0.08, 0, Math.PI * 2);
    ctx.arc(x + width * 0.67, y + height * 0.25, width * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawLighting() {
  const w = canvas.width;
  const h = canvas.height;
  ctx.save();
  ctx.fillStyle = state.flashlight ? "rgba(0, 0, 0, 0.33)" : "rgba(0, 0, 0, 0.58)";
  ctx.fillRect(0, 0, w, h);

  if (state.flashlight) {
    const beam = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, state.magnify ? 360 : 260);
    beam.addColorStop(0, "rgba(255, 244, 196, 0.34)");
    beam.addColorStop(0.54, "rgba(255, 244, 196, 0.1)");
    beam.addColorStop(1, "rgba(255, 244, 196, 0)");
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = beam;
    ctx.fillRect(0, 0, w, h);
  }

  if (state.magnify) {
    ctx.strokeStyle = "rgba(112, 228, 255, 0.8)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, Math.min(w, h) * 0.23, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function normalizeAngle(angle) {
  while (angle > Math.PI) angle -= Math.PI * 2;
  while (angle < -Math.PI) angle += Math.PI * 2;
  return angle;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function update(dt) {
  if (!state.running) return;

  const sprint = state.keys.has("shift") ? 2.15 : 1;
  const panSpeed = 0.62 * sprint * (dt / 1000);
  const zoomSpeed = 0.2 * sprint * (dt / 1000);
  const turnSpeed = 2.5 * (dt / 1000);

  if (state.keys.has("q") || state.keys.has("arrowleft")) state.player.angle -= turnSpeed;
  if (state.keys.has("e") || state.keys.has("arrowright")) state.player.angle += turnSpeed;

  let forward = 0;
  let strafe = 0;
  if (state.keys.has("w") || state.keys.has("arrowup")) forward += 1;
  if (state.keys.has("s") || state.keys.has("arrowdown")) forward -= 1;
  if (state.keys.has("a")) strafe -= 1;
  if (state.keys.has("d")) strafe += 1;

  state.viewY = clamp(state.viewY - forward * panSpeed, 0, 1);
  state.viewX = clamp(state.viewX + strafe * panSpeed, 0, 1);
  state.sceneZoom = clamp(state.sceneZoom + forward * zoomSpeed, 1, 1.38);

  if (state.flashlight) {
    state.battery = Math.max(0, state.battery - dt * 0.0028);
    if (state.battery <= 0) {
      state.flashlight = false;
      setPrompt("Flashlight battery depleted. The hallway feels much larger now.", 2500);
    }
  } else {
    state.battery = Math.min(100, state.battery + dt * 0.001);
  }

  updateBot(dt);

  if (state.promptTimer > 0) {
    state.promptTimer -= dt;
  }
}

function moveTo(nx, ny) {
  const radius = 16;
  if (!isBlocked(nx + Math.sign(nx - state.player.x) * radius, state.player.y)) {
    state.player.x = nx;
  }
  if (!isBlocked(state.player.x, ny + Math.sign(ny - state.player.y) * radius)) {
    state.player.y = ny;
  }
}

function isBlocked(x, y) {
  if (x < 75 || y < 95 || x > WORLD_W - 80 || y > WORLD_H - 90) return true;
  const blockers = [
    [280, 120, 290, 250],
    [790, 120, 430, 300],
    [1000, 285, 120, 190],
    [1230, 330, 72, 172],
  ];
  return blockers.some(([bx, by, bw, bh]) => x > bx - 18 && x < bx + bw + 18 && y > by - 18 && y < by + bh + 18);
}

function updateBot(dt) {
  const bot = state.objects.find((object) => object.id === "net-bot" && !object.hidden);
  if (!bot) return;

  const dx = state.player.x - bot.x;
  const dy = state.player.y - bot.y;
  const distance = Math.hypot(dx, dy);
  const speed = state.botAlert ? 58 : 28;
  bot.x += (dx / distance) * speed * (dt / 1000);
  bot.y += (dy / distance) * speed * (dt / 1000);

  if (distance < TILE * 5 && !state.botAlert) {
    state.botAlert = true;
    setPrompt("Audio cue: synthetic footsteps. The Net Bot is inside the loop.", 3000);
  }

  if (distance < TILE * 0.72) {
    failDecision("The Net Bot reached you. Run reset to floor 1.");
  }
}

function reportDecision(hasAnomalyDecision) {
  if (!state.running) return;
  state.attempts += 1;
  const floor = floors[state.floorIndex];
  const correct = hasAnomalyDecision === floor.hasAnomaly;

  if (correct) {
    state.correct += 1;
    state.streak += 1;
    if (state.floorIndex < floors.length - 1) {
      state.floorIndex += 1;
      setPrompt("Correct. Moving to the next floor.", 2400);
      setTimeout(startFloor, 1000);
    } else {
      showOutcome("victory");
    }
  } else {
    showOutcome("defeat");
  }
  updateHud();
}

function showOutcome(type) {
  const elapsed = Math.max(1, Math.floor((performance.now() - state.startTime) / 1000));
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  state.running = false;
  state.completed = type === "victory";
  ui.outcomePanel.classList.toggle("defeat", type === "defeat");
  ui.failureReason.classList.toggle("is-hidden", type !== "defeat");
  ui.failureTip.classList.toggle("is-hidden", type !== "defeat");
  ui.levelBreakdown.classList.toggle("is-hidden", type === "defeat");
  if (type === "defeat") {
    const floor = floors[state.floorIndex];
    const reason = floor.hasAnomaly
      ? `You cleared the floor while a ${floor.anomalyLabel || "glitch"} was present on ${floor.floor}.`
      : `You reported an anomaly, but ${floor.floor} was normal.`;
    ui.failureReason.querySelector("span").textContent = reason;
  }
  ui.outcomeTitle.textContent = type === "victory" ? "You Escaped" : "The Glitch Got You";
  ui.outcomeSubtitle.textContent = type === "victory"
    ? "The glitch has been defeated. You made it out."
    : "You failed to identify the anomaly. The run has been reset.";
  ui.statTime.textContent = `${mins}:${secs}`;
  ui.statTwoLabel.textContent = type === "victory" ? "Floor Checks" : "Streak Lost";
  ui.statTwoValue.textContent = type === "victory" ? `${state.correct}/${floors.length}` : "1";
  ui.statTwoSub.textContent = type === "victory" ? "correct" : "reset to 0";
  ui.statThreeLabel.textContent = type === "victory" ? "Resets" : "Failed On";
  ui.statThreeValue.textContent = type === "victory" ? "0" : floors[state.floorIndex].floor;
  ui.statThreeSub.textContent = type === "victory" ? "total" : "Pollak Library";
  ui.statAccuracy.textContent = type === "victory" ? "100%" : "0%";
  ui.outcomeRetryButton.textContent = type === "victory" ? "Play Again" : "Try Again";
  renderLevelBreakdown();
  setScreen("outcome");
}

function renderLevelBreakdown() {
  ui.levelBreakdownItems.replaceChildren();
  floors.forEach((floor, index) => {
    const label = document.createElement("span");
    label.textContent = `F${index + 1}`;

    const status = document.createElement("em");
    status.textContent = "✓";
    status.title = floor.floor;

    ui.levelBreakdownItems.append(label, status);
  });
}

function advanceFloor() {
  state.completed = true;
  state.running = false;
  updateHud();
}

function failDecision(message) {
  state.lives -= 1;
  state.streak = 0;
  if (state.lives <= 0) {
    setPrompt(`${message} Game over.`, 4200);
    state.running = false;
    setScreen("menu");
    return;
  }

  state.floorIndex = 0;
  setPrompt(`${message} Lives remaining: ${state.lives}. Restarting at floor 1.`, 3600);
  setTimeout(startFloor, 1000);
}

function updateHud() {
  const floor = floors[state.floorIndex];
  ui.locationLabel.textContent = floor.name;
  ui.floorLabel.textContent = state.completed ? "Demo complete" : floor.floor;
  ui.livesLabel.textContent = String(state.lives);
  ui.batteryLabel.textContent = `${Math.round(state.battery)}%`;
  ui.streakLabel.textContent = String(state.streak);
  ui.accuracyLabel.textContent = state.attempts ? `${Math.round((state.correct / state.attempts) * 100)}%` : "--";
  ui.toolLabel.textContent = state.magnify
    ? "Magnifying glass"
    : state.flashlight
      ? "Flashlight on"
      : "Flashlight off";

  const elapsed = Math.floor((performance.now() - state.startTime) / 1000);
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");
  ui.timerLabel.textContent = `${mins}:${secs}`;
}

function loop(now) {
  const dt = Math.min(50, now - state.lastTime);
  state.lastTime = now;
  update(dt);
  if (state.screen === "menu") {
    drawMenuScene();
  } else if (state.screen === "lobby") {
    drawLobbyScene();
  } else if (state.screen === "settings" || state.screen === "scan") {
    drawMenuScene();
  } else {
    drawWorld();
    updateHud();
  }
  requestAnimationFrame(loop);
}

function setScreen(screen) {
  state.screen = screen;
  ui.wrap.classList.toggle("menu-mode", screen === "menu");
  ui.wrap.classList.toggle("settings-mode", screen === "settings");
  ui.wrap.classList.toggle("scan-mode", screen === "scan");
  ui.wrap.classList.toggle("lobby-mode", screen === "lobby");
  ui.wrap.classList.toggle("outcome-mode", screen === "outcome");
  ui.wrap.classList.toggle("hud-collapsed", screen === "game" && !state.hudVisible);
  ui.menuPanel.classList.toggle("is-hidden", screen !== "menu");
  ui.settingsPanel.classList.toggle("is-hidden", screen !== "settings");
  ui.scanPanel.classList.toggle("is-hidden", screen !== "scan");
  ui.lobbyPanel.classList.toggle("is-hidden", screen !== "lobby");
  ui.outcomePanel.classList.toggle("is-hidden", screen !== "outcome");
  if (screen === "scan") {
    startScanScene();
  }
}

function startGame() {
  state.running = true;
  state.hudVisible = false;
  setScreen("game");
  if (canvas.requestPointerLock) {
    const lockRequest = canvas.requestPointerLock();
    if (lockRequest?.catch) lockRequest.catch(() => {});
  }
  resetRun();
}

const scanState = {
  x: -999,
  y: -999,
  frame: null,
};

function sizeScanMask() {
  const ratio = window.devicePixelRatio || 1;
  const bounds = ui.scanPanel.getBoundingClientRect();
  ui.scanMask.width = Math.max(1, Math.floor(bounds.width * ratio));
  ui.scanMask.height = Math.max(1, Math.floor(bounds.height * ratio));
}

function drawScanMask() {
  if (state.screen !== "scan") return;
  const mask = ui.scanMask;
  const maskCtx = mask.getContext("2d");
  const ratio = window.devicePixelRatio || 1;
  maskCtx.clearRect(0, 0, mask.width, mask.height);
  maskCtx.fillStyle = "rgba(0, 0, 0, 0.72)";
  maskCtx.fillRect(0, 0, mask.width, mask.height);

  const x = scanState.x * ratio;
  const y = scanState.y * ratio;
  const radius = 160 * ratio;
  const gradient = maskCtx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, "rgba(0, 0, 0, 1)");
  gradient.addColorStop(0.62, "rgba(0, 0, 0, 0.7)");
  gradient.addColorStop(1, "rgba(0, 0, 0, 0)");

  maskCtx.globalCompositeOperation = "destination-out";
  maskCtx.fillStyle = gradient;
  maskCtx.beginPath();
  maskCtx.arc(x, y, radius, 0, Math.PI * 2);
  maskCtx.fill();
  maskCtx.globalCompositeOperation = "source-over";
  scanState.frame = requestAnimationFrame(drawScanMask);
}

function startScanScene() {
  state.running = false;
  ui.scanFound.classList.add("is-hidden");
  ui.scanPopup.classList.remove("is-visible");
  scanState.x = -999;
  scanState.y = -999;
  sizeScanMask();
  cancelAnimationFrame(scanState.frame);
  drawScanMask();
}

function stopScanScene() {
  cancelAnimationFrame(scanState.frame);
  ui.scanPopup.classList.remove("is-visible");
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift", "q", "e"].includes(key)) {
    event.preventDefault();
    state.keys.add(key);
  }
  if (key === "f") {
    state.flashlight = !state.flashlight && state.battery > 1;
    setPrompt(state.flashlight ? "Flashlight on. Battery drains while active." : "Flashlight off. Battery slowly recharges.", 1800);
  }
  if (key === "tab") {
    event.preventDefault();
    if (state.screen === "game") {
      state.hudVisible = !state.hudVisible;
      ui.wrap.classList.toggle("hud-collapsed", !state.hudVisible);
    }
  }
  if (key === "g") reportDecision(true);
  if (key === "c") reportDecision(false);
});

window.addEventListener("keyup", (event) => {
  state.keys.delete(event.key.toLowerCase());
});

canvas.addEventListener("mousemove", (event) => {
  if (document.pointerLockElement === canvas) {
    state.player.angle += event.movementX * 0.0023;
  }
});

canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("mousedown", (event) => {
  if (event.button === 2) state.magnify = true;
});
window.addEventListener("mouseup", (event) => {
  if (event.button === 2) state.magnify = false;
});

function activate(button, handler) {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    handler();
  });
  button.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler();
    }
  });
}

activate(ui.soloButton, startGame);
activate(ui.multiplayerButton, () => {
  state.running = false;
  setScreen("lobby");
});
activate(ui.scanButton, () => setScreen("scan"));
activate(ui.settingsButton, () => setScreen("settings"));
activate(ui.settingsBackButton, () => setScreen("menu"));
activate(ui.settingsSaveButton, () => {
  ui.settingsMessage.textContent = "Settings saved for this prototype session.";
  setTimeout(() => setScreen("menu"), 650);
});
activate(ui.settingsResetButton, () => {
  ui.settingsMessage.textContent = "Settings reset to defaults.";
  setTimeout(() => {
    ui.settingsMessage.textContent = "";
  }, 1800);
});
activate(ui.quitButton, () => {
  setPrompt("Quit is disabled in the browser prototype.", 2200);
});
activate(ui.leaveLobbyButton, () => setScreen("menu"));
activate(ui.startLobbyButton, startGame);
activate(ui.outcomeMenuButton, () => setScreen("menu"));
activate(ui.outcomeRetryButton, startGame);
activate(ui.reportButton, () => reportDecision(true));
activate(ui.clearButton, () => reportDecision(false));
activate(ui.resetButton, resetRun);

ui.scanPanel.addEventListener("pointermove", (event) => {
  const bounds = ui.scanPanel.getBoundingClientRect();
  scanState.x = event.clientX - bounds.left;
  scanState.y = event.clientY - bounds.top;
});

ui.scanPanel.addEventListener("pointerdown", (event) => {
  if (event.target !== ui.scanHotspot) {
    ui.scanPopup.classList.remove("is-visible");
  }
});

activate(ui.scanHotspot, (event) => {
  const bounds = ui.scanPanel.getBoundingClientRect();
  const x = scanState.x > 0 ? scanState.x : bounds.width * 0.44;
  const y = scanState.y > 0 ? scanState.y : bounds.height * 0.32;
  ui.scanPopup.style.left = `${x}px`;
  ui.scanPopup.style.top = `${y}px`;
  ui.scanPopup.classList.add("is-visible");
});
activate(ui.scanReportButton, () => {
  ui.scanPopup.classList.remove("is-visible");
  ui.scanFound.classList.remove("is-hidden");
});
activate(ui.scanContinueButton, () => ui.scanPopup.classList.remove("is-visible"));
activate(ui.scanAgainButton, startScanScene);
activate(ui.scanMenuButton, () => {
  stopScanScene();
  setScreen("menu");
});

window.addEventListener("resize", () => {
  const ratio = window.devicePixelRatio || 1;
  const bounds = canvas.getBoundingClientRect();
  canvas.width = Math.max(960, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(540, Math.floor(bounds.height * ratio));
  if (state.screen === "scan") sizeScanMask();
});

window.dispatchEvent(new Event("resize"));
setScreen("menu");
startFloor();
requestAnimationFrame(loop);
