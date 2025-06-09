let time = 0;

const canvas = document.getElementById("gpuCanvas");
//const button = document.getElementById("generate");

const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();
const context = canvas.getContext("webgpu");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const format = navigator.gpu.getPreferredCanvasFormat();
context.configure({
  device: device,
  format: format,
  alphaMode: "opaque",
});

// Crée les sommets pour un cercle approximatif (triangle fan-like)
// Crée les sommets pour un cercle en triangle-list
const circleVertexCount = 30;
const radius = 0.05; // Rayon du cercle
const vertices = [];
let center = [0.0, 0.0];
console.log("init", center[0], center[1]);

/* for (let i = 0; i < circleVertexCount; i++) {
  const angle1 = (i / circleVertexCount) * 2 * Math.PI;
  const angle2 = ((i + 1) / circleVertexCount) * 2 * Math.PI;

  // Premier sommet : centre du cercle
  vertices.push(center[0], center[1]);

  // Deuxième sommet : point 1 du triangle, décalé par le centre
  vertices.push(
    center[0] + radius * Math.cos(angle1),
    center[1] + radius * Math.sin(angle1)
  );

  // Troisième sommet : point 2 du triangle, décalé par le centre
  vertices.push(
    center[0] + radius * Math.cos(angle2),
    center[1] + radius * Math.sin(angle2)
  );
} */
for (let i = 0; i < circleVertexCount; i++) {
  const angle1 = (i / circleVertexCount) * 2 * Math.PI;
  const angle2 = ((i + 1) / circleVertexCount) * 2 * Math.PI;

  vertices.push(0.0, 0.0); // centre du cercle toujours à l'origine
  vertices.push(radius * Math.cos(angle1), radius * Math.sin(angle1));
  vertices.push(radius * Math.cos(angle2), radius * Math.sin(angle2));
}

const vertexBuffer = device.createBuffer({
  size: vertices.length * 4,
  usage: GPUBufferUsage.VERTEX,
  mappedAtCreation: true,
});
new Float32Array(vertexBuffer.getMappedRange()).set(vertices);
vertexBuffer.unmap();

// Buffer de stockage pour (x, y)
const posBuffer = device.createBuffer({
  size: 2 * 4,
  usage:
    GPUBufferUsage.STORAGE |
    GPUBufferUsage.VERTEX |
    GPUBufferUsage.COPY_SRC |
    GPUBufferUsage.COPY_DST,
});
device.queue.writeBuffer(posBuffer, 0, new Float32Array(center));
// console.log(`Position initiale: x=${center[0]}, y=${center[1]}`);

const timeBuffer = device.createBuffer({
  size: 4,
  usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
});

// Shaders
const vertexModule = device.createShaderModule({
  code: await (await fetch("./scripts/webgpu2/vertex2.wgsl")).text(),
});
const fragmentModule = device.createShaderModule({
  code: await (await fetch("./scripts/webgpu2/fragment2.wgsl")).text(),
});

// Pipeline rendu
const renderPipeline = device.createRenderPipeline({
  layout: "auto",
  vertex: {
    module: vertexModule,
    entryPoint: "main",
    buffers: [
      {
        arrayStride: 2 * 4,
        attributes: [{ shaderLocation: 0, offset: 0, format: "float32x2" }],
      },
    ],
  },
  fragment: {
    module: fragmentModule,
    entryPoint: "main",
    targets: [{ format: format }],
  },
  primitive: {
    topology: "triangle-list", // 👍✅ remplacé par "triangle-list"
  },
});

// Bind group (position)
const bindGroup = device.createBindGroup({
  layout: renderPipeline.getBindGroupLayout(0),
  entries: [
    {
      binding: 0,
      resource: {
        buffer: posBuffer,
      },
    },
  ],
});

// Compute shader
const computeModule = device.createShaderModule({
  code: await (await fetch("./scripts/webgpu2/compute2.wgsl")).text(),
});
const computePipeline = device.createComputePipeline({
  layout: "auto",
  compute: {
    module: computeModule,
    entryPoint: "main",
  },
});

const computeBindGroup = device.createBindGroup({
  layout: computePipeline.getBindGroupLayout(0),
  entries: [
    { binding: 0, resource: { buffer: posBuffer } },
    { binding: 1, resource: { buffer: timeBuffer } },
  ],
});

// Fonction pour exécuter compute + render
async function computeAndRender() {
  // Compute pass (génère une nouvelle position aléatoire)
  const encoder = device.createCommandEncoder();

  const computePass = encoder.beginComputePass();
  computePass.setPipeline(computePipeline);
  computePass.setBindGroup(0, computeBindGroup);
  computePass.dispatchWorkgroups(1);
  computePass.end();

  // Copie posBuffer pour lecture CPU (read-back)
  const readBuffer = device.createBuffer({
    size: 2 * 4,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  encoder.copyBufferToBuffer(posBuffer, 0, readBuffer, 0, 2 * 4);

  // Render pass
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
  renderPass.setBindGroup(0, bindGroup);
  renderPass.setVertexBuffer(0, vertexBuffer);
  renderPass.draw(vertices.length / 2, 1, 0, 0);
  renderPass.end();

  device.queue.submit([encoder.finish()]);

  // Lire la nouvelle position et l'afficher
  await readBuffer.mapAsync(GPUMapMode.READ);
  const array = new Float32Array(readBuffer.getMappedRange());
  console.log(`Nouvelle position sortie: x=${array[0]}, y=${array[1]}`);
  readBuffer.unmap();
  // render();
  time += 0.1;
  device.queue.writeBuffer(timeBuffer, 0, new Float32Array([time]));
  requestAnimationFrame(computeAndRender);
}
/* async function render() {
  time += 0.1;
  console.log("time");

  requestAnimationFrame(render);
} */

// Premier rendu
computeAndRender();

window.changeCenter = function () {
  console.log("Changement de position");
  // Génère une nouvelle position aléatoire
  const newX = (Math.random() - 0.5) * 2; // Entre -1 et 1
  const newY = (Math.random() - 0.5) * 2; // Entre -1 et 1
  center = [newX, newY];
  console.log("Nouvelle position entrée", center[0], center[1]);

  // Met à jour le buffer de position
  device.queue.writeBuffer(posBuffer, 0, new Float32Array(center));

  // Exécute compute + render
  computeAndRender();
};
// Clic sur le bouton -> nouvelle position
//button.addEventListener("click", computeAndRender());
document.getElementById("generate").addEventListener("click", changeCenter);
