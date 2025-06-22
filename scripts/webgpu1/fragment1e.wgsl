@group(0) @binding(4)
var<storage, read> colorBufferDif: array<vec4<f32>>;

@fragment
fn main(
  @location(0) uv: vec2<f32>,
  @interpolate(flat) @location(3) particleIndex: u32
) -> @location(0) vec4<f32> {
  let dist = length(uv);             // distance au centre
  let baseColor = colorBufferDif[particleIndex]; // couleur unique de la particule

  // Optionnel : dégradé radial vers centre
  let center = baseColor.rgb;
  let edge = center * 0.2;
  let finalRGB = mix(center, edge, dist);
  let alpha = 1.0 - dist;

  return vec4<f32>(finalRGB, alpha * baseColor.a); // utilise alpha d'origine si souhaité
}
