const canvas = document.getElementById("glCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL non supporté !");
    throw new Error("WebGL non supporté !");
}

// === SHADERS ===
const vertexShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0, 1);
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    uniform vec2 u_resolution;
    uniform vec2 u_translation;
    uniform float u_radius;
    uniform float u_time;
    uniform float u_index;

    void main() {
        vec2 coord = (gl_FragCoord.xy - u_translation) / u_radius;
        float dist = length(coord);
        
        // Détection du cercle
        if (dist < 1.0) {
            float r = abs(sin(u_time * 0.5 + u_index));
            float g = abs(cos(u_time * 0.3 + u_index));
            float b = abs(sin(u_time * 0.7 + u_index * 2.0));
            gl_FragColor = vec4(r, g, b, 1.0);
        } else {
            discard;
        }
    }
`;

// Création des shaders et programme
const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vs, fs);
gl.useProgram(program);

// === ATTRIBUTES / UNIFORMS ===
const positionAttrib = gl.getAttribLocation(program, "a_position");
const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
const translationUniform = gl.getUniformLocation(program, "u_translation");
const radiusUniform = gl.getUniformLocation(program, "u_radius");
const timeUniform = gl.getUniformLocation(program, "u_time");
const indexUniform = gl.getUniformLocation(program, "u_index");

// === BUFFER DE VERTICES ===
// Un rectangle couvrant tout l'écran
const vertices = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1
]);
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
gl.enableVertexAttribArray(positionAttrib);
gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

// === CERCLES ===
const circleCount = 10;
const circles = [];

for (let i = 0; i < circleCount; i++) {
    circles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        dx: (Math.random() - 0.5) * 3,
        dy: (Math.random() - 0.5) * 3,
        radius: 50,
        index: i
    });
}

function render(time) {
    time *= 0.001;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(resolutionUniform, canvas.width, canvas.height);

    for (const circle of circles) {
        circle.x += circle.dx;
        circle.y += circle.dy;

        if (circle.x < 0 || circle.x > canvas.width) circle.dx *= -1;
        if (circle.y < 0 || circle.y > canvas.height) circle.dy *= -1;

        gl.uniform2f(translationUniform, circle.x, circle.y);
        gl.uniform1f(radiusUniform, circle.radius);
        gl.uniform1f(timeUniform, time);
        gl.uniform1f(indexUniform, circle.index);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
