#version 300 es
precision highp float;
uniform sampler2D u_data;
in vec2 v_uv;
out vec4 outColor;

void main() {
    vec4 ball1 = texelFetch(u_data, ivec2(0,0), 0);
    vec4 ball2 = texelFetch(u_data, ivec2(1,0), 0);
    float r = 0.05;
    vec2 uv = v_uv * 2.0 - 1.0;
    float d1 = length(uv - ball1.xy);
    float d2 = length(uv - ball2.xy);
    float c1 = smoothstep(r, r - 0.01, d1);
    float c2 = smoothstep(r, r - 0.01, d2);
    vec3 color1 = mix(vec3(0,0.7,1), vec3(1), c1);
    vec3 color2 = mix(vec3(1,0,0), vec3(1), c2);
    outColor = vec4(color1 * (1.0 - c2) + color2 * (1.0 - c1), 1.0);
}
