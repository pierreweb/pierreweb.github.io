#version 300 es
precision highp float;
uniform float u_aspect;
uniform sampler2D u_data;
uniform float u_ballCount;
uniform float u_r;
in vec2 v_uv;
out vec4 outColor;

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
    uv.x *= u_aspect; // corrige la déformation en X
  //float r = 0.05;
  vec3 col = vec3(1.0);

  for (int i = 0; i < 100; i++) {
    if (i >= int(u_ballCount)) break;
    vec4 ball = texelFetch(u_data, ivec2(i,0), 0);
    float d = length(uv - ball.xy);
    float c = smoothstep(u_r, u_r - 0.01, d);
    col *= mix(vec3(1.0), vec3(1.0, 0.2, 0.0), c); // couleur des balles
  }
  
  outColor = vec4(col, 1.0);
}



