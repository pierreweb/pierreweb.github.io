let canvas, adapter, device, context, format;
let computePipeline, renderPipeline;
let particlesBuffer,
  colorBuffer,
  velocityBuffer,
  indexBuffer,
  uniformBuffer,
  uniformBufferCompute;
let computeBindGroup, renderBindGroup;

let aspectRatio;
//let countSlider, sizeSlider, speedSlider, rotationSlider, colorSelect;
//const countSlider = null, sizeSlider = null, speedSlider = null, rotationSlider = null, colorSelect = null;

let particlesCount,
  particleSize,
  particlesSizes,
  particleSpeed,
  particlesSpeeds,
  particleRotation,
  particlesRotations,
  particleColor,
  particlesColors,
  particlesDatas;
//let aspect = canvas.width / canvas.height;

document.addEventListener("DOMContentLoaded", () => {
  init();
});

async function init() {
  canvas = document.querySelector("#gpuCanvas");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspectRatio = canvas.width / canvas.height;
  console.log("Aspect Ratio:", aspectRatio);
  adapter = await navigator.gpu.requestAdapter();
  device = await adapter.requestDevice();

  context = canvas.getContext("webgpu");
  format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  /*   countSlider = document.getElementById("countSlider");
  sizeSlider = document.getElementById("sizeSlider");
  speedSlider = document.getElementById("speedSlider");
  rotationSlider = document.getElementById("rotationSlider");
  colorSelect = document.getElementById("colorSelect"); */

  // lecture des valeurs initiales  des sliders
  [particlesCount, particleSpeed, particleSize, particleColor] = readSlider();
  console.log(
    "Initial values from sliders:",
    particlesCount,
    particleSpeed,
    particleSize,
    particleColor
  );
  /*  readSlider()
  particlesCount = parseInt(countSlider.value);
  particlesSize = parseFloat(sizeSlider.value) / 100; // taille initiale en pourcentage
  //console.log("particles Sizeinit", particlesSize);
  particlesSpeed = parseInt(speedSlider.value);
  particlesRotation = parseInt(rotationSlider.value);
  particlesColor = colorSelect.value; */

  //genération des positions des particules
  // Exemple : Générer 100 particules avec une distance minimale de 0.05
  let particlesPositions = new Float32Array(particlesCount * 2); // 2 coordonnées (x, y) par particle
  particlesPositions = generateParticlesUniquePositions(particlesCount, 0.05);
  console.log(particlesPositions); // ✅ Vérification
  // Génération des vitesses des particles
  let particlesSpeeds = new Float32Array(particlesCount * 2); // 2 coordonnées (vx, vy) par particle
  particlesSpeeds = generateParticlesSpeed(particleSpeed);
  console.log(particlesSpeeds); // ✅ Vérification
  // Génération des tailles des particles
  let particlesSizes = new Float32Array(particlesCount); // 1 taille (size) par particle
  particlesSizes = generateParticlesSize(particlesCount, particleSize);
  console.log(particlesSizes); // ✅ Vérification
  let particlesColors = new Float32Array(4); // 4 valeurs pour la couleur (RGBA)

  //console.log("particlesColor:", particlesColor); // ✅ Vérification de la couleur

  //let particlesDatas = new Float32Array(particlesCount * 4); // 4 coordonnées (x, y, vx, vy) par particule
  let particlesDatas = new Float32Array(particlesCount * 5); // ✅ (X,Y,VX,VY,Size) 5 valeurs par particule
  // ✅ Ajouter les positions (x, y) aux premières cases
  particlesDatas.set(particlesPositions, 0);
  // ✅ Ajouter les vitesses (vx, vy) après les positions
  particlesDatas.set(particlesSpeeds, particlesCount * 2);
  // ✅ Ajouter les tailles (size) juste après les positions
  particlesDatas.set(particlesSizes, particlesCount * 3);
  console.log(particlesDatas); // 🚀 Vérification que les données sont bien fusionnées

  // Création des buffers de données

  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, // ✅ Ajout du mode Storage
    mappedAtCreation: true,
  });
  //console.log("particlesBuffer:", particlesBuffer);
  const mappedParticles = new Float32Array(particlesBuffer.getMappedRange());
  mappedParticles.set(particlesDatas);
  particlesBuffer.unmap();

  // Création du buffer de couleur
  particlesColors = [1.0, 0.0, 0.0, 1.0]; // Couleur rouge par défaut
  //particlesColors=(particlesColor === "red") ? new Float32Array([1.0, 0.0, 0.0, 1.0]) :

  colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT, // 4 valeurs pour la couleur (RGBA)
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, particlesColors); // Mise à jour du buffer avec la couleur
  //console.log("colorBuffer:", colorBuffer);

  // Création du buffer d'aspect ratio = canvas.width / canvas.height;
  uniformBuffer = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([aspectRatio])); // Mise à jour du buffer avec `u_aspect`

  /*   uniformBufferCompute = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    uniformBufferCompute,
    0,
    new Float32Array([aspectRatio])
  ); // Mise à jour du buffer avec `u_aspect` */

  // Création du buffer de vitesse
  /*   velocityBuffer = device.createBuffer({
    size: velocities.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, // ✅ Ajout du mode Storage
    mappedAtCreation: true,
  });

  const mappedVel = new Float32Array(velocityBuffer.getMappedRange());
  mappedVel.set(velocities);
  velocityBuffer.unmap(); */

  // Chargement des shaders
  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/compute1.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/vertex1.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/fragment1.wgsl")).text(),
  });

  // Création des pipelines
  // Compute pipeline
  /*   const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
    ],
  }); */
  //compute bind groups

  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      }, // Positions
      // {
      //   binding: 1,
      //   visibility: GPUShaderStage.COMPUTE,
      //   buffer: { type: "storage" },
      // }, // Vitesses
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      }, // ✅ Ajout de `u_aspect`
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

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: particlesBuffer } }, // Positions
      // { binding: 1, resource: { buffer: velocityBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Ajout de `u_aspect`
      { binding: 2, resource: { buffer: colorBuffer } }, // Couleur (optionnel pour le compute)
    ],
  });

  // render bind groups
  //create bing group layout

  const renderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      }, // ✅ Ajout de `u_aspect`
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "uniform" },
      }, // color
    ],
  });

  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: colorBuffer } }, // Couleur
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Ajout de `u_aspect`
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

    primitiveTopology: "point-list", // ✅ Utilisation de "point-list" pour dessiner des points
  });

  render();
}

async function render() {
  //function render() {
  const encoder = device.createCommandEncoder();

  // Compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(particlesCount / 64));
  computePass.end();

  //console.log("Positions après computePass:", vertices);
  // console.log("ballBuffer accessible ?", ballBuffer);

  //console.log("Vitesse après computePass:", velocities);
  //console.log("velocityBuffer accessible ?", velocityBuffer);
  // console.log("ballBuffer:", ballBuffer);
  // console.log("velocityBuffer:", velocityBuffer);

  // Render pass
  const textureView = context.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        //clearValue: { r: 0, g: 0, b: 0, a: 1 },
        clearValue: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, // ✅ Un fond gris foncé visible
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });

  renderPass.setPipeline(renderPipeline);
  renderPass.setVertexBuffer(0, particlesBuffer);
  //renderPass.setIndexBuffer(indexBuffer, "uint16");
  renderPass.setBindGroup(0, renderBindGroup);

  renderPass.drawIndexed(particlesCount * 4, 1, 0, 0, 0);
  renderPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}
//--------------------------------------functions----------------------------
function readSlider() {
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const rotationSlider = document.getElementById("rotationSlider");
  const colorSelect = document.getElementById("colorSelect");

  // Lecture des valeurs des sliders
  const particlesCount = parseInt(countSlider.value);
  const particleSpeed = parseFloat(speedSlider.value);
  const particleSize = parseFloat(sizeSlider.value) / 100; // Taille en pourcentage
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
  let speeds = [];
  for (let i = 0; i < particlesCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    speeds.push([
      Math.cos(angle) * particleSpeed,
      Math.sin(angle) * particleSpeed,
    ]);
  }
  return speeds;
}
function generateParticlesSize(count, size) {
  let sizes = [];
  for (let i = 0; i < count; i++) {
    sizes.push(size + 0.1 * size * (Math.random() * 2 - 1)); // Utilise la taille définie par le slider
  }
  return sizes;
}

// 🎚️ Exemples d'interaction (connecte ça à ton slider panel)
/* window.setParticulesCount = (n) => {
  particlesCount = n;
  change(particlesCount, particlesSpeed, particlesSize, particlesColor);
  //initTriangles(n);
};

window.setParticlesSize = (s) => {
  particlesSize = s;
};

window.setParticlesColor = (name) => {
  selectedColor = name;
  //initTriangles(triangleCount);
};

window.setRotationSpeed = (omega) => {
  particlesRotation = omega;
};
window.setParticlesSpeed = (speed) => {
  particlesSpeed = speed;
}; */

// sliders.js (ou à la fin de shader3withsettle_fixed.js si tout est dans un seul fichier)

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");

countSlider.addEventListener("input", () => {
  change(
    parseInt(countSlider.value),
    particlesSpeed,
    particlesSize,
    particlesColor
  );
  //setParticlesCount(parseInt(countSlider.value));
});

sizeSlider.addEventListener("input", () => {
  change(
    particlesCount,
    particlesSpeed,
    parseFloat(sizeSlider.value) / 100, // taille en pourcentage
    particlesColor
  );
  //setParticlesSize(parseFloat(sizeSlider.value) / 100);
});

speedSlider.addEventListener("input", () => {
  change(
    particlesCount,
    parseFloat(speedSlider.value),
    particlesSize,
    particlesColor
  );
  // console.log("parseFloat(speedSlider.value)", parseFloat(speedSlider.value));
});

rotationSlider.addEventListener("input", () => {
  // setRotationSpeed(parseFloat(rotationSlider.value));
});

colorSelect.addEventListener("change", () => {
  change(particlesCount, particlesSpeed, particlesSize, colorSelect.value);
  //setGradient(colorSelect.value);
});

/* export function toggleFullscreen() {
  const canvas = document.getElementById("glCanvas");
  if (!document.fullscreenElement) {
    canvas.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
} */

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
  console.log("Canvas found:", canvas);
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
    speed !== particlesSpeed ||
    size !== particlesSize ||
    color !== particlesColor
  ) {
    console.log("Changing parameters:", count, speed, size, color);
  }
  if (count !== particlesCount) {
    particlesCount = count;
    console.log("Changing count to:", particlesCount);
    // Recréer les buffers et pipelines si le nombre de particules change
  }
  if (size !== particlesSize) {
    particlesSize = size;
    console.log("Changing size to:", particlesSize);
    // Recréer les buffers si la taille change
  }
  if (speed !== particlesSpeed) {
    particlesSpeed = speed;
    console.log("Changing speed to:", particlesSpeed);
    // Recréer les vitesses si la vitesse change
  }
  if (color !== particlesColor) {
    particlesColor = color;
    console.log("Changing color to:", particlesColor);
    // Recréer le buffer de couleur si la couleur change
  }

  // particlesCount = count;
  // particlesSpeed= speed;
  // particlesSize= size;
  // particlesColor = color;
  //init();
}
