async function init() {
  const canvas = document.getElementById("glCanvas");
  const gl = canvas.getContext("webgl2");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  if (!gl.getExtension("EXT_color_buffer_float")) {
    console.error("EXT_color_buffer_float not supported by your GPU.");
  }

  let aspect = canvas.width / canvas.height;

  // Sliders et options
  const countSlider = document.getElementById("countSlider");
  const sizeSlider = document.getElementById("sizeSlider");
  const speedSlider = document.getElementById("speedSlider");
  const rotationSlider = document.getElementById("rotationSlider");
  const colorSelect = document.getElementById("colorSelect");

  const sliders = [countSlider, speedSlider, sizeSlider];

  // 🟩 Correction: les valeurs initiales sont directement lues des sliders
  let ballCount = parseInt(countSlider.value);
  let ballSize = parseFloat(sizeSlider.value);
  let ballSpeed = parseFloat(speedSlider.value);
  let selectedGradient = colorSelect.value;

  // 🟩  valeurs forcées pour test
  ballSize = 0.01;
  ballCount = 10;
  ballSpeed = 0.1;

  // 🟩 VBO / VAO
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

  // Shaders
  const [computeSrc, displayFS, displayVS] = await Promise.all([
    loadShader("./scripts/shaderpingpong/compute2.frag"),
    loadShader("./scripts/shaderpingpong/display2.frag"),
    loadShader("./scripts/shaderpingpong/display2.vert"),
  ]);

  //const computeProgram = await createProgram(displayVS, computeSrc);
  //const displayProgram = await createProgram(displayVS, displayFS);
  const computeProgram = await createProgram(displayVS, computeSrc);
  const displayProgram = await createProgram(displayVS, displayFS);

  if (!computeProgram) {
    console.error("❌ Erreur de compilation du Compute Shader !");
    return;
  }
  if (!displayProgram) {
    console.error("❌ Erreur de compilation du Display Shader !");
    return;
  }

  if (!gl.getProgramParameter(computeProgram, gl.LINK_STATUS)) {
    console.error(
      "❌ Erreur de linkage du Compute Shader :",
      gl.getProgramInfoLog(computeProgram)
    );
    return;
  }

  // Textures & FBO
  let texA, texB, fbo;

  function initTextures() {
    texA = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, ballCount, 1);

    const data = new Float32Array(ballCount * 4);
    for (let i = 0; i < ballCount; i++) {
      data[i * 4 + 0] = (Math.random() * 2 - 1) * 0.5;
      data[i * 4 + 1] = (Math.random() * 2 - 1) * 0.5;
      data[i * 4 + 2] = (Math.random() * 2 - 1) * ballSpeed;
      data[i * 4 + 3] = (Math.random() * 2 - 1) * ballSpeed;
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

  initTextures();

  return {
    canvas,
    gl,
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

  // 🟩 Compute shader
  gl.useProgram(computeProgram);
  const u_data = gl.getUniformLocation(computeProgram, "u_data");
  if (!u_data) console.error("Failed to get location for u_data");

  // gl.useProgram(computeProgram);
  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_aspect"), state.aspect);
  gl.uniform1f(
    gl.getUniformLocation(computeProgram, "u_ballCount"),
    state.ballCount
  );
  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_dt"), dt);
  gl.uniform1f(gl.getUniformLocation(computeProgram, "u_r"), state.ballSize);

  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  const inputTex = state.ping ? texA : texB;
  const outputTex = state.ping ? texB : texA;

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
  gl.viewport(0, 0, state.ballCount, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // 🟩 Display shader

  gl.useProgram(displayProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texA); // Assurer que la texture est active
  gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);

  //gl.bindTexture(gl.TEXTURE_2D, outputTex);
  // gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);
  gl.uniform1f(
    gl.getUniformLocation(displayProgram, "u_ballCount"),
    state.ballCount
  );
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_aspect"), state.aspect);
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_r"), state.ballSize);

  //gl.drawArrays(gl.POINTS, 0, state.ballCount);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  state.ping = !state.ping;
  requestAnimationFrame(() => render(state));
}

function change(state) {
  state.ballCount = parseInt(state.countSlider.value);
  state.ballSize = parseFloat(state.sizeSlider.value);
  state.ballSpeed = parseFloat(state.speedSlider.value);
  state.selectedGradient = state.colorSelect.value;

  console.log(
    "State updated:",
    state.ballCount,
    state.ballSize,
    state.ballSpeed
  );

  state.initTextures();
}

init().then((state) => {
  render(state);

  // 🟩 Sliders: mise à jour dynamique
  state.sliders.forEach((slider) => {
    slider.addEventListener("input", () => change(state));
  });

  window.addEventListener("resize", () => {
    state.canvas.width = window.innerWidth;
    state.canvas.height = window.innerHeight;
    state.aspect = state.canvas.width / state.canvas.height;
  });
});

export function goFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch((err) => {
      alert(`Erreur plein écran : ${err.message}`);
    });
  }
}

async function loadShader(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load shader: ${url}`);
  }
  return response.text();
}

async function createProgram(vertexSrc, fragmentSrc) {
  const gl = document.getElementById("glCanvas").getContext("webgl2");

  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexSrc);
  gl.compileShader(vertexShader);
  if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    console.error(
      "Vertex shader compilation failed:",
      gl.getShaderInfoLog(vertexShader)
    );
    return null;
  }

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentSrc);
  gl.compileShader(fragmentShader);
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    console.error(
      "Fragment shader compilation failed:",
      gl.getShaderInfoLog(fragmentShader)
    );
    return null;
  }

  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program linking failed:", gl.getProgramInfoLog(program));
    return null;
  }

  return program;
}
