document.createElement('canvas').getContext('webgl2')
const canvas = document.getElementById("glCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


const gl = canvas.getContext("webgl2");


if (!gl) {
  alert("WebGL non supporté !");
}

// VERTEX SHADER
const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_offset;
  attribute float a_angle;
  attribute float a_size;
  varying vec2 v_pos;
  uniform vec2 u_resolution;
  void main() {
    float angle = a_angle;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 scaled = a_position * a_size;
    vec2 rotated = rotation * scaled;
    vec2 position = rotated + a_offset;
    vec2 zeroToOne = position / u_resolution;
    vec2 zeroToTwo = zeroToOne * 2.0;
    vec2 clipSpace = zeroToTwo - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
    v_pos = a_position;
  }
`;

// FRAGMENT SHADER
const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_pos;
  uniform int u_gradient;
  void main() {
    vec3 color1;
    vec3 color2;
    if (u_gradient == 0) {
      color1 = vec3(0.2, 0.2, 0.8);
      color2 = vec3(0.6, 0.6, 1.0);
    } else if (u_gradient == 1) {
      color1 = vec3(0.8, 0.2, 0.2);
      color2 = vec3(1.0, 0.6, 0.6);
    } else if (u_gradient == 2) {
      color1 = vec3(0.2, 0.8, 0.2);
      color2 = vec3(0.6, 1.0, 0.6);
    } else if (u_gradient == 3) {
      color1 = vec3(1.0, 1.0, 0.2);
      color2 = vec3(1.0, 1.0, 0.6);
    } else if (u_gradient == 4) {
      color1 = vec3(1.0, 0.5, 0.8);
      color2 = vec3(1.0, 0.7, 0.9);
    } else if (u_gradient == 5) {
      color1 = vec3(1.0, 0.5, 0.0);
      color2 = vec3(1.0, 0.7, 0.3);
    } else if (u_gradient == 6) {
      color1 = vec3(0.5, 0.0, 1.0);
      color2 = vec3(1.0, 0.5, 0.0);
    } else {
      color1 = vec3(1.0);
      color2 = vec3(1.0);
    }
    float t = (v_pos.y + 1.0) / 2.0;
    vec3 color = mix(color1, color2, t);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return shader;
}

function createProgram(gl, vs, fs) {
  const program = gl.createProgram();
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  return program;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vs, fs);

const a_position = gl.getAttribLocation(program, "a_position");
const a_offset = gl.getAttribLocation(program, "a_offset");
const a_angle = gl.getAttribLocation(program, "a_angle");
const a_size = gl.getAttribLocation(program, "a_size");
const u_resolution = gl.getUniformLocation(program, "u_resolution");
const u_gradient = gl.getUniformLocation(program, "u_gradient");

const triangleVertices = new Float32Array([
  0, -1,
  1, 1,
  -1, 1
]);

const triangleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

let triangleCount = 10;
let triangleSize = 60;
let rotationSpeed = 1;
let gradientIndex = 0;

let triangles = [];
function resetTriangles() {
  triangles = [];
  for (let i = 0; i < triangleCount; i++) {
    triangles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      dx: (Math.random() - 0.5) * 4,
      dy: (Math.random() - 0.5) * 4,
      angle: Math.random() * Math.PI * 2
    });
  }
}
resetTriangles();

const offsets = new Float32Array(triangleCount * 2);
const angles = new Float32Array(triangleCount);
const sizes = new Float32Array(triangleCount);

function render() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.useProgram(program);
  gl.uniform2f(u_resolution, gl.canvas.width, gl.canvas.height);
  gl.uniform1i(u_gradient, gradientIndex);

  for (let i = 0; i < triangles.length; i++) {
    let t = triangles[i];
    t.x += t.dx;
    t.y += t.dy;
    t.angle += 0.01 * rotationSpeed;

    if (t.x < 0 || t.x > canvas.width) t.dx *= -1;
    if (t.y < 0 || t.y > canvas.height) t.dy *= -1;

    offsets[i * 2] = t.x;
    offsets[i * 2 + 1] = t.y;
    angles[i] = t.angle;
    sizes[i] = triangleSize;
  }

  gl.enableVertexAttribArray(a_position);
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.vertexAttribPointer(a_position, 2, gl.FLOAT, false, 0, 0);

  const offsetBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(a_offset);
  gl.vertexAttribPointer(a_offset, 2, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(a_offset, 1);

  const angleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, angles, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(a_angle);
  gl.vertexAttribPointer(a_angle, 1, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(a_angle, 1);

  const sizeBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(a_size);
  gl.vertexAttribPointer(a_size, 1, gl.FLOAT, false, 0, 0);
  gl.vertexAttribDivisor(a_size, 1);

  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, triangleCount);
  requestAnimationFrame(render);
}

render();

document.getElementById("count").addEventListener("input", (e) => {
  triangleCount = parseInt(e.target.value);
  resetTriangles();
});
document.getElementById("size").addEventListener("input", (e) => {
  triangleSize = (parseFloat(e.target.value) / 100) * Math.min(canvas.width, canvas.height);
});
document.getElementById("rotation").addEventListener("input", (e) => {
  rotationSpeed = parseFloat(e.target.value);
});
document.getElementById("gradient").addEventListener("change", (e) => {
  gradientIndex = e.target.selectedIndex;
});
document.getElementById("fullscreen").addEventListener("click", () => {
  if (canvas.requestFullscreen) canvas.requestFullscreen();
});
