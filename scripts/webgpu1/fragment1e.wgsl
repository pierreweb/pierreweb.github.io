@group(0) @binding(2)
var<uniform> colorBuffer: vec4<f32>; // ✅ Couleur des particules





@fragment
fn main(
  @location(0) uv: vec2<f32>
) -> @location(0) vec4<f32> {
  // Calcul de la distance au centre pour dégradé radial
  let dist = length(uv); // 0 au centre, ~1 au bord

  // Dégradé de couleur (par ex, centre blanc, bord transparent)
 // let centerColor = vec3<f32>(1.0, 0.2, 0.1); // rouge claire
   let centerColor = vec3<f32>(colorBuffer.rgb);//vec3<f32>(1.0, 0.2, 0.1); // rouge claire
  let edgeColor = vec3<f32>(0.1, 0.0, 0.0); // rouge

  // Interpolation
  let color = mix(centerColor, edgeColor, dist);

  // Ajout alpha (optionnel)
  let alpha = 1.0 - dist;

  return vec4<f32>(color, alpha);
}



//@fragment
//fn main(@location(0) size: f32) -> @location(0) vec4<f32> {
 // return vec4<f32>(1.0, 1.0, 1.0, 1.0); // blanc pur
  // let alpha = clamp(size * 2.0, 0.1, 0.5); // ✅ Variation de l’opacité selon la taille
  //  return vec4<f32>(colorBuffer.rgb, 0.1); // ✅ Application de la couleur
//}