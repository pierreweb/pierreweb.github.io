#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_dt;
uniform float u_ballCount;
uniform float u_r;
uniform float u_aspect;

out vec4 fragColor;

void main() {
  int i = int(gl_FragCoord.x);

  vec4 data = texelFetch(u_data, ivec2(i, 0), 0);
  vec2 pos = data.xy;
  vec2 vel = data.zw;

  pos += vel * u_dt;

  // ✅ Correction pour l’aspect (rebond sur les bords gauche/droite)
  float rX = u_r / u_aspect; // rayon corrigé horizontal
  if (pos.x < -1.0 + rX) {
    pos.x = -1.0 + rX;
    vel.x *= -1.0;
  }
  if (pos.x > 1.0 - rX) {
    pos.x = 1.0 - rX;
    vel.x *= -1.0;
  }

  // Pas besoin de correction pour Y (aspect vertical normal)
  if (pos.y < -1.0 + u_r) {
    pos.y = -1.0 + u_r;
    vel.y *= -1.0;
  }
  if (pos.y > 1.0 - u_r) {
    pos.y = 1.0 - u_r;
    vel.y *= -1.0;
  }

  fragColor = vec4(pos, vel);
}
