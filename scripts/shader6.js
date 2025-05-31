const container = document.getElementById("container");
const canvas = document.getElementById("glCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const gl = canvas.getContext("webgl2");
if (!gl) {
  alert("WebGL2 non supporté !");
  throw new Error("WebGL2 requis");
}

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");

countSlider.addEventListener("input", () => {
  setTriangleCount(parseInt(countSlider.value));
});
sizeSlider.addEventListener("input", () => {
  setTriangleSize(parseFloat(sizeSlider.value) / 100);
});
speedSlider.addEventListener("input", () => {
  triangleSpeed = parseFloat(speedSlider.value);
});
rotationSlider.addEventListener("input", () => {
  rotationSpeed = parseFloat(rotationSlider.value);
});
colorSelect.addEventListener("change", () => {
  setGradient(colorSelect.value);
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

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// Initialisation des paramètres
let triangleCount = parseInt(countSlider.value);
let triangleSize = parseFloat(sizeSlider.value) / 100;
let triangleSpeed = parseInt(speedSlider.value);
let rotationSpeed = parseInt(rotationSlider.value);
let selectedGradient = colorSelect.value;

const vertexShaderSource = `#version 300 es
in vec2 a_position;
in vec2 a_offset;
in float a_angle;
in vec3 a_color;

out vec3 v_color;

uniform float u_time;
uniform float u_size;
uniform float u_aspect;
uniform float u_rotationSpeed;

void main() {
  float angle = a_angle + u_time * u_rotationSpeed;
  mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
  vec2 pos = rot * a_position * u_size + a_offset;
  pos.x /= u_aspect;
  gl_Position = vec4(pos, 0.0, 1.0);
  v_color = a_color;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 outColor;
void main() {
  outColor = vec4(v_color, 1.0);
}`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createProgram(gl, vsSource, fsSource) {
  const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

const posLoc = gl.getAttribLocation(program, "a_position");
const offsetLoc = gl.getAttribLocation(program, "a_offset");
const angleLoc = gl.getAttribLocation(program, "a_angle");
const colorLoc = gl.getAttribLocation(program, "a_color");
const timeLoc = gl.getUniformLocation(program, "u_time");
const sizeLoc = gl.getUniformLocation(program, "u_size");
const aspectLoc = gl.getUniformLocation(program, "u_aspect");
const rotSpeedLoc = gl.getUniformLocation(program, "u_rotationSpeed");

const triangleVertices = new Float32Array([0.0, 0.1, -0.1, -0.1, 0.1, -0.1]);

const triangleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

let offsets, directions, angles, colors;
let offsetBuffer, angleBuffer, colorBuffer;

function generateGradient(name) {
  console.log("Generating gradient for:", name);
  switch (name) {
    case "blue":
      return [
        [0.2, 0.3, 1],
        [0.6, 0.8, 1],
      ];
    case "yellow":
      return [
        [1, 1, 0.4],
        [1, 0.9, 0.2],
      ];
    case "green":
      return [
        [0.2, 1, 0.4],
        [0, 0.6, 0.3],
      ];
    case "red":
      return [
        [1, 0.4, 0.4],
        [0.6, 0, 0],
      ];
    case "pink":
      return [
        [1, 0.6, 0.9],
        [0.8, 0, 0.5],
      ];
    case "orange":
      return [
        [1, 0.7, 0.2],
        [1, 0.4, 0],
      ];
    case "birdofparadise":
      return [
        [0.1, 0.1, 1],
        [1, 0.1, 0.1],
      ];
    default:
      return [
        [1, 1, 1],
        [0.5, 0.5, 0.5],
      ];
  }
}

function randomColor(grad) {
  const t = Math.random();
  return [
    grad[0][0] * (1 - t) + grad[1][0] * t,
    grad[0][1] * (1 - t) + grad[1][1] * t,
    grad[0][2] * (1 - t) + grad[1][2] * t,
  ];
}

function initTriangles(count) {
  const aspect = canvas.width / canvas.height;
  offsets = new Float32Array(count * 2);
  directions = new Float32Array(count * 2);
  angles = new Float32Array(count);
  colors = new Float32Array(count * 3);
  const grad = generateGradient(selectedGradient);

  for (let i = 0; i < count; i++) {
    offsets[i * 2] = (Math.random() * 2 - 1) * aspect;
    offsets[i * 2 + 1] = Math.random() * 2 - 1;

    directions[i * 2] = (Math.random() - 0.5) * 0.01;
    directions[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
    angles[i] = Math.random() * Math.PI * 2;
    const color = randomColor(grad);
    colors.set(color, i * 3);
  }

  offsetBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);

  angleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, angles, gl.DYNAMIC_DRAW);

  colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
}

function update(aspect) {
  for (let i = 0; i < triangleCount; i++) {
    let x = offsets[i * 2];
    let y = offsets[i * 2 + 1];
    let dx = directions[i * 2] * triangleSpeed;
    let dy = directions[i * 2 + 1] * triangleSpeed;

    x += dx * aspect;
    y += dy;

    if (x < -1 * aspect || x > 1 * aspect) directions[i * 2] *= -1;
    if (y < -1 || y > 1) directions[i * 2 + 1] *= -1;

    offsets[i * 2] = x;
    offsets[i * 2 + 1] = y;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsets);
}

function render(time) {
  const aspect = canvas.width / canvas.height;

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(offsetLoc);
  gl.vertexAttribDivisor(offsetLoc, 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
  gl.vertexAttribPointer(angleLoc, 1, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(angleLoc);
  gl.vertexAttribDivisor(angleLoc, 1);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(colorLoc);
  gl.vertexAttribDivisor(colorLoc, 1);

  gl.uniform1f(timeLoc, time * 0.001);
  gl.uniform1f(sizeLoc, triangleSize);
  gl.uniform1f(aspectLoc, aspect);
  gl.uniform1f(rotSpeedLoc, rotationSpeed);

  update(aspect);

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, triangleCount);

  requestAnimationFrame(render);
}

function setTriangleCount(count) {
  triangleCount = count;
  initTriangles(triangleCount);
}
function setTriangleSize(size) {
  triangleSize = size;
}
function setRotationSpeed(speed) {
  rotationSpeed = speed;
}
function setGradient(name) {
  selectedGradient = name;
  initTriangles(triangleCount);
}

initTriangles(triangleCount);
requestAnimationFrame(render);
