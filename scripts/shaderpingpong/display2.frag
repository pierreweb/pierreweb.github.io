#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_ballCount;
uniform float u_aspect;
uniform float u_r;

in vec2 v_uv; // UV qui vient du vertex shader
out vec4 outColor;




void main() {
    vec2 p = (v_uv - 0.5) * 2.0; // Normaliser à [-1, +1], centré

    // 🟢 Correction : utiliser un index correct
    float id = floor(v_uv.x * u_ballCount) / u_ballCount;
    //vec4 data = texture(u_data, vec2(id, 0.5)); // Lire position correcte
   // vec4 data = texture(u_data, vec2(v_uv.x, 0.5)); // Assurer qu'on lit bien une seule balle
      //vec4 data = texture(u_data, vec2(gl_FragCoord.x / u_ballCount, 0.5));
      //vec4 data = texture(u_data, vec2((v_uv.x * u_ballCount + 0.5) / u_ballCount, 0.5));
      //vec4 data = texture(u_data, vec2((gl_FragCoord.x + 0.5) / u_ballCount, 0.0));
vec4 data = texture(u_data, vec2((v_uv.x * u_ballCount + 0.5) / u_ballCount, 0.5));



    vec2 pos = data.xy;

    // ✅ Correction de l'aspect ratio
    pos.x *= u_aspect;
    p.x *= u_aspect;

    float d = length(p - pos);
    float alpha = smoothstep(u_r, 0.0, d);

    // 🟢 Ajout : meilleure gestion du gradient
   // vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.5), abs(pos.x)); 
   // vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.5), data.x * 0.5 + 0.5);
    vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.0, 0.5), data.x);



    outColor = vec4(color, alpha);
    outColor = vec4(v_uv, 1.0, 1.0); // Test affichage UV directement
    outColor = vec4(pos, 0.0, 1.0);
    outColor = vec4(v_uv.x, v_uv.y, 0.0, 1.0); // Test affichage UV
    outColor = vec4(pos, 0.0, 1.0);
 
outColor = vec4(data.xy, 0.0, 1.0); // Affichage direct des positions
//outColor = vec4(1.0, 0.0, 0.0, 1.0); // Rouge total
outColor = vec4(color, 1.0);

outColor = vec4(color, smoothstep(u_r, 0.0, length(v_uv - data.xy)));







}
