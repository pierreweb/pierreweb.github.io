const container = document.getElementById("container");
const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
  alert("WebGL2 non supporté !");
  throw new Error("WebGL2 non supporté !");
}

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const countSlider = document.getElementById("countSlider");
const sizeSlider = document.getElementById("sizeSlider");
const speedSlider = document.getElementById("speedSlider");
const rotationSlider = document.getElementById("rotationSlider");
const colorSelect = document.getElementById("colorSelect");
let aspect = canvas.width / canvas.height;

// lecture des valeurs initiales  des sliders
let triangleCount = parseInt(countSlider.value);
let triangleSize = parseFloat(sizeSlider.value) / 100; // taille initiale en pourcentage
//console.log("triangleSizeinit", triangleSize);
let triangleSpeed = parseInt(speedSlider.value);
let rotationSpeed = parseInt(rotationSlider.value);
let selectedGradient = colorSelect.value;

// Shaders
const vsSource = `#version 300 es
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

const fsSource = `#version 300 es
precision mediump float;
in vec3 v_color;
out vec4 fragColor;

void main() {
  fragColor = vec4(v_color, 1.0);
}`;

// Compile shaders
function createShader(gl, type, src) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);

// Create program
const program = gl.createProgram();
gl.attachShader(program, vs);
gl.attachShader(program, fs);
gl.linkProgram(program);
gl.useProgram(program);

// Triangle shape (un seul triangle)
const triangleVertices = new Float32Array([0, 0.1, -0.1, -0.1, 0.1, -0.1]);
const triangleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

/* const triangleColors = new Float32Array(
  setTriangleColors(selectedGradient).flat()
); */
let triangleColors = new Float32Array(
  setTriangleColors(selectedGradient).flat()
);

// Couleurs fixes par sommet pour le dégradé

const colorBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleColors, gl.STATIC_DRAW);

// Attributs
const posLoc = gl.getAttribLocation(program, "a_position");
const offsetLoc = gl.getAttribLocation(program, "a_offset");
const angleLoc = gl.getAttribLocation(program, "a_angle");
const colorLoc = gl.getAttribLocation(program, "a_color");

// Uniforms
const timeLoc = gl.getUniformLocation(program, "u_time");
const sizeLoc = gl.getUniformLocation(program, "u_size");
let aspectLoc = gl.getUniformLocation(program, "u_aspect");
const rotationSpeedLoc = gl.getUniformLocation(program, "u_rotationSpeed");

/* // Attributs dynamiques
let offsets, directions, angles, colors1, colors2;
let offsetBuffer, angleBuffer, colorBuffer1, colorBuffer2; */

// Données pour chaque triangle
let numTriangles = triangleCount || 10; // Nombre de triangles
let offsets = new Float32Array(numTriangles * 2);
let velocities = new Float32Array(numTriangles * 2);
let angles = new Float32Array(numTriangles);

for (let i = 0; i < numTriangles; i++) {
  //offsets[i * 2] = (Math.random() - 0.5) * 1.5;
  offsets[i * 2] = (Math.random() * 2 - 1) * aspect;
  // offsets[i * 2] = (Math.random() - 0.5) * 2 * aspect;

  offsets[i * 2 + 1] = Math.random() * 2 - 1;
  //offsets[i * 2 + 1] = (Math.random() - 0.5) * 1.5 * aspect;
  velocities[i * 2] = (Math.random() - 0.5) * 0.01;
  velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
  angles[i] = Math.random() * Math.PI * 2;
}

// Créez les buffers pour les offsets et les angles
const offsetBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);

const angleBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
gl.bufferData(gl.ARRAY_BUFFER, angles, gl.DYNAMIC_DRAW);

// Lier les attributs statiques (position et couleur)
gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(posLoc);

gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(colorLoc);
gl.vertexAttribDivisor(colorLoc, 0); // Même couleur pour chaque sommet

// Lier les attributs dynamiques (offsets et angles)
gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
gl.vertexAttribPointer(offsetLoc, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(offsetLoc);
gl.vertexAttribDivisor(offsetLoc, 1);

gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
gl.vertexAttribPointer(angleLoc, 1, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(angleLoc);
gl.vertexAttribDivisor(angleLoc, 1);

// Uniforms fixes
gl.uniform1f(sizeLoc, triangleSize);
// gl.uniform1f(aspectLoc, canvas.width / canvas.height);
// gl.uniform1f(rotationSpeedLoc, 1.0);
gl.uniform1f(aspectLoc, aspect);
gl.uniform1f(rotationSpeedLoc, rotationSpeed);

// Boucle de rendu
let startTime = performance.now();

function render() {
  let currentTime = (performance.now() - startTime) / 1000;
  gl.uniform1f(timeLoc, currentTime);

  // Mise à jour des positions et rebonds
  for (let i = 0; i < numTriangles; i++) {
    let x = offsets[i * 2];
    let y = offsets[i * 2 + 1];
    let vx = velocities[i * 2];
    let vy = velocities[i * 2 + 1];

    x += vx;
    y += vy;
    // Vérification des rebonds
    if (x > aspect || x < -aspect) velocities[i * 2] *= -1;

    // if (x > 1.0 || x < -1.0) velocities[i * 2] *= -1;
    if (y > 1.0 || y < -1.0) velocities[i * 2 + 1] *= -1;

    offsets[i * 2] = x;
    offsets[i * 2 + 1] = y;
  }

  // Mise à jour des buffers dynamiques
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsets);

  //gl.viewport(0, 0, canvas.width, canvas.height);
  //gl.clearColor(0, 0, 0, 1);

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, numTriangles);

  gl.uniform1f(sizeLoc, triangleSize);

  requestAnimationFrame(render);
}

render();

// Événements des sliders
countSlider.addEventListener("input", () =>
  setTriangleCount(parseInt(countSlider.value))
);
sizeSlider.addEventListener("input", () =>
  setTriangleSize(parseFloat(sizeSlider.value) / 100)
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

/* function setTriangleCount(count) {
  triangleCount = count;
  offsets = new Float32Array(triangleCount * 2);
  velocities = new Float32Array(triangleCount * 2);
  angles = new Float32Array(triangleCount);
  let decrease = false;
  if (triangleCount < numTriangles) {
    decrease = true;
  } else {
    decrease = false;
  }

  //numTriangles = triangleCount;

  
  // Mettre à jour le buffer des offsets
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);
  // Mettre à jour le buffer des angles
  gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, angles, gl.DYNAMIC_DRAW);
  // Mettre à jour le nombre d'instances
  gl.vertexAttribDivisor(offsetLoc, 1);
  gl.vertexAttribDivisor(angleLoc, 1);
  // Redessiner les triangles
  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, triangleColors, gl.STATIC_DRAW);
  gl.uniform1f(sizeLoc, triangleSize);
  gl.uniform1f(aspectLoc, canvas.width / canvas.height);
  gl.uniform1f(rotationSpeedLoc, rotationSpeed);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, triangleCount); 
  // Mise à jour des positions et rebonds
    for (let i = 0; i < numTriangles; i++) {
    let x = offsets[i * 2];
    let y = offsets[i * 2 + 1];
    let vx = velocities[i * 2];
    let vy = velocities[i * 2 + 1];

    x += vx;
    y += vy;
    // Vérification des rebonds
    if (x > aspect || x < -aspect) velocities[i * 2] *= -1;

    // if (x > 1.0 || x < -1.0) velocities[i * 2] *= -1;
    if (y > 1.0 || y < -1.0) velocities[i * 2 + 1] *= -1;

    offsets[i * 2] = x;
    offsets[i * 2 + 1] = y;
  } 
  if (decrease) {
    // Réduire le nombre de triangles
  
  } else {
    // Augmenter le nombre de triangles
    console.log(
      "Augmenter le nombre de triangles de ",
      numTriangles,
      "à",
      triangleCount
    );
   
  }

   for (let i = numTriangles; i < triangleCount; i++) {
      offsets[i * 2] = (Math.random() - 0.5) * 1.5 * aspect;
      offsets[i * 2 + 1] = (Math.random() - 0.5) * 1.5;
      velocities[i * 2] = (Math.random() - 0.5) * 0.01;
      velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.01;
      angles[i] = Math.random() * Math.PI * 2;
    } 

  // Mise à jour des buffers dynamiques
  // gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  // gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsets);

  numTriangles = triangleCount;

  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArraysInstanced(gl.TRIANGLES, 0, 3, numTriangles);
  console.log("setTriangleCount", triangleCount);
} */

function setTriangleCount(count) {
  // Stocker l'ancien nombre de triangles
  const oldNumTriangles = numTriangles;
  numTriangles = count;

  // Vérifier si on augmente ou diminue le nombre de triangles
  const decreasing = numTriangles < oldNumTriangles;

  if (decreasing) {
    // Réduction du nombre de triangles
    console.log(
      "Réduire le nombre de triangles de",
      oldNumTriangles,
      "à",
      numTriangles
    );
    // Ici, pas besoin de recréer les tableaux, on prend les 'numTriangles' premiers éléments
    // (Pas d'action supplémentaire si pas de logique pour sauvegarder des valeurs existantes)
  } else {
    // Augmentation du nombre de triangles
    console.log(
      "Augmenter le nombre de triangles de",
      oldNumTriangles,
      "à",
      numTriangles
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
      `Nombre de triangles mis à jour de ${oldNumTriangles} à ${numTriangles}`
    );
  }
}

function updateBuffers() {
  // Mettre à jour le buffer des offsets
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, offsets, gl.DYNAMIC_DRAW);
  // Mettre à jour le buffer des angles
  gl.bindBuffer(gl.ARRAY_BUFFER, angleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, angles, gl.DYNAMIC_DRAW);
  // Mettre à jour le nombre d'instances
  gl.vertexAttribDivisor(offsetLoc, 1);
  gl.vertexAttribDivisor(angleLoc, 1);
}

function setTriangleSize(size) {
  triangleSize = size;
  console.log("setTriangleSize", triangleSize);
  gl.uniform1f(sizeLoc, triangleSize);
  //gl.uniform1f(sizeLoc, triangleSize);
  // Mettre à jour la taille des triangles
  /*  gl.bindBuffer(gl.ARRAY_BUFFER, triangleBuffer);
  gl.bufferSubData(
    gl.ARRAY_BUFFER,
    0,
    new Float32Array([
      0,
      triangleSize,
      -triangleSize,
      -triangleSize,
      triangleSize,
      -triangleSize,
    ])
  ); */
}

function setTriangleRotation(rotation) {
  rotationSpeed = rotation;
  gl.uniform1f(rotationSpeedLoc, rotationSpeed);
}

function setTriangleSpeed(speed) {
  triangleSpeed = speed;
  // Mettre à jour la vitesse des triangles
  for (let i = 0; i < numTriangles; i++) {
    velocities[i * 2] = (Math.random() - 0.5) * triangleSpeed * 0.01;
    velocities[i * 2 + 1] = (Math.random() - 0.5) * triangleSpeed * 0.01;
  }
  gl.bindBuffer(gl.ARRAY_BUFFER, offsetBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, offsets);
}

function setTriangleColors(name) {
  console.log("setTriangleColors", name);
  switch (name) {
    case "blue":
      return [
        [0.1, 0.2, 1], //sommet haut (bleu)
        [0.6, 0.8, 1], // sommet bas gauche (bleu clair)
        [0.8, 0.8, 1], // sommet bas droit (blanc)
      ];
    case "yellow":
      return [
        [1, 1, 0.2], // sommet haut (jaune)
        [0.9, 0.9, 0.7], // sommet bas gauche (jaune clair)
        [1, 0.9, 0.2], // sommet bas droit (blanc)
      ];
    case "green":
      return [
        [0.2, 1, 0.4], // sommet haut (vert)
        [0, 0.6, 0.3], // sommet bas gauche (vert foncé)
        [0.4, 1, 0.4], // sommet bas droit (blanc)
      ];
    case "red":
      return [
        [1, 0.4, 0.4], // sommet haut (rouge)
        [0.6, 0, 0], // sommet bas gauche (rouge foncé)
        [1, 0.6, 0.6], // sommet bas droit (blanc)
      ];
    case "pink":
      return [
        [1, 0.6, 0.9], // sommet haut (rose)
        [0.8, 0, 0.5], // sommet bas gauche (rose foncé)
        [1, 0.8, 0.9], // sommet bas droit (blanc)
      ];
    case "orange":
      return [
        [1, 0.0, 0.0], // sommet haut (orange)
        [0.3, 0.0, 0.0], // sommet bas gauche (orange foncé)
        [1, 0.5, 0.2], // sommet bas droit (blanc)
      ];
    case "birdofparadise":
      return [
        [1, 0.1, 1], // Sommet haut (noir)
        [1.0, 1.0, 0.2], // Sommet bas gauche (blanc)
        [0.8, 0.5, 0.0], // Sommet bas droit (orange vif)
      ];
    default:
      return [
        [1, 1, 1], // Sommet haut (blanc)
        [0.1, 0.1, 0.1], // Sommet bas gauche (noir)
        [0.5, 0.5, 0.5], // Sommet bas droit (gris)
      ];
  }
}

function changeTriangleColors(name) {
  /*   const triangleColors = new Float32Array(
  setTriangleColors(selectedGradient).flat()
); */
  const newColors = setTriangleColors(name).flat();
  triangleColors.set(newColors);
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, triangleColors);
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

/* function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  aspect = canvas.width / canvas.height;
} */

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  aspect = canvas.width / canvas.height;
  gl.uniform1f(aspectLoc, aspect);
  gl.viewport(0, 0, canvas.width, canvas.height);
}
