const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Vérifie extension pour float textures
if (!gl.getExtension("EXT_color_buffer_float")) {
  console.error("EXT_color_buffer_float not supported by your GPU.");
}

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");
let aspect = canvas.width / canvas.height;

// lecture des valeurs initiales  des sliders
let ballCount = parseInt(countSlider.value);
let ballSize = parseFloat(sizeSlider.value) / 100; // taille initiale en pourcentage
//console.log("triangleSizeinit", triangleSize);
let ballSpeed = parseInt(speedSlider.value);
//let rotationSpeed = parseInt(rotationSlider.value);
let selectedGradient = colorSelect.value;

// VBO et VAO pour le quad plein écran
const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const quadVbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

// Helper : charger un shader
async function loadShader(url) {
  const res = await fetch(url);
  return res.text();
}

// Helper : créer un programme
async function createProgram(vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  console.log(gl.getShaderInfoLog(vs));

  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  console.log(gl.getShaderInfoLog(fs));

  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  console.log(gl.getProgramInfoLog(program));

  return program;
}

// Initialiser les textures et framebuffer pour un nombre dynamique de balles
// let ballCount = 7;
console.log("Ball count:", ballCount);
let texA, texB, fbo;

function initTextures() {
  texA = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texA);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, ballCount, 1);

  const data = new Float32Array(ballCount * 4);
  for (let i = 0; i < ballCount; i++) {
    data[i * 4 + 0] = (Math.random() * 2 - 1) * 0.5 * aspect; // pos.x
    data[i * 4 + 1] = (Math.random() * 2 - 1) * 0.5; // pos.y
    data[i * 4 + 2] = (Math.random() * 2 - 1) * 0.4; // vel.x
    data[i * 4 + 3] = (Math.random() * 2 - 1) * 0.4; // vel.y
  }
  gl.texSubImage2D(
    gl.TEXTURE_2D,
    0,
    0,
    0,
    ballCount,
    1,
    gl.RGBA,
    gl.FLOAT,
    data
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  texB = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texB);
  gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, ballCount, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

  fbo = gl.createFramebuffer();
}

// Main
Promise.all([
  loadShader("./scripts/shaderpingpong/compute1.frag"),
  loadShader("./scripts/shaderpingpong/display1.frag"),
  loadShader("./scripts/shaderpingpong/display1.vert"),
]).then(async ([computeSrc, displayFS, displayVS]) => {
  console.log("Shaders loaded");

  const computeProgram = await createProgram(displayVS, computeSrc);
  const displayProgram = await createProgram(displayVS, displayFS);

  initTextures();

  let ping = true;
  let lastTime = performance.now();

  function render() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // --- Compute step ---
    gl.useProgram(computeProgram);
    gl.uniform1f(gl.getUniformLocation(computeProgram, "u_aspect"), aspect);
    gl.uniform1f(
      gl.getUniformLocation(computeProgram, "u_ballCount"),
      ballCount
    );
    gl.uniform1f(gl.getUniformLocation(computeProgram, "u_dt"), dt);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const inputTex = ping ? texA : texB;
    const outputTex = ping ? texB : texA;
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.uniform1i(gl.getUniformLocation(computeProgram, "u_data"), 0);

    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      outputTex,
      0
    );
    gl.viewport(0, 0, ballCount, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    // --- Display step ---
    gl.useProgram(displayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, outputTex);
    gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);
    gl.uniform1f(
      gl.getUniformLocation(displayProgram, "u_ballCount"),
      ballCount
    );
    gl.uniform1f(gl.getUniformLocation(displayProgram, "u_aspect"), aspect);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    ping = !ping;
    requestAnimationFrame(render);
  }

  render();
});

// Gestion des événements pour les sliders
countSlider.addEventListener("input", () =>
  setBallCount(parseInt(countSlider.value))
);
sizeSlider.addEventListener("input", () =>
  setTriangleSize(parseFloat(sizeSlider.value))
);

speedSlider.addEventListener("input", () =>
  setTriangleSpeed(parseFloat(speedSlider.value))
);
rotationSlider.addEventListener("input", () =>
  setTriangleRotation(parseFloat(rotationSlider.value))
);
colorSelect.addEventListener("change", () =>
  changeTriangleColors(colorSelect.value)
);
// Événement de changement de taille du canvas
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspect = canvas.width / canvas.height;
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_aspect"), aspect);

  // gl.uniform1f(aspectLoc, aspect);
  gl.viewport(0, 0, canvas.width, canvas.height);
}

export function goFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    container.requestFullscreen().catch((err) => {
      alert(`Erreur plein écran : ${err.message}`);
    });
  }
}
function setBallCount(count) {
  ballCount = count;
  // initTextures();
  console.log("Ball count set to:", ballCount);
}
