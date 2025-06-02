const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Création d'un carré plein écran
const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const quadVbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const posLoc = 0;
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

// Shaders de calcul et d'affichage
async function loadShader(url) {
  const res = await fetch(url);
  return res.text();
}
async function createProgram(vsSource, fsSource) {
  const vs = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vs, vsSource);
  gl.compileShader(vs);
  const fs = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fs, fsSource);
  gl.compileShader(fs);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.bindAttribLocation(program, 0, "position");
  gl.linkProgram(program);
  return program;
}

gl.getExtension("EXT_color_buffer_float");
if (!gl.getExtension("EXT_color_buffer_float")) {
  console.error("EXT_color_buffer_float not supported by your GPU.");
}

// Initialiser textures et framebuffer
const texA = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texA);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, 2, 1);

// gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 2, 1, 0, gl.RGBA, gl.FLOAT, null);

gl.texSubImage2D(
  gl.TEXTURE_2D,
  0,
  0,
  0,
  2,
  1,
  gl.RGBA,
  gl.FLOAT,
  new Float32Array([0.5, 0.0, 0.3, 0.2, -0.5, 0.0, -0.3, 0.2])
);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
const texB = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texB);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA32F, 2, 1);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
const fbo = gl.createFramebuffer();

// Load shaders
Promise.all([
  loadShader("./scripts/shaderpingpong/compute.frag"),
  loadShader("./scripts/shaderpingpong/display.frag"),
  loadShader("./scripts/shaderpingpong/display.vert"),
]).then(async ([computeSrc, displayFS, displayVS]) => {
  console.log("Shaders loaded");
  const computeProgram = await createProgram(
    await loadShader("./scripts/shaderpingpong/display.vert"),
    computeSrc
  );
  const displayProgram = await createProgram(displayVS, displayFS);
  let ping = true;
  function render() {
    // Compute step
    gl.useProgram(computeProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    const inputTex = ping ? texA : texB;
    const outputTex = ping ? texB : texA;
    gl.bindTexture(gl.TEXTURE_2D, inputTex);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      outputTex,
      0
    );
    gl.viewport(0, 0, 2, 1);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    // Display step
    gl.useProgram(displayProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, outputTex);
    gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    ping = !ping;
    requestAnimationFrame(render);
  }
  render();
});
