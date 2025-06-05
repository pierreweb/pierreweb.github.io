let canvas, adapter, device, context, format;
let computePipeline, renderPipeline;
let ballBuffer, velocityBuffer;
let computeBindGroup, renderBindGroup;
let ballCount = 100;
let speedBalls = 0.01;
let sizeBalls = 0.02;
let colorBalls = [1.0, 0.0, 0.0, 1.0]; // rouge

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
  adapter = await navigator.gpu.requestAdapter();
  device = await adapter.requestDevice();

  context = canvas.getContext("webgpu");
  format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: "opaque",
  });

  const vertices = new Float32Array(ballCount * 2);
  const velocities = new Float32Array(ballCount * 2);

  for (let i = 0; i < ballCount; i++) {
    vertices[i * 2 + 0] = (Math.random() * 2 - 1) * 0.9; // x
    vertices[i * 2 + 1] = (Math.random() * 2 - 1) * 0.9; // y
    const angle = Math.random() * 2 * Math.PI;
    velocities[i * 2 + 0] = Math.cos(angle) * speedBalls;
    velocities[i * 2 + 1] = Math.sin(angle) * speedBalls;
  }

  ballBuffer = device.createBuffer({
    size: vertices.byteLength,
    usage:
      GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(ballBuffer.getMappedRange()).set(vertices);
  ballBuffer.unmap();
  // console.log(new Float32Array(vertices));

  velocityBuffer = device.createBuffer({
    size: velocities.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Float32Array(velocityBuffer.getMappedRange()).set(velocities);
  velocityBuffer.unmap();

  const computeModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/compute.wgsl")).text(),
  });
  const vertexModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/vertex.wgsl")).text(),
  });
  const fragmentModule = device.createShaderModule({
    code: await (await fetch("./scripts/webgpu/fragment.wgsl")).text(),
  });

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
        buffer: { type: "storage" },
      },
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

  computeBindGroup = device.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: ballBuffer } },
      { binding: 1, resource: { buffer: velocityBuffer } },
    ],
  });

  const renderBindGroupLayout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        buffer: { type: "uniform" },
      },
    ],
  });

  const colorBuffer = device.createBuffer({
    size: 4 * Float32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(colorBuffer, 0, new Float32Array(colorBalls));

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

  renderBindGroup = device.createBindGroup({
    layout: renderBindGroupLayout,
    entries: [{ binding: 0, resource: { buffer: colorBuffer } }],
  });

  render();
}

function render() {
  const encoder = device.createCommandEncoder();

  // compute pass
  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(Math.ceil(ballCount / 64));
  computePass.end();

  // render pass
  const textureView = context.getCurrentTexture().createView();
  const renderPass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: textureView,
        clearValue: { r: 0, g: 0, b: 0, a: 1 },
        loadOp: "clear",
        storeOp: "store",
      },
    ],
  });
  renderPass.setPipeline(renderPipeline);
  renderPass.setVertexBuffer(0, ballBuffer);
  renderPass.setBindGroup(0, renderBindGroup);
  renderPass.draw(ballCount, 1, 0, 0);
  renderPass.end();

  device.queue.submit([encoder.finish()]);

  requestAnimationFrame(render);
}
