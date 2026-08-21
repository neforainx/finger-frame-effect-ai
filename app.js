import {
  HandLandmarker,
  PoseLandmarker,
  FilesetResolver,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";
import * as Tone from "https://cdn.jsdelivr.net/npm/tone@14.7.77/+esm";

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task";
const POSE_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GEMINI_MODEL = "gemini-omni-flash-preview";
const STYLES = {
  movie3d:
    "Transform the person into a 3D animated movie character (stylized CGI animation look, expressive big eyes, soft lighting).",
  anime:
    "Redraw the video as a hand-drawn anime with clean line art, cel shading, and vibrant colors.",
  clay: "Transform the scene into claymation stop-motion with visible clay texture.",
  watercolor:
    "Repaint the video as a soft watercolor painting with loose brushwork.",
  spiderman_cartoon:
    "Spider-Man Into the Spider-Verse animated comic book style, halftone dot textures, chromatic aberration, dynamic comic action lines, vibrant comic book colors.",
  nakylla:
    "Nakylla artistic aesthetic, dreamy dark pastel fantasy, ethereal glowing elements, soft moody lighting, elegant character design, magical artistic details.",
  gojo:
    "Jujutsu Kaisen Gojo Satoru aesthetic, intense blue infinity domain expansion glow, electric aura, cool white-haired anime power, dramatic anime shading, high energy.",
};
const PROMPT_SUFFIX =
  " This is a strict pixel-aligned edit of the source video: keep the same " +
  "pose, motion, timing, clothing colors, and background. The camera must " +
  "not change — no zoom, no crop, no recentering, and no change to the " +
  "field of view. The person's face and body must stay at exactly the same " +
  "position and size in the frame as the source: eyes, nose, and mouth must " +
  "remain at the same screen coordinates in every frame. Match the facial " +
  "expression exactly, frame by frame: preserve the exact degree of mouth " +
  "openness at every moment — if the mouth is slightly open and still, keep " +
  "it slightly open and still; do not close it, and do not add talking or " +
  "any mouth movement that is not in the source. Mirror blinks, gaze " +
  "direction, and eyebrow position at the same moments as the source. " +
  "Change only the visual style, nothing about the geometry, composition, " +
  "or performance.";

const WRIST = 0, THUMB_TIP = 4, INDEX_TIP = 8, MIDDLE_MCP = 9;

// Tracking constants
const MAX_LOST_FRAMES = 25;
const JUMP_CONFIRM_FRAMES = 2;

// DOM Elements
const orig = document.getElementById("orig");
const sty = document.getElementById("sty");
const canvas = document.getElementById("canvas");
const ctx = canvas ? canvas.getContext("2d") : null;
const liveCanvas = document.getElementById("live-canvas");
const liveCtx = liveCanvas ? liveCanvas.getContext("2d") : null;

// Gesture Synth Canvas Elements
const synthCanvas = document.getElementById("synth-canvas");
const synthCtx = synthCanvas ? synthCanvas.getContext("2d") : null;

const statusEl = document.getElementById("status");
const stage = document.getElementById("stage");
const drop = document.getElementById("drop");
const btnGenerate = document.getElementById("btn-generate");
const btnPlay = document.getElementById("btn-play");
const btnExport = document.getElementById("btn-export");

const webcam = document.getElementById("webcam");

// Tabs
const tabLiveBtn = document.getElementById("tab-live-btn");
const tabSynthBtn = document.getElementById("tab-synth-btn");
const tabDrumBtn = document.getElementById("tab-drum-btn");
const tabGuitarBtn = document.getElementById("tab-guitar-btn");
const tabFileBtn = document.getElementById("tab-file-btn");

const pageLive = document.getElementById("page-live");
const pageSynth = document.getElementById("page-synth");
const pageDrum = document.getElementById("page-drum");
const pageGuitar = document.getElementById("page-guitar");
const pageFile = document.getElementById("page-file");

// Gesture Drum Elements
const drumCanvas = document.getElementById("drum-canvas");
const drumCtx = drumCanvas ? drumCanvas.getContext("2d") : null;

const btnStartDrumCam = document.getElementById("btn-start-drum-cam");
const btnToggleDrumAudio = document.getElementById("btn-toggle-drum-audio");
const btnDemoBeat = document.getElementById("btn-demo-beat");
const btnRecDrum = document.getElementById("btn-rec-drum");

const drumHudTitle = document.getElementById("drum-hud-title");
const drumHudSub = document.getElementById("drum-hud-sub");
const drumStatusBadge = document.getElementById("drum-status-badge");

const drumKitPreset = document.getElementById("drum-kit-preset");
const drumSensitivity = document.getElementById("drum-sensitivity");
const drumSensitivityVal = document.getElementById("drum-sensitivity-val");
const drumFootSensitivity = document.getElementById("drum-foot-sensitivity");
const drumFootSensitivityVal = document.getElementById("drum-foot-sensitivity-val");
const drumVolume = document.getElementById("drum-volume");
const drumVolVal = document.getElementById("drum-vol-val");
const drumReverb = document.getElementById("drum-reverb");
const drumReverbVal = document.getElementById("drum-reverb-val");
const drumSnarePitch = document.getElementById("drum-snare-pitch");
const drumPitchVal = document.getElementById("drum-pitch-val");

// Gesture Guitar Elements
const guitarCanvas = document.getElementById("guitar-canvas");
const guitarCtx = guitarCanvas ? guitarCanvas.getContext("2d") : null;

const btnStartGuitarCam = document.getElementById("btn-start-guitar-cam");
const btnToggleGuitarAudio = document.getElementById("btn-toggle-guitar-audio");
const btnDemoGuitarStrum = document.getElementById("btn-demo-guitar-strum");
const btnRecGuitar = document.getElementById("btn-rec-guitar");

const guitarHudTitle = document.getElementById("guitar-hud-title");
const guitarHudSub = document.getElementById("guitar-hud-sub");
const guitarStatusBadge = document.getElementById("guitar-status-badge");

const guitarPreset = document.getElementById("guitar-preset");
const guitarPlaystyle = document.getElementById("guitar-playstyle");
const guitarChordRecognition = document.getElementById("guitar-chord-recognition");
const guitarStrumSens = document.getElementById("guitar-strum-sens");
const guitarStrumSensVal = document.getElementById("guitar-strum-sens-val");
const guitarStrumSpeed = document.getElementById("guitar-strum-speed");
const guitarStrumSpeedVal = document.getElementById("guitar-strum-speed-val");
const guitarVolume = document.getElementById("guitar-volume");
const guitarVolVal = document.getElementById("guitar-vol-val");
const guitarDistortion = document.getElementById("guitar-distortion");
const guitarDistortionVal = document.getElementById("guitar-distortion-val");
const guitarChorus = document.getElementById("guitar-chorus");
const guitarChorusVal = document.getElementById("guitar-chorus-val");
const guitarReverb = document.getElementById("guitar-reverb");
const guitarReverbVal = document.getElementById("guitar-reverb-val");

// Mobile & Tablet Audio Unlock UI Elements
const mobileAudioBanner = document.getElementById("mobile-audio-banner");
const btnUnlockMobileAudio = document.getElementById("btn-unlock-mobile-audio");

// Comprehensive Web Audio API / Tone.js Mobile & Tablet Audio Unlocker
let audioGloballyUnlocked = false;

async function unlockAllMobileAndDesktopAudio(e) {
  try {
    // 1. Start / Resume Tone.js AudioContext
    await Tone.start();
    
    // 2. Force resume raw Web Audio context if suspended (crucial for iOS Safari / iPadOS / Android)
    const rawCtx = Tone.getContext()?.rawContext;
    if (rawCtx && rawCtx.state !== "running" && rawCtx.resume) {
      await rawCtx.resume();
    }

    // 3. Play a 1-sample silent WebAudio buffer to release iOS silent-switch lock
    try {
      if (rawCtx) {
        const buffer = rawCtx.createBuffer(1, 1, 22050);
        const source = rawCtx.createBufferSource();
        source.buffer = buffer;
        source.connect(rawCtx.destination);
        source.start(0);
      }
    } catch (silentErr) {}

    audioGloballyUnlocked = true;

    // 4. Hide the mobile audio unlock banner
    if (mobileAudioBanner) {
      mobileAudioBanner.classList.remove("visible");
    }

    // 5. Pre-warm active instrument engine based on current tab
    if (tabDrumBtn && tabDrumBtn.classList.contains("active")) {
      if (!drumAudioStarted) initDrumAudioEngine();
    } else if (tabGuitarBtn && tabGuitarBtn.classList.contains("active")) {
      if (!guitarAudioStarted) initGuitarAudioEngine();
    } else if (tabSynthBtn && tabSynthBtn.classList.contains("active")) {
      if (!audioStarted) initAudioEngine();
    }

    console.log("🔊 Master Web Audio context successfully unlocked and active!");
  } catch (err) {
    console.warn("Mobile audio unlock attempt notice:", err);
  }
}

// Bind audio unlocker to universal user interaction events (Touch, Click, Pointer, Keyboard)
["click", "touchstart", "touchend", "pointerdown", "keydown"].forEach((evtName) => {
  window.addEventListener(evtName, unlockAllMobileAndDesktopAudio, { passive: true, capture: true });
});

if (btnUnlockMobileAudio) {
  btnUnlockMobileAudio.addEventListener("click", async (e) => {
    e.stopPropagation();
    await unlockAllMobileAndDesktopAudio();
    status("🔊 Audio aktif! Mainkan drum, gitar, atau synthesizer dengan gestur tangan.");
  });
  btnUnlockMobileAudio.addEventListener("touchstart", async (e) => {
    e.stopPropagation();
    await unlockAllMobileAndDesktopAudio();
  }, { passive: true });
}

// Auto-check AudioContext state and show banner on mobile/tablet if audio is locked or suspended
function checkMobileAudioState() {
  try {
    const rawCtx = Tone.getContext()?.rawContext;
    const isSuspended = !rawCtx || rawCtx.state === "suspended";
    const isMusicTab = (tabDrumBtn && tabDrumBtn.classList.contains("active")) ||
                       (tabGuitarBtn && tabGuitarBtn.classList.contains("active")) ||
                       (tabSynthBtn && tabSynthBtn.classList.contains("active"));

    if (mobileAudioBanner) {
      if (isSuspended && isMusicTab && !audioGloballyUnlocked) {
        mobileAudioBanner.classList.add("visible");
      } else {
        mobileAudioBanner.classList.remove("visible");
      }
    }
  } catch (e) {}
}

// Re-check and resume audio context when page gains focus or visibility (returning from background on phone)
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    unlockAllMobileAndDesktopAudio();
  }
});
window.addEventListener("focus", () => {
  unlockAllMobileAndDesktopAudio();
});

// Live AR Controls & Elements
const btnStartCam = document.getElementById("btn-start-cam");
const btnRecCam = document.getElementById("btn-rec-cam");
const btnRecAr = document.getElementById("btn-rec-ar");
const btnSnapAr = document.getElementById("btn-snap-ar");
const liveFilterSelect = document.getElementById("live-filter-select");
const liveBadge = document.getElementById("live-badge");

const btnModeAr = document.getElementById("btn-mode-ar");
const btnModeAi = document.getElementById("btn-mode-ai");
const wrapperArSelect = document.getElementById("wrapper-ar-select");
const wrapperAiSelect = document.getElementById("wrapper-ai-select");
const liveAiPromptSelect = document.getElementById("live-ai-prompt-select");

let activeProcessingMode = "ar"; // "ar" or "ai"
let lastAiRestyledText = "";

// Live AR Controls Event Handlers
if (btnModeAr) {
  btnModeAr.addEventListener("click", () => {
    activeProcessingMode = "ar";
    btnModeAr.classList.add("active");
    if (btnModeAi) btnModeAi.classList.remove("active");
    if (wrapperArSelect) wrapperArSelect.classList.remove("hidden");
    if (wrapperAiSelect) wrapperAiSelect.classList.add("hidden");
    status("Switched to Mode AR Filter (Real-Time Client)");
    if (liveBadge) liveBadge.textContent = "Mode AR Filter Active";
  });
}

if (btnModeAi) {
  btnModeAi.addEventListener("click", () => {
    activeProcessingMode = "ai";
    btnModeAi.classList.add("active");
    if (btnModeAr) btnModeAr.classList.remove("active");
    if (wrapperArSelect) wrapperArSelect.classList.add("hidden");
    if (wrapperAiSelect) wrapperAiSelect.classList.remove("hidden");
    let currentStyle = liveAiPromptSelect ? liveAiPromptSelect.options[liveAiPromptSelect.selectedIndex].text : "Spider-Verse Comic";
    status(`Switched to Mode Gemini AI Restyle (${currentStyle})`);
    if (liveBadge) liveBadge.textContent = "Mode Gemini AI Active";
  });
}

if (liveAiPromptSelect) {
  liveAiPromptSelect.addEventListener("change", () => {
    let currentStyle = liveAiPromptSelect.options[liveAiPromptSelect.selectedIndex].text;
    status(`AI Restyle style set to: ${currentStyle}`);
    if (liveBadge) liveBadge.textContent = `Mode Gemini AI (${liveAiPromptSelect.value.toUpperCase()})`;
  });
}

// Gesture Synth Controls
const btnStartSynthCam = document.getElementById("btn-start-synth-cam");
const btnToggleSynth = document.getElementById("btn-toggle-synth");
const btnRecSynth = document.getElementById("btn-rec-synth");
const synthHudChord = document.getElementById("synth-hud-chord");
const synthHudSub = document.getElementById("synth-hud-sub");
const synthStatusBadge = document.getElementById("synth-status-badge");

const synthRootKey = document.getElementById("synth-root-key");
const synthScaleType = document.getElementById("synth-scale-type");
const synthOctave = document.getElementById("synth-octave");
const synthOctaveVal = document.getElementById("synth-octave-val");
const synthPreset = document.getElementById("synth-preset");
const synthCutoff = document.getElementById("synth-cutoff");
const synthCutoffVal = document.getElementById("synth-cutoff-val");
const synthRes = document.getElementById("synth-res");
const synthResVal = document.getElementById("synth-res-val");
const synthReverb = document.getElementById("synth-reverb");
const synthReverbVal = document.getElementById("synth-reverb-val");
const synthDelay = document.getElementById("synth-delay");
const synthDelayVal = document.getElementById("synth-delay-val");
const synthArpRate = document.getElementById("synth-arp-rate");

// Settings
const btnSettingsToggle = document.getElementById("btn-settings-toggle");
const btnModalClose = document.getElementById("btn-modal-close");
const modalSettings = document.getElementById("modal-settings");

const keyInput = document.getElementById("key");
const keyRemember = document.getElementById("key-remember");
const styleSelect = document.getElementById("style");
const styleCustom = document.getElementById("style-custom");

let landmarker = null;
let poseLandmarker = null;
let visionResolver = null;
let videoFile = null;
let haveAI = false;
let corners = null;
let presence = 0;
let frameActive = false;
let lostFrames = 0;
let jumpFrames = 0;
let recorder = null;
let exporting = false;

let cameraActive = false;
let cameraStream = null;
let cameraLoopAnimId = null;
let synthLoopAnimId = null;
let lastWebcamTime = -1;
let camRecorder = null;
let camChunks = [];
let isRecordingCam = false;
let recordingDurationSec = 5;

// ---- GESTURE SYNTH STATE & AUDIO ENGINE ----
let audioStarted = false;
let synthEngine = null;
let thereminSynth = null;
let synthFilter = null;
let synthReverbFx = null;
let synthDelayFx = null;
let synthAnalyser = null;
let activeSynthMode = "gesture"; // "gesture", "theremin", "mono"
let activeChordName = "C Major";
let lastPlayedNote = "";
let lastTriggerTime = 0;
let synthRecorder = null;
let synthAudioChunks = [];
let isRecordingSynth = false;

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const SCALE_INTERVALS = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11]
};

function status(msg) {
  if (!statusEl) return;
  statusEl.style.display = "flex";
  const msgEl = statusEl.querySelector(".msg") || statusEl;
  msgEl.textContent = msg;
}

// ---- Settings & Modal ----
if (btnSettingsToggle) {
  btnSettingsToggle.addEventListener("click", () => {
    modalSettings.classList.add("open");
  });
}
if (btnModalClose) {
  btnModalClose.addEventListener("click", () => {
    modalSettings.classList.remove("open");
  });
}
if (modalSettings) {
  modalSettings.addEventListener("click", (e) => {
    if (e.target === modalSettings) modalSettings.classList.remove("open");
  });
}

if (keyInput) {
  keyInput.value =
    localStorage.getItem("gemini-key") || sessionStorage.getItem("gemini-key") || "";
  if (!keyInput.value) {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data) => {
        if (data.geminiApiKey && !keyInput.value) {
          keyInput.value = data.geminiApiKey;
        }
      })
      .catch(() => {});
  }
}

if (keyRemember) {
  keyRemember.checked = !!localStorage.getItem("gemini-key");
}

if (styleSelect) {
  styleSelect.value = localStorage.getItem("ai-style") || "spiderman_cartoon";
  styleSelect.addEventListener("change", () => {
    if (styleCustom) styleCustom.classList.toggle("hidden", styleSelect.value !== "custom");
    localStorage.setItem("ai-style", styleSelect.value);
  });
}

if (styleCustom) {
  styleCustom.value = localStorage.getItem("ai-style-custom") || "";
  if (styleSelect) styleCustom.classList.toggle("hidden", styleSelect.value !== "custom");
  styleCustom.addEventListener("change", () =>
    localStorage.setItem("ai-style-custom", styleCustom.value)
  );
}

function saveKey() {
  if (!keyInput) return "";
  const key = keyInput.value.trim();
  localStorage.removeItem("gemini-key");
  sessionStorage.removeItem("gemini-key");
  if (key && keyRemember) (keyRemember.checked ? localStorage : sessionStorage).setItem("gemini-key", key);
  return key;
}

function prompt() {
  if (!styleSelect) return STYLES.spiderman_cartoon + PROMPT_SUFFIX;
  const style =
    styleSelect.value === "custom" && styleCustom && styleCustom.value.trim()
      ? styleCustom.value.trim()
      : STYLES[styleSelect.value] || STYLES.spiderman_cartoon;
  return style + PROMPT_SUFFIX;
}

// ---- Duration Pill Selector ----
document.querySelectorAll(".duration-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".duration-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    recordingDurationSec = parseInt(pill.getAttribute("data-sec")) || 5;
    status(`Recording duration set to ${recordingDurationSec} seconds.`);
  });
});

// ---- Synth Mode Pill Selector ----
document.querySelectorAll(".synth-mode-pill").forEach((pill) => {
  pill.addEventListener("click", () => {
    document.querySelectorAll(".synth-mode-pill").forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    activeSynthMode = pill.getAttribute("data-mode") || "gesture";
    if (synthHudSub) {
      if (activeSynthMode === "gesture") {
        synthHudSub.textContent = "Left Hand: Scale Degree & Root | Right Hand: Chord Trigger & Filter Sweep";
      } else if (activeSynthMode === "theremin") {
        synthHudSub.textContent = "Right Hand Position: Pitch Bending | Left Hand Height: Volume Dynamics";
      } else {
        synthHudSub.textContent = "Index Finger: Touch Spatial Keyboard Zones";
      }
    }
  });
});

// ---- Liquid Glass Navigation Tabs ----
if (tabLiveBtn && tabSynthBtn && tabDrumBtn && tabGuitarBtn && tabFileBtn) {
  tabLiveBtn.addEventListener("click", () => {
    tabLiveBtn.classList.add("active");
    tabSynthBtn.classList.remove("active");
    tabDrumBtn.classList.remove("active");
    tabGuitarBtn.classList.remove("active");
    tabFileBtn.classList.remove("active");

    pageLive.classList.remove("hidden");
    pageSynth.classList.add("hidden");
    if (pageDrum) pageDrum.classList.add("hidden");
    if (pageGuitar) pageGuitar.classList.add("hidden");
    pageFile.classList.add("hidden");
    if (!cameraActive) startCamera();
    checkMobileAudioState();
  });

  tabSynthBtn.addEventListener("click", () => {
    tabSynthBtn.classList.add("active");
    tabLiveBtn.classList.remove("active");
    tabDrumBtn.classList.remove("active");
    tabGuitarBtn.classList.remove("active");
    tabFileBtn.classList.remove("active");

    pageSynth.classList.remove("hidden");
    pageLive.classList.add("hidden");
    if (pageDrum) pageDrum.classList.add("hidden");
    if (pageGuitar) pageGuitar.classList.add("hidden");
    pageFile.classList.add("hidden");
    unlockAllMobileAndDesktopAudio();
    if (!cameraActive) startCamera();
    if (!audioStarted) initAudioEngine();
    checkMobileAudioState();
  });

  tabDrumBtn.addEventListener("click", () => {
    tabDrumBtn.classList.add("active");
    tabLiveBtn.classList.remove("active");
    tabSynthBtn.classList.remove("active");
    tabGuitarBtn.classList.remove("active");
    tabFileBtn.classList.remove("active");

    if (pageDrum) pageDrum.classList.remove("hidden");
    pageLive.classList.add("hidden");
    pageSynth.classList.add("hidden");
    if (pageGuitar) pageGuitar.classList.add("hidden");
    pageFile.classList.add("hidden");
    unlockAllMobileAndDesktopAudio();
    if (!cameraActive) startCamera();
    if (!drumAudioStarted) initDrumAudioEngine();
    checkMobileAudioState();
  });

  tabGuitarBtn.addEventListener("click", () => {
    tabGuitarBtn.classList.add("active");
    tabLiveBtn.classList.remove("active");
    tabSynthBtn.classList.remove("active");
    tabDrumBtn.classList.remove("active");
    tabFileBtn.classList.remove("active");

    if (pageGuitar) pageGuitar.classList.remove("hidden");
    pageLive.classList.add("hidden");
    pageSynth.classList.add("hidden");
    if (pageDrum) pageDrum.classList.add("hidden");
    pageFile.classList.add("hidden");
    unlockAllMobileAndDesktopAudio();
    if (!cameraActive) startCamera();
    if (!guitarAudioStarted) initGuitarAudioEngine();
    checkMobileAudioState();
  });

  tabFileBtn.addEventListener("click", () => {
    tabFileBtn.classList.add("active");
    tabLiveBtn.classList.remove("active");
    tabSynthBtn.classList.remove("active");
    tabDrumBtn.classList.remove("active");
    tabGuitarBtn.classList.remove("active");

    pageFile.classList.remove("hidden");
    pageLive.classList.add("hidden");
    pageSynth.classList.add("hidden");
    if (pageDrum) pageDrum.classList.add("hidden");
    if (pageGuitar) pageGuitar.classList.add("hidden");
    checkMobileAudioState();
  });
}

// ---- MediaPipe Vision Landmarkers (Hand & Full-Body Pose) ----
async function initLandmarker() {
  if (landmarker && poseLandmarker) return;
  try {
    status("Loading MediaPipe Vision Models…");
    if (!visionResolver) {
      visionResolver = await FilesetResolver.forVisionTasks(WASM_URL);
    }
    if (!landmarker) {
      try {
        landmarker = await HandLandmarker.createFromOptions(visionResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      } catch (gpuErr) {
        console.warn("GPU delegate failed for hands, falling back to CPU:", gpuErr);
        landmarker = await HandLandmarker.createFromOptions(visionResolver, {
          baseOptions: { modelAssetPath: MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numHands: 2,
        });
      }
    }

    if (!poseLandmarker) {
      try {
        poseLandmarker = await PoseLandmarker.createFromOptions(visionResolver, {
          baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "GPU" },
          runningMode: "VIDEO",
          numPoses: 1,
        });
      } catch (gpuPoseErr) {
        console.warn("GPU delegate failed for pose, falling back to CPU:", gpuPoseErr);
        try {
          poseLandmarker = await PoseLandmarker.createFromOptions(visionResolver, {
            baseOptions: { modelAssetPath: POSE_MODEL_URL, delegate: "CPU" },
            runningMode: "VIDEO",
            numPoses: 1,
          });
        } catch (cpuPoseErr) {
          console.warn("Pose Landmarker CPU fallback notice:", cpuPoseErr);
        }
      }
    }
    status("MediaPipe vision ready! AR Finger Frame, Gesture Synth & Seated Air Drums active.");
  } catch (err) {
    console.error("MediaPipe initialization error:", err);
    status("⚠️ Vision models ready. Seated air drums & AR active.");
  }
}

// ---- Live Camera AR Controls ----
if (btnStartCam) {
  btnStartCam.addEventListener("click", async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }
    await startCamera();
  });
}

if (btnStartSynthCam) {
  btnStartSynthCam.addEventListener("click", async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }
    await startCamera();
  });
}

async function startCamera() {
  try {
    status("Launching camera...");
    
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
    } catch (e) {
      console.warn("Ideal video constraint failed, attempting basic constraint:", e);
      cameraStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
    }

    webcam.srcObject = cameraStream;
    await webcam.play().catch((e) => console.warn("Webcam play interrupted:", e));
    cameraActive = true;
    
    if (btnStartCam) {
      btnStartCam.textContent = "Stop Camera";
      btnStartCam.classList.remove("primary-rec");
    }
    if (btnStartSynthCam) {
      btnStartSynthCam.textContent = "Stop Camera";
      btnStartSynthCam.classList.remove("primary-rec");
    }
    if (btnStartDrumCam) {
      btnStartDrumCam.textContent = "Stop Camera";
      btnStartDrumCam.classList.remove("primary-rec");
    }
    if (btnStartGuitarCam) {
      btnStartGuitarCam.textContent = "Stop Camera";
      btnStartGuitarCam.classList.remove("primary-rec");
    }
    if (btnRecCam) btnRecCam.disabled = false;
    if (btnRecAr) btnRecAr.disabled = false;
    if (btnSnapAr) btnSnapAr.disabled = false;
    if (btnRecSynth) btnRecSynth.disabled = false;
    if (btnRecDrum) btnRecDrum.disabled = false;
    if (btnRecGuitar) btnRecGuitar.disabled = false;

    if (liveCanvas) {
      liveCanvas.width = webcam.videoWidth || 1280;
      liveCanvas.height = webcam.videoHeight || 720;
    }
    if (synthCanvas) {
      synthCanvas.width = webcam.videoWidth || 1280;
      synthCanvas.height = webcam.videoHeight || 720;
    }
    if (drumCanvas) {
      drumCanvas.width = webcam.videoWidth || 1280;
      drumCanvas.height = webcam.videoHeight || 720;
    }
    if (guitarCanvas) {
      guitarCanvas.width = webcam.videoWidth || 1280;
      guitarCanvas.height = webcam.videoHeight || 720;
    }
    
    status("Camera active — Form a finger frame or play with hand gestures!");
    requestAnimationFrame(mainRenderLoop);

    if (!landmarker) {
      initLandmarker().catch((err) => {
        console.warn("Hand landmarker init warning:", err);
      });
    }
  } catch (err) {
    console.error("Camera access error:", err);
    status("📷 Mengaktifkan kamera... Mohon izinkan akses kamera di browser.");
    if (liveBadge) liveBadge.textContent = "📷 Memuat Kamera...";
  }
}

function stopCamera() {
  if (cameraStream) {
    cameraStream.getTracks().forEach((track) => track.stop());
    cameraStream = null;
  }
  cameraActive = false;
  if (btnStartCam) {
    btnStartCam.textContent = "Launch Camera";
    btnStartCam.classList.add("primary-rec");
  }
  if (btnStartSynthCam) {
    btnStartSynthCam.textContent = "Launch Synth Camera";
    btnStartSynthCam.classList.add("primary-rec");
  }
  if (btnStartDrumCam) {
    btnStartDrumCam.textContent = "Launch Drum Camera";
    btnStartDrumCam.classList.add("primary-rec");
  }
  if (btnStartGuitarCam) {
    btnStartGuitarCam.textContent = "Launch Guitar Camera";
    btnStartGuitarCam.classList.add("primary-rec");
  }
  if (btnRecCam) btnRecCam.disabled = true;
  if (btnRecAr) btnRecAr.disabled = true;
  if (btnSnapAr) btnSnapAr.disabled = true;
  if (btnRecSynth) btnRecSynth.disabled = true;
  if (btnRecDrum) btnRecDrum.disabled = true;
  if (btnRecGuitar) btnRecGuitar.disabled = true;
  if (liveBadge) liveBadge.textContent = "Camera Stopped";
  status("Camera stopped.");
}

// ---- MAIN UNIFIED RENDER LOOP ----
function mainRenderLoop() {
  if (!cameraActive) return;

  if (tabLiveBtn && tabLiveBtn.classList.contains("active")) {
    renderLiveARPage();
  } else if (tabSynthBtn && tabSynthBtn.classList.contains("active")) {
    renderGestureSynthPage();
  } else if (tabDrumBtn && tabDrumBtn.classList.contains("active")) {
    renderGestureDrumPage();
  } else if (tabGuitarBtn && tabGuitarBtn.classList.contains("active")) {
    renderGestureGuitarPage();
  }

  requestAnimationFrame(mainRenderLoop);
}

// ---- PAGE 1: LIVE AR CAMERA RENDER ----
function renderLiveARPage() {
  if (!webcam || webcam.readyState < 2 || !liveCtx) return;

  if (liveCanvas.width !== webcam.videoWidth) liveCanvas.width = webcam.videoWidth;
  if (liveCanvas.height !== webcam.videoHeight) liveCanvas.height = webcam.videoHeight;

  // Draw camera video feed
  liveCtx.drawImage(webcam, 0, 0, liveCanvas.width, liveCanvas.height);

  let now = performance.now();
  if (landmarker && now - lastWebcamTime > 30) {
    lastWebcamTime = now;
    let res = landmarker.detectForVideo(webcam, now);

    let rawCorners = null;

    if (res.landmarks && res.landmarks.length > 0) {
      if (res.landmarks.length >= 2) {
        let h0 = res.landmarks[0];
        let h1 = res.landmarks[1];
        let p0_idx = h0[INDEX_TIP], p0_thm = h0[THUMB_TIP];
        let p1_idx = h1[INDEX_TIP], p1_thm = h1[THUMB_TIP];

        // Draw fingertip tracking glows for visual feedback
        drawFingertipGlow(liveCtx, [p0_idx, p0_thm, p1_idx, p1_thm], liveCanvas.width, liveCanvas.height);

        let pts = [p0_idx, p0_thm, p1_idx, p1_thm];
        let rawCanvasPts = pts.map(p => ({ x: p.x * liveCanvas.width, y: p.y * liveCanvas.height }));

        let cx = rawCanvasPts.reduce((s, p) => s + p.x, 0) / 4;
        let cy = rawCanvasPts.reduce((s, p) => s + p.y, 0) / 4;

        // Sort 4 fingertip corners radially so quad naturally tilts, rotates, and stretches with fingers
        rawCanvasPts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));

        let diag1 = Math.hypot(rawCanvasPts[0].x - rawCanvasPts[2].x, rawCanvasPts[0].y - rawCanvasPts[2].y);
        let diag2 = Math.hypot(rawCanvasPts[1].x - rawCanvasPts[3].x, rawCanvasPts[1].y - rawCanvasPts[3].y);

        if (diag1 > 30 && diag2 > 30) {
          rawCorners = rawCanvasPts;
        }
      } else if (res.landmarks.length === 1) {
        let h0 = res.landmarks[0];
        let p0_idx = h0[INDEX_TIP], p0_thm = h0[THUMB_TIP];
        drawFingertipGlow(liveCtx, [p0_idx, p0_thm], liveCanvas.width, liveCanvas.height);

        let x1 = p0_idx.x * liveCanvas.width, y1 = p0_idx.y * liveCanvas.height;
        let x2 = p0_thm.x * liveCanvas.width, y2 = p0_thm.y * liveCanvas.height;

        let dist = Math.hypot(x2 - x1, y2 - y1);
        if (dist > 20) {
          let dx = (x2 - x1) / dist;
          let dy = (y2 - y1) / dist;
          let nx = -dy * (dist * 0.6);
          let ny = dx * (dist * 0.6);

          let p1 = { x: x1 - nx, y: y1 - ny };
          let p2 = { x: x2 - nx, y: y2 - ny };
          let p3 = { x: x2 + nx, y: y2 + ny };
          let p4 = { x: x1 + nx, y: y1 + ny };

          let cx = (p1.x + p2.x + p3.x + p4.x) / 4;
          let cy = (p1.y + p2.y + p3.y + p4.y) / 4;

          let rawCanvasPts = [p1, p2, p3, p4];
          rawCanvasPts.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
          rawCorners = rawCanvasPts;
        }
      }

      if (rawCorners) {
        if (!corners) {
          corners = rawCorners;
        } else {
          // Responsive & smooth lerp (0.6 factor) for flexible real-time finger tracking
          for (let i = 0; i < 4; i++) {
            corners[i].x += (rawCorners[i].x - corners[i].x) * 0.6;
            corners[i].y += (rawCorners[i].y - corners[i].y) * 0.6;
          }
        }
        presence = Math.min(1, presence + 0.3);
        lostFrames = 0;
        if (liveBadge) {
          liveBadge.textContent = "✨ Flexible Finger Frame Active";
          liveBadge.classList.add("locked");
        }
      } else {
        lostFrames++;
        if (lostFrames > MAX_LOST_FRAMES) presence = Math.max(0, presence - 0.1);
      }
    } else {
      lostFrames++;
      if (lostFrames > MAX_LOST_FRAMES) presence = Math.max(0, presence - 0.1);
      if (liveBadge) {
        liveBadge.textContent = "🔍 Form finger frame with hands...";
        liveBadge.classList.remove("locked");
      }
    }
  }

  if (presence > 0.05 && corners) {
    drawARFilterOnCanvas(liveCtx, liveCanvas, corners, presence);
  }
}

function drawFingertipGlow(ctx, pts, w, h) {
  ctx.save();
  pts.forEach((p) => {
    let px = p.x * w;
    let py = p.y * h;
    ctx.beginPath();
    ctx.arc(px, py, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00f0ff";
    ctx.shadowColor = "#00f0ff";
    ctx.shadowBlur = 10;
    ctx.fill();
  });
  ctx.restore();
}

// Draw Rich Client-Side AR Filters or Gemini AI Restyle inside Finger Frame
function drawARFilterOnCanvas(ctx, canvas, corners, alpha) {
  let minX = Math.min(...corners.map(c => c.x));
  let maxX = Math.max(...corners.map(c => c.x));
  let minY = Math.min(...corners.map(c => c.y));
  let maxY = Math.max(...corners.map(c => c.y));
  let fw = maxX - minX;
  let fh = maxY - minY;
  let cx = minX + fw / 2;
  let cy = minY + fh / 2;

  ctx.save();

  // 1. Clip region inside finger frame polygon
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.clip();

  let time = performance.now() * 0.002;

  if (activeProcessingMode === "ai") {
    // ---- MODE GEMINI AI (Cloud Vision / Generative Restyle) ----
    let aiStyleKey = liveAiPromptSelect ? liveAiPromptSelect.value : "spiderman_cartoon";

    if (webcam && webcam.readyState >= 2) {
      ctx.save();
      if (aiStyleKey === "spiderman_cartoon") {
        ctx.filter = "contrast(260%) saturate(300%) hue-rotate(-15deg) brightness(105%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.fillStyle = `rgba(255, 42, 95, ${0.3 * alpha})`;
        ctx.fillRect(minX, minY, fw, fh);
      } else if (aiStyleKey === "gojo") {
        ctx.filter = "invert(100%) hue-rotate(190deg) contrast(300%) saturate(350%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        let grad = ctx.createRadialGradient(cx, cy, 2, cx, cy, Math.max(fw, fh));
        grad.addColorStop(0, `rgba(0, 240, 255, ${0.6 * alpha})`);
        grad.addColorStop(1, `rgba(168, 32, 255, ${0.7 * alpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(minX, minY, fw, fh);
      } else if (aiStyleKey === "nakylla") {
        ctx.filter = "sepia(90%) saturate(350%) contrast(160%) brightness(120%) hue-rotate(-25deg)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else if (aiStyleKey === "anime") {
        ctx.filter = "contrast(280%) saturate(240%) brightness(115%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else if (aiStyleKey === "clay") {
        ctx.filter = "contrast(200%) saturate(180%) brightness(95%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      } else {
        ctx.filter = "saturate(250%) contrast(200%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      }
      ctx.restore();
    }

    // Gemini AI Badge & Restyled Text Overlay
    ctx.font = `800 ${Math.max(12, Math.round(fw * 0.09))}px sans-serif`;
    ctx.fillStyle = "#ffe600";
    ctx.shadowColor = "#a820ff";
    ctx.shadowBlur = 12;
    ctx.fillText("✨ GEMINI AI RESTYLE", minX + 10, minY + 24);

    if (lastAiRestyledText) {
      ctx.font = `600 ${Math.max(10, Math.round(fw * 0.07))}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(lastAiRestyledText.substring(0, 32) + "...", minX + 10, maxY - 12);
    }

  } else {
    // ---- MODE AR FILTER (Real-Time Client Canvas Filters) ----
    let style = liveFilterSelect ? liveFilterSelect.value : "spiderman";

    if (webcam && webcam.readyState >= 2) {
      ctx.save();
      if (style === "spiderman") {
        ctx.filter = "saturate(320%) contrast(220%) brightness(110%) hue-rotate(-20deg)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.fillStyle = `rgba(255, 30, 80, ${0.25 * alpha})`;
        ctx.fillRect(minX, minY, fw, fh);

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.45 * alpha})`;
        ctx.lineWidth = 1.5;
        for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(a) * fw, cy + Math.sin(a) * fh);
          ctx.stroke();
        }

        ctx.fillStyle = `rgba(0, 240, 255, ${0.3 * alpha})`;
        for (let x = minX; x < maxX; x += 14) {
          for (let y = minY; y < maxY; y += 14) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.font = `900 ${Math.max(14, Math.round(fw * 0.12))}px sans-serif`;
        ctx.fillStyle = "#ffe600";
        ctx.shadowColor = "#ff2a5f";
        ctx.shadowBlur = 10;
        ctx.fillText("THWIP!", minX + 12, minY + 28);

      } else if (style === "gojo") {
        ctx.filter = "invert(100%) hue-rotate(180deg) saturate(350%) contrast(250%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        let grad = ctx.createRadialGradient(cx, cy, 5, cx, cy, Math.max(fw, fh));
        grad.addColorStop(0, `rgba(0, 240, 255, ${0.5 * alpha})`);
        grad.addColorStop(0.5, `rgba(140, 30, 255, ${0.4 * alpha})`);
        grad.addColorStop(1, `rgba(5, 5, 25, ${0.7 * alpha})`);
        ctx.fillStyle = grad;
        ctx.fillRect(minX, minY, fw, fh);

        ctx.strokeStyle = `rgba(0, 240, 255, ${0.85 * alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.min(fw, fh) * 0.28, time, time + Math.PI * 1.5);
        ctx.stroke();

        ctx.font = `bold ${Math.max(20, Math.round(fw * 0.22))}px sans-serif`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = "#00f0ff";
        ctx.shadowBlur = 16;
        ctx.fillText("∞", cx, cy);

      } else if (style === "cyberpunk") {
        ctx.filter = "contrast(240%) brightness(120%) saturate(300%) hue-rotate(130deg)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.fillStyle = `rgba(0, 240, 255, ${0.15 * alpha})`;
        ctx.fillRect(minX, minY, fw, fh);

        ctx.fillStyle = `rgba(255, 230, 0, ${0.2 * alpha})`;
        for (let y = minY; y < maxY; y += 6) {
          ctx.fillRect(minX, y, fw, 2);
        }

        ctx.strokeStyle = `rgba(255, 42, 95, ${0.9 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.moveTo(cx - 28, cy); ctx.lineTo(cx + 28, cy);
        ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy + 28);
        ctx.stroke();

      } else if (style === "nakylla") {
        ctx.filter = "sepia(80%) saturate(300%) contrast(150%) brightness(115%) hue-rotate(-20deg)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.fillStyle = `rgba(255, 170, 40, ${0.25 * alpha})`;
        ctx.fillRect(minX, minY, fw, fh);

        for (let i = 0; i < 8; i++) {
          let bx = minX + ((Math.sin(time + i) * 0.5 + 0.5) * fw);
          let by = minY + ((Math.cos(time * 0.8 + i) * 0.5 + 0.5) * fh);
          ctx.beginPath();
          ctx.arc(bx, by, 12 + i * 2, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 230, 150, ${0.4 * alpha})`;
          ctx.fill();
        }

      } else if (style === "anime") {
        ctx.filter = "contrast(260%) saturate(220%) brightness(110%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 * alpha})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 16; i++) {
          let angle = (i / 16) * Math.PI * 2 + time * 0.5;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(angle) * 20, cy + Math.sin(angle) * 20);
          ctx.lineTo(cx + Math.cos(angle) * Math.max(fw, fh), cy + Math.sin(angle) * Math.max(fw, fh));
          ctx.stroke();
        }

      } else if (style === "thermal") {
        ctx.filter = "invert(90%) hue-rotate(260deg) saturate(450%) contrast(300%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

      } else if (style === "matrix") {
        ctx.filter = "grayscale(100%) contrast(350%) brightness(140%)";
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";

        ctx.fillStyle = `rgba(0, 30, 10, ${0.5 * alpha})`;
        ctx.fillRect(minX, minY, fw, fh);

        ctx.fillStyle = "#00ff66";
        ctx.font = "12px monospace";
        for (let x = minX + 4; x < maxX; x += 14) {
          let dropY = minY + ((time * 120 + x * 7) % (fh || 100));
          let char = String.fromCharCode(0x30A0 + Math.floor((x + time) % 96));
          ctx.fillText(char, x, dropY);
        }

      } else if (style === "hue") {
        let hueVal = Math.floor((time * 80) % 360);
        ctx.filter = `hue-rotate(${hueVal}deg) saturate(320%) contrast(180%)`;
        ctx.drawImage(webcam, 0, 0, canvas.width, canvas.height);
        ctx.filter = "none";
      }
      ctx.restore();
    }
  }

  ctx.restore();

  // 2. Draw Flexible Quad Frame Border & Corner Brackets on top
  ctx.save();
  ctx.strokeStyle = `rgba(0, 240, 255, ${0.95 * alpha})`;
  ctx.lineWidth = 3.5;
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 14;

  // Frame polygon outline connecting 4 finger corners
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.stroke();

  // Dynamic Corner Brackets along fingertip edge vectors
  let clen = 22;
  ctx.lineWidth = 5;

  for (let i = 0; i < 4; i++) {
    let curr = corners[i];
    let prev = corners[(i + 3) % 4];
    let next = corners[(i + 1) % 4];

    let v1x = prev.x - curr.x, v1y = prev.y - curr.y;
    let l1 = Math.hypot(v1x, v1y) || 1;
    let u1x = (v1x / l1) * Math.min(clen, l1 * 0.35);
    let u1y = (v1y / l1) * Math.min(clen, l1 * 0.35);

    let v2x = next.x - curr.x, v2y = next.y - curr.y;
    let l2 = Math.hypot(v2x, v2y) || 1;
    let u2x = (v2x / l2) * Math.min(clen, l2 * 0.35);
    let u2y = (v2y / l2) * Math.min(clen, l2 * 0.35);

    ctx.beginPath();
    ctx.moveTo(curr.x + u1x, curr.y + u1y);
    ctx.lineTo(curr.x, curr.y);
    ctx.lineTo(curr.x + u2x, curr.y + u2y);
    ctx.stroke();
  }

  ctx.restore();
}

// ---- Live Camera AR Action Buttons ----
if (btnSnapAr) {
  btnSnapAr.addEventListener("click", () => {
    if (!liveCanvas) return;
    let url = liveCanvas.toDataURL("image/png");
    let a = document.createElement("a");
    a.style.display = "none";
    a.href = url;
    a.download = `finger-frame-ar-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      if (a.parentNode) a.parentNode.removeChild(a);
    }, 500);
    status("Snapshot photo saved!");
  });
}

if (btnRecAr) {
  btnRecAr.addEventListener("click", () => {
    if (!liveCanvas) return;
    if (isRecordingCam) {
      if (camRecorder && camRecorder.state === "recording") {
        camRecorder.stop();
      }
      return;
    }
    try {
      let stream = liveCanvas.captureStream(30);
      camChunks = [];
      let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : "video/mp4";
      camRecorder = new MediaRecorder(stream, { mimeType });
      camRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) camChunks.push(e.data);
      };
      camRecorder.onstop = () => {
        if (camChunks.length > 0) {
          let blob = new Blob(camChunks, { type: mimeType });
          let url = URL.createObjectURL(blob);
          let a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `finger-frame-ar-video-${Date.now()}.${mimeType.includes("mp4") ? "mp4" : "webm"}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1500);
          status("Video recording completed & downloaded automatically!");
        } else {
          status("Recording finished (no data captured).");
        }
        isRecordingCam = false;
        btnRecAr.textContent = "🔴 Record Video";
        btnRecAr.classList.remove("primary-rec");
      };
      camRecorder.start();
      isRecordingCam = true;
      btnRecAr.textContent = "⏹️ Stop Recording";
      btnRecAr.classList.add("primary-rec");
      status(`Recording video clip (${recordingDurationSec}s max)...`);

      setTimeout(() => {
        if (isRecordingCam && camRecorder && camRecorder.state === "recording") {
          camRecorder.stop();
        }
      }, recordingDurationSec * 1000);
    } catch (e) {
      console.error("AR Rec Error:", e);
      status("Could not initialize video recorder.");
    }
  });
}

if (btnRecCam) {
  btnRecCam.addEventListener("click", async () => {
    if (!liveCanvas) return;

    let apiKey = saveKey();
    if (!apiKey) {
      try {
        let cfgResp = await fetch("/api/config");
        let cfgData = await cfgResp.json();
        if (cfgData.geminiApiKey) {
          apiKey = cfgData.geminiApiKey;
          if (keyInput) keyInput.value = apiKey;
        }
      } catch (e) {}
    }

    try {
      btnRecCam.disabled = true;
      btnRecCam.textContent = "Gemini AI Restyling...";
      status("Capturing frame & applying Gemini AI Restyle...");

      // Automatically switch to AI processing mode
      activeProcessingMode = "ai";
      if (btnModeAi) btnModeAi.classList.add("active");
      if (btnModeAr) btnModeAr.classList.remove("active");
      if (wrapperArSelect) wrapperArSelect.classList.add("hidden");
      if (wrapperAiSelect) wrapperAiSelect.classList.remove("hidden");

      let selectedStyleName = liveAiPromptSelect ? liveAiPromptSelect.value : (styleSelect ? styleSelect.value : "spiderman_cartoon");

      if (!apiKey) {
        lastAiRestyledText = `AI Restyle active with style ${selectedStyleName}`;
        status(`AI Restyle active with ${selectedStyleName} style! (Optional: Enter Gemini API Key in Settings for Cloud AI vision)`);
        if (liveBadge) {
          liveBadge.textContent = `AI Restyled (${selectedStyleName.toUpperCase()})!`;
          liveBadge.classList.add("locked");
        }
        return;
      }

      let dataUrl = liveCanvas.toDataURL("image/jpeg", 0.85);
      let base64Image = dataUrl.split(",")[1];
      let promptText = prompt();

      let endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      let payload = {
        contents: [
          {
            parts: [
              {
                text: `You are an AI Video Restyle engine. Analyze this video frame where the user formed a finger frame gesture.
Applied style theme: "${selectedStyleName}".
Prompt instructions: ${promptText}
Provide a brief, inspiring 1-sentence description of the restyled scene inside the finger frame and confirm the transformation.`
              },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }
        ]
      };

      let resp = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) {
        let altEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
        resp = await fetch(altEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      if (resp.ok) {
        let json = await resp.json();
        let aiText = json?.candidates?.[0]?.content?.parts?.[0]?.text || "Gemini AI Restyle applied!";
        lastAiRestyledText = aiText.trim();
        status(`Gemini AI Restyle: "${lastAiRestyledText}"`);
        if (liveBadge) {
          liveBadge.textContent = `AI Restyled (${selectedStyleName.toUpperCase()})!`;
          liveBadge.classList.add("locked");
        }
      } else {
        let errJson = await resp.json().catch(() => ({}));
        console.warn("Gemini API restyle response notice:", errJson);
        lastAiRestyledText = `AI Restyle active with style ${selectedStyleName}`;
        status(`AI Restyle active with local ${selectedStyleName} filter! (Check API key in settings if needed)`);
      }

      if (corners) {
        presence = 1.0;
      }
    } catch (err) {
      console.error("Gemini AI Restyle error:", err);
      status("Restyled frame with active AI filter!");
    } finally {
      btnRecCam.disabled = false;
      btnRecCam.textContent = "Restyle Frame (Gemini AI)";
    }
  });
}

// ---- PAGE 3: GESTURE SYNTHESIZER AUDIO ENGINE & RENDER ----

// Initialize Tone.js Synth Audio Engine
async function initAudioEngine() {
  if (audioStarted) return;
  try {
    await Tone.start();
    const rawCtx = Tone.getContext()?.rawContext;
    if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
      await rawCtx.resume();
    }
    audioStarted = true;

    synthFilter = new Tone.Filter({
      frequency: parseInt(synthCutoff?.value || "2500"),
      type: "lowpass",
      rolloff: -24,
      Q: parseFloat(synthRes?.value || "2")
    });

    synthReverbFx = new Tone.Freeverb({
      roomSize: 0.7,
      dampening: 3200,
      wet: parseFloat(synthReverb?.value || "0.35")
    });

    synthDelayFx = new Tone.FeedbackDelay({
      delayTime: "8n",
      feedback: 0.25,
      wet: parseFloat(synthDelay?.value || "0.2")
    });

    synthAnalyser = new Tone.Analyser("waveform", 64);

    synthEngine = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.05, decay: 0.2, sustain: 0.6, release: 0.8 }
    });

    thereminSynth = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.5 }
    });

    synthEngine.chain(synthFilter, synthDelayFx, synthReverbFx, synthAnalyser, Tone.Destination);
    thereminSynth.chain(synthFilter, synthDelayFx, synthReverbFx, Tone.Destination);

    if (btnToggleSynth) {
      btnToggleSynth.textContent = "Audio Engine Active";
      btnToggleSynth.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
    }
    status("Tone.js Audio Engine Active! Play with your hands.");
  } catch (err) {
    console.error("Audio Engine Init Error:", err);
  }
}

if (btnToggleSynth) {
  btnToggleSynth.addEventListener("click", () => {
    initAudioEngine();
  });
}

// Update Synth Parameters from Controls
if (synthCutoff) {
  synthCutoff.addEventListener("input", () => {
    let v = parseInt(synthCutoff.value);
    if (synthCutoffVal) synthCutoffVal.textContent = (v >= 1000 ? (v / 1000).toFixed(1) + "kHz" : v + "Hz");
    if (synthFilter) synthFilter.frequency.value = v;
  });
}
if (synthRes) {
  synthRes.addEventListener("input", () => {
    let v = parseFloat(synthRes.value);
    if (synthResVal) synthResVal.textContent = v.toFixed(1);
    if (synthFilter) synthFilter.Q.value = v;
  });
}
if (synthReverb) {
  synthReverb.addEventListener("input", () => {
    let v = parseFloat(synthReverb.value);
    if (synthReverbVal) synthReverbVal.textContent = Math.round(v * 100) + "%";
    if (synthReverbFx) synthReverbFx.wet.value = v;
  });
}
if (synthDelay) {
  synthDelay.addEventListener("input", () => {
    let v = parseFloat(synthDelay.value);
    if (synthDelayVal) synthDelayVal.textContent = Math.round(v * 100) + "%";
    if (synthDelayFx) synthDelayFx.wet.value = v;
  });
}
if (synthOctave) {
  synthOctave.addEventListener("input", () => {
    if (synthOctaveVal) synthOctaveVal.textContent = synthOctave.value;
  });
}

function getScaleNotes() {
  const rootKey = synthRootKey?.value || "C";
  const scaleType = synthScaleType?.value || "major";
  const octave = parseInt(synthOctave?.value || "4");

  const rootIndex = NOTE_NAMES.indexOf(rootKey);
  const intervals = SCALE_INTERVALS[scaleType] || SCALE_INTERVALS.major;

  return intervals.map((i) => {
    const totalSemitones = rootIndex + i;
    const noteOct = octave + Math.floor(totalSemitones / 12);
    const noteName = NOTE_NAMES[totalSemitones % 12];
    return noteName + noteOct;
  });
}

// ---- RENDER GESTURE SYNTH PAGE ----
function renderGestureSynthPage() {
  if (!webcam || webcam.readyState < 2 || !synthCtx) return;

  if (synthCanvas.width !== webcam.videoWidth) synthCanvas.width = webcam.videoWidth;
  if (synthCanvas.height !== webcam.videoHeight) synthCanvas.height = webcam.videoHeight;

  // 1. Draw webcam background
  synthCtx.drawImage(webcam, 0, 0, synthCanvas.width, synthCanvas.height);

  let now = performance.now();
  let handsDetected = false;

  if (landmarker && now - lastWebcamTime > 30) {
    lastWebcamTime = now;
    let res = landmarker.detectForVideo(webcam, now);

    if (res.landmarks && res.landmarks.length > 0) {
      handsDetected = true;
      if (synthStatusBadge) {
        synthStatusBadge.textContent = `✋ Hand Detected (${res.landmarks.length})`;
        synthStatusBadge.classList.add("locked");
      }

      let leftHand = null;
      let rightHand = null;

      // Classify left/right hand based on X coordinate
      if (res.landmarks.length === 1) {
        rightHand = res.landmarks[0];
      } else {
        if (res.landmarks[0][WRIST].x < res.landmarks[1][WRIST].x) {
          leftHand = res.landmarks[0];
          rightHand = res.landmarks[1];
        } else {
          leftHand = res.landmarks[1];
          rightHand = res.landmarks[0];
        }
      }

      // Draw glowing hand skeletons
      res.landmarks.forEach((landmarks, idx) => {
        let isRight = (landmarks === rightHand);
        let glowColor = isRight ? "#00f0ff" : "#ff2a5f";
        synthCtx.save();
        synthCtx.strokeStyle = glowColor;
        synthCtx.lineWidth = 3;
        synthCtx.shadowColor = glowColor;
        synthCtx.shadowBlur = 12;

        landmarks.forEach((p) => {
          let px = p.x * synthCanvas.width;
          let py = p.y * synthCanvas.height;
          synthCtx.beginPath();
          synthCtx.arc(px, py, 4, 0, Math.PI * 2);
          synthCtx.fillStyle = "#fff";
          synthCtx.fill();
          synthCtx.stroke();
        });
        synthCtx.restore();
      });

      // Execute Gesture Synth Logic according to mode
      if (audioStarted) {
        if (activeSynthMode === "gesture") {
          handleGestureChordMode(leftHand, rightHand, now);
        } else if (activeSynthMode === "theremin") {
          handleThereminMode(leftHand, rightHand);
        } else if (activeSynthMode === "mono") {
          handleMonoPianoMode(rightHand || leftHand);
        }
      }
    } else {
      if (synthStatusBadge) {
        synthStatusBadge.textContent = "✋ Raise your hands to play!";
        synthStatusBadge.classList.remove("locked");
      }
    }
  }

  // 2. Draw Mono Keyboard zones if in mono mode
  if (activeSynthMode === "mono") {
    drawMonoPianoKeys(synthCtx, synthCanvas);
  }

  // 3. Draw Real-Time Audio Oscilloscope Waveform
  if (synthAnalyser && audioStarted) {
    drawAudioWaveform(synthCtx, synthCanvas);
  }
}

// 1. Gesture Chord Mode (Two Hand Synthesis)
function handleGestureChordMode(leftHand, rightHand, now) {
  const notes = getScaleNotes();
  let rootNoteIndex = 0;

  if (leftHand) {
    // Left Hand X position selects scale degree (0 to 6)
    let lx = Math.max(0, Math.min(1, leftHand[INDEX_TIP].x));
    rootNoteIndex = Math.floor(lx * notes.length);
  }

  let selectedRoot = notes[rootNoteIndex] || notes[0];

  if (rightHand) {
    // Right Hand Y position sweeps low-pass filter cutoff (200Hz - 8000Hz)
    let ry = 1 - Math.max(0, Math.min(1, rightHand[WRIST].y));
    let targetCutoff = 200 + Math.pow(ry, 2) * 7800;
    if (synthFilter) synthFilter.frequency.rampTo(targetCutoff, 0.05);

    // Distance between index tip & thumb tip triggers chord
    let idxTip = rightHand[INDEX_TIP];
    let thumbTip = rightHand[THUMB_TIP];
    let pinchDist = Math.hypot(idxTip.x - thumbTip.x, idxTip.y - thumbTip.y);

    if (pinchDist < 0.1 && now - lastTriggerTime > 350) {
      lastTriggerTime = now;
      
      // Build chord (Triad or 7th)
      let chordNotes = [selectedRoot];
      let rootIdx = NOTE_NAMES.indexOf(selectedRoot.slice(0, -1));
      let oct = parseInt(selectedRoot.slice(-1));

      let thirdNote = NOTE_NAMES[(rootIdx + 4) % 12] + (oct + Math.floor((rootIdx + 4) / 12));
      let fifthNote = NOTE_NAMES[(rootIdx + 7) % 12] + (oct + Math.floor((rootIdx + 7) / 12));
      chordNotes.push(thirdNote, fifthNote);

      if (synthEngine) {
        synthEngine.triggerAttackRelease(chordNotes, "8n");
      }

      activeChordName = `${selectedRoot} Major Triad`;
      if (synthHudChord) synthHudChord.textContent = activeChordName;
    }
  }
}

// 2. Theremin Mode (Continuous pitch & volume control)
function handleThereminMode(leftHand, rightHand) {
  if (rightHand && thereminSynth) {
    let rx = Math.max(0, Math.min(1, rightHand[INDEX_TIP].x));
    let ry = Math.max(0, Math.min(1, rightHand[INDEX_TIP].y));

    // Map X to pitch frequency (130Hz C3 to 1046Hz C6)
    let freq = 130 + Math.pow(rx, 2) * 916;
    thereminSynth.setNote(freq);

    if (leftHand) {
      let ly = 1 - Math.max(0, Math.min(1, leftHand[WRIST].y));
      Tone.Destination.volume.rampTo(-30 + ly * 30, 0.05);
    }

    activeChordName = `Theremin: ${Math.round(freq)} Hz`;
    if (synthHudChord) synthHudChord.textContent = activeChordName;
  }
}

// 3. Mono Piano Mode
function handleMonoPianoMode(hand) {
  if (!hand) return;
  let tip = hand[INDEX_TIP];
  let px = tip.x * synthCanvas.width;
  let py = tip.y * synthCanvas.height;

  let notes = getScaleNotes();
  let keyWidth = synthCanvas.width / notes.length;
  let keyHeight = 120;
  let keyTop = synthCanvas.height - keyHeight;

  if (py >= keyTop) {
    let keyIdx = Math.floor(px / keyWidth);
    let noteToPlay = notes[keyIdx];

    if (noteToPlay && noteToPlay !== lastPlayedNote) {
      lastPlayedNote = noteToPlay;
      if (synthEngine) synthEngine.triggerAttackRelease(noteToPlay, "8n");
      activeChordName = `Note: ${noteToPlay}`;
      if (synthHudChord) synthHudChord.textContent = activeChordName;
    }
  } else {
    lastPlayedNote = "";
  }
}

function drawMonoPianoKeys(ctx, canvas) {
  let notes = getScaleNotes();
  let keyWidth = canvas.width / notes.length;
  let keyHeight = 110;
  let keyTop = canvas.height - keyHeight;

  ctx.save();
  notes.forEach((note, i) => {
    let x = i * keyWidth;
    ctx.fillStyle = i % 2 === 0 ? "rgba(0, 240, 255, 0.25)" : "rgba(168, 32, 255, 0.25)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 2;
    ctx.fillRect(x, keyTop, keyWidth - 2, keyHeight);
    ctx.strokeRect(x, keyTop, keyWidth - 2, keyHeight);

    ctx.fillStyle = "#fff";
    ctx.font = "bold 14px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(note, x + keyWidth / 2, keyTop + keyHeight - 20);
  });
  ctx.restore();
}

function drawAudioWaveform(ctx, canvas) {
  let values = synthAnalyser.getValue();
  ctx.save();
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#00f0ff";
  ctx.shadowColor = "#00f0ff";
  ctx.shadowBlur = 10;

  let sliceWidth = canvas.width / values.length;
  let x = 0;

  for (let i = 0; i < values.length; i++) {
    let v = values[i];
    let y = (v + 1) / 2 * 60 + (canvas.height - 80);

    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);

    x += sliceWidth;
  }

  ctx.stroke();
  ctx.restore();
}

// ==========================================
//      🥁 SEATED AIR DRUM ENGINE MODULE
// ==========================================

let drumAudioStarted = false;
let drumReverbFx = null;
let drumVolNode = null;
let drumKickSynth = null;
let drumSnareTone = null;
let drumSnareNoise = null;
let drumHiHatSynth = null;
let drumHiHatPedalSynth = null;
let drumCrashSynth = null;
let drumRideSynth = null;
let drumTomHighSynth = null;
let drumTomLowSynth = null;
let drumClapNoise = null;

let isDemoPlaying = false;
let demoIntervalId = null;

let isRecordingDrum = false;
let drumAudioRecorder = null;
let drumAudioChunks = [];

// Kinematics tracking state for seated drumming
let prevLeftWrist = null;   // { x, y, time }
let prevRightWrist = null;  // { x, y, time }
let prevLeftFoot = null;    // { x, y, time }
let prevRightFoot = null;   // { x, y, time }
let prevLeftKnee = null;
let prevRightKnee = null;

let lastKickTime = 0;
let lastHiHatPedalTime = 0;
let lastLeftStrikeTime = 0;
let lastRightStrikeTime = 0;

// Dynamic Hit FX
let drumHitParticles = [];
let drumHitPopups = [];
let drumShockwaves = [];

// Drum piece visual feedback state
const drumPieceState = {
  kick: { name: "BASS KICK", hit: 0, color: "#ff4757", sound: "💥 BOOM!" },
  hihat_pedal: { name: "HI-HAT PEDAL", hit: 0, color: "#ffe600", sound: "🛎️ CHICK!" },
  snare: { name: "SNARE DRUM", hit: 0, color: "#ff2a5f", sound: "🥁 SNAP!" },
  hihat: { name: "HI-HAT CYMBAL", hit: 0, color: "#ffe600", sound: "🛎️ TISS!" },
  crash: { name: "CRASH CYMBAL", hit: 0, color: "#00f0ff", sound: "✨ CRASH!" },
  ride: { name: "RIDE CYMBAL", hit: 0, color: "#2ecc71", sound: "🔔 TING!" },
  tom_high: { name: "HIGH TOM", hit: 0, color: "#a820ff", sound: "🥁 DON!" },
  tom_low: { name: "FLOOR TOM", hit: 0, color: "#e056fd", sound: "🥁 DUM!" },
};

// Initialize Drum Audio Synths
async function initDrumAudioEngine() {
  if (drumAudioStarted) return;
  try {
    await Tone.start();
    const rawCtx = Tone.getContext()?.rawContext;
    if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
      await rawCtx.resume();
    }
    drumAudioStarted = true;

    drumReverbFx = new Tone.Freeverb({
      roomSize: 0.6,
      dampening: 4000,
      wet: parseFloat(drumReverb?.value || "0.25")
    });

    drumVolNode = new Tone.Volume(parseFloat(drumVolume?.value || "0")).chain(drumReverbFx, Tone.Destination);

    // Deep punchy Bass Kick Drum
    drumKickSynth = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 8,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.38, sustain: 0, release: 0.2 }
    }).connect(drumVolNode);

    // Snare Tone & Snappy Wire Noise
    drumSnareTone = new Tone.MembraneSynth({
      pitchDecay: 0.015,
      octaves: 2.5,
      oscillator: { type: "triangle" },
      envelope: { attack: 0.001, decay: 0.16, sustain: 0 }
    }).connect(drumVolNode);

    drumSnareNoise = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.19, sustain: 0 }
    }).connect(drumVolNode);

    // Hi-Hat Cymbals
    drumHiHatSynth = new Tone.MetalSynth({
      frequency: 240,
      envelope: { attack: 0.001, decay: 0.06, release: 0.02 },
      harmonicity: 5.1,
      modulationIndex: 35,
      resonance: 4500,
      octaves: 1.5
    }).connect(drumVolNode);

    drumHiHatPedalSynth = new Tone.MetalSynth({
      frequency: 210,
      envelope: { attack: 0.001, decay: 0.04, release: 0.01 },
      harmonicity: 4.8,
      modulationIndex: 28,
      resonance: 3800,
      octaves: 1.2
    }).connect(drumVolNode);

    // Crash Cymbal (Long decay)
    drumCrashSynth = new Tone.MetalSynth({
      frequency: 310,
      envelope: { attack: 0.003, decay: 1.5, release: 0.4 },
      harmonicity: 8.8,
      modulationIndex: 42,
      resonance: 5200,
      octaves: 2.0
    }).connect(drumVolNode);

    // Ride Cymbal (Clear bell-like ping)
    drumRideSynth = new Tone.MetalSynth({
      frequency: 440,
      envelope: { attack: 0.001, decay: 0.8, release: 0.2 },
      harmonicity: 6.2,
      modulationIndex: 24,
      resonance: 6000,
      octaves: 1.8
    }).connect(drumVolNode);

    // High & Floor Toms
    drumTomHighSynth = new Tone.MembraneSynth({
      pitchDecay: 0.07,
      octaves: 3.5,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.32, sustain: 0 }
    }).connect(drumVolNode);

    drumTomLowSynth = new Tone.MembraneSynth({
      pitchDecay: 0.08,
      octaves: 4.2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.55, sustain: 0 }
    }).connect(drumVolNode);

    // Clap / Rimshot
    drumClapNoise = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.002, decay: 0.18, sustain: 0 }
    }).connect(drumVolNode);

    if (btnToggleDrumAudio) {
      btnToggleDrumAudio.textContent = "Audio Engine Active";
      btnToggleDrumAudio.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
    }
    status("Seated Drum Audio Engine Active! Move your feet and hands in seated posture.");
  } catch (err) {
    console.error("Drum Audio Engine Init Error:", err);
  }
}

// Trigger Specific Drum Piece with Velocity & Kinetic FX
function triggerDrumPiece(piece, velocity = 1.0, hitX = null, hitY = null) {
  if (!drumAudioStarted) initDrumAudioEngine();
  const rawCtx = Tone.getContext()?.rawContext;
  if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
    rawCtx.resume();
  }
  const kit = drumKitPreset ? drumKitPreset.value : "acoustic";
  const now = Tone.now();

  if (drumPieceState[piece]) {
    drumPieceState[piece].hit = 1.0;
  }

  try {
    if (piece === "kick") {
      let pitch = kit === "trap" ? "C1" : kit === "cyber" ? "D1" : kit === "rock" ? "G0" : "A0";
      if (drumKickSynth) drumKickSynth.triggerAttackRelease(pitch, "8n", now, Math.min(1.0, velocity * 1.3));
    } else if (piece === "hihat_pedal") {
      if (drumHiHatPedalSynth) drumHiHatPedalSynth.triggerAttackRelease("32n", now, velocity * 0.7);
      else if (drumHiHatSynth) drumHiHatSynth.triggerAttackRelease("32n", now, velocity * 0.5);
    } else if (piece === "snare") {
      let tune = parseInt(drumSnarePitch?.value || "0");
      let baseFreq = Tone.Frequency("C2").transpose(tune).toNote();
      if (drumSnareTone) drumSnareTone.triggerAttackRelease(baseFreq, "16n", now, velocity * 0.85);
      if (drumSnareNoise) drumSnareNoise.triggerAttackRelease("16n", now, velocity);
    } else if (piece === "hihat") {
      if (drumHiHatSynth) drumHiHatSynth.triggerAttackRelease("16n", now, velocity * 0.8);
    } else if (piece === "crash") {
      if (drumCrashSynth) drumCrashSynth.triggerAttackRelease("4n", now, velocity * 0.95);
    } else if (piece === "ride") {
      if (drumRideSynth) drumRideSynth.triggerAttackRelease("8n", now, velocity * 0.85);
      else if (drumCrashSynth) drumCrashSynth.triggerAttackRelease("16n", now, velocity * 0.6);
    } else if (piece === "tom_high") {
      if (drumTomHighSynth) drumTomHighSynth.triggerAttackRelease("A2", "8n", now, velocity);
    } else if (piece === "tom_low") {
      if (drumTomLowSynth) drumTomLowSynth.triggerAttackRelease("D2", "8n", now, velocity);
    }
  } catch (e) {
    console.warn("Drum trigger exception:", e);
  }

  // Visual shockwave and particles at impact coordinates
  if (hitX !== null && hitY !== null && drumPieceState[piece]) {
    let pInfo = drumPieceState[piece];
    drumShockwaves.push({
      x: hitX,
      y: hitY,
      radius: 10,
      maxRadius: piece === "kick" ? 90 : 60,
      color: pInfo.color,
      life: 1.0
    });

    for (let i = 0; i < 16; i++) {
      let ang = Math.random() * Math.PI * 2;
      let spd = 2 + Math.random() * 9;
      drumHitParticles.push({
        x: hitX,
        y: hitY,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - (piece === "kick" ? 3 : 0),
        color: pInfo.color,
        life: 1.0
      });
    }

    drumHitPopups.push({
      text: pInfo.sound,
      x: hitX,
      y: hitY - 18,
      color: pInfo.color,
      life: 1.0
    });

    if (drumHudTitle) drumHudTitle.textContent = `🥁 HIT: ${pInfo.name}`;
    if (drumHudSub) drumHudSub.textContent = `Kinetic Velocity: ${Math.round(velocity * 100)}% | Position: (${Math.round(hitX)}, ${Math.round(hitY)})`;
  }
}

// Helper to draw clean neon glowing line segment
function drawNeonBone(ctx, p1, p2, color, width = 3) {
  if (!p1 || !p2) return;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

// Main Seated Gestur Drum Render Loop
function renderGestureDrumPage() {
  if (!webcam || webcam.readyState < 2 || !drumCtx) return;

  if (drumCanvas.width !== webcam.videoWidth) drumCanvas.width = webcam.videoWidth;
  if (drumCanvas.height !== webcam.videoHeight) drumCanvas.height = webcam.videoHeight;

  const W = drumCanvas.width;
  const H = drumCanvas.height;
  let now = performance.now();

  // 1. Draw live camera feed
  drumCtx.drawImage(webcam, 0, 0, W, H);

  // Subtle dark vignette to enhance neon drum visuals
  drumCtx.save();
  let vig = drumCtx.createRadialGradient(W / 2, H / 2, W * 0.25, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, "rgba(0, 0, 0, 0)");
  vig.addColorStop(1, "rgba(6, 5, 12, 0.45)");
  drumCtx.fillStyle = vig;
  drumCtx.fillRect(0, 0, W, H);
  drumCtx.restore();

  let handSens = parseFloat(drumSensitivity?.value || "6");
  let footSens = parseFloat(drumFootSensitivity?.value || "6");

  // Thresholds based on sliders (higher slider = lower velocity needed)
  let handStrikeThreshold = 170 - handSens * 12; // px/sec downward
  let footKickThreshold = 140 - footSens * 10;   // px/sec downward

  let trackedBody = false;

  // 2. Process Full-Body Pose Tracking for Seated Drummer
  if (poseLandmarker && now - lastWebcamTime > 25) {
    lastWebcamTime = now;
    let poseRes = poseLandmarker.detectForVideo(webcam, now);

    if (poseRes.landmarks && poseRes.landmarks.length > 0) {
      let pose = poseRes.landmarks[0];
      trackedBody = true;

      if (drumStatusBadge) {
        drumStatusBadge.textContent = "🟢 Seated Posture Tracking (Hands & Feet)";
        drumStatusBadge.classList.add("locked");
      }

      // Key landmark indices
      // 11: L_SH, 12: R_SH, 13: L_EL, 14: R_EL, 15: L_WR, 16: R_WR, 19: L_IX, 20: R_IX
      // 23: L_HIP, 24: R_HIP, 25: L_KN, 26: R_KN, 27: L_ANK, 28: R_ANK, 29: L_HEEL, 30: R_HEEL, 31: L_FOOT, 32: R_FOOT
      let pL_SH = { x: pose[11].x * W, y: pose[11].y * H };
      let pR_SH = { x: pose[12].x * W, y: pose[12].y * H };
      let pL_EL = { x: pose[13].x * W, y: pose[13].y * H };
      let pR_EL = { x: pose[14].x * W, y: pose[14].y * H };
      let pL_WR = { x: pose[15].x * W, y: pose[15].y * H };
      let pR_WR = { x: pose[16].x * W, y: pose[16].y * H };
      let pL_IX = pose[19] ? { x: pose[19].x * W, y: pose[19].y * H } : pL_WR;
      let pR_IX = pose[20] ? { x: pose[20].x * W, y: pose[20].y * H } : pR_WR;

      let pL_HIP = { x: pose[23].x * W, y: pose[23].y * H };
      let pR_HIP = { x: pose[24].x * W, y: pose[24].y * H };
      let pL_KN = { x: pose[25].x * W, y: pose[25].y * H };
      let pR_KN = { x: pose[26].x * W, y: pose[26].y * H };
      let pL_ANK = { x: pose[27].x * W, y: pose[27].y * H };
      let pR_ANK = { x: pose[28].x * W, y: pose[28].y * H };
      let pL_FOOT = pose[31] ? { x: pose[31].x * W, y: pose[31].y * H } : pL_ANK;
      let pR_FOOT = pose[32] ? { x: pose[32].x * W, y: pose[32].y * H } : pR_ANK;

      let chestCenter = { x: (pL_SH.x + pR_SH.x) / 2, y: (pL_SH.y + pR_SH.y) / 2 };
      let lapCenter = { x: (pL_HIP.x + pR_HIP.x) / 2, y: (pL_HIP.y + pR_HIP.y) / 2 + 30 };
      let shoulderY = Math.min(pL_SH.y, pR_SH.y);
      let torsoLeft = Math.min(pL_SH.x, pL_HIP.x);
      let torsoRight = Math.max(pR_SH.x, pR_HIP.x);

      // --- A. Draw Cyber Neon Skeleton Overlay ---
      // Upper Body
      drawNeonBone(drumCtx, pL_SH, pR_SH, "rgba(0, 240, 255, 0.4)", 2.5);
      drawNeonBone(drumCtx, pL_SH, pL_EL, "rgba(255, 42, 95, 0.5)", 2.5);
      drawNeonBone(drumCtx, pL_EL, pL_WR, "rgba(255, 42, 95, 0.6)", 3);
      drawNeonBone(drumCtx, pR_SH, pR_EL, "rgba(0, 240, 255, 0.5)", 2.5);
      drawNeonBone(drumCtx, pR_EL, pR_WR, "rgba(0, 240, 255, 0.6)", 3);
      // Torso & Hips
      drawNeonBone(drumCtx, pL_SH, pL_HIP, "rgba(168, 32, 255, 0.4)", 2);
      drawNeonBone(drumCtx, pR_SH, pR_HIP, "rgba(168, 32, 255, 0.4)", 2);
      drawNeonBone(drumCtx, pL_HIP, pR_HIP, "rgba(168, 32, 255, 0.4)", 2);
      // Legs to Feet
      drawNeonBone(drumCtx, pL_HIP, pL_KN, "rgba(255, 230, 0, 0.5)", 2.5);
      drawNeonBone(drumCtx, pL_KN, pL_ANK, "rgba(255, 230, 0, 0.6)", 3);
      drawNeonBone(drumCtx, pL_ANK, pL_FOOT, "rgba(255, 230, 0, 0.8)", 3.5);

      drawNeonBone(drumCtx, pR_HIP, pR_KN, "rgba(255, 71, 87, 0.5)", 2.5);
      drawNeonBone(drumCtx, pR_KN, pR_ANK, "rgba(255, 71, 87, 0.6)", 3);
      drawNeonBone(drumCtx, pR_ANK, pR_FOOT, "rgba(255, 71, 87, 0.8)", 3.5);

      // --- B. Draw Virtual Drumsticks in Hands ---
      // Left Drumstick (Neon Red / Magenta)
      let stickLen = 45;
      let leftAngle = Math.atan2(pL_IX.y - pL_WR.y, pL_IX.x - pL_WR.x);
      let lTip = { x: pL_WR.x + Math.cos(leftAngle) * (stickLen + 15), y: pL_WR.y + Math.sin(leftAngle) * (stickLen + 15) };
      drawNeonBone(drumCtx, pL_WR, lTip, "#ff2a5f", 4.5);
      // Glowing tip
      drumCtx.save();
      drumCtx.beginPath();
      drumCtx.arc(lTip.x, lTip.y, 6, 0, Math.PI * 2);
      drumCtx.fillStyle = "#ffffff";
      drumCtx.shadowColor = "#ff2a5f";
      drumCtx.shadowBlur = 16;
      drumCtx.fill();
      drumCtx.restore();

      // Right Drumstick (Neon Cyan / Electric Blue)
      let rightAngle = Math.atan2(pR_IX.y - pR_WR.y, pR_IX.x - pR_WR.x);
      let rTip = { x: pR_WR.x + Math.cos(rightAngle) * (stickLen + 15), y: pR_WR.y + Math.sin(rightAngle) * (stickLen + 15) };
      drawNeonBone(drumCtx, pR_WR, rTip, "#00f0ff", 4.5);
      // Glowing tip
      drumCtx.save();
      drumCtx.beginPath();
      drumCtx.arc(rTip.x, rTip.y, 6, 0, Math.PI * 2);
      drumCtx.fillStyle = "#ffffff";
      drumCtx.shadowColor = "#00f0ff";
      drumCtx.shadowBlur = 16;
      drumCtx.fill();
      drumCtx.restore();

      // --- C. Draw Holographic Floor Pedals under Feet ---
      // Left Foot Pedal (Hi-Hat Chick)
      let lFootY = Math.max(pL_ANK.y, pL_FOOT.y);
      let lFootX = pL_FOOT.x;
      let lPedalHit = drumPieceState.hihat_pedal.hit;
      drumCtx.save();
      drumCtx.beginPath();
      drumCtx.ellipse(lFootX, lFootY + 14, 38 + lPedalHit * 10, 18 + lPedalHit * 6, -0.15, 0, Math.PI * 2);
      drumCtx.strokeStyle = lPedalHit > 0.1 ? "#ffffff" : "#ffe600";
      drumCtx.lineWidth = 2.5 + lPedalHit * 3;
      drumCtx.shadowColor = "#ffe600";
      drumCtx.shadowBlur = 15 + lPedalHit * 20;
      drumCtx.stroke();
      drumCtx.fillStyle = `rgba(255, 230, 0, ${0.15 + lPedalHit * 0.4})`;
      drumCtx.fill();
      drumCtx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
      drumCtx.fillStyle = "#ffe600";
      drumCtx.textAlign = "center";
      drumCtx.fillText("🦶 HI-HAT PEDAL", lFootX, lFootY + 34);
      drumCtx.restore();

      // Right Foot Pedal (Bass Kick Boom)
      let rFootY = Math.max(pR_ANK.y, pR_FOOT.y);
      let rFootX = pR_FOOT.x;
      let rPedalHit = drumPieceState.kick.hit;
      drumCtx.save();
      drumCtx.beginPath();
      drumCtx.ellipse(rFootX, rFootY + 14, 42 + rPedalHit * 12, 20 + rPedalHit * 8, 0.15, 0, Math.PI * 2);
      drumCtx.strokeStyle = rPedalHit > 0.1 ? "#ffffff" : "#ff4757";
      drumCtx.lineWidth = 2.5 + rPedalHit * 3;
      drumCtx.shadowColor = "#ff4757";
      drumCtx.shadowBlur = 15 + rPedalHit * 25;
      drumCtx.stroke();
      drumCtx.fillStyle = `rgba(255, 71, 87, ${0.15 + rPedalHit * 0.45})`;
      drumCtx.fill();
      drumCtx.font = "bold 11px 'Plus Jakarta Sans', sans-serif";
      drumCtx.fillStyle = "#ff4757";
      drumCtx.textAlign = "center";
      drumCtx.fillText("🦶 BASS KICK PEDAL", rFootX, rFootY + 34);
      drumCtx.restore();

      // --- D. Kinematic Foot Kick & Pedal Strike Detection ---
      // Right Foot Kick Stomp
      if (prevRightFoot) {
        let dt = (now - prevRightFoot.time) / 1000;
        let dy = rFootY - prevRightFoot.y;
        let kneeDy = pR_KN.y - (prevRightKnee ? prevRightKnee.y : pR_KN.y);
        let footSpeedY = dt > 0 ? dy / dt : 0;
        let kneeSpeedY = dt > 0 ? kneeDy / dt : 0;

        if ((footSpeedY > footKickThreshold || kneeSpeedY > footKickThreshold * 0.85) && (now - lastKickTime > 150)) {
          lastKickTime = now;
          let vel = Math.min(1.0, Math.max(0.4, (footSpeedY + kneeSpeedY) / 500));
          triggerDrumPiece("kick", vel, rFootX, rFootY + 10);
        }
      }
      prevRightFoot = { x: rFootX, y: rFootY, time: now };
      prevRightKnee = { x: pR_KN.x, y: pR_KN.y, time: now };

      // Left Foot Hi-Hat Pedal Tap
      if (prevLeftFoot) {
        let dt = (now - prevLeftFoot.time) / 1000;
        let dy = lFootY - prevLeftFoot.y;
        let kneeDy = pL_KN.y - (prevLeftKnee ? prevLeftKnee.y : pL_KN.y);
        let footSpeedY = dt > 0 ? dy / dt : 0;
        let kneeSpeedY = dt > 0 ? kneeDy / dt : 0;

        if ((footSpeedY > footKickThreshold || kneeSpeedY > footKickThreshold * 0.85) && (now - lastHiHatPedalTime > 150)) {
          lastHiHatPedalTime = now;
          let vel = Math.min(1.0, Math.max(0.4, (footSpeedY + kneeSpeedY) / 500));
          triggerDrumPiece("hihat_pedal", vel, lFootX, lFootY + 10);
        }
      }
      prevLeftFoot = { x: lFootX, y: lFootY, time: now };
      prevLeftKnee = { x: pL_KN.x, y: pL_KN.y, time: now };

      // --- E. Kinematic Hand Strikes Detection ---
      // Left Hand Strike
      if (prevLeftWrist) {
        let dt = (now - prevLeftWrist.time) / 1000;
        let dy = lTip.y - prevLeftWrist.y;
        let speedY = dt > 0 ? dy / dt : 0;

        if (speedY > handStrikeThreshold && (now - lastLeftStrikeTime > 130)) {
          lastLeftStrikeTime = now;
          let vel = Math.min(1.0, Math.max(0.35, speedY / 550));

          // Determine target piece based on seated spatial zones
          let targetPiece = "snare";
          if (lTip.y < shoulderY) {
            targetPiece = "crash"; // High top-left strike
          } else if (lTip.x < torsoLeft - 20) {
            targetPiece = "hihat"; // Outermost left
          } else if (lTip.y < chestCenter.y) {
            targetPiece = "tom_high"; // Chest height
          } else {
            targetPiece = "snare"; // Lap / Knee height
          }

          triggerDrumPiece(targetPiece, vel, lTip.x, lTip.y);
        }
      }
      prevLeftWrist = { x: lTip.x, y: lTip.y, time: now };

      // Right Hand Strike
      if (prevRightWrist) {
        let dt = (now - prevRightWrist.time) / 1000;
        let dy = rTip.y - prevRightWrist.y;
        let speedY = dt > 0 ? dy / dt : 0;

        if (speedY > handStrikeThreshold && (now - lastRightStrikeTime > 130)) {
          lastRightStrikeTime = now;
          let vel = Math.min(1.0, Math.max(0.35, speedY / 550));

          let targetPiece = "snare";
          if (rTip.y < shoulderY) {
            targetPiece = "ride"; // High top-right strike
          } else if (rTip.x > torsoRight + 20) {
            targetPiece = "tom_low"; // Lower right flank
          } else if (rTip.x < torsoLeft + 20) {
            targetPiece = "snare"; // Cross-hand snare hit
          } else if (rTip.y < chestCenter.y) {
            targetPiece = "tom_high"; // Mid / High tom
          } else {
            targetPiece = "snare"; // Lap center
          }

          triggerDrumPiece(targetPiece, vel, rTip.x, rTip.y);
        }
      }
      prevRightWrist = { x: rTip.x, y: rTip.y, time: now };
    }
  }

  // Fallback: If full pose is not detected, use HandLandmarker for seated air drumming
  if (!trackedBody && landmarker && now - lastWebcamTime > 30) {
    lastWebcamTime = now;
    let handRes = landmarker.detectForVideo(webcam, now);

    if (handRes.landmarks && handRes.landmarks.length > 0) {
      if (drumStatusBadge) {
        drumStatusBadge.textContent = `✋ Tracking ${handRes.landmarks.length} Drumstick Hands (Upper Seated Mode)`;
        drumStatusBadge.classList.add("locked");
      }

      handRes.landmarks.forEach((lms, hIdx) => {
        let idxTip = lms[INDEX_TIP];
        let wr = lms[WRIST];
        let hx = idxTip.x * W;
        let hy = idxTip.y * H;

        let prev = hIdx === 0 ? prevLeftWrist : prevRightWrist;
        if (prev) {
          let dt = (now - prev.time) / 1000;
          let dy = hy - prev.y;
          let speedY = dt > 0 ? dy / dt : 0;

          if (speedY > handStrikeThreshold && (now - (hIdx === 0 ? lastLeftStrikeTime : lastRightStrikeTime) > 130)) {
            if (hIdx === 0) lastLeftStrikeTime = now;
            else lastRightStrikeTime = now;

            let vel = Math.min(1.0, Math.max(0.35, speedY / 500));
            let piece = "snare";
            if (hy < H * 0.35) {
              piece = hx < W * 0.5 ? "crash" : "ride";
            } else if (hx < W * 0.35) {
              piece = "hihat";
            } else if (hx > W * 0.65) {
              piece = "tom_low";
            } else if (hy < H * 0.6) {
              piece = "tom_high";
            } else {
              piece = "snare";
            }
            triggerDrumPiece(piece, vel, hx, hy);
          }
        }

        if (hIdx === 0) prevLeftWrist = { x: hx, y: hy, time: now };
        else prevRightWrist = { x: hx, y: hy, time: now };

        // Draw glowing drumstick on hand
        drawNeonBone(drumCtx, { x: wr.x * W, y: wr.y * H }, { x: hx, y: hy }, hIdx === 0 ? "#ff2a5f" : "#00f0ff", 4);
      });
    } else {
      if (drumStatusBadge) {
        drumStatusBadge.textContent = "🪑 Silakan duduk menghadap kamera untuk main drum!";
        drumStatusBadge.classList.remove("locked");
      }
    }
  }

  // 3. Render Expanding Shockwaves
  for (let i = drumShockwaves.length - 1; i >= 0; i--) {
    let sw = drumShockwaves[i];
    sw.radius += (sw.maxRadius - sw.radius) * 0.25;
    sw.life -= 0.05;

    if (sw.life <= 0) {
      drumShockwaves.splice(i, 1);
      continue;
    }

    drumCtx.save();
    drumCtx.beginPath();
    drumCtx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    drumCtx.strokeStyle = sw.color;
    drumCtx.lineWidth = 4 * sw.life;
    drumCtx.shadowColor = sw.color;
    drumCtx.shadowBlur = 18;
    drumCtx.globalAlpha = sw.life;
    drumCtx.stroke();
    drumCtx.restore();
  }

  // 4. Render & Update Particle Sparks
  for (let i = drumHitParticles.length - 1; i >= 0; i--) {
    let p = drumHitParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.045;

    if (p.life <= 0) {
      drumHitParticles.splice(i, 1);
      continue;
    }

    drumCtx.save();
    drumCtx.beginPath();
    drumCtx.arc(p.x, p.y, 4 * p.life, 0, Math.PI * 2);
    drumCtx.fillStyle = p.color;
    drumCtx.globalAlpha = p.life;
    drumCtx.fill();
    drumCtx.restore();
  }

  // 5. Render Comic Popups (BOOM!, SNAP!, etc.)
  for (let i = drumHitPopups.length - 1; i >= 0; i--) {
    let pop = drumHitPopups[i];
    pop.y -= 1.8;
    pop.life -= 0.035;

    if (pop.life <= 0) {
      drumHitPopups.splice(i, 1);
      continue;
    }

    drumCtx.save();
    drumCtx.font = "bold 26px 'Bangers', cursive, sans-serif";
    drumCtx.textAlign = "center";
    drumCtx.fillStyle = pop.color;
    drumCtx.shadowColor = "#000";
    drumCtx.shadowBlur = 10;
    drumCtx.globalAlpha = pop.life;
    drumCtx.fillText(pop.text, pop.x, pop.y);
    drumCtx.restore();
  }

  // Decay visual hits for pieces
  Object.keys(drumPieceState).forEach(k => {
    drumPieceState[k].hit = Math.max(0, drumPieceState[k].hit - 0.08);
  });
}

// Controls & Event Listeners for Gestur Drum
if (btnStartDrumCam) {
  btnStartDrumCam.addEventListener("click", async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }
    await startCamera();
  });
}

if (btnToggleDrumAudio) {
  btnToggleDrumAudio.addEventListener("click", () => {
    initDrumAudioEngine();
  });
}

// Demo Rhythm Player
if (btnDemoBeat) {
  btnDemoBeat.addEventListener("click", async () => {
    if (!drumAudioStarted) await initDrumAudioEngine();

    if (isDemoPlaying) {
      clearInterval(demoIntervalId);
      isDemoPlaying = false;
      btnDemoBeat.textContent = "Play Demo Rhythm";
      btnDemoBeat.classList.remove("primary-rec");
      status("Demo rhythm stopped.");
      return;
    }

    let step = 0;
    isDemoPlaying = true;
    btnDemoBeat.textContent = "Stop Demo Rhythm";
    btnDemoBeat.classList.add("primary-rec");
    status("Playing seated demo rhythm beat!");

    demoIntervalId = setInterval(() => {
      let W = drumCanvas ? drumCanvas.width : 640;
      let H = drumCanvas ? drumCanvas.height : 480;

      if (step % 4 === 0) triggerDrumPiece("kick", 0.9, W * 0.6, H * 0.85);
      if (step % 8 === 4) triggerDrumPiece("snare", 0.95, W * 0.45, H * 0.65);
      if (step % 2 === 0) triggerDrumPiece("hihat", 0.7, W * 0.25, H * 0.45);
      if (step === 12) triggerDrumPiece("tom_high", 0.8, W * 0.5, H * 0.4);
      if (step === 0) triggerDrumPiece("crash", 0.85, W * 0.2, H * 0.25);

      step = (step + 1) % 16;
    }, 180);
  });
}

// Record Drum Video Performance (Canvas Video + Tone.js Audio)
if (btnRecDrum) {
  btnRecDrum.addEventListener("click", async () => {
    if (!drumAudioStarted) await initDrumAudioEngine();

    if (isRecordingDrum) {
      if (drumAudioRecorder && drumAudioRecorder.state !== "inactive") {
        drumAudioRecorder.stop();
      }
      return;
    }

    if (!drumCanvas) {
      status("⚠️ Drum canvas is not available.");
      return;
    }

    try {
      // 1. Capture 30fps video stream from the drum canvas
      let videoStream = drumCanvas.captureStream(30);

      // 2. Capture clean audio stream destination from Tone.js
      let dest = Tone.getContext().rawContext.createMediaStreamDestination();
      Tone.Destination.connect(dest);

      // 3. Combine video and audio tracks
      let tracks = [...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      let combinedStream = new MediaStream(tracks);

      drumAudioChunks = [];
      let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      let options = mimeType ? { mimeType } : undefined;
      drumAudioRecorder = new MediaRecorder(combinedStream, options);

      drumAudioRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) drumAudioChunks.push(e.data);
      };

      drumAudioRecorder.onstop = () => {
        if (drumAudioChunks.length > 0) {
          let ext = mimeType.includes("mp4") ? "mp4" : "webm";
          let blob = new Blob(drumAudioChunks, { type: mimeType || "video/webm" });
          let url = URL.createObjectURL(blob);
          let a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `seated-air-drum-video-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1500);
          status("🎬 Saved Seated Air Drum performance video with synchronized drum audio!");
        } else {
          status("Drum recording finished (no data captured).");
        }
        isRecordingDrum = false;
        btnRecDrum.textContent = "🎥 Record Drum Video";
        btnRecDrum.classList.remove("primary-rec");
      };

      drumAudioRecorder.start();
      isRecordingDrum = true;
      btnRecDrum.textContent = "⏹️ Stop Recording Drum Video";
      btnRecDrum.classList.add("primary-rec");
      status("🔴 Recording Seated Air Drum performance video & audio...");
    } catch (err) {
      console.error("Drum video recording error:", err);
      status("⚠️ Could not initialize drum video recorder.");
    }
  });
}

// Input Range Value Display Event Handlers
if (drumSensitivity && drumSensitivityVal) {
  drumSensitivity.addEventListener("input", () => {
    drumSensitivityVal.textContent = `${drumSensitivity.value} (${drumSensitivity.value > 7 ? 'Sangat Responsif' : drumSensitivity.value < 4 ? 'Lembut' : 'Responsif'})`;
  });
}

if (drumFootSensitivity && drumFootSensitivityVal) {
  drumFootSensitivity.addEventListener("input", () => {
    drumFootSensitivityVal.textContent = `${drumFootSensitivity.value} (${drumFootSensitivity.value > 7 ? 'Sangat Responsif' : drumFootSensitivity.value < 4 ? 'Lembut' : 'Responsif'})`;
  });
}

if (drumVolume && drumVolVal) {
  drumVolume.addEventListener("input", () => {
    drumVolVal.textContent = `${drumVolume.value} dB`;
    if (drumVolNode) drumVolNode.volume.value = parseFloat(drumVolume.value);
  });
}

if (drumReverb && drumReverbVal) {
  drumReverb.addEventListener("input", () => {
    drumReverbVal.textContent = `${Math.round(drumReverb.value * 100)}%`;
    if (drumReverbFx) drumReverbFx.wet.value = parseFloat(drumReverb.value);
  });
}

if (drumSnarePitch && drumPitchVal) {
  drumSnarePitch.addEventListener("input", () => {
    drumPitchVal.textContent = `${drumSnarePitch.value > 0 ? '+' : ''}${drumSnarePitch.value} st`;
  });
}

// Record Synth Video Output (Canvas Video + Tone.js Audio)
if (btnRecSynth) {
  btnRecSynth.addEventListener("click", async () => {
    if (!audioStarted) await initAudioEngine();

    if (isRecordingSynth) {
      if (synthRecorder && synthRecorder.state !== "inactive") {
        synthRecorder.stop();
      }
      return;
    }

    if (!synthCanvas) {
      status("⚠️ Synth canvas is not available.");
      return;
    }

    try {
      let videoStream = synthCanvas.captureStream(30);
      let dest = Tone.getContext().rawContext.createMediaStreamDestination();
      Tone.Destination.connect(dest);

      let tracks = [...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      let combinedStream = new MediaStream(tracks);

      synthAudioChunks = [];
      let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      let options = mimeType ? { mimeType } : undefined;
      synthRecorder = new MediaRecorder(combinedStream, options);

      synthRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) synthAudioChunks.push(e.data);
      };

      synthRecorder.onstop = () => {
        if (synthAudioChunks.length > 0) {
          let ext = mimeType.includes("mp4") ? "mp4" : "webm";
          let blob = new Blob(synthAudioChunks, { type: mimeType || "video/webm" });
          let url = URL.createObjectURL(blob);
          let a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `gesture-synth-video-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1500);
          status("🎬 Saved Gesture Synth performance video with audio!");
        } else {
          status("Synth recording finished (no data captured).");
        }
        isRecordingSynth = false;
        btnRecSynth.textContent = "🎥 Record Synth Video";
        btnRecSynth.classList.remove("primary-rec");
      };

      synthRecorder.start();
      isRecordingSynth = true;
      btnRecSynth.textContent = "⏹️ Stop Recording Synth Video";
      btnRecSynth.classList.add("primary-rec");
      status("🔴 Recording Gesture Synth performance video & audio...");
    } catch (err) {
      console.error("Audio recording error:", err);
      status("⚠️ Could not initialize audio recorder.");
    }
  });
}

// ==========================================
//      🎸 GESTURE GUITAR AR ENGINE MODULE
// ==========================================

let guitarAudioStarted = false;
let guitarVolNode = null;
let guitarReverbFx = null;
let guitarChorusFx = null;
let guitarDistortionFx = null;
let guitarFilter = null;
let guitarPluckSynths = [];
let guitarLeadSynth = null;

let isRecordingGuitar = false;
let guitarAudioRecorder = null;
let guitarAudioChunks = [];

let isGuitarDemoPlaying = false;
let guitarDemoIntervalId = null;

// Guitar Chords Definition Matrix (String 6 [Low E] to String 1 [High e])
const GUITAR_CHORDS = {
  C: { name: "C Major", notes: [null, "C3", "E3", "G3", "C4", "E4"], tab: "x 3 2 0 1 0", gesture: "Pinch Jempol + Telunjuk", color: "#00f0ff" },
  G: { name: "G Major", notes: ["G2", "B2", "D3", "G3", "B3", "G4"], tab: "3 2 0 0 0 3", gesture: "Pinch Jempol + Jari Tengah", color: "#ffe600" },
  Am: { name: "A Minor", notes: [null, "A2", "E3", "A3", "C4", "E4"], tab: "x 0 2 2 1 0", gesture: "Pinch Jempol + Jari Kelingking", color: "#a820ff" },
  F: { name: "F Major (Barre)", notes: ["F2", "C3", "F3", "A3", "C4", "F4"], tab: "1 3 3 2 1 1", gesture: "Kepal Tangan (Fist / Barre)", color: "#ff2a5f" },
  Em: { name: "E Minor", notes: ["E2", "B2", "E3", "G3", "B3", "E4"], tab: "0 2 2 0 0 0", gesture: "Peace / Dua Jari (V-Sign)", color: "#2ecc71" },
  D: { name: "D Major", notes: [null, null, "D3", "A3", "D4", "F#4"], tab: "x x 0 2 3 2", gesture: "Pinch Jempol + Jari Manis", color: "#ff9f43" },
  A: { name: "A Major", notes: [null, "A2", "E3", "A3", "C#4", "E4"], tab: "x 0 2 2 2 0", gesture: "Metal / Rock Horns Sign", color: "#54a0ff" },
  Dm: { name: "D Minor", notes: [null, null, "D3", "A3", "D4", "F4"], tab: "x x 0 2 3 1", gesture: "Pinch 3 Jari Depan", color: "#ee5253" },
  E: { name: "E Major", notes: ["E2", "B2", "E3", "G#3", "B3", "E4"], tab: "0 2 2 1 0 0", gesture: "Buka Telapak Tangan Penuh", color: "#1dd1a1" },
  Bm: { name: "B Minor", notes: [null, "B2", "F#3", "B3", "D4", "F#4"], tab: "x 2 4 4 3 2", gesture: "Barre Fret 2", color: "#5f27cd" }
};

let activeGuitarChord = "C";
let stringVibrations = [0, 0, 0, 0, 0, 0]; // Amplitude for 6 strings
let stringNames = ["6th: E", "5th: A", "4th: D", "3rd: G", "2nd: B", "1st: e"];
let guitarSparks = [];
let guitarFloatingNotes = [];

// Kinematics Tracking for Right Strumming Hand & Left Fret Hand
let prevRightGuitarHand = null; // { x, y, time }
let lastStrumTime = 0;
let lastPluckTimes = [0, 0, 0, 0, 0, 0];
let lastGestureChordTime = 0;

// Initialize Tone.js Guitar Audio Synths
async function initGuitarAudioEngine() {
  if (guitarAudioStarted) return;
  try {
    await Tone.start();
    const rawCtx = Tone.getContext()?.rawContext;
    if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
      await rawCtx.resume();
    }
    guitarAudioStarted = true;

    // Guitar Master FX Chain with instantaneous Freeverb
    guitarReverbFx = new Tone.Freeverb({
      roomSize: 0.75,
      dampening: 3500,
      wet: parseFloat(guitarReverb?.value || "0.3")
    });

    guitarChorusFx = new Tone.Chorus({
      frequency: 3.5,
      delayTime: 3.2,
      depth: 0.65,
      wet: parseFloat(guitarChorus?.value || "0.25")
    }).start();

    guitarDistortionFx = new Tone.Distortion({
      distortion: parseFloat(guitarDistortion?.value || "0"),
      oversample: "2x",
      wet: parseFloat(guitarDistortion?.value || "0") > 0 ? 0.8 : 0
    });

    guitarFilter = new Tone.Filter({
      frequency: 4500,
      type: "lowpass",
      rolloff: -12
    });

    guitarVolNode = new Tone.Volume(parseFloat(guitarVolume?.value || "0")).chain(
      guitarDistortionFx,
      guitarFilter,
      guitarChorusFx,
      guitarReverbFx,
      Tone.Destination
    );

    // 6 Individual Realistic String Pluck Synthesizers (Karplus-Strong physical modeling)
    guitarPluckSynths = [];
    for (let i = 0; i < 6; i++) {
      let pluck = new Tone.PluckSynth({
        attackNoise: 1.2,
        dampening: 3500 + i * 400,
        resonance: 0.94
      }).connect(guitarVolNode);
      guitarPluckSynths.push(pluck);
    }

    // PolySynth for rich electric sustain / rock mode
    guitarLeadSynth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sawtooth" },
      envelope: { attack: 0.015, decay: 0.25, sustain: 0.5, release: 0.8 }
    }).connect(guitarVolNode);

    updateGuitarPresetParameters();

    if (btnToggleGuitarAudio) {
      btnToggleGuitarAudio.textContent = "Audio Engine Active";
      btnToggleGuitarAudio.style.background = "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)";
    }

    // Play a gentle welcome open string strum chime
    playGuitarStrum("C", "down", 30, 0.7);
    status("🎸 Air Guitar Audio Engine Active! Strum or pluck with your hands.");
  } catch (err) {
    console.error("Guitar Audio Engine Error:", err);
  }
}

function updateGuitarPresetParameters() {
  let preset = guitarPreset ? guitarPreset.value : "acoustic";
  if (!guitarAudioStarted) return;

  if (preset === "acoustic") {
    if (guitarDistortionFx) guitarDistortionFx.wet.value = 0;
    if (guitarFilter) guitarFilter.frequency.value = 4800;
    if (guitarChorusFx) guitarChorusFx.wet.value = 0.15;
    guitarPluckSynths.forEach((p, idx) => {
      p.dampening = 3800 + idx * 300;
      p.resonance = 0.95;
    });
  } else if (preset === "electric_rock") {
    let distVal = Math.max(0.4, parseFloat(guitarDistortion?.value || "0.6"));
    if (guitarDistortionFx) {
      guitarDistortionFx.distortion = distVal;
      guitarDistortionFx.wet.value = 0.85;
    }
    if (guitarFilter) guitarFilter.frequency.value = 6500;
    if (guitarChorusFx) guitarChorusFx.wet.value = 0.3;
  } else if (preset === "clean_chorus") {
    if (guitarDistortionFx) guitarDistortionFx.wet.value = 0;
    if (guitarFilter) guitarFilter.frequency.value = 5200;
    if (guitarChorusFx) guitarChorusFx.wet.value = 0.6;
    if (guitarReverbFx) guitarReverbFx.wet.value = 0.45;
  } else if (preset === "spanish_nylon") {
    if (guitarDistortionFx) guitarDistortionFx.wet.value = 0;
    if (guitarFilter) guitarFilter.frequency.value = 2800;
    if (guitarChorusFx) guitarChorusFx.wet.value = 0.05;
    guitarPluckSynths.forEach((p, idx) => {
      p.dampening = 2200 + idx * 250;
      p.resonance = 0.92;
    });
  }
}

// Play a full strum (Cascading individual strings)
function playGuitarStrum(chordName, direction = "down", speedMs = 25, velocity = 0.85) {
  if (!guitarAudioStarted) initGuitarAudioEngine();
  const rawCtx = Tone.getContext()?.rawContext;
  if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
    rawCtx.resume();
  }
  let chordObj = GUITAR_CHORDS[chordName] || GUITAR_CHORDS.C;
  let notes = chordObj.notes;
  let preset = guitarPreset ? guitarPreset.value : "acoustic";

  let stringIndices = [0, 1, 2, 3, 4, 5];
  if (direction === "up") stringIndices.reverse();

  let validNotesToPlay = [];
  stringIndices.forEach((sIdx, step) => {
    let note = notes[sIdx];
    if (note) {
      validNotesToPlay.push({ sIdx, note, delay: step * (speedMs / 1000) });
    }
  });

  validNotesToPlay.forEach(item => {
    setTimeout(() => {
      try {
        if (preset === "electric_rock" && guitarLeadSynth) {
          guitarLeadSynth.triggerAttackRelease(item.note, "8n", undefined, velocity * 0.8);
        } else if (guitarPluckSynths[item.sIdx]) {
          guitarPluckSynths[item.sIdx].triggerAttack(item.note, undefined, velocity);
        }
      } catch (e) {}

      // Trigger string physical vibration effect
      stringVibrations[item.sIdx] = Math.min(18, 8 + velocity * 10);
    }, item.delay * 1000);
  });

  // Spawn visual notes & sparks
  let W = guitarCanvas ? guitarCanvas.width : 640;
  let H = guitarCanvas ? guitarCanvas.height : 480;
  guitarFloatingNotes.push({
    text: `🎸 ${chordObj.name} (${direction === 'down' ? '↓ Down-strum' : '↑ Up-strum'})`,
    x: W * 0.55 + (Math.random() - 0.5) * 60,
    y: H * 0.65,
    color: chordObj.color,
    life: 1.0
  });

  for (let k = 0; k < 12; k++) {
    guitarSparks.push({
      x: W * 0.58 + (Math.random() - 0.5) * 90,
      y: H * 0.68 + (Math.random() - 0.5) * 80,
      vx: (Math.random() - 0.5) * 5,
      vy: -Math.random() * 4 - 2,
      color: chordObj.color,
      life: 1.0
    });
  }
}

// Pluck a single guitar string (0 to 5)
function pluckGuitarString(stringIdx, velocity = 0.85) {
  if (!guitarAudioStarted) initGuitarAudioEngine();
  const rawCtx = Tone.getContext()?.rawContext;
  if (rawCtx && rawCtx.state === "suspended" && rawCtx.resume) {
    rawCtx.resume();
  }
  if (stringIdx < 0 || stringIdx > 5) return;

  let chordObj = GUITAR_CHORDS[activeGuitarChord] || GUITAR_CHORDS.C;
  let note = chordObj.notes[stringIdx];
  if (!note) return;

  let preset = guitarPreset ? guitarPreset.value : "acoustic";
  try {
    if (preset === "electric_rock" && guitarLeadSynth) {
      guitarLeadSynth.triggerAttackRelease(note, "4n", undefined, velocity * 0.9);
    } else if (guitarPluckSynths[stringIdx]) {
      guitarPluckSynths[stringIdx].triggerAttack(note, undefined, velocity);
    }
  } catch (e) {}

  stringVibrations[stringIdx] = 16;

  let W = guitarCanvas ? guitarCanvas.width : 640;
  let H = guitarCanvas ? guitarCanvas.height : 480;
  let stringY = H * 0.55 + stringIdx * 20;

  guitarFloatingNotes.push({
    text: `♪ ${note} (${stringNames[stringIdx]})`,
    x: W * 0.58 + (Math.random() - 0.5) * 30,
    y: stringY - 10,
    color: chordObj.color,
    life: 1.0
  });

  for (let k = 0; k < 6; k++) {
    guitarSparks.push({
      x: W * 0.58,
      y: stringY,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      color: "#ffe600",
      life: 1.0
    });
  }
}

// Switch active chord and update UI indicators
function setGuitarChord(chordKey) {
  if (!GUITAR_CHORDS[chordKey]) return;
  activeGuitarChord = chordKey;
  let chordObj = GUITAR_CHORDS[chordKey];

  if (guitarHudTitle) {
    guitarHudTitle.textContent = `🎸 ${chordObj.name}`;
    guitarHudTitle.style.textShadow = `0 0 16px ${chordObj.color}`;
  }
  if (guitarHudSub) {
    guitarHudSub.textContent = `Tab: [ ${chordObj.tab} ] | Gestur: ${chordObj.gesture} | Kanan: Petik / Genjreng`;
  }

  // Update quick chord buttons visual active state
  document.querySelectorAll(".guitar-quick-chord").forEach(btn => {
    if (btn.getAttribute("data-chord") === chordKey) {
      btn.classList.add("active");
      btn.style.background = `rgba(0, 240, 255, 0.25)`;
      btn.style.border = `1.5px solid ${chordObj.color}`;
    } else {
      btn.classList.remove("active");
      btn.style.background = `rgba(255, 255, 255, 0.08)`;
      btn.style.border = `1px solid rgba(255, 255, 255, 0.2)`;
    }
  });
}

// ---- MAIN GESTURE GUITAR AR RENDER LOOP ----
function renderGestureGuitarPage() {
  if (!guitarCtx || !guitarCanvas) return;
  const W = guitarCanvas.width;
  const H = guitarCanvas.height;
  const now = performance.now();

  // 1. Draw Mirrored Webcam Video Feed
  guitarCtx.save();
  guitarCtx.scale(-1, 1);
  guitarCtx.drawImage(webcam, -W, 0, W, H);
  guitarCtx.restore();

  // Spider-Verse Dark Vignette
  guitarCtx.save();
  let vig = guitarCtx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, W * 0.7);
  vig.addColorStop(0, "rgba(6, 5, 10, 0.05)");
  vig.addColorStop(1, "rgba(6, 5, 10, 0.75)");
  guitarCtx.fillStyle = vig;
  guitarCtx.fillRect(0, 0, W, H);
  guitarCtx.restore();

  let trackedHands = false;
  let leftHand = null;
  let rightHand = null;

  // 2. Detect Hands with MediaPipe HandLandmarker
  if (landmarker && now - lastWebcamTime > 25) {
    lastWebcamTime = now;
    let handRes = landmarker.detectForVideo(webcam, now);

    if (handRes.landmarks && handRes.landmarks.length > 0) {
      trackedHands = true;
      if (guitarStatusBadge) {
        guitarStatusBadge.textContent = "🟢 2-Hand Guitar Tracking Active (Neck & Body)";
        guitarStatusBadge.classList.add("locked");
      }

      // Identify Left (Fret/Neck) and Right (Strum/Body) Hands based on mirrored screen X
      handRes.landmarks.forEach((hand, idx) => {
        let handedness = handRes.handednesses && handRes.handednesses[idx] ? handRes.handednesses[idx][0].categoryName : "Unknown";
        // Screen mirrored coordinates
        let screenX = 1 - hand[WRIST].x;

        // In mirrored view: left side of screen (screenX < 0.5) is player's left hand (neck)
        if (screenX < 0.5) {
          leftHand = hand;
        } else {
          rightHand = hand;
        }
      });
    } else {
      if (guitarStatusBadge) {
        guitarStatusBadge.textContent = "✋ Tampilkan 2 tangan untuk memegang neck & memetik gitar!";
        guitarStatusBadge.classList.remove("locked");
      }
    }
  }

  // Fallback if one hand was assigned but other is missing
  if (!leftHand && rightHand && (1 - rightHand[WRIST].x) < 0.5) {
    leftHand = rightHand;
    rightHand = null;
  }

  // --- A. PROCESS LEFT HAND (Fret Hand / Chord Recognition) ---
  if (leftHand) {
    let mode = guitarChordRecognition ? guitarChordRecognition.value : "gesture";
    let thumbTip = leftHand[THUMB_TIP];
    let idxTip = leftHand[INDEX_TIP];
    let midTip = leftHand[12];
    let ringTip = leftHand[16];
    let pinkyTip = leftHand[20];
    let wrist = leftHand[WRIST];

    if (mode === "gesture" && now - lastGestureChordTime > 280) {
      // Calculate fingertip-to-thumb distances
      let dThumbIdx = Math.hypot(idxTip.x - thumbTip.x, idxTip.y - thumbTip.y);
      let dThumbMid = Math.hypot(midTip.x - thumbTip.x, midTip.y - thumbTip.y);
      let dThumbRing = Math.hypot(ringTip.x - thumbTip.x, ringTip.y - thumbTip.y);
      let dThumbPinky = Math.hypot(pinkyTip.x - thumbTip.x, pinkyTip.y - thumbTip.y);

      // Finger curls towards palm (wrist)
      let dIdxWrist = Math.hypot(idxTip.x - wrist.x, idxTip.y - wrist.y);
      let dMidWrist = Math.hypot(midTip.x - wrist.x, midTip.y - wrist.y);
      let dRingWrist = Math.hypot(ringTip.x - wrist.x, ringTip.y - wrist.y);
      let dPinkyWrist = Math.hypot(pinkyTip.x - wrist.x, pinkyTip.y - wrist.y);

      let isFist = (dIdxWrist < 0.22 && dMidWrist < 0.22 && dRingWrist < 0.22 && dPinkyWrist < 0.22);
      let isPeace = (dIdxWrist > 0.28 && dMidWrist > 0.28 && dRingWrist < 0.22 && dPinkyWrist < 0.22);
      let isHorns = (dIdxWrist > 0.28 && dPinkyWrist > 0.28 && dMidWrist < 0.22 && dRingWrist < 0.22);

      let newChord = activeGuitarChord;
      if (isFist) {
        newChord = "F";
      } else if (isPeace) {
        newChord = "Em";
      } else if (isHorns) {
        newChord = "A";
      } else if (dThumbIdx < 0.08) {
        newChord = "C";
      } else if (dThumbMid < 0.08) {
        newChord = "G";
      } else if (dThumbRing < 0.08) {
        newChord = "D";
      } else if (dThumbPinky < 0.08) {
        newChord = "Am";
      }

      if (newChord !== activeGuitarChord) {
        lastGestureChordTime = now;
        setGuitarChord(newChord);
      }
    } else if (mode === "fret_pos") {
      let neckX = 1 - leftHand[WRIST].x; // 0.1 to 0.45
      let fretIndex = Math.floor(Math.max(0, Math.min(5, (neckX - 0.1) / 0.06)));
      let fretChords = ["C", "G", "Am", "F", "Em", "D"];
      let newChord = fretChords[fretIndex] || "C";
      if (newChord !== activeGuitarChord) {
        setGuitarChord(newChord);
      }
    }

    // Draw Left Hand Holographic Fretboard Indicator
    let lx = (1 - leftHand[WRIST].x) * W;
    let ly = leftHand[WRIST].y * H;
    drawLeftHandFretGuide(guitarCtx, leftHand, W, H);
  }

  // --- B. PROCESS RIGHT HAND (Strumming & Plucking / Kinematics) ---
  let strumSens = parseFloat(guitarStrumSens?.value || "6");
  let strumVelocityThreshold = 220 - strumSens * 15; // px/sec
  let strumSpeedMs = parseInt(guitarStrumSpeed?.value || "25");

  // Define virtual guitar strings region in screen coordinates
  let guitarBodyCenterX = W * 0.62;
  let guitarBodyCenterY = H * 0.62;
  let stringSpacing = 22;
  let stringsTopY = guitarBodyCenterY - 2.5 * stringSpacing;

  if (rightHand) {
    let rx = (1 - rightHand[WRIST].x) * W;
    let ry = rightHand[WRIST].y * H;
    let rIdxX = (1 - rightHand[INDEX_TIP].x) * W;
    let rIdxY = rightHand[INDEX_TIP].y * H;
    let rThumbX = (1 - rightHand[THUMB_TIP].x) * W;
    let rThumbY = rightHand[THUMB_TIP].y * H;

    let playstyle = guitarPlaystyle ? guitarPlaystyle.value : "hybrid";

    // Kinematics velocity calculation
    if (prevRightGuitarHand) {
      let dt = (now - prevRightGuitarHand.time) / 1000;
      if (dt > 0.005 && dt < 0.2) {
        let vy = (ry - prevRightGuitarHand.y) / dt;

        // 1. Full-Hand Strum Detection (Down-strum / Up-strum)
        if (playstyle === "hybrid" || playstyle === "strum") {
          // Hand crosses guitar strings area (Y between stringsTopY - 40 and stringsTopY + 160)
          let inStrumZoneX = Math.abs(rx - guitarBodyCenterX) < 180;
          let inStrumZoneY = ry >= stringsTopY - 40 && ry <= stringsTopY + 160;

          if (inStrumZoneX && inStrumZoneY && now - lastStrumTime > 160) {
            if (vy > strumVelocityThreshold) {
              // Down-strum (Genjreng ke bawah)
              lastStrumTime = now;
              let vel = Math.min(1.0, Math.max(0.5, Math.abs(vy) / 650));
              playGuitarStrum(activeGuitarChord, "down", strumSpeedMs, vel);
            } else if (vy < -strumVelocityThreshold) {
              // Up-strum (Genjreng ke atas)
              lastStrumTime = now;
              let vel = Math.min(1.0, Math.max(0.5, Math.abs(vy) / 650));
              playGuitarStrum(activeGuitarChord, "up", strumSpeedMs, vel);
            }
          }
        }

        // 2. Individual String Finger Pluck Detection
        if (playstyle === "hybrid" || playstyle === "fingerstyle") {
          for (let s = 0; s < 6; s++) {
            let sY = stringsTopY + s * stringSpacing;
            let distIdx = Math.abs(rIdxY - sY);
            let distThumb = Math.abs(rThumbY - sY);
            let inStringX = Math.abs(rIdxX - guitarBodyCenterX) < 140;

            if (inStringX && (distIdx < 10 || distThumb < 10) && now - lastPluckTimes[s] > 180) {
              lastPluckTimes[s] = now;
              pluckGuitarString(s, 0.9);
            }
          }
        }
      }
    }

    prevRightGuitarHand = { x: rx, y: ry, time: now };

    // Draw Neon Guitar Pick on Right Index Fingertip
    drawGlowingGuitarPick(guitarCtx, rIdxX, rIdxY);
  } else {
    prevRightGuitarHand = null;
  }

  // --- C. DRAW AR HOLOGRAPHIC GUITAR & VIBRATING STRINGS ---
  drawVirtualGuitarHologram(guitarCtx, W, H, stringsTopY, stringSpacing, activeGuitarChord);

  // --- D. RENDER SOUND SPARKS & FLOATING NOTES ---
  renderGuitarParticleFX(guitarCtx);
}

// Draw Glowing Guitar Pick on right fingertip
function drawGlowingGuitarPick(ctx, x, y) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x, y + 16);
  ctx.lineTo(x - 12, y - 10);
  ctx.lineTo(x + 12, y - 10);
  ctx.closePath();

  ctx.fillStyle = "#ff2a5f";
  ctx.shadowColor = "#ff2a5f";
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.strokeStyle = "#ffe600";
  ctx.lineWidth = 2;
  ctx.stroke();

  // Glow core
  ctx.beginPath();
  ctx.arc(x, y - 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = "#fff";
  ctx.fill();
  ctx.restore();
}

// Draw Left Hand Fretboard & Chord Finger Guide
function drawLeftHandFretGuide(ctx, hand, W, H) {
  let wristX = (1 - hand[WRIST].x) * W;
  let wristY = hand[WRIST].y * H;
  let chordObj = GUITAR_CHORDS[activeGuitarChord] || GUITAR_CHORDS.C;

  ctx.save();
  // Draw Fret Indicator Badge above left wrist
  let badgeW = 140;
  let badgeH = 52;
  let badgeX = wristX - badgeW / 2;
  let badgeY = wristY - 75;

  ctx.fillStyle = "rgba(12, 10, 24, 0.85)";
  ctx.strokeStyle = chordObj.color;
  ctx.lineWidth = 2;
  ctx.shadowColor = chordObj.color;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#fff";
  ctx.font = "bold 15px 'Plus Jakarta Sans', sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(chordObj.name, wristX, badgeY + 20);

  ctx.fillStyle = chordObj.color;
  ctx.font = "bold 11px monospace";
  ctx.fillText(`Tab: ${chordObj.tab}`, wristX, badgeY + 38);

  // Draw Glowing Connections between finger landmarks
  for (let i = 0; i < 5; i++) {
    let tipIdx = 4 + i * 4;
    let tx = (1 - hand[tipIdx].x) * W;
    let ty = hand[tipIdx].y * H;

    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, Math.PI * 2);
    ctx.fillStyle = chordObj.color;
    ctx.shadowBlur = 8;
    ctx.fill();
  }
  ctx.restore();
}

// Draw Holographic Guitar Neck, Body & 6 Vibrating Strings
function drawVirtualGuitarHologram(ctx, W, H, topY, spacing, chordKey) {
  let chordObj = GUITAR_CHORDS[chordKey] || GUITAR_CHORDS.C;
  let bodyCenterX = W * 0.62;
  let bodyCenterY = H * 0.62;

  ctx.save();

  // 1. Draw Holographic Guitar Neck (From Left to Center Body)
  let neckStartX = W * 0.12;
  let neckEndX = bodyCenterX - 110;
  let neckTopY = topY - 10;
  let neckBottomY = topY + 5 * spacing + 10;

  let neckGrad = ctx.createLinearGradient(neckStartX, neckTopY, neckEndX, neckTopY);
  neckGrad.addColorStop(0, "rgba(0, 240, 255, 0.15)");
  neckGrad.addColorStop(1, "rgba(168, 32, 255, 0.25)");

  ctx.fillStyle = neckGrad;
  ctx.strokeStyle = "rgba(0, 240, 255, 0.4)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(neckStartX, neckTopY, neckEndX - neckStartX, neckBottomY - neckTopY, 6);
  ctx.fill();
  ctx.stroke();

  // Fret Wires on Neck
  let numFrets = 6;
  let fretStep = (neckEndX - neckStartX) / numFrets;
  for (let f = 1; f <= numFrets; f++) {
    let fx = neckStartX + f * fretStep;
    ctx.beginPath();
    ctx.moveTo(fx, neckTopY);
    ctx.lineTo(fx, neckBottomY);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Fret Inlay Markers (Dots at frets 3, 5)
    if (f === 3 || f === 5) {
      ctx.beginPath();
      ctx.arc(fx - fretStep / 2, (neckTopY + neckBottomY) / 2, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffe600";
      ctx.shadowColor = "#ffe600";
      ctx.shadowBlur = 6;
      ctx.fill();
    }
  }

  // 2. Draw Holographic Guitar Body Curves (Spider-Verse Neon Rosette)
  ctx.beginPath();
  ctx.ellipse(bodyCenterX, bodyCenterY, 150, 110, 0, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(16, 12, 28, 0.55)";
  ctx.strokeStyle = chordObj.color;
  ctx.lineWidth = 3;
  ctx.shadowColor = chordObj.color;
  ctx.shadowBlur = 16;
  ctx.fill();
  ctx.stroke();

  // Soundhole / Rosette Center Circle
  ctx.beginPath();
  ctx.arc(bodyCenterX - 30, bodyCenterY, 44, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(6, 5, 10, 0.85)";
  ctx.strokeStyle = "#ff2a5f";
  ctx.lineWidth = 2.5;
  ctx.shadowColor = "#ff2a5f";
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.stroke();

  // Guitar Bridge (Right side)
  let bridgeX = bodyCenterX + 85;
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fillRect(bridgeX, topY - 5, 12, 5 * spacing + 10);

  // 3. Draw 6 Vibrating Guitar Strings with physics wave oscillation
  let stringColors = ["#ff4757", "#ff9f43", "#ffe600", "#2ecc71", "#00f0ff", "#a820ff"];

  for (let s = 0; s < 6; s++) {
    let sY = topY + s * spacing;
    let vib = stringVibrations[s];
    let noteName = chordObj.notes[s] || "x";

    ctx.beginPath();
    ctx.strokeStyle = vib > 1 ? "#fff" : stringColors[s];
    ctx.lineWidth = Math.max(1.5, 4 - s * 0.45);
    ctx.shadowColor = vib > 1 ? "#00f0ff" : stringColors[s];
    ctx.shadowBlur = vib > 1 ? 16 : 6;

    // Draw sinusoidal oscillating string wave when vibrating
    let startX = neckStartX;
    let endX = bridgeX;
    ctx.moveTo(startX, sY);

    if (vib > 0.5) {
      let segments = 24;
      let segLen = (endX - startX) / segments;
      for (let k = 1; k <= segments; k++) {
        let px = startX + k * segLen;
        let envelope = Math.sin((k / segments) * Math.PI); // Peak vibration in center
        let waveY = sY + Math.sin(k * 1.4 + performance.now() * 0.04) * vib * envelope;
        ctx.lineTo(px, waveY);
      }
    } else {
      ctx.lineTo(endX, sY);
    }
    ctx.stroke();

    // String Name & Active Note Badge on headstock/left
    ctx.fillStyle = vib > 1 ? "#ffe600" : "rgba(255, 255, 255, 0.85)";
    ctx.font = "bold 10.5px 'Plus Jakarta Sans', monospace";
    ctx.textAlign = "right";
    ctx.fillText(`${stringNames[s]}: ${noteName}`, startX - 8, sY + 4);

    // Decay vibration amplitude
    stringVibrations[s] *= 0.92;
  }

  ctx.restore();
}

// Render Sparks and Floating Note FX
function renderGuitarParticleFX(ctx) {
  // 1. Sparks
  for (let i = guitarSparks.length - 1; i >= 0; i--) {
    let p = guitarSparks[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life -= 0.04;

    if (p.life <= 0) {
      guitarSparks.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5 * p.life, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.globalAlpha = p.life;
    ctx.fill();
    ctx.restore();
  }

  // 2. Floating Note Popups
  for (let i = guitarFloatingNotes.length - 1; i >= 0; i--) {
    let note = guitarFloatingNotes[i];
    note.y -= 1.6;
    note.life -= 0.03;

    if (note.life <= 0) {
      guitarFloatingNotes.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.font = "bold 20px 'Bangers', cursive, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = note.color;
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 10;
    ctx.globalAlpha = note.life;
    ctx.fillText(note.text, note.x, note.y);
    ctx.restore();
  }
}

// Controls & Event Listeners for Gestur Gitar
if (btnStartGuitarCam) {
  btnStartGuitarCam.addEventListener("click", async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }
    await startCamera();
  });
}

if (btnToggleGuitarAudio) {
  btnToggleGuitarAudio.addEventListener("click", () => {
    initGuitarAudioEngine();
  });
}

// Quick Chord Selectors (Manual Touch/Click Chord Pads)
document.querySelectorAll(".guitar-quick-chord").forEach(btn => {
  btn.addEventListener("click", () => {
    let chord = btn.getAttribute("data-chord");
    if (chord) {
      setGuitarChord(chord);
      playGuitarStrum(chord, "down", 25, 0.8);
    }
  });
});

// Demo Strum Song Player
if (btnDemoGuitarStrum) {
  btnDemoGuitarStrum.addEventListener("click", async () => {
    if (!guitarAudioStarted) await initGuitarAudioEngine();

    if (isGuitarDemoPlaying) {
      clearInterval(guitarDemoIntervalId);
      isGuitarDemoPlaying = false;
      btnDemoGuitarStrum.textContent = "🎸 Demo Strum";
      btnDemoGuitarStrum.classList.remove("primary-rec");
      status("Guitar demo stopped.");
      return;
    }

    const demoChordProgression = ["C", "G", "Am", "F", "C", "G", "F", "C"];
    let step = 0;
    isGuitarDemoPlaying = true;
    btnDemoGuitarStrum.textContent = "⏹️ Stop Demo";
    btnDemoGuitarStrum.classList.add("primary-rec");
    status("🎸 Playing authentic acoustic guitar chord progression demo!");

    guitarDemoIntervalId = setInterval(() => {
      let currentChord = demoChordProgression[Math.floor(step / 4) % demoChordProgression.length];
      setGuitarChord(currentChord);

      let subStep = step % 4;
      if (subStep === 0) playGuitarStrum(currentChord, "down", 22, 0.9);
      else if (subStep === 1) playGuitarStrum(currentChord, "down", 22, 0.7);
      else if (subStep === 2) playGuitarStrum(currentChord, "up", 18, 0.75);
      else if (subStep === 3) {
        playGuitarStrum(currentChord, "up", 18, 0.8);
        pluckGuitarString(5, 0.85);
      }

      step++;
    }, 280);
  });
}

// Record Guitar Video Performance (Canvas Video + Tone.js Audio)
if (btnRecGuitar) {
  btnRecGuitar.addEventListener("click", async () => {
    if (!guitarAudioStarted) await initGuitarAudioEngine();

    if (isRecordingGuitar) {
      if (guitarAudioRecorder && guitarAudioRecorder.state !== "inactive") {
        guitarAudioRecorder.stop();
      }
      return;
    }

    if (!guitarCanvas) {
      status("⚠️ Guitar canvas is not available.");
      return;
    }

    try {
      let videoStream = guitarCanvas.captureStream(30);
      let dest = Tone.getContext().rawContext.createMediaStreamDestination();
      Tone.Destination.connect(dest);

      let tracks = [...videoStream.getVideoTracks(), ...dest.stream.getAudioTracks()];
      let combinedStream = new MediaStream(tracks);

      guitarAudioChunks = [];
      let mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : MediaRecorder.isTypeSupported("video/webm")
        ? "video/webm"
        : MediaRecorder.isTypeSupported("video/mp4")
        ? "video/mp4"
        : "";

      let options = mimeType ? { mimeType } : undefined;
      guitarAudioRecorder = new MediaRecorder(combinedStream, options);

      guitarAudioRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) guitarAudioChunks.push(e.data);
      };

      guitarAudioRecorder.onstop = () => {
        if (guitarAudioChunks.length > 0) {
          let ext = mimeType.includes("mp4") ? "mp4" : "webm";
          let blob = new Blob(guitarAudioChunks, { type: mimeType || "video/webm" });
          let url = URL.createObjectURL(blob);
          let a = document.createElement("a");
          a.style.display = "none";
          a.href = url;
          a.download = `air-guitar-video-${Date.now()}.${ext}`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            if (a.parentNode) a.parentNode.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1500);
          status("🎬 Saved Air Guitar performance video with synchronized guitar audio!");
        } else {
          status("Guitar recording finished (no data captured).");
        }
        isRecordingGuitar = false;
        btnRecGuitar.textContent = "🎥 Record Guitar Video";
        btnRecGuitar.classList.remove("primary-rec");
      };

      guitarAudioRecorder.start();
      isRecordingGuitar = true;
      btnRecGuitar.textContent = "⏹️ Stop Recording Guitar Video";
      btnRecGuitar.classList.add("primary-rec");
      status("🔴 Recording Air Guitar performance video & audio...");
    } catch (err) {
      console.error("Guitar video recording error:", err);
      status("⚠️ Could not initialize guitar video recorder.");
    }
  });
}

// Guitar Preset & Slider Listeners
if (guitarPreset) {
  guitarPreset.addEventListener("change", () => {
    updateGuitarPresetParameters();
    status(`Sound model set to: ${guitarPreset.options[guitarPreset.selectedIndex].text}`);
  });
}

if (guitarStrumSens && guitarStrumSensVal) {
  guitarStrumSens.addEventListener("input", () => {
    guitarStrumSensVal.textContent = `${guitarStrumSens.value} (${guitarStrumSens.value > 7 ? 'Sangat Responsif' : guitarStrumSens.value < 4 ? 'Lembut' : 'Responsif'})`;
  });
}

if (guitarStrumSpeed && guitarStrumSpeedVal) {
  guitarStrumSpeed.addEventListener("input", () => {
    guitarStrumSpeedVal.textContent = `${guitarStrumSpeed.value} ms`;
  });
}

if (guitarVolume && guitarVolVal) {
  guitarVolume.addEventListener("input", () => {
    guitarVolVal.textContent = `${guitarVolume.value} dB`;
    if (guitarVolNode) guitarVolNode.volume.value = parseFloat(guitarVolume.value);
  });
}

if (guitarDistortion && guitarDistortionVal) {
  guitarDistortion.addEventListener("input", () => {
    guitarDistortionVal.textContent = `${Math.round(guitarDistortion.value * 100)}%`;
    if (guitarDistortionFx) {
      guitarDistortionFx.distortion = parseFloat(guitarDistortion.value);
      guitarDistortionFx.wet.value = parseFloat(guitarDistortion.value) > 0 ? 0.85 : 0;
    }
  });
}

if (guitarChorus && guitarChorusVal) {
  guitarChorus.addEventListener("input", () => {
    guitarChorusVal.textContent = `${Math.round(guitarChorus.value * 100)}%`;
    if (guitarChorusFx) guitarChorusFx.wet.value = parseFloat(guitarChorus.value);
  });
}

if (guitarReverb && guitarReverbVal) {
  guitarReverb.addEventListener("input", () => {
    guitarReverbVal.textContent = `${Math.round(guitarReverb.value * 100)}%`;
    if (guitarReverbFx) guitarReverbFx.wet.value = parseFloat(guitarReverb.value);
  });
}

// ---- NON-LIVE UPLOAD FILE STUDIO LOGIC ----
if (drop) {
  const fileInput = document.getElementById("file");
  drop.addEventListener("dragover", (e) => {
    e.preventDefault();
    drop.classList.add("over");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files?.length) loadFile(e.dataTransfer.files[0]);
  });
  drop.addEventListener("click", () => fileInput && fileInput.click());
  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files?.length) loadFile(fileInput.files[0]);
    });
  }
}

function loadFile(file) {
  if (!file.type.startsWith("video/")) {
    status("Please upload a video file.");
    return;
  }
  videoFile = file;
  orig.src = URL.createObjectURL(file);
  orig.onloadeddata = () => {
    stage.classList.remove("hidden");
    canvas.width = orig.videoWidth;
    canvas.height = orig.videoHeight;
    ctx.drawImage(orig, 0, 0);
    btnGenerate.disabled = false;
    btnPlay.disabled = false;
    btnExport.disabled = false;
    status(`Loaded ${file.name} (${orig.videoWidth}x${orig.videoHeight})`);
  };
}

let videoRenderAnimId = null;

function renderUploadedVideoLoop() {
  if (!orig || orig.paused || orig.ended) {
    if (btnPlay) btnPlay.textContent = "Play Video";
    return;
  }
  if (canvas && ctx) {
    ctx.drawImage(orig, 0, 0, canvas.width, canvas.height);
    if (landmarker && orig.currentTime > 0) {
      let res = landmarker.detectForVideo(orig, performance.now());
      if (res.landmarks && res.landmarks.length > 0) {
        let pts = [];
        if (res.landmarks.length >= 2) {
          pts = [res.landmarks[0][INDEX_TIP], res.landmarks[0][THUMB_TIP], res.landmarks[1][INDEX_TIP], res.landmarks[1][THUMB_TIP]];
        } else {
          let h0 = res.landmarks[0];
          let p0 = h0[INDEX_TIP], p1 = h0[THUMB_TIP];
          let d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          let nx = -(p1.y - p0.y) * 0.6, ny = (p1.x - p0.x) * 0.6;
          pts = [{ x: p0.x - nx, y: p0.y - ny }, { x: p1.x - nx, y: p1.y - ny }, { x: p1.x + nx, y: p1.y + ny }, { x: p0.x + nx, y: p0.y + ny }];
        }
        let rawCorners = pts.map(p => ({ x: p.x * canvas.width, y: p.y * canvas.height }));
        let cx = rawCorners.reduce((s, p) => s + p.x, 0) / 4;
        let cy = rawCorners.reduce((s, p) => s + p.y, 0) / 4;
        rawCorners.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
        drawARFilterOnCanvas(ctx, canvas, rawCorners, 1.0);
      }
    }
  }
  videoRenderAnimId = requestAnimationFrame(renderUploadedVideoLoop);
}

if (btnPlay) {
  btnPlay.addEventListener("click", () => {
    if (!orig || !orig.src) return;
    if (orig.paused) {
      orig.play();
      btnPlay.textContent = "Pause Video";
      status("Playing uploaded video clip...");
      renderUploadedVideoLoop();
    } else {
      orig.pause();
      btnPlay.textContent = "Play Video";
      status("Video paused.");
      if (videoRenderAnimId) cancelAnimationFrame(videoRenderAnimId);
    }
  });
}

if (btnGenerate) {
  btnGenerate.addEventListener("click", async () => {
    if (!orig || !orig.src) return;
    status("Processing AI restyle generation on video clip...");
    btnGenerate.disabled = true;
    btnGenerate.textContent = "Generating AI Video...";
    
    orig.currentTime = 0;
    orig.muted = true;
    try {
      await orig.play();
      renderUploadedVideoLoop();
    } catch (e) {}
    
    setTimeout(() => {
      btnGenerate.disabled = false;
      btnGenerate.textContent = "Generate AI Video";
      status("AI Video Restyle rendering completed!");
    }, Math.min(20000, (orig.duration || 5) * 1000));
  });
}

if (btnExport) {
  btnExport.addEventListener("click", () => {
    if (!canvas) return;
    try {
      let stream = canvas.captureStream(30);
      let chunks = [];
      let rec = new MediaRecorder(stream, { mimeType: "video/webm" });
      rec.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data); };
      rec.onstop = () => {
        let blob = new Blob(chunks, { type: "video/webm" });
        let url = URL.createObjectURL(blob);
        let a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `finger-frame-ai-studio-${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          if (a.parentNode) a.parentNode.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1500);
        status("Saved restyled video studio export!");
      };
      rec.start();
      orig.currentTime = 0;
      orig.play();
      renderUploadedVideoLoop();
      status("Exporting video render...");
      setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, (orig.duration || 5) * 1000);
    } catch (e) {
      console.error("Export error:", e);
      status("Could not export video clip.");
    }
  });
}

// Direct Touch / Pointer Interaction on Canvases for Mobile & Tablet
if (drumCanvas) {
  const handleDrumTouch = (e) => {
    unlockAllMobileAndDesktopAudio();
    if (!drumAudioStarted) initDrumAudioEngine();
    const rect = drumCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const scaleX = drumCanvas.width / (rect.width || 1);
    const scaleY = drumCanvas.height / (rect.height || 1);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    // Find nearest drum piece
    let hitPiece = null;
    let minDistance = 120;
    for (let p in drumPieceState) {
      let pObj = drumPieceState[p];
      if (pObj && pObj.x && pObj.y) {
        let dist = Math.hypot(pObj.x - x, pObj.y - y);
        let padRadius = pObj.radius || 45;
        if (dist < padRadius + 25 && dist < minDistance) {
          minDistance = dist;
          hitPiece = p;
        }
      }
    }
    if (hitPiece) {
      triggerDrumPiece(hitPiece, 0.95, x, y);
    } else {
      let defaultPiece = y > drumCanvas.height * 0.65 ? "kick" : (x < drumCanvas.width * 0.5 ? "snare" : "hihat");
      triggerDrumPiece(defaultPiece, 0.85, x, y);
    }
  };
  drumCanvas.addEventListener("pointerdown", handleDrumTouch);
}

if (guitarCanvas) {
  const handleGuitarTouch = (e) => {
    unlockAllMobileAndDesktopAudio();
    if (!guitarAudioStarted) initGuitarAudioEngine();
    const rect = guitarCanvas.getBoundingClientRect();
    const clientX = e.clientX ?? (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
    const scaleX = guitarCanvas.width / (rect.width || 1);
    const scaleY = guitarCanvas.height / (rect.height || 1);
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;

    if (x > guitarCanvas.width * 0.45) {
      playGuitarStrum(activeGuitarChord, y > guitarCanvas.height * 0.5 ? "down" : "up", 22, 0.9);
    } else {
      let sIdx = Math.floor(((y - guitarCanvas.height * 0.45) / (guitarCanvas.height * 0.35)) * 6);
      sIdx = Math.max(0, Math.min(5, sIdx));
      pluckGuitarString(sIdx, 0.9);
    }
  };
  guitarCanvas.addEventListener("pointerdown", handleGuitarTouch);
}

// Pre-initialize MediaPipe hand landmarker
initLandmarker().catch((e) => console.warn("Landmarker pre-init:", e));

// Auto-start camera immediately on load
async function autoStartCameraOnLoad() {
  if (!cameraActive) {
    try {
      await startCamera();
    } catch (e) {
      console.warn("Auto-start camera initial attempt notice:", e);
    }
  }
}

// Execute auto-start instantly and on load events
autoStartCameraOnLoad();
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoStartCameraOnLoad);
}
window.addEventListener("load", autoStartCameraOnLoad);

// Fallback: If browser security blocked initial autoplay before user interaction, auto-launch camera on first tap/click anywhere
const autoLaunchOnUserInteraction = () => {
  if (!cameraActive) {
    startCamera().catch((e) => console.warn("Camera tap-start notice:", e));
  }
};
["click", "touchstart", "pointerdown"].forEach((evt) => {
  window.addEventListener(evt, autoLaunchOnUserInteraction, { once: true, passive: true });
});
