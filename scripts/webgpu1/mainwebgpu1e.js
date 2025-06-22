let canvas,
  adapter,
  device,
  context,
  format,
  computeModule,
  vertexModule,
  fragmentModule,
  animationFrameId;
let computePipeline, computePipeline1, computePipeline2, renderPipeline;
let particlesBuffer,
  correctionBuffer,
  colorBuffer,
  colorBufferDif,
  colorDatas,
  colorTypeUniformBuffer, //colorType aiguillage
  uaspectUniformBuffer, //u_aspect
  uniformData, //color type
  particlesCountUniformBuffer, //particlesCount
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
  particleColorName,
  colorType,
  particlesPositions,
  particlesSizes,
  particlesSpeeds,
  particlesColors,
  particlesDatas,
  correctionDatas;
//je laisse les sliders à valeur par defaut entre 0 et 100 step 1 et je regle ici
const particlesCountMin = 2;
const particlesCountMax = 1000;
const particlesSpeedMin = 0.0;
const particlesSpeedMax = 0.009;
const ecartTypeSpeed = 0.0; // √variance
const particlesSizeMin = 0.01;
const particlesSizeMax = 0.3;
const ecartTypeSize = 0.0; // √variance

async function main() {
  await init(); // 👈 bien attendre init()
  await initParticles(); // 👈 pas avant
  render(); // 👈 puis démarrer la boucle
}

main();

async function init() {
  canvas = document.querySelector("#gpuCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspectRatio = canvas.width / canvas.height;
  // console.log("Aspect Ratio:", aspectRatio);
  adapter = await navigator.gpu.requestAdapter();
  device = await adapter.requestDevice();
  console.log("device", device);

  context = canvas.getContext("webgpu");
  format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });
}
async function initParticles() {
  createBuffersDatas();
  // console.log("create Buffers Datas finit");
  createBuffers();
  console.log("create Buffers finit");
  initBuffers();
  console.log("initBuffers finit");
  await createShaders();
  console.log("create shaders finit");

  //compute bind groups
  updateBindGroups();

  //render();
}

/**
 * @function render
 * @description Renders the current frame, including compute and render passes.
 */
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
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 },
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
  //requestAnimationFrame(render);
  //console.log("particlesDatas[0][1]", particlesDatas[0], particlesDatas[1]);
  animationFrameId = requestAnimationFrame(render);
}
//--------------------------------------functions----------------------------
function readBuffer() {}
function reduceBuffers() {}
function extandBuffers() {
  console.log("extandBuffers()");
  // 🔁 Sauvegarde temporaire de l'ancien buffer
  const oldParticlesBuffer = particlesBuffer;
  // 🔧 Création du nouveau buffer (avec nouvelle taille si nécessaire)
  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });
  // 📝 Écriture des nouvelles données dans le buffer GPU
  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");

  //ne pas oublier le correctionBuffer
  const oldCorrectionBuffer = correctionBuffer;
  correctionDatas = new Float32Array(4 * particlesCount); // Par défaut, Float32Array est déjà rempli de 0.0
  // correctionDatas.fill(0.0); // Mais tu peux le faire explicitement si besoin :
  correctionBuffer = device.createBuffer({
    size: correctionDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  writeToBuffer(correctionBuffer, correctionDatas, "correctionBuffer");

  const oldcolorBufferDif = colorBufferDif;
  // 🔧 Création du nouveau buffer (avec nouvelle taille si nécessaire)
  colorBufferDif = device.createBuffer({
    size: colorDatas.byteLength,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });
  // 📝 Écriture des nouvelles données dans le buffer GPU
  writeToBuffer(colorBufferDif, colorDatas, "colorBufferDif");
  writeToBuffer(
    colorTypeUniformBuffer,
    new Uint32Array([colorType[0]]),
    //colorType[0],
    "colorTypeUniformBuffer"
  );

  //ne pas oublier le particlesCount buffer
  const oldparticlesCountUniformBuffer = particlesCountUniformBuffer;
  const uniformData = new Uint32Array([particlesCount]);
  particlesCountUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  writeToBuffer(
    particlesCountUniformBuffer,
    uniformData,
    "particlesCountUniformBuffer"
  );

  // ✅ Une fois qu'on est sûr que plus rien ne lesutilise
  // 1. Détruire les anciens buffer si nécessaire
  device.queue.onSubmittedWorkDone().then(() => {
    // Tu peux maintenant détruire / remplacer les buffers
    if (oldParticlesBuffer) oldParticlesBuffer.destroy();
    if (oldCorrectionBuffer) oldCorrectionBuffer.destroy();
    if (oldparticlesCountUniformBuffer)
      oldparticlesCountUniformBuffer.destroy();
    console.log("old buffers destroy");
  });
}
function updateBuffers() {}
async function createShaders() {
  // Chargement des shaders
  computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/compute1e.wgsl")).text(),
  });
  vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/vertex1e.wgsl")).text(),
  });
  fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/fragment1e.wgsl")).text(),
  });
}
function initBuffers() {
  // Upload des données dans les buffers
  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");
  //console.log("particlesBuffer:", particlesBuffer);
  //console.log("Buffer rempli et prêt :", particlesDatas);
  //console.log("🔎 État du buffer après création:", particlesBuffer.mapState);
  writeToBuffer(correctionBuffer, correctionDatas, "correctionBuffer");
  writeToBuffer(
    colorTypeUniformBuffer,
    new Uint32Array([colorType[0]]),
    //colorType[0],
    "colorTypeUniformBuffer"
  );
  writeToBuffer(colorBufferDif, colorDatas, "colorBufferDif");
  writeToBuffer(
    uaspectUniformBuffer,
    new Float32Array([aspectRatio]),
    "uaspectUniformBuffer"
  );
  writeToBuffer(
    particlesCountUniformBuffer,
    uniformData,
    "particlesCountUniformBuffer"
  );
  // writeToBuffer(vertexBuffer, circleVertices, "vertexBuffer");//faut rajouter usage coppy....
  new Float32Array(vertexBuffer.getMappedRange()).set(circleVertices);
  vertexBuffer.unmap();
  writeToBuffer(indexBuffer, indexData, "indexBuffer");
}
function createBuffersDatas() {
  // lecture des valeurs initiales  des sliders
  [particlesCount, particleSpeed, particleSize, particleColorName] =
    readSlider();
  /*   console.log(
    "Initial values from sliders:",
    "count:",
    particlesCount,
    "speed:",
    particleSpeed,
    "size:",
    particleSize,
    "color:",
    particleColorName
  ); */
  particlesCount = generateParticlesCount(particlesCount);
  //console.log("particlesCount", particlesCount);
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
  correctionDatas = new Float32Array(4 * particlesCount); // Par défaut, Float32Array est déjà rempli de 0.0
  correctionDatas.fill(0.0); // Mais tu peux le faire explicitement si besoin :

  colorDatas = setColorsDatas(particleColorName, particlesCount);

  /*   [particlesColors, colorType] = setColor(particleColorName);
  console.log("particlesColors", particlesColors, "colorType", colorType);

  colorDatas = new Float32Array(particlesCount * 4);
  if (colorType[0] == 1) {
    //balles multicolor

    for (let i = 0; i < particlesCount; i++) {
      colorDatas.set(
        [
          Math.random(), // R
          Math.random(), // G
          Math.random(), // B
          1.0, // Alpha
        ],
        i * 4
      );
    }
  }
  if (colorType[0] == 2) {
    //whereisWally?
    for (let i = 0; i < particlesCount; i++) {
      const color = particlesColors; // Doit être [r, g, b, a]
      if (color && color.length === 4) {
        colorDatas.set(color, i * 4);
      } else {
        console.warn(`❌ Couleur invalide pour la particule ${i}`, color);
      }
    }
    colorDatas.set([1.0, 0.0, 0.0, 1.0], 0); //charlie est rouge
  }
  if (colorType[0] == 0) {
    //1 seule couleur pour toutes les balles
    for (let i = 0; i < particlesCount; i++) {
      const color = particlesColors; // Doit être [r, g, b, a]
      if (color && color.length === 4) {
        colorDatas.set(color, i * 4);
      } else {
        console.warn(`❌ Couleur invalide pour la particule ${i}`, color);
      }
    }
  } */
  uniformData = new Uint32Array([particlesCount]);
  // Crée les sommets pour un cercle en triangle-list
  circleResolution = 20; //nombre de sommet autour du cercle
  circleVertices = createCircleVertices(circleResolution);
  //console.log("circleVertices", circleVertices);
  //creationde l index associé car wbgpu ne gere pas triangle-fan

  const indices = [];
  for (let i = 1; i <= circleResolution; i++) {
    indices.push(0); // centre
    indices.push(i);
    indices.push(i + 1);
  }
  // Conversion en Uint16Array (WebGPU attend des index 16 bits en général)
  indexData = new Uint16Array(indices); //console.log(indexData);
}
function createBuffers() {
  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });
  correctionBuffer = device.createBuffer({
    size: correctionDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  colorBufferDif = device.createBuffer({
    size: colorDatas.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    //mappedAtCreation: true,
  });
  colorTypeUniformBuffer = device.createBuffer({
    size: colorType.byteLength, // 2, // Un seul `u32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  // Création du buffer d'aspect ratio = canvas.width / canvas.height;
  uaspectUniformBuffer = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  //console.log("uaspectUniformBuffer:", uaspectUniformBuffer); // 🚀 Vérification de la création du buffer
  particlesCountUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  vertexBuffer = device.createBuffer({
    size: circleVertices.byteLength,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  });
  // Création du buffer d’index
  indexBuffer = device.createBuffer({
    size: indexData.byteLength,
    // size: indexData.length * 2,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: false,
  });
}

function stopRendering() {
  console.log("stopRendering()");
  cancelAnimationFrame(animationFrameId);
}

function startRendering() {
  console.log("startRendering()");
  animationFrameId = requestAnimationFrame(render);
}

function writeToBuffer(buffer, data, label = "inconnu") {
  console.log("writteToBuffer()", label);
  if (!device || !device.queue) {
    console.warn(
      `❌ Impossible d'écrire dans le buffer "${label}": device ou queue est indéfini`
    );
    return;
  }
  device.queue.writeBuffer(buffer, 0, data);
  console.log(`✅ Données écrites dans : ${label}`);
}

function setColorsDatas(particleColorName, particlesCount) {
  [particlesColors, colorType] = setColor(particleColorName);
  //console.log("particlesColors", particlesColors, "colorType", colorType);

  colorDatas = new Float32Array(particlesCount * 4);
  if (colorType[0] == 1) {
    //balles multicolor

    for (let i = 0; i < particlesCount; i++) {
      colorDatas.set(
        [
          Math.random(), // R
          Math.random(), // G
          Math.random(), // B
          1.0, // Alpha
        ],
        i * 4
      );
    }
  }
  if (colorType[0] == 2) {
    //whereisWally?
    for (let i = 0; i < particlesCount; i++) {
      const color = particlesColors; // Doit être [r, g, b, a]
      if (color && color.length === 4) {
        colorDatas.set(color, i * 4);
      } else {
        console.warn(`❌ Couleur invalide pour la particule ${i}`, color);
      }
    }
    colorDatas.set([1.0, 0.0, 0.0, 1.0], 0); //charlie est rouge
  }
  if (colorType[0] == 0) {
    console.log("test", particlesColors);
    //1 seule couleur pour toutes les balles
    for (let i = 0; i < particlesCount; i++) {
      const color = particlesColors; // Doit être [r, g, b, a]
      if (color && color.length === 4) {
        colorDatas.set(color, i * 4);
      } else {
        console.warn(`❌ Couleur invalide pour la particule ${i}`, color);
      }
    }
  }
  return colorDatas;
}

function setColor(colorName) {
  console.log("setColor(colorName)", colorName);
  let color = convertColor(colorName);
  let type = new Uint32Array(1);
  switch (colorName) {
    case "whereisWally":
      type[0] = 2;
      console.log("type", type[0], "+ colorName", colorName);
      break;
    case "multicolor":
      type[0] = 1;
      console.log("type", type[0], "+ colorName", colorName);
      break;
    default:
      type[0] = 0;
      console.log("type", type[0], "+ colorName", colorName);
  }
  console.log("color", color, "type", type);
  return [color, type];
}
function convertColor(colorName) {
  // console.log("test0", colorName);
  const colors = {
    red: [1.0, 0.0, 0.0, 1.0],
    green: [0.0, 1.0, 0.0, 1.0],
    blue: [0.0, 0.0, 1.0, 1.0],
    yellow: [1.0, 1.0, 0.0, 1.0],
    pink: [1.0, 0.7, 0.8, 1.0],
    orange: [1.0, 0.5, 0.1, 1.0],
    white: [1.0, 1.0, 1.0, 1.0],
    black: [0.0, 0.0, 0.0, 1.0],
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
    whereisWally: [0.4, 0.5, 1.0, 1.0],
    multicolor: [0.0, 0.0, 0.0, 0.0],
  };
  // console.log("test", colors[colorName]);
  return new Float32Array(colors[colorName] || [1.0, 1.0, 1.0, 1.0]); // Blanc si inconnue
}

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
    let newPos = [
      (Math.random() * 2 - 1) * 0.95,
      (Math.random() * 2 - 1) * 0.95,
    ]; // ✅ Génère une position aléatoire
    //let newPos = [1.0, (Math.random() * 2 - 1) * 0.9]; // ✅test
    // Vérifie que la nouvelle position n'est pas trop proche des autres attention devient boucle infini avec beaucoup de particules
    /* let isUnique = positions.every(
      (p) => Math.hypot(p[0] - newPos[0], p[1] - newPos[1]) >= minDist
    ); */
    let isUnique = true;

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

  const particleDisplay = document.getElementById("particleCountDisplay");
  particleDisplay.textContent = `Particles: ${newparticlesCount}`;

  return newparticlesCount; // Math.round(minParticles + curvedT * (maxParticles - minParticles));
}

function generateParticlesSpeed(speed, ecartTypeSpeed) {
  //conversion slider 0 à 100 en speed min à max
  const nspeed = speed;
  let pspeed =
    ((particlesSpeedMax - particlesSpeedMin) / 100) * nspeed +
    particlesSpeedMin;
  //sécurité
  // pspeed = Math.max(particlesSpeedMin, Math.min(particlesSpeedMax, pspeed));
  console.log("nspeed", nspeed, "pspeed", pspeed);
  let speeds = [];
  for (let i = 0; i < particlesCount; i++) {
    let speedGenerée = randomNormal(pspeed, ecartTypeSpeed);
    // On contraint à la plage de speed
    const pspeedcor = Math.max(
      particlesSpeedMin,
      Math.min(particlesSpeedMax, speedGenerée)
    );
    //console.log("psspeed", pspeed);
    const angle = Math.random() * 2 * Math.PI;
    speeds.push([Math.cos(angle) * pspeedcor, Math.sin(angle) * pspeedcor]);
  }
  //console.log("generateParticlesSpeed", speeds);
  return speeds;
}

function generateParticlesSize(count, size) {
  //slider entre 0 et 100( defaut) et size entre particleSizeMin et particleSizeMax

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
  //console.log("generateParticleSize", sizes);
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
  change();
});

sizeSlider.addEventListener("input", () => {
  change();
});

speedSlider.addEventListener("input", () => {
  change();
});

/* rotationSlider.addEventListener("input", () => {
  // setRotationSpeed(parseFloat(rotationSlider.value));
}); */

colorSelect.addEventListener("change", () => {
  change();
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
  changeUAspect(aspectRatio);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas(); // au démarrage

function changeUAspect(newAspect) {
  const aspectData = new Float32Array([newAspect]);
  //device.queue.writeBuffer(uaspectUniformBuffer, 0, aspectData);
  writeToBuffer(
    uaspectUniformBuffer,
    //new Float32Array([aspectRatio]),
    aspectData,
    "uaspectUniformBuffer"
  );
  console.log("🟢 u_aspect mis à jour :", newAspect);
}

// Changer les paramètres dynamiquement (slider)
function change() {
  //console.log("function change()");
  let readparticlesCount,
    readparticleSpeed,
    readparticleSize,
    readparticleColorName;
  //[particlesCount, particleSpeed, particleSize, particleColorName] = readSlider();
  [
    readparticlesCount,
    readparticleSpeed,
    readparticleSize,
    readparticleColorName,
  ] = readSlider();
  /*   console.log(
    "read values from sliders:",
    "count:",
    readparticlesCount,
    "speed:",
    readparticleSpeed,
    "size:",
    readparticleSize,
    "color:",
    readparticleColorName
  ); */
  readparticlesCount = generateParticlesCount(readparticlesCount); //pour garder slider en 0 et 100(defaut) et count entre2 et 1000
  //console.log("readparticlesCount", readparticlesCount);

  const oldValues = [
    particlesCount,
    particleSpeed,
    particleSize,
    String(particleColorName).toLowerCase(), // <-- forçage en string
  ];
  const newValues = [
    readparticlesCount,
    readparticleSpeed,
    readparticleSize,
    String(readparticleColorName).toLowerCase(), // // <-- forçage en string
  ];
  const variableNames = [
    "particlesCount",
    "particleSpeed",
    "particleSize",
    "particleColorName",
  ];

  const changedVars = getChangedVariables(oldValues, newValues, variableNames);
  //console.log("Variables modifiées :", changedVars);
  if (changedVars.includes("particlesCount")) changeCount(readparticlesCount);
  if (changedVars.includes("particleSpeed")) changeSpeed(readparticleSpeed);
  if (changedVars.includes("particleSize")) changeSize(readparticleSize);
  if (changedVars.includes("particleColorName"))
    changeColor(readparticleColorName);
}

function getChangedVariables(oldValues, newValues, variableNames) {
  const changed = [];
  for (let i = 0; i < variableNames.length; i++) {
    if (oldValues[i] !== newValues[i]) {
      changed.push(variableNames[i]);
    }
  }
  //console.log("getChangedVariables()", changed);
  return changed; // tableau des noms qui ont changé
}

function changeColor(colorName) {
  particleColorName = colorName;
  // console.log("changeColor()", particleColorName);
  colorDatas = setColorsDatas(particleColorName, particlesCount);
  // console.log("changeColor():colorDatas", colorDatas);
  writeToBuffer(colorBufferDif, colorDatas, "colorBufferDiff");

  //particleColorName = colorName;
  //particlesColors = convertColor(particleColorName);
  //const rgba = colorMap[colorName] || [1.0, 1.0, 1.0, 1.0]; // blanc par défaut
  // const newColor = new Float32Array(rgba);
  //device.queue.writeBuffer(colorBuffer, 0, newColor);
  //writeToBuffer(colorBuffer, particlesColors, "colorBuffer");
}

function changeSize(size) {
  particleSize = size; // mise  jour  size
  //console.log("changeSize()");
  changeSizes(particleSize);
  //articlesSizes = generateParticlesSize(particlesCount, particleSize); //mise a jour tableaux size
}

function changeSpeed(newSpeed) {
  console.log(
    "changeSpeed() 🔁 Changement de vitesse des particules:",
    "newSpeed",
    newSpeed
  );
  particleSpeed = newSpeed;

  // 1. Générer les nouvelles vitesses
  particlesSpeeds = generateParticlesSpeed(particleSpeed, ecartTypeSpeed);

  // 2. Mettre à jour particlesDatas uniquement pour VX et VY
  for (let i = 0; i < particlesCount; i++) {
    let index = i * 6;
    particlesDatas[index + 4] = particlesSpeeds[i][0]; // VX
    particlesDatas[index + 5] = particlesSpeeds[i][1]; // VY
  }
  // 2. Construction d’un tableau plat pour correctionBuffer (4 floats/particule) ( suis pas sur que ca soit utile)
  //console.log("testcount", correctionDatas);
  //correctionDatas = new Float32Array(4 * particlesCount);
  for (let i = 0; i < particlesCount; i++) {
    const base = i * 4;
    //correctionDatas[base + 0] = 0.0; // DX inutilisé ici ?
    //correctionDatas[base + 1] = 0.0; // DY inutilisé ici ?
    correctionDatas[base + 2] = particlesSpeeds[i][0]; // VX
    correctionDatas[base + 3] = particlesSpeeds[i][1]; // VY
  }
  //console.log("testcount1", correctionDatas);

  // 3. Réécriture dans le buffer existant
  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");
  writeToBuffer(correctionBuffer, correctionDatas, "correctionBuffer");
  // console.log("✅ Vitesse mise à jour !");
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

/* function reduceParticles(){   //je tronque  particlesDatas
    //particlesDatas.bytelength = newCount * 6; //je tronque mon tableau// pas le droit avec floatarray
    const newParticlesDatas = new Float32Array(newCount * 6);
    newParticlesDatas.set(particlesDatas.slice(0, newCount * 6)); // copie les 6 * newCount premières valeurs
    particlesDatas = newParticlesDatas;}
function extandParticles(){} */

function changeCount(newCount) {
  stopRendering();
  console.log("changeCount()🔁 Changement du nombre de particules", newCount);

  const oldCount = particlesCount;
  // console.log("oc", oldCount, "nc", newCount);
  if (oldCount >= newCount) {
    //reduceParticles();
    //je tronque  particlesDatas
    //particlesDatas.bytelength = newCount * 6; //je tronque mon tableau mais  pas le droit avec floatarray
    const newParticlesDatas = new Float32Array(newCount * 6);
    newParticlesDatas.set(particlesDatas.slice(0, newCount * 6)); // copie les 6 * newCount premières valeurs
    particlesDatas = newParticlesDatas;
  } else {
    //extandParticles();
    //newCount>=oldCount
    //je rajoute newCount-oldCount valeur
    [particlesCount, particleSpeed, particleSize, particleColorName] =
      readSlider();

    particlesCount = generateParticlesCount(particlesCount);
    console.log("changeCount()particlesCount", particlesCount);
    particlesPositions = new Float32Array(particlesCount * 2); // 2 coordonnées (x, y) par particle

    particlesPositions = generateParticlesUniquePositions(particlesCount, 0.1);
    //console.log("changeCount()particlesPositions", particlesPositions); // ✅ Vérification
    // Génération des vitesses des particles
    particlesSpeeds = new Float32Array(particlesCount * 2); // 2 coordonnées (vx, vy) par particle
    particlesSpeeds = generateParticlesSpeed(particleSpeed, ecartTypeSpeed);
    //console.log("changeCount()particlesSpeeds", particlesSpeeds); // ✅ Vérification
    // Génération des tailles des particles
    particlesSizes = new Float32Array(particlesCount); // 1 taille (size) par particle
    particlesSizes = generateParticlesSize(particlesCount, particleSize);
    const newParticlesDatas = new Float32Array(particlesCount * 6); //oblige de faire ca car methode push fonctionne pas sur floatArray

    for (let i = 0; i < particlesCount; i++) {
      let index = i * 6;
      if (i < oldCount) {
        newParticlesDatas[index] = particlesDatas[index]; // ✅ Récupère X correctement
        newParticlesDatas[index + 1] = particlesDatas[index + 1]; // ✅ Récupère Y correctement
        newParticlesDatas[index + 2] = particlesDatas[index + 2]; // ✅ SIZE
        newParticlesDatas[index + 3] = 0.0; //particlesDatas[index + 3]; // ✅ _PAD pour alignement memoire gpu
        newParticlesDatas[index + 4] = particlesDatas[index + 4]; // ✅ VX
        newParticlesDatas[index + 5] = particlesDatas[index + 5]; // ✅ VY
      } else {
        newParticlesDatas[index] = particlesPositions[i][0]; // ✅ Récupère X correctement
        newParticlesDatas[index + 1] = particlesPositions[i][1]; // ✅ Récupère Y correctement
        newParticlesDatas[index + 2] = particlesSizes[i]; // ✅ SIZE
        newParticlesDatas[index + 3] = 0.0; // ✅ _PAD pour alignement memoire gpu
        newParticlesDatas[index + 4] = particlesSpeeds[i][0]; // ✅ VX
        newParticlesDatas[index + 5] = particlesSpeeds[i][1]; // ✅ VY
      }
    }
    //console.log("changeCount()", newParticlesDatas);

    // particlesDatas = new Float32Array(particlesCount * 6); // je recreer particlesDatas
    particlesDatas = newParticlesDatas;

    //const newColorDatas = new Float32Array(newCount); //oblige de faire ca car methode push fonctionne pas sur floatArray
    colorDatas = setColorsDatas(particleColorName, newCount);
    //extandBuffers();
    // writeToBuffer(colorBufferDif, colorDatas, "colorBufferDif");

    for (let i = 0; i < particlesCount; i++) {
      // newColorDatas = colorDatas[i];
      // const newParticlesDatas = new Float32Array(newCount * 6);
      //newColorDatas.set(colorDatas.slice(0, newCount)); // copie les 6 * newCount premières valeurs
      // particlesDatas = newParticlesDatas;
    }
  }

  particlesCount = newCount;
  extandBuffers();

  // 🔗 Met à jour les bind groups si besoin ici ! (si `particlesBuffer` est dans un `bindGroup`)
  updateBindGroups(); //ligne 1178

  //console.log(`✅ ${newCount} particules prêtes !`);
  startRendering();
}

function updateBindGroups() {
  console.log("updateBindGroups()");
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
      { binding: 1, resource: { buffer: uaspectUniformBuffer } }, // ✅ Ajout de `u_aspect`
      { binding: 3, resource: { buffer: particlesCountUniformBuffer } }, // ✅ Ajout de `particlesCount`
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
      /*     {
        binding: 2,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      }, */
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
      {
        binding: 4,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, // 👈 très important
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      },
    ],
  });

  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      // { binding: 2, resource: { buffer: colorBuffer } }, // ✅ Couleur (vec4<f32>)
      { binding: 1, resource: { buffer: uaspectUniformBuffer } }, // ✅ Aspect ratio (float32)
      { binding: 0, resource: { buffer: particlesBuffer } }, // ✅ Particules (storage buffer)
      { binding: 4, resource: { buffer: colorBufferDif } }, // particles colors differents
      { binding: 3, resource: { buffer: colorTypeUniformBuffer } }, // color aiguillage
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

/*   // 🔁 Sauvegarde temporaire de l'ancien buffer
  const oldParticlesBuffer = particlesBuffer;
  // 🔧 Création du nouveau buffer (avec nouvelle taille si nécessaire)
  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.VERTEX |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC,
  });
  // 📝 Écriture des nouvelles données dans le buffer GPU
  writeToBuffer(particlesBuffer, particlesDatas, "particlesBuffer");

  //ne pas oublier le correctionBuffer
  const oldCorrectionBuffer = correctionBuffer;
  correctionDatas = new Float32Array(4 * particlesCount); // Par défaut, Float32Array est déjà rempli de 0.0
  // correctionDatas.fill(0.0); // Mais tu peux le faire explicitement si besoin :
  correctionBuffer = device.createBuffer({
    size: correctionDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_DST |
      GPUBufferUsage.COPY_SRC,
  });
  writeToBuffer(correctionBuffer, correctionDatas, "correctionBuffer");

  //ne pas oublier le particlesCount buffer
  const oldparticlesCountUniformBuffer = particlesCountUniformBuffer;
  const uniformData = new Uint32Array([particlesCount]);
  particlesCountUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  writeToBuffer(
    particlesCountUniformBuffer,
    uniformData,
    "particlesCountUniformBuffer"
  );

  // ✅ Une fois qu'on est sûr que plus rien ne lesutilise
  // 1. Détruire les anciens buffer si nécessaire
  device.queue.onSubmittedWorkDone().then(() => {
    // Tu peux maintenant détruire / remplacer les buffers
    if (oldParticlesBuffer) oldParticlesBuffer.destroy();
    if (oldCorrectionBuffer) oldCorrectionBuffer.destroy();
    if (oldparticlesCountUniformBuffer)
      oldparticlesCountUniformBuffer.destroy();
    console.log("old buffers destroy");
  }); */
