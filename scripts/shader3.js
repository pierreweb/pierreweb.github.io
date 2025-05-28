
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
        uniform vec2 u_resolution;
        uniform vec2 u_translation;
        uniform float u_rotation;

        void main() {
            // Rotation
            float cosR = cos(u_rotation);
            float sinR = sin(u_rotation);
            vec2 rotatedPosition = vec2(
                a_position.x * cosR - a_position.y * sinR,
                a_position.x * sinR + a_position.y * cosR
            );

            // Translation et conversion coord NDC
            vec2 position = rotatedPosition + u_translation;
            vec2 zeroToOne = position / u_resolution;
            vec2 clipSpace = zeroToOne * 2.0 - 1.0;

            gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        }
    `;

    const fragmentShaderSource = `
        precision mediump float;
        uniform float u_time;
        uniform float u_index;

        void main() {
            float r = abs(sin(u_time * 0.5 + u_index));
            float g = abs(cos(u_time * 0.3 + u_index));
            float b = abs(sin(u_time * 0.7 + u_index * 2.0));
            gl_FragColor = vec4(r, g, b, 1.0);
        }
    `;

    // === UTILS ===
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

    function createProgram(gl, vs, fs) {
        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error(gl.getProgramInfoLog(program));
            gl.deleteProgram(program);
        }
        return program;
    }

    // === SHADERS & PROGRAM ===
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vs, fs);
    gl.useProgram(program);

    // === ATTRIBUTES / UNIFORMS ===
    const positionAttrib = gl.getAttribLocation(program, "a_position");
    const resolutionUniform = gl.getUniformLocation(program, "u_resolution");
    const translationUniform = gl.getUniformLocation(program, "u_translation");
    const rotationUniform = gl.getUniformLocation(program, "u_rotation");
    const timeUniform = gl.getUniformLocation(program, "u_time");
    const indexUniform = gl.getUniformLocation(program, "u_index");

    // === GÉOMÉTRIE DU TRIANGLE ===
    const triangle = new Float32Array([
        0, -20,
        15, 10,
        -15, 10
    ]);
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, triangle, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionAttrib);
    gl.vertexAttribPointer(positionAttrib, 2, gl.FLOAT, false, 0, 0);

    // === TRIANGLES ===
    const triangleCount = 10;
    const triangles = [];

    for (let i = 0; i < triangleCount; i++) {
        triangles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            dx: (Math.random() - 0.5) * 3,
            dy: (Math.random() - 0.5) * 3,
            angle: Math.random() * Math.PI * 2,
            dAngle: (Math.random() - 0.5) * 0.1,
            index: i
        });
    }

    function render(time) {
        time *= 0.001;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resolutionUniform, canvas.width, canvas.height);

        for (const tri of triangles) {
            tri.x += tri.dx;
            tri.y += tri.dy;
            tri.angle += tri.dAngle;

            // rebond
            if (tri.x < 0 || tri.x > canvas.width) tri.dx *= -1;
            if (tri.y < 0 || tri.y > canvas.height) tri.dy *= -1;

            gl.uniform2f(translationUniform, tri.x, tri.y);
            gl.uniform1f(rotationUniform, tri.angle);
            gl.uniform1f(timeUniform, time);
            gl.uniform1f(indexUniform, tri.index);

            gl.drawArrays(gl.TRIANGLES, 0, 3);
        }

        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);

