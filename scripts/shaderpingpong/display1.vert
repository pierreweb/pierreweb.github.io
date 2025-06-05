#version 300 es
layout(location=0) in float ballIndex;
in vec2 position;


out vec2 v_uv;
void main() {
  v_uv = position * 0.5 + 0.5;

  gl_Position = vec4(position, 0, 1);
}





