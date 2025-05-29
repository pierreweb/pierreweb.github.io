const canvas = document.getElementById("glcanvas");
const gl = canvas.getContext("webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!gl) {
    alert("WebGL non supporté !");
}

// Shaders
const vsSource = `
attribute vec2 a_position;
uniform vec2 u_resolution;
uniform float u_rotation;
void main() {
    float angle = u_rotation;
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    vec2 rotated = rotation * a_position;
    vec2 zeroToOne = rotated / u_resolution;
    vec2 clipSpace = zeroToOne * 2.0 - 1.0;
    gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
}
`;

const fsSource = `
precision mediump float;
uniform vec3 u_color;
void main() {
    gl_FragColor = vec4(u_color, 1);
}
`;

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

function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vsSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
const program = createProgram(gl, vertexShader, fragmentShader);

// Look up locations
const positionLocation = gl.getAttribLocation(program, "a_position");
const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
const rotationLocation = gl.getUniformLocation(program, "u_rotation");
const colorLocation = gl.getUniformLocation(program, "u_color");

// Crée un triangle centré sur l’origine
const triangleVertices = new Float32Array([
    0, -0.5,
    0.5, 0.5,
    -0.5, 0.5
]);

// Buffer
const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, triangleVertices, gl.STATIC_DRAW);

// Triangle dynamique
let triangles = [];

function createTriangle(x, y, size, speedX, speedY, rotationSpeed) {
    return {
        x,
        y,
        size,
        speedX,
        speedY,
        rotation: 0,
        rotationSpeed,
        color: [Math.random(), Math.random(), Math.random()]
    };
}

// Valeurs par défaut (modifiables par le panneau de contrôle)
const settings = {
    count: 10,
    triangleSize: 0.1, // en proportion de la plus petite dimension
    rotationSpeed: 0.01
};

function updateTriangles() {
    triangles = [];
    for (let i = 0; i < settings.count; i++) {
        const size = settings.triangleSize * Math.min(canvas.width, canvas.height);
        const x = Math.random() * (canvas.width - size);
        const y = Math.random() * (canvas.height - size);
        const speedX = (Math.random() - 0.5) * 4;
        const speedY = (Math.random() - 0.5) * 4;
        const rotationSpeed = (Math.random() - 0.5) * settings.rotationSpeed;
        triangles.push(createTriangle(x, y, size, speedX, speedY, rotationSpeed));
    }
}

updateTriangles();

function drawTriangle(tri) {
    gl.useProgram(program);

    // Appliquer la taille en pixels
    const scaledVertices = new Float32Array([
        0, -tri.size,
        tri.size, tri.size,
        -tri.size, tri.size
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, scaledVertices, gl.DYNAMIC_DRAW);

    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(rotationLocation, tri.rotation);
    gl.uniform3fv(colorLocation, tri.color);

    gl.drawArrays(gl.TRIANGLES, 0, 3);
}

function animate() {
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    for (const tri of triangles) {
        // Déplacement
        tri.x += tri.speedX;
        tri.y += tri.speedY;

        // Rebond sur les bords
        if (tri.x < 0 || tri.x + tri.size > canvas.width) tri.speedX *= -1;
        if (tri.y < 0 || tri.y + tri.size > canvas.height) tri.speedY *= -1;

        // Rotation
        tri.rotation += tri.rotationSpeed;

        // Dessin
        gl.viewport(tri.x, tri.y, tri.size, tri.size);
        drawTriangle(tri);
    }

    requestAnimationFrame(animate);
}

animate();

// Écouteurs sliders (à connecter à tes sliders HTML)
document.getElementById("triangleCount").addEventListener("input", e => {
    settings.count = parseInt(e.target.value);
    updateTriangles();
});

document.getElementById("triangleSize").addEventListener("input", e => {
    settings.triangleSize = parseFloat(e.target.value) / 100;
    updateTriangles();
});

document.getElementById("rotationSpeed").addEventListener("input", e => {
    settings.rotationSpeed = parseFloat(e.target.value);
    updateTriangles();
});

document.getElementById("fullscreenBtn").addEventListener("click", () => {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});
