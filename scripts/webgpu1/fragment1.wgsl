@group(0) @binding(2)
var<uniform> colorBuffer: vec4<f32>; // ✅ Couleur des particules



@fragment
fn main(@location(0) size: f32) -> @location(0) vec4<f32> {
  return vec4<f32>(1.0, 1.0, 1.0, 1.0); // blanc pur
   // let alpha = clamp(size * 2.0, 0.3, 1.0); // ✅ Variation de l’opacité selon la taille
   // return vec4<f32>(colorBuffer.rgb, alpha); // ✅ Application de la couleur


}



