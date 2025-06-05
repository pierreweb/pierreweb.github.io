#version 300 es
precision highp float;

uniform sampler2D u_data;
uniform float u_ballCount;
uniform float u_r;
uniform float u_aspect;

in vec2 v_uv;
out vec4 fragColor;




//out vec4 outColor;



void main() {

  // Convert UV to NDC [-1,1] et corrige aspect
  vec2 p = v_uv * 2.0 - 1.0;
  p.x *= u_aspect; // le point à comparer

  //vec3 col = vec3(0.0);
    vec4 color = vec4(0.0);

  for (int i = 0; i < int(u_ballCount); ++i) {
    vec4 data = texelFetch(u_data, ivec2(i, 0), 0);
    vec2 pos = data.xy;
    pos.x *= u_aspect;

    // distance avec aspect appliqué => cercles ronds à l’écran
    float d = length(p - pos);

    if (d < u_r) {
     // col = vec3(1.0 - d / u_r, d / u_r, 0.1);
        float alpha = smoothstep(u_r, 0.0, d);
        color += vec4(1.0, 0.5, 0.2, 1.0) * alpha; // Couleur de base
    }
  }

    // color = clamp(color, 0.0, 1.0);
    //outColor = vec4(color.rgb, 1.0);
    fragColor = vec4(color.rgb, 1.0);
  //fragColor = vec4(col, 1.0);

}

//void main() {
    //for (int i = 0; i < 1000; i++) { // Max 1000 particules
      //  if (i >= int(u_ballCount)) break;

     //   vec4 p = texelFetch(u_data, ivec2(i, 0), 0);
       // vec2 pos = p.xy;

      //  float d = length(uv - pos);
  //  }
//}