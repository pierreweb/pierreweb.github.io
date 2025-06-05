async function init(state = {}) {
  const canvas = document.getElementById("glCanvas");
  const gl = canvas.getContext("webgl2");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!gl.getExtension("EXT_color_buffer_float")) {
    console.error("EXT_color_buffer_float not supported by your GPU.");
  }

  const aspect = canvas.width / canvas.height;

  // Sliders et options
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const rotationSlider = document.getElementById("rotationSlider");
  const colorSelect = document.getElementById("colorSelect");

  const sliders = [countSlider, sizeSlider, speedSlider];

  // Valeurs initiales
  let ballCount = parseInt(countSlider.value);
  let ballSize = parseFloat(sizeSlider.value);
  let ballSpeed = parseFloat(speedSlider.value);
  let selectedGradient = colorSelect.value;

  // 🟩 Fixées pour test
  //   ballCount = 10;
  //   ballSize = 0.05;
  //   ballSpeed = 0.5;
  /*   state.ballCount = parseInt(state.countSlider.value);
  state.ballSize = parseFloat(state.sizeSlider.value);
  state.ballSpeed = parseFloat(state.speedSlider.value); */

  // Quad plein écran (pour rendu compute et display)
  const quadVerts = new Float32Array([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ]);
  const quadVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
  gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Chargement des shaders
  const [computeSrc, displayFS, displayVS] = await Promise.all([
    loadShader("./scripts/shaderpingpong/compute4.frag"),
    loadShader("./scripts/shaderpingpong/display4.frag"),
    loadShader("./scripts/shaderpingpong/display4.vert"),
  ]);

  const computeProgram = createProgram(gl, displayVS, computeSrc);
  const displayProgram = createProgram(gl, displayVS, displayFS);

  if (!computeProgram || !displayProgram) {
    console.error("Erreur de compilation des shaders");
    return;
  }

  // Textures et framebuffer pour le ping-pong
  let texA, texB, fbo;
  function initTextures() {
    console.log("Initialisation des textures et FBO");
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Définit la couleur de fond (noir)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // Nettoie la couleur + la profondeur
    gl.bindTexture(gl.TEXTURE_2D, null); // Désactive la texture actuelle
    gl.bindBuffer(gl.ARRAY_BUFFER, null); // Désactive les buffers

    // Texture A : données initiales
    texA = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, ballCount, 1);

    const data = new Float32Array(ballCount * 4);
    for (let i = 0; i < ballCount; i++) {
      data[i * 4 + 0] = (Math.random() * 2 - 1) * 0.5; // x
      data[i * 4 + 1] = (Math.random() * 2 - 1) * 0.5; // y
      data[i * 4 + 2] = (Math.random() * 2 - 1) * ballSpeed; // vx
      data[i * 4 + 3] = (Math.random() * 2 - 1) * ballSpeed; // vy
    }
    console.log("ballSpeed", ballSpeed);
    console.log("ballCount", ballCount);
    console.log("Données initiales pour la texture A :", data);
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

    // Texture B : vide
    texB = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, ballCount, 1);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);

    // FBO
    fbo = gl.createFramebuffer();
  }

  return {
    gl,
    canvas,
    aspect,
    countSlider,
    sizeSlider,
    speedSlider,
    sliders,
    rotationSlider,
    colorSelect,
    ballCount,
    ballSize,
    ballSpeed,
    selectedGradient,
    computeProgram,
    displayProgram,
    texA,
    texB,
    fbo,
    vao,
    ping: true,
    lastTime: performance.now(),
    initTextures,
  };
}

function render(state) {
  const { gl, canvas, computeProgram, displayProgram, texA, texB, fbo } = state;

  const now = performance.now();
  const dt = (now - state.lastTime) / 1000;
  state.lastTime = now;

  // 🟩 Phase de calcul
  gl.useProgram(computeProgram);
  gl.bindVertexArray(state.vao);

  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_aspect"), state.aspect);
  gl.uniform1f(
    gl.getUniformLocation(computeProgram, "u_ballCount"),
    state.ballCount
  );
  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_dt"), dt);
  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_r"), state.ballSize);

  const inputTex = state.ping ? texA : texB;
  const outputTex = state.ping ? texB : texA;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, inputTex);
  gl.uniform1i(gl.getUniformLocation(computeProgram, "u_data"), 0);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    outputTex,
    0
  );
  gl.viewport(0, 0, state.ballCount, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // 🟩 Phase d'affichage
  gl.useProgram(displayProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, outputTex);
  gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);

  gl.uniform1f(
    gl.getUniformLocation(displayProgram, "u_ballCount"),
    state.ballCount
  );
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_aspect"), state.aspect);
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_r"), state.ballSize);

  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // 🟩 Prochain frame
  state.ping = !state.ping;
  requestAnimationFrame(() => render(state));
}

function change(state) {
  const gl = state.gl;

  state.ballCount = parseInt(state.countSlider.value);
  state.ballSize = parseFloat(state.sizeSlider.value);
  state.ballSpeed = parseFloat(state.speedSlider.value);
  state.selectedGradient = state.colorSelect.value;

  console.log(
    "🔄 Mise à jour :",
    state.ballCount,
    state.ballSize,
    state.ballSpeed
  );

  // Supprimer **proprement** les textures avant de recréer
  //if (state.texA) gl.deleteTexture(state.texA);
  //if (state.texB) gl.deleteTexture(state.texB);
  //state.texA = null;
  //state.texB = null;

  // 🟢 Réinitialisation complète
  init(state).then(() => {
    requestAnimationFrame(() => render(state));
  });
}

init().then((state) => {
  render(state);

  state.sliders.forEach((slider) => {
    slider.addEventListener("input", () => change(state));
  });

  window.addEventListener("resize", () => {
    state.canvas.width = window.innerWidth;
    state.canvas.height = window.innerHeight;
    state.aspect = state.canvas.width / state.canvas.height;
  });
});

async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load shader: ${url}`);
  }
  return response.text();
}

function createProgram(gl, vertexSrc, fragmentSrc) {
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSrc);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSrc);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(
      "Fragment shader error:",
      gl.getShaderInfoLog(fragmentShader)
    );
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Shader program link error:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}

export function goFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch((err) => {
      alert(`Erreur plein écran : ${err.message}`);
    });
  }
}
