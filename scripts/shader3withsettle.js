const canvas = document.getElementById("glCanvas");
const gl = canvas.getContext("webgl");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

if (!gl) {
    alert("WebGL non supporté !");
}

// === SHADERS ===

// Vertex shader
const vertexShaderSource = `
    attribute vec2 a_position;
    uniform float u_angle;
    uniform vec2 u_resolution;
    uniform float u_size;

    void main() {
        float cosA = cos(u_angle);
        float sinA = sin(u_angle);
        vec2 rotatedPosition = vec2(
            a_position.x * cosA - a_position.y * sinA,
            a_position.x * sinA + a_position.y * cosA
        );
        vec2 scaled = rotatedPosition * u_size;
        vec2 position = scaled / u_resolution * 2.0;
        gl_Position = vec4(position, 0.0, 1.0);
    }
`;

// Fragment shader
const fragmentShaderSource = `
    precision mediump float;
    uniform float u_time;
    uniform int u_gradient;

    vec3 getGradient(float t) {
        if (u_gradient == 0) return vec3(1.0, t, 0.0); // jaune
        if (u_gradient == 1) return vec3(0.0, 0.0, t); // bleu
        if (u_gradient == 2) return vec3(0.0, t, 0.0); // vert
        if (u_gradient == 3) return vec3(t, 0.0, 0.0); // rouge
        if (u_gradient == 4) return vec3(1.0, 0.4 + 0.6*t, 0.7 + 0.3*t); // rose
        if (u_gradient == 5) return vec3(1.0, 0.5 + 0.5*t, 0.0); // orange
        if (u_gradient == 6) return mix(vec3(0.5, 0.0, 1.0), vec3(1.0, 0.5, 0.0), t); // oiseau paradis
        return vec3(1.0);
    }

    void main() {
        float t = mod(u_time * 0.2, 1.0);
        vec3 color = getGradient(t);
        gl_FragColor = vec4(color, 1.0);
    }
`;

// === UTILITAIRE SHADER ===
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

function createProgram(vertexSource, fragmentSource) {
    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    gl.attachShader(program, vShader);
    gl.attachShader(program, fShader);
    gl.linkProgram(program);
    return program;
}

const program = createProgram(vertexShaderSource, fragmentShaderSource);
gl.useProgram(program);

// === LOCALISATION DES ATTRIBUTS & UNIFORMS ===
const aPositionLoc = gl.getAttribLocation(program, "a_position");
const uTimeLoc = gl.getUniformLocation(program, "u_time");
const uAngleLoc = gl.getUniformLocation(program, "u_angle");
const uResLoc = gl.getUniformLocation(program, "u_resolution");
const uSizeLoc = gl.getUniformLocation(program, "u_size");
const uGradientLoc = gl.getUniformLocation(program, "u_gradient");

// === TRIANGLE DE BASE ===
const baseTriangle = new Float32Array([
    0.0,  0.05,
   -0.04, -0.05,
    0.04, -0.05
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, baseTriangle, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPositionLoc);
gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

// === TRIANGLES ===
let triangles = [];

function createTriangles(count) {
    triangles = [];
    for (let i = 0; i < count; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: (Math.random() - 0.5) * 2,
            dy: (Math.random() - 0.5) * 2,
            angle: Math.random() * Math.PI * 2
        });
    }
}

// === SLIDERS ===
const countSlider = document.getElementById("triangleCount");
const sizeSlider = document.getElementById("triangleSize");
const speedSlider = document.getElementById("rotationSpeed");
const gradientSelect = document.getElementById("gradientSelect");
const fullscreenBtn = document.getElementById("fullscreenBtn");

countSlider.addEventListener("input", () => {
    createTriangles(parseInt(countSlider.value));
});
fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        canvas.requestFullscreen();
    }
});

// === ANIMATION ===
createTriangles(parseInt(countSlider.value));

function render(time) {
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const rotationSpeed = parseFloat(speedSlider.value);
    const triangleSize = parseFloat(sizeSlider.value) / 100 * Math.min(canvas.width, canvas.height);
    const gradientIndex = gradientSelect.selectedIndex;

    triangles.forEach(t => {
        // mouvement
        t.x += t.dx;
        t.y += t.dy;

        if (t.x < 0 || t.x > canvas.width) t.dx *= -1;
        if (t.y < 0 || t.y > canvas.height) t.dy *= -1;

        t.angle += 0.01 * rotationSpeed;

        // définir taille & position
        gl.uniform1f(uAngleLoc, t.angle);
        gl.uniform2f(uResLoc, canvas.width, canvas.height);
        gl.uniform1f(uSizeLoc, triangleSize);
        gl.uniform1f(uTimeLoc, time * 0.001);
        gl.uniform1i(uGradientLoc, gradientIndex);

        // translation en WebGL
        gl.viewport(t.x - triangleSize / 2, t.y - triangleSize / 2, triangleSize, triangleSize);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    });

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
