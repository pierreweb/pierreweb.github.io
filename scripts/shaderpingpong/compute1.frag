#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_ballCount;
uniform float u_r;
uniform float u_dt;
uniform float u_aspect;

out vec4 outColor;

void main() {
  int ballIndex = int(gl_FragCoord.x);
  vec4 ball = texelFetch(u_data, ivec2(ballIndex, 0), 0);

  vec2 pos = ball.xy;
  vec2 vel = ball.zw;

  // Déplacement
  pos += vel * u_dt;
  //difference rond carre
  float delta=0.414*u_r;

  // Collisions avec les bords (en aspect corrigé directement)
  float xMin = (-1.0 * u_aspect)+u_r;
  float xMax = ( 1.0 * u_aspect)-u_r;

  if (pos.x < xMin) {
    pos.x = xMin;
    vel.x *= -1.0;
  }
  if (pos.x > xMax) {
    pos.x = xMax;
    vel.x *= -1.0;
  }

  if (pos.y < -1.0 + u_r) {
    pos.y = -1.0 + u_r;
    vel.y *= -1.0;
  }
  if (pos.y > 1.0 - u_r) {
    pos.y = 1.0 - u_r;
    vel.y *= -1.0;
  }

  // Collisions avec les autres balles (aspect ratio correctement géré)
  // Approximation collisions avec les autres balles
  for (int i = 0; i < 1000; i++) {  // limite haute (shader n’aime pas boucle dynamique)
    if (i >= int(u_ballCount)) break;
    if (i == ballIndex) continue;
    
    vec4 other = texelFetch(u_data, ivec2(i,0), 0);
    vec2 d = pos - other.xy;
    float dist = length(d);
    vec2 direction = normalize(d); // PAS delta, mais bien d

if (dist < 2.0 * u_r) {
    float overlap = 0.5 * (u_r * 2.0 - dist);
  
    pos -= overlap * direction*vec2(1,1);
    other.xy += overlap * direction*vec2(1,1);

    // Inversion approximative de la vitesse
    vel = reflect(vel, direction);
}
if (dist < 2.0 * u_r-delta) {
    float overlap = 0.5 * (u_r * 2.0 - dist);
  
   pos -= overlap * direction*vec2(1.0+u_r,1.0+u_r);
   other.xy += overlap * direction*vec2(1.0+u_r,1.0+u_r);
     // Inversion approximative de la vitesse
   // vel = reflect(vec2(5.0,1.0), direction);//vitesse plus grande pour echapper au "collage"
}

  }

  outColor = vec4(pos, vel);
}

