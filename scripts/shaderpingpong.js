const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2 non supporté !");
}

// 1️⃣ Shaders de calcul (compute shader simulé)
const computeShaderSrc = await fetch("compute-shader.frag").then((res) =>
  res.text()
);

// 2️⃣ Création d’un programme shader
function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }
  return shader;
}
function createProgram(gl, vertexShaderSrc, fragmentShaderSrc) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSrc);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
  }
  return program;
}

// 3️⃣ Un simple vertex shader
const vertexShaderSrc = `#version 300 es
in vec2 position;
out vec2 v_uv;
void main() {
  v_uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

// 4️⃣ Création du programme
const program = createProgram(gl, vertexShaderSrc, computeShaderSrc);

// 5️⃣ Quad couvrant tout l’écran
const quadVerts = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const vbo = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
const posLoc = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(posLoc);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

// 6️⃣ Création des textures pour stocker les données (2 balles)
const ballData = new Float32Array([
  // x, y, vx, vy, radius
  0.3, 0.3, 0.01, 0.02, 0.05, 0.7, 0.7, -0.02, -0.01, 0.05,
]);
function createDataTexture(data) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, 2, 1, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  return tex;
}
const texA = createDataTexture(ballData);
const texB = createDataTexture(ballData);

// 7️⃣ Framebuffer
const fbo = gl.createFramebuffer();

// 8️⃣ Boucle d’animation
let ping = true;
function render() {
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  // Lire depuis texA
  const inputTex = ping ? texA : texB;
  const outputTex = ping ? texB : texA;

  // Lier la texture de lecture
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, inputTex);
  gl.uniform1i(gl.getUniformLocation(program, "u_input"), 0);

  // Écrire dans la texture de sortie
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    outputTex,
    0
  );
  gl.viewport(0, 0, 2, 1);
  gl.drawArrays(gl.TRIANGLES, 0, 6);

  // Swap textures
  ping = !ping;

// Afficher le résultat
// Étape 1️⃣ – Calcul des nouvelles positions (comme avant)
gl.useProgram(program); // Ton compute shader
gl.bindVertexArray(vao);

const inputTex = ping ? texA : texB;
const outputTex = ping ? texB : texA;

gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, inputTex);
gl.uniform1i(gl.getUniformLocation(program, "u_input"), 0);

gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, outputTex, 0);
gl.viewport(0, 0, 2, 1);
gl.drawArrays(gl.TRIANGLES, 0, 6);

// Swap pour la prochaine frame
ping = !ping;

// Étape 2️⃣ – Affichage à l’écran
gl.useProgram(displayProgram);
gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Dessine directement sur le canvas
gl.viewport(0, 0, canvas.width, canvas.height);

const dataTex = ping ? texB : texA;
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, dataTex);
gl.uniform1i(gl.getUniformLocation(displayProgram, "u_data"), 0);

gl.drawArrays(gl.TRIANGLES, 0, 6);

requestAnimationFrame(render);




  // (Pour affichage sur canvas, tu peux faire un autre shader d’affichage, pas dans ce squelette)
  requestAnimationFrame(render);
}
render();


// Charger les shaders d’affichage
const displayFrag = await fetch("affichage.frag").then(res => res.text());
const displayVert = await fetch("affichage.vert").then(res => res.text());
const displayProgram = createProgram(gl, displayVert, displayFrag);
    
#version 300 es
in vec2 position;
out vec2 v_uv;
void main() {
  v_uv = position * 0.5 + 0.5;
  gl_Position = vec4(position, 0, 1);
}


// Configurer le shader d’affichage
#version 300 es
precision highp float;
uniform sampler2D u_data;
out vec4 outColor;
in vec2 v_uv;

void main() {
  // Lecture des positions et vitesses des deux balles
  vec4 ball1 = texelFetch(u_data, ivec2(0,0), 0);
  vec4 ball2 = texelFetch(u_data, ivec2(1,0), 0);
  float r1 = 0.05;
  float r2 = 0.05;

  // Remap UV [0,1] -> [-1,1]
  vec2 uv = v_uv * 2.0 - 1.0;

  // Calcul distance des balles
  float d1 = length(uv - ball1.xy);
  float d2 = length(uv - ball2.xy);

  // Affiche la balle si distance < rayon
  float c1 = smoothstep(r1, r1 - 0.01, d1);
  float c2 = smoothstep(r2, r2 - 0.01, d2);

  vec3 color1 = mix(vec3(0,0.7,1), vec3(1), c1); // Balle 1 bleue
  vec3 color2 = mix(vec3(1,0,0), vec3(1), c2);   // Balle 2 rouge

  // Mélange des 2 couleurs
  outColor = vec4(color1 * (1.0 - c2) + color2 * (1.0 - c1), 1.0);
}


