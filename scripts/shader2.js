const canvas = document.getElementById("glCanvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const gl = canvas.getContext("webgl");

if (!gl) {
    alert("WebGL non supporté !");
    throw new Error("WebGL non supporté !");
}

// Vertex Shader
const vertexShaderSource = `
attribute vec2 a_position;
uniform vec2 u_offset;
void main() {
    gl_Position = vec4(a_position + u_offset, 0.0, 1.0);
}
`;

// Fragment Shader (couleur animée)
const fragmentShaderSource = `
precision mediump float;
uniform float u_time;
void main() {
    float r = abs(sin(u_time * 0.5));
    float g = abs(sin(u_time * 1.0));
    float b = abs(sin(u_time * 1.5));
    gl_FragColor = vec4(r, g, b, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Erreur compilation shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error("Échec du linkage");
}
gl.useProgram(program);

// Triangle: 3 points en 2D (x, y)
const positions = new Float32Array([
    0.0,  0.1,
   -0.1, -0.1,
    0.1, -0.1
]);

const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

// Attributs et uniforms
const aPositionLoc = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(aPositionLoc);
gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);

const uOffsetLoc = gl.getUniformLocation(program, "u_offset");
const uTimeLoc = gl.getUniformLocation(program, "u_time");

// Position & Vitesse
let pos = [0, 0];
let velocity = [0.005, 0.007];

function render(time) {
    time *= 0.001; // en secondes

    // Rebond sur les bords
    for (let i = 0; i < 2; i++) {
        pos[i] += velocity[i];
        if (pos[i] > 1.0 - 0.1 || pos[i] < -1.0 + 0.1) {
            velocity[i] *= -1;
        }
    }

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2fv(uOffsetLoc, pos);
    gl.uniform1f(uTimeLoc, time);

    gl.drawArrays(gl.TRIANGLES, 0, 3);

    requestAnimationFrame(render);
}

requestAnimationFrame(render);
