#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_position; // Quad en 2D

out vec2 v_uv;

void main() {
    v_uv = (a_position + 1.0) * 0.5; // De [-1,1] -> [0,1]
    gl_Position = vec4(a_position, 0.0, 1.0);
}
