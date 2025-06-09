let canvas, adapter, device, context, format;
let computePipeline, renderPipeline;
let particlesBuffer, colorBuffer, uniformBuffer;
let computeBindGroup, renderBindGroup;
let aspectRatio;

let particlesCount, particleSize, particleSpeed, particleColor;

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

  [particlesCount, particleSpeed, particleSize, particleColor] = readSlider();
  console.log(
    "Initial values:",
    particlesCount,
    particleSpeed,
    particleSize,
    particleColor
  );

  // Positions
  let positionsArray = generateParticlesUniquePositions(particlesCount, 0.05);
  let particlesPositions = new Float32Array(positionsArray.flat());
  console.log("particlesPositions:", particlesPositions);

  // Vitesses
  let particlesSpeeds = generateParticlesSpeed(particlesCount, particleSpeed);
  console.log("particlesSpeeds:", particlesSpeeds);

  // Tailles
  let particlesSizes = generateParticlesSize(particlesCount, particleSize);
  console.log("particlesSizes:", particlesSizes);

  // Fusion des données
  let particlesDatas = new Float32Array(particlesCount * 5);
  particlesDatas.set(particlesPositions, 0);
  particlesDatas.set(particlesSpeeds, particlesCount * 2);
  particlesDatas.set(particlesSizes, particlesCount * 4);
  console.log("particlesDatas:", particlesDatas);

  // Buffer de particules
  particlesBuffer = device.createBuffer({
    size: particlesDatas.byteLength,
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(particlesBuffer.getMappedRange()).set(particlesDatas);
  particlesBuffer.unmap();

  // Couleur
  let particlesColors = [1.0, 0.0, 0.0, 1.0];
  colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, new Float32Array(particlesColors));

  // Aspect ratio
  uniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([aspectRatio]));

  // Shaders
  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/compute1.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/vertex1.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu1/fragment1.wgsl")).text(),
  });

  // Compute pipeline et bind group
  const computeBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({
      bindGroupLayouts: [computeBindGroupLayout],
    }),
    compute: { module: computeModule, entryPoint: "main" },
  });
  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: particlesBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
  });

  // Render pipeline et bind group
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
      },
    ],
  });
  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: colorBuffer } },
      { binding: 1, resource: { buffer: uniformBuffer } },
    ],
  });
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
    primitive: { topology: "point-list" },
  });

  render();
}

async function render() {
  const encoder = device.createCommandEncoder();

  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(particlesCount / 64));
  computePass.end();

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
  renderPass.setVertexBuffer(0, particlesBuffer);
  renderPass.setBindGroup(0, renderBindGroup);
  renderPass.draw(particlesCount, 1, 0, 0); // Remplacé drawIndexed par draw
  renderPass.end();

  device.queue.submit([encoder.finish()]);
  requestAnimationFrame(render);
}

function readSlider() {
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const colorSelect = document.getElementById("colorSelect");
  const particlesCount = parseInt(countSlider.value);
  const particleSpeed = parseFloat(speedSlider.value);
  const particleSize = parseFloat(sizeSlider.value) / 100;
  const particleColor = colorSelect.value;
  return [particlesCount, particleSpeed, particleSize, particleColor];
}

function generateParticlesUniquePositions(particlesCount, minDist) {
  let positions = [];
  while (positions.length < particlesCount) {
    let newPos = [(Math.random() * 2 - 1) * 0.9, (Math.random() * 2 - 1) * 0.9];
    let isUnique = positions.every(
      (p) => Math.hypot(p[0] - newPos[0], p[1] - newPos[1]) >= minDist
    );
    if (isUnique) positions.push(newPos);
  }
  return positions;
}

function generateParticlesSpeed(particlesCount, speed) {
  let speeds = new Float32Array(particlesCount * 2);
  for (let i = 0; i < particlesCount; i++) {
    let angle = Math.random() * 2 * Math.PI;
    speeds[i * 2] = Math.cos(angle) * speed;
    speeds[i * 2 + 1] = Math.sin(angle) * speed;
  }
  return speeds;
}

function generateParticlesSize(particlesCount, size) {
  let sizes = new Float32Array(particlesCount);
  for (let i = 0; i < particlesCount; i++) {
    sizes[i] = size + 0.1 * size * (Math.random() * 2 - 1);
  }
  return sizes;
}
