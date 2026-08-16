import "./style.css";

import * as THREE from "three";

import { Line2 } from "three/addons/lines/Line2.js";
import { LineGeometry } from "three/addons/lines/LineGeometry.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";

import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { AfterimagePass } from "three/addons/postprocessing/AfterimagePass.js";

let currentSongIndex = 0;
const BASE = import.meta.env.BASE_URL;
const songs = [
  {
    title: "Stay Wilding",
    artist: "annasalty",
    file: `${BASE}music/stay-wilding.mp3`
  },

  {
    title: "In Light of Emotions",
    artist: "annasalty",
    file: `${BASE}music/in-light-of-emotions.mp3`
  },

  {
    title: "Moo",
    artist: "annasalty",
    file: `${BASE}music/Moo.mp3`
  },

  {
    title: "Cloud Walk",
    artist: "annasalty",
    file: `${BASE}music/cloud-walk.mp3`
  },

  {
    title: "gtr",
    artist: "annasalty",
    file: `${BASE}music/gtr.mp3`
  },

  {
    title: "L.A. 2",
    artist: "annasalty",
    file: `${BASE}music/LA2.mp3`
  },
];


/* =========================================================
   UTILITIES
========================================================= */

const TAU = Math.PI * 2;

function random(min, max) {
  return min + Math.random() * (max - min);
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0, edge1, value) {
  const x = clamp01(
    (value - edge0) /
    Math.max(0.0001, edge1 - edge0)
  );

  return x * x * (3 - 2 * x);
}


/* =========================================================
   DOM
========================================================= */

const audio = document.querySelector("#audio");
const playButton = document.querySelector("#playButton");
const menuButton =
  document.querySelector("#menuButton");

const songList =
  document.querySelector("#songList");
const timeline = document.querySelector("#timeline");
const progress = document.querySelector("#progress");
const timeDisplay = document.querySelector("#timeDisplay");


/* =========================================================
   THREE.JS SCENE
========================================================= */

const scene = new THREE.Scene();

scene.background = new THREE.Color(0x000000);


const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);

camera.position.set(0, 0, 10);


/* =========================================================
   RENDERER
========================================================= */

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(
  Math.min(window.devicePixelRatio, 2)
);

renderer.setSize(
  window.innerWidth,
  window.innerHeight
);

renderer.setClearColor(0x000000, 1);

renderer.outputColorSpace = THREE.SRGBColorSpace;

document.body.appendChild(renderer.domElement);


/* =========================================================
   POST PROCESSING

   We are deliberately NOT using bloom.
========================================================= */

const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(
  scene,
  camera
);

composer.addPass(renderPass);


/*
  Motion trails.

  Higher damp = trails remain visible longer.
*/

const afterimagePass = new AfterimagePass(0.89);

composer.addPass(afterimagePass);



/* =========================================================
   FIBER GROUP
========================================================= */

const fiberGroup = new THREE.Group();

scene.add(fiberGroup);


/*
  Number of individual fiber strands.

  Lower this if performance becomes an issue.
*/

const FIBER_COUNT = 24;


/*
  More points = smoother curves.

  150 is enough to create very smooth waves without
  becoming completely unreasonable.
*/

const POINTS_PER_FIBER = 150;

const fibers = [];

const guideMaterials = [];
const TRUNK_X_POSITIONS = [-1.6, 1.6];

function createGuideLine(yPosition) {
  const geometry = new LineGeometry();

  geometry.setPositions([
    -20, yPosition, 0,
     20, yPosition, 0
  ]);

  const material = new LineMaterial({
    color: 0x222222,
    linewidth: 2.2,
    transparent: true,
    opacity: 0.45,
    depthTest: false,
    depthWrite: false
  });

  material.resolution.set(window.innerWidth, window.innerHeight);

  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = 0;

  scene.add(line);
  guideMaterials.push(material);
}

TRUNK_X_POSITIONS.forEach(createGuideLine);


for (let i = 0; i < FIBER_COUNT; i++) {
  const positions = new Float32Array(POINTS_PER_FIBER * 3);

  const geometry = new LineGeometry();
  geometry.setPositions(positions);

  const material = new LineMaterial({
    color: 0xffffff,
    linewidth: random(0.25, 0.55),
    transparent: true,
    opacity: random(0.55, 0.9),
    blending: THREE.AdditiveBlending,
    depthTest: false,
    depthWrite: false
  });

  material.resolution.set(window.innerWidth, window.innerHeight);

  const line = new Line2(geometry, material);
  line.frustumCulled = false;
  line.renderOrder = 2;

  const trunkX = TRUNK_X_POSITIONS[i % 2];

  // Most fibers bend outward away from center,
  // but some bend inward for variation.
  const outwardDirection = trunkX < 0 ? -1 : 1;
  const branchDirection =
    Math.random() < 0.8
      ? outwardDirection
      : -outwardDirection;

  fibers.push({
    line,
    geometry,
    material,
    positions,

    trunkX,
    branchDirection,

    branchAmplitude: random(0.25, 0.85),
    depthAmplitude: random(0.12, 0.75),

    phase: random(0, TAU),
    waveFrequency: random(0.8, 1.35),
    waveSpeed: random(0.65, 1.2),
    waveDirection: Math.random() > 0.5 ? 1 : -1,

    branchTightness: random(0.9, 1.35),

    hueOffset:
      i / FIBER_COUNT + random(-0.06, 0.06),

    baseWidth: random(0.25, 0.55)
  });

  fiberGroup.add(line);
}


/* =========================================================
   ATMOSPHERIC PARTICLES
========================================================= */

const PARTICLE_COUNT = 170;

const particlePositions =
  new Float32Array(
    PARTICLE_COUNT * 3
  );

const particleVelocities =
  new Float32Array(
    PARTICLE_COUNT * 3
  );

const particlePhases =
  new Float32Array(
    PARTICLE_COUNT
  );


for (let i = 0; i < PARTICLE_COUNT; i++) {

  const index = i * 3;

  particlePositions[index] =
    random(-8, 8);

  particlePositions[index + 1] =
    random(-4.5, 4.5);

  particlePositions[index + 2] =
    random(-2.5, 1);


  particleVelocities[index] =
    random(0.04, 0.13);

  particleVelocities[index + 1] =
    random(-0.02, 0.02);

  particleVelocities[index + 2] =
    random(-0.01, 0.01);


  particlePhases[i] =
    random(0, TAU);
}


const particleGeometry =
  new THREE.BufferGeometry();

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(
    particlePositions,
    3
  )
);


const particleMaterial =
  new THREE.PointsMaterial({
    color: 0xffffff,

    size: 0.025,

    transparent: true,
    opacity: 0.18,

    blending: THREE.AdditiveBlending,

    depthWrite: false,

    sizeAttenuation: true
  });


const particles =
  new THREE.Points(
    particleGeometry,
    particleMaterial
  );

particles.renderOrder = 1;

scene.add(particles);


/* =========================================================
   AUDIO
========================================================= */

let audioContext = null;
let analyser = null;
let sourceNode = null;
let frequencyData = null;


/*
  Smoothed frequency values.

  All are normalized approximately from 0–1.
*/

let bass = 0;
let mids = 0;
let highs = 0;


/*
  Beat pulse rises instantly when a beat is
  detected and then falls back toward zero.
*/

let beatPulse = 0;


/*
  Used for detecting unusually strong bass
  compared with recent bass levels.
*/

const bassHistory =
  new Array(32).fill(0.05);

let bassHistoryIndex = 0;

let lastBeatTime = -1000;


/* =========================================================
   INITIALIZE WEB AUDIO
========================================================= */

async function initializeAudio() {

  if (!audioContext) {

    const AudioContextClass =
      window.AudioContext ||
      window.webkitAudioContext;


    audioContext =
      new AudioContextClass();


    analyser =
      audioContext.createAnalyser();


    analyser.fftSize = 2048;

    analyser.smoothingTimeConstant = 0.72;


    frequencyData =
      new Uint8Array(
        analyser.frequencyBinCount
      );


    sourceNode =
      audioContext
        .createMediaElementSource(audio);


    sourceNode.connect(analyser);

    analyser.connect(
      audioContext.destination
    );
  }


  if (
    audioContext.state ===
    "suspended"
  ) {

    await audioContext.resume();
  }
}


/* =========================================================
   FREQUENCY BAND
========================================================= */

function getFrequencyBand(
  minimumFrequency,
  maximumFrequency
) {

  if (
    !analyser ||
    !frequencyData ||
    !audioContext
  ) {

    return 0;
  }


  const nyquist =
    audioContext.sampleRate / 2;


  const startIndex =
    Math.max(
      0,
      Math.floor(
        minimumFrequency /
        nyquist *
        frequencyData.length
      )
    );


  const endIndex =
    Math.min(
      frequencyData.length - 1,
      Math.ceil(
        maximumFrequency /
        nyquist *
        frequencyData.length
      )
    );


  let total = 0;
  let count = 0;


  for (
    let i = startIndex;
    i <= endIndex;
    i++
  ) {

    total += frequencyData[i];

    count++;
  }


  if (count === 0) {
    return 0;
  }


  return (
    total /
    count /
    255
  );
}


/* =========================================================
   BEAT
========================================================= */

function triggerBeat(intensity) {
  beatPulse = Math.min(
    0.85,
    0.25 + intensity * 1.2
  );
}


/* =========================================================
   AUDIO ANALYSIS
========================================================= */

function updateAudio(deltaTime) {

  let targetBass = 0;
  let targetMids = 0;
  let targetHighs = 0;


  if (
    analyser &&
    frequencyData &&
    !audio.paused
  ) {

    analyser.getByteFrequencyData(
      frequencyData
    );


    /*
      LOW FREQUENCIES

      Kick / bass.
    */

    targetBass =
      getFrequencyBand(
        30,
        170
      );


    /*
      MID FREQUENCIES

      Melodies, vocals, synth body, etc.
    */

    targetMids =
      getFrequencyBand(
        180,
        2200
      );


    /*
      HIGH FREQUENCIES

      Hats, sharp percussion, bright details.
    */

    targetHighs =
      getFrequencyBand(
        4200,
        14000
      );


    /* ----------------------------------
       BEAT DETECTION
    ---------------------------------- */

    const historyAverage =
      bassHistory.reduce(
        (sum, value) =>
          sum + value,
        0
      ) /
      bassHistory.length;


    bassHistory[
      bassHistoryIndex
    ] = targetBass;


    bassHistoryIndex =
      (
        bassHistoryIndex + 1
      ) %
      bassHistory.length;


    const now =
      performance.now();


    const dynamicThreshold =
      Math.max(
        0.24,
        historyAverage * 1.34
      );


    if (
      targetBass >
        dynamicThreshold &&

      targetBass >
        bass * 1.08 &&

      now -
        lastBeatTime >
        145
    ) {

      triggerBeat(
        targetBass
      );

      lastBeatTime = now;
    }
  }


  /* ----------------------------------
     SMOOTH FREQUENCY VALUES
  ---------------------------------- */

  bass =
    THREE.MathUtils.lerp(
      bass,
      targetBass,
      0.18
    );


  mids =
    THREE.MathUtils.lerp(
      mids,
      targetMids,
      0.13
    );


  highs =
    THREE.MathUtils.lerp(
      highs,
      targetHighs,
      0.2
    );


  /* ----------------------------------
     DECAY BEAT IMPACT
  ---------------------------------- */

  beatPulse =
    Math.max(
      0,
      beatPulse -
        deltaTime * 3.4
    );
}

function getVisibleWidthAtZ0() {
  const distance = camera.position.z;

  const visibleHeight =
    2 *
    Math.tan(
      THREE.MathUtils.degToRad(camera.fov / 2)
    ) *
    distance;

  return visibleHeight * camera.aspect;
}

/* =========================================================
   UPDATE FIBERS
========================================================= */

function updateFibers(time) {
  const bassForce = bass * bass;
  const impact = Math.max(bassForce, beatPulse);

  /*
    Keep the camera stationary, but let the
    fiber bundle shake a bit on strong beats.
  */

  const shakeAmount =
    beatPulse * 0.06 +
    bassForce * 0.02;

  fiberGroup.position.x = random(-shakeAmount, shakeAmount);
  fiberGroup.position.y = random(-shakeAmount, shakeAmount);
  fiberGroup.rotation.z = Math.PI / 2 +
  random(-shakeAmount, shakeAmount) * 0.01;

  for (let fiberIndex = 0; fiberIndex < fibers.length; fiberIndex++) {
    const fiber = fibers[fiberIndex];
    const positions = fiber.positions;

    for (let i = 0; i < POINTS_PER_FIBER; i++) {
      const p = i / (POINTS_PER_FIBER - 1);

      /*
        The strand runs vertically from bottom to top.
      */

      const visibleWidth = getVisibleWidthAtZ0();

      const fiberLength = visibleWidth + 1.5;

      let y =
        -fiberLength / 2 +
        p * fiberLength;

      /*
        This makes the fiber leave the trunk in the middle
        and return back to the trunk at both ends.
      */

      const envelope = Math.sin(p * Math.PI);
      const branchEnvelope = Math.pow(envelope, fiber.branchTightness);

      /*
        Very gentle idle motion.
      */

      const idleWave =
        Math.sin(
          p * TAU * fiber.waveFrequency +
          time * 0.35 +
          fiber.phase
        ) * 0.035;

      /*
        Main smooth wave.
      */

      const mainWave =
        Math.sin(
          p * TAU * (0.95 + fiber.waveFrequency) +
          time * fiber.waveSpeed * fiber.waveDirection * (0.7 + bassForce * 3.4) +
          fiber.phase
        );

      /*
        Secondary wave only becomes more visible on heavy bass.
        This is what reduces smoothness during intense moments
        without making the lines jagged.
      */

      const detailWave =
        Math.sin(
          p * TAU * (1.5 + bassForce * 2.2) -
          time * (0.7 + bassForce * 1.8) +
          fiber.phase * 1.5
        );

      /*
        This is the outward branching amount.
        Because branchEnvelope is zero at both ends,
        the strand returns to the original vertical line.
      */

      const branchReach =
        fiber.branchAmplitude *
        branchEnvelope *
        (0.18 + impact * 0.38);

      let x = fiber.trunkX;

      x += fiber.branchDirection * branchReach;

      x +=
        mainWave *
        (0.025 + bassForce * 0.09 + beatPulse * 0.04) *
        branchEnvelope;

      x +=
        detailWave *
        bassForce *
        bassForce *
        0.42 *
        branchEnvelope;

      x +=
        Math.sin(time * 0.55 + fiber.phase) *
        0.04 *
        branchEnvelope;

      /*
        Keep a little depth so the piece still feels 3D.
      */

      let z =
        Math.cos(
          p * TAU * (1.1 + fiber.waveFrequency * 0.6) -
          time * 0.9 +
          fiber.phase
        ) *
        fiber.depthAmplitude *
        branchEnvelope *
        (0.3 + mids * 1.0 + highs * 0.25);

      z +=
        detailWave *
        bassForce *
        0.055 *
        branchEnvelope;

      /*
        Slight vertical ripple so the line itself feels alive.
      */

      y += idleWave * envelope;
      y +=
        Math.sin(
          p * TAU * 0.7 +
          time * 0.45 +
          fiber.phase
        ) *
        0.05 *
        envelope;

      const index = i * 3;
      positions[index] = x;
      positions[index + 1] = y;
      positions[index + 2] = z;
    }

    fiber.geometry.setPositions(positions);

    /*
      Color behavior stays dynamic.
    */

    const hue =
      (time * 0.035 + fiber.hueOffset + mids * 0.08) % 1;

    const lightness =
      Math.min(
        0.76,
        0.48 + highs * 0.3 + beatPulse * 0.06
      );

    fiber.material.color.setHSL(
      hue,
      0.94,
      lightness
    );

    fiber.material.opacity =
      Math.min(
        1,
        0.52 + highs * 0.4 + bass * 0.14
      );

    fiber.material.linewidth =
      fiber.baseWidth *
      (1 + highs * 0.65 + beatPulse * 0.18);
  }
}


/* =========================================================
   UPDATE PARTICLES
========================================================= */

function updateParticles(
  time,
  deltaTime
) {

  for (
    let i = 0;
    i < PARTICLE_COUNT;
    i++
  ) {

    const index =
      i * 3;


    /*
      Particles always drift, even when the
      music is paused.
    */

    const movementMultiplier =
      1 +
      mids * 6;


    particlePositions[index] +=
      particleVelocities[index] *
      deltaTime *
      movementMultiplier;


    particlePositions[
      index + 1
    ] +=
      Math.sin(
        time * 0.4 +
        particlePhases[i]
      ) *
      deltaTime *
      0.025 *
      (
        1 +
        mids * 5
      );


    /*
      Wrap particles around the screen.
    */

    if (
      particlePositions[index] >
      8
    ) {

      particlePositions[index] =
        -8;
    }


    if (
      particlePositions[index + 1] >
      4.8
    ) {

      particlePositions[index + 1] =
        -4.8;
    }


    if (
      particlePositions[index + 1] <
      -4.8
    ) {

      particlePositions[index + 1] =
        4.8;
    }
  }


  particleGeometry.attributes.position.needsUpdate =
    true;


  /*
    Mids energize the particle field.

    Highs create the sparkling effect.
  */

  particleMaterial.opacity =
    Math.min(
      0.75,
      0.12 +
      mids * 0.27 +
      highs * 0.52
    );


  particleMaterial.size =
    0.018 +
    highs * 0.055;
}
/* =========================================================
   PLAYER
========================================================= */

async function togglePlayback() {

  await initializeAudio();


  if (audio.paused) {

    try {

      await audio.play();

    } catch (error) {

      console.error(
        "Unable to play audio:",
        error
      );
    }

  } else {

    audio.pause();
  }
}


playButton.addEventListener(
  "click",
  togglePlayback
);


audio.addEventListener(
  "play",
  () => {

    playButton.textContent = "Ⅱ";

    playButton.setAttribute(
      "aria-label",
      "Pause"
    );
  }
);


audio.addEventListener(
  "pause",
  () => {

    playButton.textContent = "▶";

    playButton.setAttribute(
      "aria-label",
      "Play"
    );
  }
);


audio.addEventListener(
  "ended",
  () => {

    playButton.textContent = "▶";
  }
);


/* =========================================================
   SEEKING
========================================================= */

timeline.addEventListener(
  "pointerdown",
  (event) => {

    if (
      !Number.isFinite(
        audio.duration
      )
    ) {

      return;
    }


    const bounds =
      timeline.getBoundingClientRect();


    const percentage =
      clamp01(
        (
          event.clientX -
          bounds.left
        ) /
        bounds.width
      );


    audio.currentTime =
      percentage *
      audio.duration;
  }
);


/* =========================================================
   TIME DISPLAY
========================================================= */

function formatTime(seconds) {

  if (
    !Number.isFinite(seconds)
  ) {

    return "0:00";
  }


  const minutes =
    Math.floor(
      seconds / 60
    );


  const remainingSeconds =
    Math.floor(
      seconds % 60
    );


  return (
    `${minutes}:` +
    `${remainingSeconds}`
      .padStart(
        2,
        "0"
      )
  );
}


function updatePlayerUI() {

  const duration =
    Number.isFinite(
      audio.duration
    )
      ? audio.duration
      : 0;


  const percentage =
    duration > 0
      ? audio.currentTime /
        duration
      : 0;


  progress.style.transform =
    `translateY(-50%) scaleX(${percentage})`;


  timeDisplay.textContent =
    `${formatTime(audio.currentTime)} / ${formatTime(duration)}`;
}


/* =========================================================
   SPACEBAR
========================================================= */

window.addEventListener(
  "keydown",
  (event) => {

    if (
      event.code === "Space" &&
      event.target === document.body
    ) {

      event.preventDefault();

      togglePlayback();
    }
  }
);


/* =========================================================
   RESIZE
========================================================= */

function handleResize() {

  const width =
    window.innerWidth;

  const height =
    window.innerHeight;

  const pixelRatio =
    Math.min(
      window.devicePixelRatio,
      2
    );

  camera.aspect =
    width / height;

  camera.updateProjectionMatrix();


  renderer.setPixelRatio(
    pixelRatio
  );

  renderer.setSize(
    width,
    height
  );


  if (
    typeof composer.setPixelRatio ===
    "function"
  ) {

    composer.setPixelRatio(
      pixelRatio
    );
  }


  composer.setSize(
    width,
    height
  );


  for (
    const fiber of fibers
  ) {

    fiber.material.resolution.set(
      width,
      height
    );
  }

  for (const material of guideMaterials) {
  material.resolution.set(width, height);
}
}


window.addEventListener(
  "resize",
  handleResize
);


/* =========================================================
   ANIMATION
========================================================= */

const clock =
  new THREE.Clock();


function animate() {

  requestAnimationFrame(
    animate
  );


  const deltaTime =
    Math.min(
      clock.getDelta(),
      0.05
    );


  const time =
    clock.elapsedTime;


  updateAudio(
    deltaTime
  );


  updateFibers(
    time
  );


  updateParticles(
    time,
    deltaTime
  );

  updatePlayerUI();


  /*
    Slightly stronger trails when the music
    becomes more intense.
  */

  if (
    afterimagePass.uniforms?.damp
  ) {

    afterimagePass.uniforms.damp.value =
      Math.min(
        0.94,
        0.875 +
        bass * 0.035 +
        mids * 0.018
      );
  }


  composer.render();
}
async function loadSong(index, autoPlay = false) {
  currentSongIndex = index;

  const song = songs[currentSongIndex];

  // Stop current track
  audio.pause();

  // Load new track
  audio.src = song.file;
  audio.currentTime = 0;
  audio.load();

  // Reset player
  progress.style.transform =
    "translateY(-50%) scaleX(0)";

  timeDisplay.textContent =
    "0:00 / 0:00";

  menuButton.textContent =
    song.title;

  console.log("Loading song:", song.file);

  // If the song was selected by the user,
  // immediately initialize Web Audio and play it.
  if (autoPlay) {
    try {
      await initializeAudio();

      await audio.play();

      console.log(
        "Now playing:",
        song.title
      );
    } catch (error) {
      console.error(
        "Could not play song:",
        error
      );
    }
  }
}
function createSongMenu() {

  songList.innerHTML = "";


  songs.forEach(
    (song, index) => {

      const button =
        document.createElement(
          "button"
        );


      button.className =
        "song-item";


      button.innerHTML = `
        <span class="song-title">
          ${song.title}
        </span>

        <span class="song-artist">
          ${song.artist}
        </span>
      `;


      button.addEventListener(
  "click",
  async () => {
    await loadSong(
      index,
      true
    );

    songList.classList.remove(
      "open"
    );
  }
);



      songList.appendChild(
        button
      );
    }
  );
}
menuButton.addEventListener(
  "click",
  () => {

    songList.classList.toggle(
      "open"
    );
  }
);

audio.addEventListener(
  "error",
  () => {
    console.error(
      "AUDIO FILE ERROR:",
      audio.src,
      audio.error
    );
  }
);

createSongMenu();

loadSong(0);

handleResize();

animate();
