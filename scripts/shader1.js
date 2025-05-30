
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
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // Fragment Shader (couleur animée avec le temps)
    const fragmentShaderSource = `
        precision mediump float;
        uniform float u_time;
        void main() {
            float r = abs(sin(u_time * 0.5));
            float g = abs(sin(u_time * 0.7));
            float b = abs(sin(u_time * 0.9));
            gl_FragColor = vec4(r, g, b, 1.0);
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

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);


if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    throw new Error("Échec du linkage du programme WebGL");
}


    
    gl.useProgram(program);

    // Création du triangle couvrant tout l'écran
    const positions = new Float32Array([
        -1, -1,
        3, -1,
        -1, 3
    ]);
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    const timeUniform = gl.getUniformLocation(program, "u_time");

    function render(time) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.uniform1f(timeUniform, time * 0.001); // Conversion en secondes

        gl.drawArrays(gl.TRIANGLES, 0, 3);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

