#version 300 es
precision highp float;

uniform sampler2D u_data; // Texture avec les données
out vec4 outColor;

void main() {
    // Obtenir les données des 2 balles
    vec4 ball1 = texelFetch(u_data, ivec2(0,0), 0);
    vec4 ball2 = texelFetch(u_data, ivec2(1,0), 0);

    // Positions et vitesses
    vec2 p1 = ball1.xy;
    vec2 v1 = ball1.zw;
    vec2 p2 = ball2.xy;
    vec2 v2 = ball2.zw;

    float r = 0.05; // rayon des balles
    float dt = 0.016; // ~16 ms par frame (60 FPS)

    // --- Collision avec les bords ---
    // Ball 1
    if (abs(p1.x + v1.x * dt) + r > 1.0) v1.x *= -1.0;
    if (abs(p1.y + v1.y * dt) + r > 1.0) v1.y *= -1.0;
    // Ball 2
    if (abs(p2.x + v2.x * dt) + r > 1.0) v2.x *= -1.0;
    if (abs(p2.y + v2.y * dt) + r > 1.0) v2.y *= -1.0;

    // --- Collision entre les deux balles ---
    vec2 dp = p2 - p1;
    float dist = length(dp);
    if (dist < 2.0 * r) {
        // Normal de collision
        vec2 n = normalize(dp);
        // Composantes normales des vitesses
        float v1n = dot(v1, n);
        float v2n = dot(v2, n);

        // Échange des composantes normales (masse = 1 pour les deux balles)
        float temp = v1n;
        v1 += (v2n - v1n) * n;
        v2 += (temp - v2n) * n;

        // Évite chevauchement (simple repositionnement)
        float overlap = 2.0 * r - dist;
        p1 -= 0.5 * overlap * n;
        p2 += 0.5 * overlap * n;
    }

    // --- Mise à jour positions ---
    p1 += v1 * dt;
    p2 += v2 * dt;

    // Sauvegarder les nouvelles données
    if (gl_FragCoord.x < 1.0) {
        outColor = vec4(p1, v1);
    } else {
        outColor = vec4(p2, v2);
    }
}
