let canvas, adapter, device, context, format;
let computePipeline, renderPipeline;
let particlesBuffer,
  colorBuffer,
  uniformBuffer,
  indexBuffer,
  indexData,
  vertexBuffer,
  vertices,
  circleVertices,
  vertexCount,
  circleVertexCount;
let computeBindGroup, renderBindGroup;
let aspectRatio;

let particlesCount,
  particleSize, //valeurs moyenne µ
  particleSpeed, //valeur moyenne µ
  particleColor;
let particlesPositions,
  particlesSizes,
  particlesSpeeds,
  particlesColors,
  particlesDatas;
//je laisse les sliders à valeur par defaut entre 0 et 100 step 1 et je regle ici
const particlesCountMin = 2;
const particlesCountMax = 1000;
const particlesSpeedMin = 0.0005;
const particlesSpeedMax = 0.002;
const ecartTypeSpeed = 0.0005; // √variance
const particlesSizeMin = 0.01;
const particlesSizeMax = 0.1;
const ecartTypeSize = 0.005; // √variance

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

  /*   particlesCount = 12; // ✅ Pour teste 
  particleSpeed = 0.0;
  particleSize = 0.05; */

  particlesPositions = new Float32Array(particlesCount * 2); // 2 coordonnées (x, y) par particle
  particlesPositions = generateParticlesUniquePositions(particlesCount, 0.1);
  console.log("particlesPositions", particlesPositions); // ✅ Vérification
  // Génération des vitesses des particles
  particlesSpeeds = new Float32Array(particlesCount * 2); // 2 coordonnées (vx, vy) par particle
  particlesSpeeds = generateParticlesSpeed(particleSpeed);
  //console.log("particlesSpeeds", particlesSpeeds); // ✅ Vérification
  // Génération des tailles des particles
  particlesSizes = new Float32Array(particlesCount); // 1 taille (size) par particle
  particlesSizes = generateParticlesSize(particlesCount, particleSize);
  // particlesSizes = [0.01, 0.02]; //pour test
  console.log("particlesSizes", particlesSizes); // ✅ Vérification
  particlesDatas = new Float32Array(particlesCount * 6); // ✅ 5 valeurs par particule
  // ✅ Fusion des données dans particlesDatas
  for (let i = 0; i < particlesCount; i++) {
    let index = i * 6; // ✅ Chaque particule a 6 valeurs
    particlesDatas[index] = particlesPositions[i][0]; // ✅ Récupère X correctement
    particlesDatas[index + 1] = particlesPositions[i][1]; // ✅ Récupère Y correctement
    particlesDatas[index + 2] = particlesSizes[i]; // ✅ SIZE
    particlesDatas[index + 3] = 0.0; // ✅ _PAD pour alignement memoire gpu
    particlesDatas[index + 4] = particlesSpeeds[i][0]; // ✅ VX
    particlesDatas[index + 5] = particlesSpeeds[i][1]; // ✅ VY
  }
  // console.log("particlesDatas", particlesDatas); // 🚀 Vérification que les données sont bien fusionnées

  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });

  device.queue.writeBuffer(particlesBuffer, 0, particlesDatas);
  // console.log("particlesBuffer:", particlesBuffer);
  // console.log("Buffer rempli et prêt :", particleData);
  //console.log("🔎 État du buffer après création:", particlesBuffer.mapState);

  // Création du buffer de couleur
  particlesColors = new Float32Array(4); // 4 valeurs pour la couleur (RGBA)
  particleColor = "red"; // ✅ Couleur rouge par défaut
  particlesColors =
    particleColor === "red"
      ? new Float32Array([1.0, 0.6, 0.6, 1.0]) // ✅ Rouge
      : new Float32Array([0.0, 1.0, 0.0, 1.0]); // ✅ Valeur par défaut (vert)

  colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT, // 4 valeurs pour la couleur (RGBA)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, particlesColors); // Mise à jour du buffer avec la couleur
  // console.log("colorBuffer:", colorBuffer);

  // Création du buffer d'aspect ratio = canvas.width / canvas.height;
  uniformBuffer = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([aspectRatio])); // Mise à jour du buffer avec `u_aspect`
  //console.log("uniformBuffer:", uniformBuffer); // 🚀 Vérification de la création du buffer

  // Crée les sommets pour un cercle en triangle-list
  circleVertexCount = 20; // const circleResolution = 20;
  circleVertices = createCircleVertices(circleVertexCount);
  vertexBuffer = device.createBuffer({
    size: circleVertices.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  new Float32Array(vertexBuffer.getMappedRange()).set(circleVertices);
  vertexBuffer.unmap();
  circleVertexCount = circleVertices.length / 2; // nb de sommets pour un cercle
  console.log("circlevertexCount", circleVertexCount);
  //creationde l index associé car wbgpu ne gere pas triangle-fan
  // Création des indices pour dessiner un cercle sous forme de triangle fan
  // Crée un tableau temporaire pour les indices
  const indices = [];
  for (let i = 0; i < circleVertexCount; i++) {
    indices.push(0); // centre
    indices.push(i + 1);
    indices.push(((i + 1) % circleVertexCount) + 1);
  }
  // Conversion en Uint16Array (WebGPU attend des index 16 bits en général)
  indexData = new Uint16Array(indices);
  // Création du buffer d’index
  indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
  });
  // Upload des données dans le buffer
  device.queue.writeBuffer(indexBuffer, 0, indexData);
  //console.log("indexBuffer", indexBuffer);
  // console.log("indexData", indexData);

  // Chargement des shaders
  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/compute1c.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/vertex1c.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/fragment1c.wgsl")).text(),
  });

  //compute bind groups
  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      }, // Positions
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      }, // ✅ Ajout de `u_aspect`
    ],
  });

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: particlesBuffer } }, // Positions
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Ajout de `u_aspect`
      //{ binding: 2, resource: { buffer: colorBuffer } }, // Couleur (optionnel pour le compute)
    ],
  });

  computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: {
      module: computeModule,
      entryPoint: "main",
    },
  });
  //console.log("computePipeline:", computePipeline); // 🚀 Vérification de la création du pipeline

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
  // console.log("Rendering...");
  const encoder = device.createCommandEncoder();
  // Compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(particlesCount);

  // computePass.dispatchWorkgroups(Math.max(1, Math.ceil(particlesCount / 64)));

  //const workgroupSize = 64;
  // const numWorkgroups = Math.ceil(particlesCount / workgroupSize);
  //computePass.dispatchWorkgroups(numWorkgroups);
  //computePass.dispatchWorkgroups(12, 2, 2);

  //computePass.dispatchWorkgroups(Math.max(1, Math.ceil(particlesCount / 64)));

  // computePass.dispatchWorkgroups(1);
  computePass.end();

  // Copie posBuffer pour lecture CPU (read-back)
  /*   const readBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  encoder.copyBufferToBuffer(particlesBuffer, 0, readBuffer, 0, 2 * 4); */

  // Render pass
  //console.log("particlesBuffer:", particlesBuffer);
  const textureView = context.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0.1, g: 0.1, b: 0.15, a: 1 },
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
function createCircleVertices(resolution) {
  const vertices = [];
  const angleStep = (2 * Math.PI) / resolution;
  vertices.push(0, 0); // centre
  for (let i = 0; i <= resolution; i++) {
    const angle = i * angleStep;
    vertices.push(Math.cos(angle), Math.sin(angle));
  }
  return new Float32Array(vertices);
}

function readSlider() {
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const rotationSlider = document.getElementById("rotationSlider");
  const colorSelect = document.getElementById("colorSelect");

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
function generateParticlesSpeed(speed) {
  speed = speed / particlesSpeedMax;
  //sécurité
  speed = Math.max(particlesSpeedMin, Math.min(particlesSpeedMax, speed));

  let speeds = [];
  for (let i = 0; i < particlesCount; i++) {
    let speedGenerée = randomNormal(speed, ecartTypeSpeed);
    // On contraint à la plage de speed
    speed = Math.max(
      particlesSpeedMin,
      Math.min(particlesSpeedMax, speedGenerée)
    );
    const angle = Math.random() * 2 * Math.PI;
    speeds.push([Math.cos(angle) * speed, Math.sin(angle) * speed]);
  }
  console.log("generateParticlesSpeed", speeds);
  return speeds;
}
function generateParticlesSize(count, size) {
  //slider entre 1 et 100( defaut) et size entre particleSizeMin et particleSizeMax
  size = size / particlesSizeMax;
  //sécurité
  size = Math.max(particlesSizeMin, Math.min(particlesSizeMax, size));

  let sizes = [];
  for (let i = 0; i < count; i++) {
    let sizeGenerée = randomNormal(size, ecartTypeSize);
    // On contraint à la plage de size
    size = Math.max(particlesSizeMin, Math.min(particlesSizeMax, sizeGenerée));

    sizes.push(size + 0.5 * size * (Math.random() * 2 - 1)); // Utilise la taille définie par le slider
  }
  // console.log("generateParticleSize", sizes);
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

// 🎚️ Exemples d'interaction (connecte ça à ton slider panel)

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");

countSlider.addEventListener("input", () => {
  change(
    parseInt(countSlider.value),
    particleSpeed,
    particleSize,
    particleColor
  );
});

sizeSlider.addEventListener("input", () => {
  change(
    particlesCount,
    particleSpeed,
    parseFloat(sizeSlider.value), // taille en pourcentage
    particleColor
  );
});

speedSlider.addEventListener("input", () => {
  change(
    particlesCount,
    parseFloat(speedSlider.value),
    particleSize,
    particleColor
  );
});

rotationSlider.addEventListener("input", () => {
  // setRotationSpeed(parseFloat(rotationSlider.value));
});

colorSelect.addEventListener("change", () => {
  change(particlesCount, particleSpeed, particleSize, colorSelect.value);
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
function change(count, speed, size, color) {
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
}
