let canvas, adapter, device, context, format;
let computePipeline, renderPipeline;
let ballBuffer,
  velocityBuffer,
  indexBuffer,
  uniformBuffer,
  uniformBufferCompute;
let computeBindGroup, renderBindGroup;
let ballCount = 20;
let speedBalls = 0.01;
let sizeBalls = 0.02;
let colorBalls = [1.0, 0.0, 0.0, 1.0]; // rouge
let vertices;
let velocities;
let aspectRatio;
//const countSlider,sizeSlider,speedSlider,rotationSlider,colorSelect;
let particlesCount,
  particlesSize,
  particlesSpeed,
  particlesRotation,
  particlesColor;
//let aspect = canvas.width / canvas.height;

document.addEventListener("DOMContentLoaded", () => {
  init();
});

// Changer les paramètres dynamiquement (slider)
export function change(count, speed, size, color) {
  ballCount = count;
  speedBalls = speed;
  sizeBalls = size;
  colorBalls = color;
  init();
}

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
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const rotationSlider = document.getElementById("rotationSlider");
  const colorSelect = document.getElementById("colorSelect");
  let aspect = canvas.width / canvas.height;

  // lecture des valeurs initiales  des sliders
  particlesCount = parseInt(countSlider.value);
  particlesSize = parseFloat(sizeSlider.value) / 100; // taille initiale en pourcentage
  //console.log("particles Sizeinit", particlesSize);
  particlesSpeed = parseInt(speedSlider.value);
  particlesRotation = parseInt(rotationSlider.value);
  particlesColor = colorSelect.value;

  // Génération des sommets
  vertices = new Float32Array(ballCount * 8); // 4 sommets par balle
  for (let i = 0; i < ballCount; i++) {
    const x = (Math.random() * 2 - 1) * 0.9;
    const y = (Math.random() * 2 - 1) * 0.9;
    const size = sizeBalls;
    vertices.set(
      [
        x - size,
        y - size, // Bas gauche
        x + size,
        y - size, // Bas droit
        x + size,
        y + size, // Haut droit
        x - size,
        y + size, // Haut gauche
      ],
      i * 8
    );
  }
  // Génération des vitesses
  velocities = new Float32Array(ballCount * 2);
  for (let i = 0; i < ballCount; i++) {
    const angle = Math.random() * 2 * Math.PI;
    velocities[i * 2 + 0] = Math.cos(angle) * speedBalls;
    velocities[i * 2 + 1] = Math.sin(angle) * speedBalls;
  }
  // Création du buffer de sommets
  ballBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST, // ✅ Ajout du mode Storage
    mappedAtCreation: true,
  });

  const mapped = new Float32Array(ballBuffer.getMappedRange());
  mapped.set(vertices);
  ballBuffer.unmap(); // ✅ Démapper après avoir écrit

  // Création de l'index buffer pour assembler les triangles

  const indices = new Uint16Array(ballCount * 6);

  for (let i = 0; i < ballCount; i++) {
    const baseIndex = i * 4;

    indices.set(
      [
        baseIndex,
        baseIndex + 1,
        baseIndex + 2,
        baseIndex + 2,
        baseIndex + 3,
        baseIndex,
      ],
      i * 6
    );
  }

  indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });

  new Uint16Array(indexBuffer.getMappedRange()).set(indices);
  indexBuffer.unmap();

  // Création du buffer d'aspect ratio
  aspectRatio = canvas.width / canvas.height;
  uniformBuffer = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([aspectRatio])); // Mise à jour du buffer avec `u_aspect`

  uniformBufferCompute = device.createBuffer({
    size: 4, // Un seul `f32`
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    uniformBufferCompute,
    0,
    new Float32Array([aspectRatio])
  ); // Mise à jour du buffer avec `u_aspect`

  // Création du buffer de vitesse
  velocityBuffer = device.createBuffer({
    size: velocities.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST, // ✅ Ajout du mode Storage
    mappedAtCreation: true,
  });

  const mappedVel = new Float32Array(velocityBuffer.getMappedRange());
  mappedVel.set(velocities);
  velocityBuffer.unmap();

  // Chargement des shaders
  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/compute.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/vertex.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/fragment.wgsl")).text(),
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
        buffer: { type: "storage" },
      }, // Vitesses
      {
        binding: 2,
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
  //console.log("ballBuffer:", ballBuffer);
  //console.log("velocityBuffer:", velocityBuffer);

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: ballBuffer } }, // Positions
      { binding: 1, resource: { buffer: velocityBuffer } },
      { binding: 2, resource: { buffer: uniformBufferCompute } }, // ✅ Ajout de `u_aspect`
    ],
  });

  // Bind groups

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
    ],
  });

  const colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  device.queue.writeBuffer(colorBuffer, 0, new Float32Array(colorBalls));

  // Création du pipeline de rendu

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

    // primitive: { topology: "triangle-list" },
    primitiveTopology: "triangle-list",
  });

  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: colorBuffer } }, // Couleur
      { binding: 1, resource: { buffer: uniformBuffer } }, // ✅ Ajout de `u_aspect`
    ],
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
  computePass.dispatchWorkgroups(Math.ceil(ballCount / 64));
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
  renderPass.setVertexBuffer(0, ballBuffer);
  renderPass.setIndexBuffer(indexBuffer, "uint16");
  renderPass.setBindGroup(0, renderBindGroup);

  renderPass.drawIndexed(ballCount * 6, 1, 0, 0, 0);
  renderPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}
