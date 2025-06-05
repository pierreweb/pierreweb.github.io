#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_ballCount;
uniform float u_r;
uniform float u_dt;
uniform float u_aspect;

out vec4 outColor;

void main() {
    // 🔹 Lecture correcte des données sans doublon
    //vec4 data = texture(u_data, vec2((gl_FragCoord.x + 0.5) / u_ballCount, 0.5));
   // vec4 data = texture(u_data, vec2((gl_FragCoord.x + 0.5) / u_ballCount, 0.5));
     vec4 data = texture(u_data, vec2((gl_FragCoord.x + 0.5) / u_ballCount, 0.5));
//vec2 pos = (data.xy * 2.0) - 1.0; // Normalisation [-1,1]

   // vec2 pos = data.xy;
   // vec2 vel = data.zw;
    vec2 pos = (data.xy * 2.0) - 1.0; // Passer de [0,1] à [-1,1]
vec2 vel = (data.zw * 2.0) - 1.0;


    // 🔹 Déplacement correct
    pos += vel * u_dt;

    // ✅ Correction des collisions avec les bords
    float xMin = -1.0 + u_r;
    float xMax = 1.0 - u_r;
    float yMin = -1.0 + u_r;
    float yMax = 1.0 - u_r;

    if (pos.x < xMin) { pos.x = xMin; vel.x *= -1.0; }
    if (pos.x > xMax) { pos.x = xMax; vel.x *= -1.0; }
    if (pos.y < yMin) { pos.y = yMin; vel.y *= -1.0; }
    if (pos.y > yMax) { pos.y = yMax; vel.y *= -1.0; }

    // 🟢 Calcul de la distance pour l'affichage
    vec2 screenPos = pos * vec2(u_aspect, 1.0);
    float d = length(gl_FragCoord.xy / vec2(u_ballCount, 1.0) - screenPos);
    float alpha = smoothstep(u_r, 0.0, d);

    // 🟢 Application de la couleur correcte
    vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.5), screenPos.x);

    // ✅ Sortie bien définie sans écrasement multiple
    outColor = vec4(color, alpha);
    outColor = vec4(pos, 1.0, 1.0); // Affichage position des balles

   
//outColor = vec4(data.xy, 0.0, 1.0); // Vérifier les données stockées
pos = clamp(pos, vec2(-1.0), vec2(1.0)); // Évite les positions en dehors du cadre
    outColor = vec4(pos, 1.0, 1.0); // Affichage position des balles



}
