let canvas, adapter, device, context, format;
let computePipeline, computePipeline1, computePipeline2, renderPipeline;
let particlesBuffer,
  colorBuffer,
  uniformBuffer, //u_aspect
  uniformBuffer1, //particlesCount
  indexBuffer,
  indexData,
  vertexBuffer,
  vertices,
  circleResolution,
  circleVertices,
  vertexCount,
  circleVertexCount;
let computeBindGroup, renderBindGroup;
let aspectRatio;

let particlesCount,
  particleSize, //valeurs moyenne µ
  particleSpeed, //valeur moyenne µ
  particleColor,
  particlesPositions,
  particlesSizes,
  particlesSpeeds,
  particlesColors,
  particlesDatas;
//je laisse les sliders à valeur par defaut entre 0 et 100 step 1 et je regle ici
const particlesCountMin = 2;
const particlesCountMax = 1000;
const particlesSpeedMin = 0.00005;
const particlesSpeedMax = 0.0005;
const ecartTypeSpeed = 0.0; // √variance
const particlesSizeMin = 0.01;
const particlesSizeMax = 0.3;
const ecartTypeSize = 0.0; // √variance

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  canvas = document.querySelector("#gpuCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspectRatio = canvas.width / canvas.height;
  // console.log("Aspect Ratio:", aspectRatio);
  adapter = await navigator.gpu.requestAdapter();
  device = await adapter.requestDevice();

  context = canvas.getContext("webgpu");
  format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  // lecture des valeurs initiales  des sliders
  [particlesCount, particleSpeed, particleSize, particleColor] = readSlider();
  /*   console.log(
    "Initial values from sliders:",
    "count:",
    particlesCount,
    "speed:",
    particleSpeed,
    "size:",
    particleSize,
    "color:",
    particleColor
  ); */
  particlesCount = generateParticlesCount(particlesCount);
  console.log("particlesCount", particlesCount);
  particlesPositions = new Float32Array(particlesCount * 2); // 2 coordonnées (x, y) par particle
  particlesPositions = generateParticlesUniquePositions(particlesCount, 0.1);
  //console.log("particlesPositions", particlesPositions); // ✅ Vérification
  // Génération des vitesses des particles
  particlesSpeeds = new Float32Array(particlesCount * 2); // 2 coordonnées (vx, vy) par particle
  particlesSpeeds = generateParticlesSpeed(particleSpeed, ecartTypeSpeed);
  //console.log("particlesSpeeds", particlesSpeeds); // ✅ Vérification
  // Génération des tailles des particles
  particlesSizes = new Float32Array(particlesCount); // 1 taille (size) par particle
  particlesSizes = generateParticlesSize(particlesCount, particleSize);
  //console.log("particlesSizes", particlesSizes); // ✅ Vérification
  particlesDatas = new Float32Array(particlesCount * 6); // ✅ 6 valeurs par particule
  // ✅ Fusion des données dans particlesDatas
  for (let i = 0; i < particlesCount; i++) {
    let index = i * 6; // ✅ Chaque particule a 6 valeurs
    particlesDatas[index] = particlesPositions[i][0]; // ✅ Récupère X correctement
    particlesDatas[index + 1] = particlesPositions[i][1]; // ✅ Récupère Y correctement
    particlesDatas[index + 2] = particlesSizes[i]; // ✅ SIZE
    particlesDatas[index + 3] = 0.0; // ✅ _PAD pour alignement memoire gpu
    particlesDatas[index + 4] = particlesSpeeds[i][0]; // ✅ VX
    particlesDatas[index + 5] = particlesSpeeds[i][1]; // ✅ VY
    //particlesDatas[index + 6] = 0.0; // padding (optionnel mais propre)
    //particlesDatas[index + 7] = 0.0; // padding (optionnel mais propre)
  }
  // console.log("particlesDatas", particlesDatas); // 🚀 Vérification que les données sont bien fusionnées
  //console.log("particlesDatasbytelength", particlesDatas.byteLength);

  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    //size: particlesCount * 8 * 4, // 8 floats × 4 bytes = 32 octets par particule
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });

  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");

  // device.queue.writeBuffer(particlesBuffer, 0, particlesDatas);
  //console.log("particlesBuffer:", particlesBuffer);
  //console.log("Buffer rempli et prêt :", particlesDatas);
  //console.log("🔎 État du buffer après création:", particlesBuffer.mapState);

  const correctionDatas = new Float32Array(4 * particlesCount); // Par défaut, Float32Array est déjà rempli de 0.0
  correctionDatas.fill(0.0); // Mais tu peux le faire explicitement si besoin :
  const correctionBuffer = device.createBuffer({
    size: correctionDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  //device.queue.writeBuffer(correctionBuffer, 0, correctionDatas);
  writeToBuffer(correctionBuffer, correctionDatas, "correctionBuffer");

  // Création du buffer de couleur
  /*   particlesColors = new Float32Array(4); // 4 valeurs pour la couleur (RGBA)
  particleColor = "red"; // ✅ Couleur rouge par défaut
  particlesColors =
    particleColor === "red"
      ? new Float32Array([1.0, 0.6, 0.6, 1.0]) // ✅ Rouge
      : new Float32Array([0.0, 1.0, 0.0, 1.0]); // ✅ Valeur par défaut (vert) */

  particlesColors = convertColor(particleColor);

  colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT, // 4 valeurs pour la couleur (RGBA)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  writeToBuffer(colorBuffer, particlesColors, "colorBuffer");

  //device.queue.writeBuffer(colorBuffer, 0, particlesColors); // Mise à jour du buffer avec la couleur
  // console.log("colorBuffer:", colorBuffer);

  // Création du buffer d'aspect ratio = canvas.width / canvas.height;
  uniformBuffer = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  writeToBuffer(
    uniformBuffer,
    new Float32Array([aspectRatio]),
    "uniformBuffer"
  );
  // device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([aspectRatio])); // Mise à jour du buffer avec `u_aspect`
  //console.log("uniformBuffer:", uniformBuffer); // 🚀 Vérification de la création du buffer

  const uniformData = new Uint32Array([particlesCount]);
  // const uniformData = new Uint32Array([10]);
  uniformBuffer1 = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  writeToBuffer(uniformBuffer1, uniformData, "uniformBuffer1");
  // device.queue.writeBuffer(uniformBuffer1, 0, uniformData); // Mise à jour du buffer avec `particlesCount
  //console.log("uniformBuffer1:", uniformBuffer1); // 🚀 Vérification de la création du buffer

  // Crée les sommets pour un cercle en triangle-list
  //circleVertexCount = 20; //
  circleResolution = 20; //nombre de sommet autour du cercle
  circleVertices = createCircleVertices(circleResolution);
  //console.log("circleVertices", circleVertices);
  vertexBuffer = device.createBuffer({
    size: circleVertices.byteLength,
    // size: circleVertices.length * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  // writeToBuffer(vertexBuffer, circleVertices, "vertexBuffer");
  new Float32Array(vertexBuffer.getMappedRange()).set(circleVertices);
  vertexBuffer.unmap();

  //creationde l index associé car wbgpu ne gere pas triangle-fan
  // Création des indices pour dessiner un cercle sous forme de triangle fan
  // Crée un tableau temporaire pour les indices
  /*   const indices = [];
  for (let i = 0; i < circleVertexCount; i++) {
    indices.push(0); // centre
    indices.push(i + 1);
    indices.push(((i + 1) % circleVertexCount) + 1);
  } */

  // circleVertexCount = circleVertexCount + 2; // total de sommets (centre + resolution + 1)
  //circleVertexCount = circleResolution + 2; // total de sommets (centre + resolution + 1)
  const indices = [];
  for (let i = 1; i <= circleResolution; i++) {
    indices.push(0); // centre
    indices.push(i);
    indices.push(i + 1);
  }
  // Conversion en Uint16Array (WebGPU attend des index 16 bits en général)
  indexData = new Uint16Array(indices); //console.log(indexData);
  // Création du buffer d’index
  indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    // size: indexData.length * 2,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
  });
  // Upload des données dans le buffer
  writeToBuffer(indexBuffer, indexData, "indexBuffer");
  //  device.queue.writeBuffer(indexBuffer, 0, indexData);

  // Chargement des shaders
  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/compute1d.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/vertex1d.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/fragment1d.wgsl")).text(),
  });

  //compute bind groups

  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      }, // ParticlesDatas buffer
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      }, // ✅ Ajout de `u_aspect`
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      }, // ✅ Ajout de `particlesCount`
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      }, //Ajout de corrections buffer
    ],
  });

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: particlesBuffer } }, // Positions
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Ajout de `u_aspect`
      { binding: 3, resource: { buffer: uniformBuffer1 } }, // ✅ Ajout de `particlesCount`
      //{ binding: 2, resource: { buffer: colorBuffer } }, // Couleur (optionnel pour le compute)
      { binding: 2, resource: { buffer: correctionBuffer } }, //Corrections
    ],
  });

  // 2️⃣ Crée les pipelines de calcul
  computePipeline1 = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: { module: computeModule, entryPoint: "simulate" },
  });

  computePipeline2 = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: { module: computeModule, entryPoint: "apply_corrections" },
  });
  //console.log("computePipeline1:", computePipeline1); // 🚀 Vérification de la création du pipeline

  // render bind groups
  //create render bing group layout
  const renderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" }, // ✅ Correction : `read-only storage` pour le vertex shader
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });

  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      { binding: 2, resource: { buffer: colorBuffer } }, // ✅ Couleur (vec4<f32>)
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Aspect ratio (float32)
      { binding: 0, resource: { buffer: particlesBuffer } }, // ✅ Particules (storage buffer)
    ],
  });

  // render pipeline
  renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [renderBindGroupLayout],
    }),
    vertex: {
      module: vertexModule,
      entryPoint: "main",
      buffers: [
        {
          arrayStride: 2 * Float32Array.BYTES_PER_ELEMENT,
          attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
        },
      ],
    },
    fragment: {
      module: fragmentModule,
      entryPoint: "main",
      targets: [{ format }],
    },
    primitive: {
      topology: "triangle-list", // ✅ Cercle plein avec un triangle-fan
      //cullMode: "none", // ✅ Désactivation du culling (aucune face cachée)
      //frontFace: "ccw", // ✅ Sens de rendu antihoraire (convention standard)
    },
  });

  render();
}

async function render() {
  // 1️⃣ Création du CommandEncoder
  const encoder = device.createCommandEncoder();
  //compute pass
  // 2️⃣ Premier kernel : simulation
  {
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline1);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(particlesCount / 64));
    //  computePass.dispatchWorkgroups(Math.min(1, Math.ceil(particlesCount / 64)));
    //computePass.dispatchWorkgroups(1);
    computePass.end();
  }

  // 3️⃣ Deuxième kernel : correction
  {
    const computePass = encoder.beginComputePass();
    computePass.setPipeline(computePipeline2);
    computePass.setBindGroup(0, computeBindGroup);
    computePass.dispatchWorkgroups(Math.ceil(particlesCount / 64));
    //computePass.dispatchWorkgroups(1);
    computePass.end();
  }
  //render pass
  const textureView = context.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.1, g: 0.3, b: 0.4, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(renderPipeline);
  // Bind group pour les uniformes / textures (si besoin)
  renderPass.setBindGroup(0, renderBindGroup);
  // Vertex buffer contenant tous les sommets des cercles
  renderPass.setVertexBuffer(0, vertexBuffer);
  // console.log("indexbuffer", indexBuffer);
  renderPass.setIndexBuffer(indexBuffer, "uint16");
  renderPass.drawIndexed(indexData.length, particlesCount, 0, 0, 0);
  //console.log("indexlenght", indexData.length);

  //renderPass.draw(particlesCount, 1, 0, 0);

  //console.log("indexDataslenght", indexData.length);
  //console.log("vertexCount", vertexCount);
  // renderPass.draw(circleVertexCount, particlesCount, 0, 0);
  // vertexCount = total de sommets à dessiner pour tous les cercles
  // Par ex : vertexCount = particlesCount * (circleResolution + 2)
  // Fin du render pass
  renderPass.end();
  // Envoi des commandes à la carte graphique
  device.queue.submit([encoder.finish()]);
  // Lire la nouvelle position et l'afficher
  /*  await readBuffer.mapAsync(GPUMapMode.READ);
  const array = new Float32Array(readBuffer.getMappedRange());
  console.log(`Nouvelle position sortie: x=${array[0]}, y=${array[1]}`);
  readBuffer.unmap(); */

  // Relancer l’animation
  requestAnimationFrame(render);
}
//--------------------------------------functions----------------------------
function writeToBuffer(buffer, data, label = "inconnu") {
  device.queue.writeBuffer(buffer, 0, data);
  console.log(`✅ Données écrites dans : ${label}`);
}

/* function createCircleVertices(resolution) {
  const vertices = [];
  const angleStep = (2 * Math.PI) / resolution;
  vertices.push(0, 0); // centre
  for (let i = 0; i <= resolution; i++) {
    const angle = i * angleStep;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  return new Float32Array(vertices);
} */

function createCircleVertices(resolution) {
  const vertices = [];
  const angleStep = (2 * Math.PI) / resolution;
  vertices.push(0, 0); // centre

  for (let i = 0; i <= resolution; i++) {
    const angle = i * angleStep;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  return new Float32Array(vertices); // total = resolution + 2 points
}

function readSlider() {
  // Lecture des valeurs des sliders
  const particlesCount = parseInt(countSlider.value);
  const particleSpeed = parseFloat(speedSlider.value);
  const particleSize = parseFloat(sizeSlider.value); // Taille en pourcentage
  const particleColor = colorSelect.value;

  return [particlesCount, particleSpeed, particleSize, particleColor];
}

function generateParticlesUniquePositions(particlesCount, minDist) {
  let positions = [];
  while (positions.length < particlesCount) {
    let newPos = [(Math.random() * 2 - 1) * 0.9, (Math.random() * 2 - 1) * 0.9]; // ✅ Génère une position aléatoire
    //let newPos = [1.0, (Math.random() * 2 - 1) * 0.9]; // ✅test

    // Vérifie que la nouvelle position n'est pas trop proche des autres
    let isUnique = positions.every(
      (p) => Math.hypot(p[0] - newPos[0], p[1] - newPos[1]) >= minDist
    );

    if (isUnique) {
      positions.push(newPos); // ✅ Ajoute la position validée
    }
  }
  return positions;
}

function generateParticlesCount(count) {
  // console.log("generateParticlesCount");
  const sliderValue = count;
  const minSlider = 0;
  const maxSlider = 100;

  const minParticles = 2;
  const maxParticles = 1000;

  const t = (sliderValue - minSlider) / (maxSlider - minSlider); // de 0 à 1
  const curvedT = Math.pow(t, 2); // courbe avec plus de détails au début
  const newparticlesCount = Math.round(
    minParticles + curvedT * (maxParticles - minParticles)
  );
  // console.log("newparticlesCount", newparticlesCount);

  return newparticlesCount; // Math.round(minParticles + curvedT * (maxParticles - minParticles));
}

/* function generateParticlesCount(count) {
  console.log("generateParticlesCount");
  //slider entre 1 et 100 et particlesCount entre 2 et 1000
  particlesCount = parseInt(10.08 * count - 8.08);
  return particlesCount;
} */

function generateParticlesSpeed(speed, ecartTypeSpeed) {
  let pspeed = speed / particlesSpeedMax;
  //sécurité
  pspeed = Math.max(particlesSpeedMin, Math.min(particlesSpeedMax, pspeed));
  let speeds = [];
  for (let i = 0; i < particlesCount; i++) {
    let speedGenerée = randomNormal(speed, ecartTypeSpeed);
    // On contraint à la plage de speed
    pspeed = Math.max(
      particlesSpeedMin,
      Math.min(particlesSpeedMax, speedGenerée)
    );
    //console.log("psspeed", pspeed);
    const angle = Math.random() * 2 * Math.PI;
    speeds.push([Math.cos(angle) * pspeed, Math.sin(angle) * pspeed]);
  }
  console.log("generateParticlesSpeed", speeds);
  return speeds;
}
function generateParticlesSize(count, size) {
  //slider entre 0 et 100( defaut) et size entre particleSizeMin et particleSizeMax

  //size = size / particlesSizeMax;
  size =
    ((particlesSizeMax - particlesSizeMin) / 100) * size + particlesSizeMin;
  console.log("size", size);
  //sécurité
  size = Math.max(particlesSizeMin, Math.min(particlesSizeMax, size));
  let sizes = [];
  for (let i = 0; i < count; i++) {
    let sizeGenerée = randomNormal(size, ecartTypeSize);
    // On contraint à la plage de size
    size = Math.max(particlesSizeMin, Math.min(particlesSizeMax, sizeGenerée));
    sizes.push(size);
  }
  console.log("generateParticleSize", sizes);
  return sizes;
}
// distribution normale gaussienne
function randomNormal(mean, stdDev) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // éviter 0
  while (v === 0) v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}
function convertColor(colorName) {
  const colors = {
    red: [1.0, 0.6, 0.6, 1.0],
    green: [0.0, 1.0, 0.0, 1.0],
    blue: [0.6, 0.6, 1.0, 1.0],
    yellow: [1.0, 1.0, 0.6, 1.0],
    pink: [1.0, 0.75, 0.8, 1.0],
    orange: [1.0, 0.6, 0.2, 1.0],
    birdofparadise: [0.9, 0.4, 0.9, 1.0],
    tropicalSunset: [1.0, 0.4, 0.2, 1.0],
    mysticAurora: [0.4, 0.8, 0.9, 1.0],
    cottonCandySky: [1.0, 0.7, 0.9, 1.0],
    sunsetGlow: [1.0, 0.5, 0.4, 1.0],
    emeraldDream: [0.3, 0.9, 0.6, 1.0],
    fieryPassion: [1.0, 0.3, 0.2, 1.0],
    oceanBreeze: [0.2, 0.7, 1.0, 1.0],
    lavenderFields: [0.7, 0.6, 1.0, 1.0],
    goldenHour: [1.0, 0.8, 0.4, 1.0],
    crimsonTwilight: [0.6, 0.1, 0.2, 1.0],
    forestWhisper: [0.2, 0.5, 0.2, 1.0],
  };

  return new Float32Array(colors[colorName] || [1.0, 1.0, 1.0, 1.0]); // Blanc si inconnue
}

// 🎚️ Exemples d'interaction (connecte ça à ton slider panel)

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");

countSlider.addEventListener("input", () => {
  change();
  /*   parseInt(countSlider.value),
    particleSpeed,
    particleSize,
    particleColor */
});

sizeSlider.addEventListener("input", () => {
  change();
  /*     particlesCount,
    particleSpeed,
    parseFloat(sizeSlider.value), // taille en pourcentage
    particleColor */
});

speedSlider.addEventListener("input", () => {
  change();
  /*     particlesCount,
    parseFloat(speedSlider.value),
    particleSize,
    particleColor */
});

rotationSlider.addEventListener("input", () => {
  // setRotationSpeed(parseFloat(rotationSlider.value));
});

colorSelect.addEventListener("change", () => {
  change();
  //change(particlesCount, particleSpeed, particleSize, colorSelect.value);
  //setGradient(colorSelect.value);
});

export function goFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    container.requestFullscreen().catch((err) => {
      alert(`Erreur plein écran : ${err.message}`);
    });
  }
}

function resizeCanvas() {
  //console.log("resizeCanvas called");
  canvas = document.querySelector("#gpuCanvas"); // Assurez-vous que canvas est défini
  if (!canvas) {
    console.error("Canvas not found!");
    return;
  }
  //console.log("Canvas found:", canvas);
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspectRatio = canvas.width / canvas.height; // Met à jour l'aspect ratio
  //console.log("Aspect Ratio après resize:", aspectRatio);
  // gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  // gl.viewport(0, 0, canvas.width, canvas.height);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // au démarrage

// Changer les paramètres dynamiquement (slider)
function change() {
  //console.log("function change()");
  let readparticlesCount,
    readparticleSpeed,
    readparticleSize,
    readparticleColor;
  //[particlesCount, particleSpeed, particleSize, particleColor] = readSlider();
  [readparticlesCount, readparticleSpeed, readparticleSize, readparticleColor] =
    readSlider();
  /*   console.log(
    "read values from sliders:",
    "count:",
    readparticlesCount,
    "speed:",
    readparticleSpeed,
    "size:",
    readparticleSize,
    "color:",
    readparticleColor
  ); */
  readparticlesCount = generateParticlesCount(readparticlesCount); //pour garder slider en 0 et 100(defaut) et count entre2 et 1000
  //console.log("readparticlesCount", readparticlesCount);

  const oldValues = [
    particlesCount,
    particleSpeed,
    particleSize,
    String(particleColor).toLowerCase(), // <-- forçage en string
  ];
  const newValues = [
    readparticlesCount,
    readparticleSpeed,
    readparticleSize,
    String(readparticleColor).toLowerCase(), // // <-- forçage en string
  ];
  const variableNames = [
    "particlesCount",
    "particleSpeed",
    "particleSize",
    "particleColor",
  ];

  const changedVars = getChangedVariables(oldValues, newValues, variableNames);
  console.log("Variables modifiées :", changedVars);
  if (changedVars.includes("particlesCount")) changeCount();
  if (changedVars.includes("particleSpeed")) changeSpeed();
  if (changedVars.includes("particleSize")) changeSize(readparticleSize);
  if (changedVars.includes("particleColor")) changeColor();
}

function getChangedVariables(oldValues, newValues, variableNames) {
  const changed = [];
  for (let i = 0; i < variableNames.length; i++) {
    if (oldValues[i] !== newValues[i]) {
      changed.push(variableNames[i]);
    }
  }
  return changed; // tableau des noms qui ont changé
}

function changeColor() {
  console.log("changeColor()");
}
function changeCount() {
  console.log("changeCount()");
}
function changeSize(size) {
  particleSize = size; // mise  jour  size
  console.log("changeSize()");
  changeSizes(particleSize);
  //articlesSizes = generateParticlesSize(particlesCount, particleSize); //mise a jour tableaux size
}
function changeSpeed() {
  console.log("changeSpeed()");
}

function changeSizes(newSize) {
  console.log("🔧 Mise à jour des tailles avec size =", newSize);
  // Regénère toutes les tailles avec distribution normale autour de newSize
  particlesSizes = generateParticlesSize(particlesCount, newSize);

  // Met à jour uniquement les tailles dans particlesDatas (offset +2 dans chaque bloc de 6 floats)
  for (let i = 0; i < particlesCount; i++) {
    let index = i * 6 + 2; // Champ "size"
    particlesDatas[index] = particlesSizes[i];
  }
  // Réécrit dans le buffer GPU sans toucher aux autres données
  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");
  //device.queue.writeBuffer(particlesBuffer, 0, particlesDatas);
}

/* function change(count, speed, size, color) {
  if (!count || !speed || !size || !color) {
    console.error("Invalid parameters for change function");
    return;
  }
  if (
    count !== particlesCount ||
    speed !== particleSpeed ||
    size !== particleSize ||
    color !== particleColor
  ) {
    console.log("Changing parameters:", count, speed, size, color);
  }
  if (count !== particlesCount) {
    particlesCount = count;
    console.log("Changing count to:", particlesCount);
    // Recréer les buffers et pipelines si le nombre de particules change
  }
  if (size !== particleSize) {
    particleSize = size;
    console.log("Changing size to:", particleSize);
    // Recréer les buffers si la taille change
  }
  if (speed !== particleSpeed) {
    particleSpeed = speed;
    console.log("Changing speed to:", particleSpeed);
    // Recréer les vitesses si la vitesse change
  }
  if (color !== particleColor) {
    particleColor = color;
    console.log("Changing color to:", particleColor);
    // Recréer le buffer de couleur si la couleur change
  }
} */
