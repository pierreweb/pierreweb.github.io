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

  const sliders = [
    countSlider,
    // state.radiusSlider,
    speedSlider,
    sizeSlider,
    // state.otherSlider,
  ];

  /*   sliders.forEach((slider) => {
    slider.addEventListener("input", () => change(state));
  }); */

  let ballCount = parseInt(countSlider.value);
  let ballSize = parseFloat(sizeSlider.value);
  let ballSpeed = parseFloat(speedSlider.value);
  let selectedGradient = colorSelect.value;
  ballSize = 0.01;
  ballCount = parseInt(1000);
  ballSpeed = parseFloat(0.1); //ballSpeed entre 0.1 et

  //canvas.width = ballCount; // 1000 si tu veux 1000 balles
  //canvas.height = 1; // une ligne de fragments
  // VBO / VAO
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
    loadShader("./scripts/shaderpingpong/compute1.frag"),
    loadShader("./scripts/shaderpingpong/display1.frag"),
    loadShader("./scripts/shaderpingpong/display1.vert"),
  ]);
  const computeProgram = await createProgram(displayVS, computeSrc);
  const displayProgram = await createProgram(displayVS, displayFS);

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

  // Compute
  gl.useProgram(computeProgram);
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
  // gl.viewport(0, 0, 1000, 1);
  //gl.viewport(0, 0, canvas.width, canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Display
  gl.useProgram(displayProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, canvas.width, canvas.height);
  // gl.viewport(0, 0, 1000, 1);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, outputTex);
  gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);
  gl.uniform1f(
    gl.getUniformLocation(displayProgram, "u_ballCount"),
    state.ballCount
  );
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_aspect"), state.aspect);
  gl.uniform1f(gl.getUniformLocation(displayProgram, "u_r"), state.ballSize);
  //gl.drawArrays(gl.TRIANGLES, 0, 6);
  gl.drawArrays(gl.POINTS, 0, state.ballCount);

  //gl.drawArrays(gl.POINTS, 0, count);

  state.ping = !state.ping;
  requestAnimationFrame(() => render(state));
}

function change(state) {
  state.ballCount = parseInt(state.countSlider.value);
  state.ballSize = parseFloat(state.sizeSlider.value);
  state.ballSpeed = parseInt(state.speedSlider.value);
  state.selectedGradient = state.colorSelect.value;
  console.log(
    "State updated:",
    state.ballCount,
    state.ballSize,
    state.ballSpeed
  );

  state.initTextures();
}

// 🟩 Lancement
init().then((state) => {
  render(state);

  // Sliders et resize
  state.sliders.forEach((slider) => {
    slider.addEventListener("input", () => change(state));
  });
  // state.sliders.addEventListener("input", () => change(state));
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
    container.requestFullscreen().catch((err) => {
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

/* function setballCount(count) {
  // Stocker l'ancien nombre de balls
  const oldNumBalls = ballCount;
  ballCount = count;

  // Vérifier si on augmente ou diminue le nombre de triangles
  const decreasing = numBalls < oldNumBalls;

  if (decreasing) {
    // Réduction du nombre de triangles
    console.log(
      "Réduire le nombre de balls de",
      oldNumBalls,
      "à",
      numBalls
    );
    // Ici, pas besoin de recréer les tableaux, on prend les 'numBalls' premiers éléments
    // (Pas d'action supplémentaire si pas de logique pour sauvegarder des valeurs existantes)
  } else {
    // Augmentation du nombre de Balles
    console.log(
      "Augmenter le nombre de balles de",
      oldNumBalls,
      "à",
      numBalls
    );
    // Ici, tu peux initialiser les nouveaux offsets, vitesses, etc.
    // Créer de nouveaux tableaux pour les décalages, vitesses et angles

    // Crée de nouveaux tableaux de la taille adaptée
    const newOffsets = new Float32Array(numTriangles * 2);
    const newVelocities = new Float32Array(numTriangles * 2);
    const newAngles = new Float32Array(numTriangles);
    // Copier les anciens éléments si nécessaire
    if (offsets && velocities && angles) {
      newOffsets.set(offsets.subarray(0, oldNumTriangles * 2));
      newVelocities.set(velocities.subarray(0, oldNumTriangles * 2));
      newAngles.set(angles.subarray(0, oldNumTriangles));
    }
    // Réaffecte les tableaux à leurs nouvelles versions
    offsets = newOffsets;
    velocities = newVelocities;
    angles = newAngles;

    // Initialiser les nouvelles valeurs uniquement pour les triangles ajoutés
    if (numTriangles > oldNumTriangles) {
      for (let i = oldNumTriangles; i < numTriangles; i++) {
        offsets[i * 2] = 0.05 * aspect; //(Math.random() * 2 - 1) * aspect;
        offsets[i * 2 + 1] = 0.05; //Math.random() * 2 - 1;
        // velocities[i * 2] = Math.random() * 0.01 - 0.005;
        // velocities[i * 2 + 1] = Math.random() * 0.01 - 0.005;
        velocities[i * 2] = (Math.random() - 0.5) * 0.01;
        velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
        angles[i] = Math.random() * Math.PI * 2;
      }
    }
    // Mettre à jour les buffers
    updateBuffers();
    console.log(
      `Nombre de balles mis à jour de ${oldNumBalls} à ${numBalls}`
    );
  }
} */
