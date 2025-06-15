struct Particle {
  pos: vec2<f32>,
  size: f32,
  _pad: f32,//👉 Même si _pad n’est jamais lu en pratique, il doit être là pour l’alignement en mémoire du GPU (WebGPU aligne les vec2<f32> et les structures sur 8 ou 16 bytes).
  velocity: vec2<f32>,
};

@group(0) @binding(0)
var<storage, read> particlesDatas: array<Particle>;

@group(0) @binding(1)
var<uniform> u_aspect: f32;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
    @location(1) size: f32,
      @location(0) uv: vec2<f32>,
};

@vertex
fn main(
  @location(0) position: vec2<f32>,
  @builtin(instance_index) index: u32
) -> VertexOutput {
  let particle = particlesDatas[index];

  // Ajuste aspect ratio
  //✅ Tu corriges la position du cercle pour compenser l’aspect ratio dans l’écran :
  let aspectCorrectedPos = vec2<f32>(particle.pos.x , particle.pos.y);

  // Échelle du cercle modèle
  //👉 Tes sommets du cercle (dans position du vertex shader) sont eux aussi affectés par l’aspect ratio.
  let scaledPos = vec2<f32>(position.x * (1.0 / u_aspect), position.y) * particle.size;


  var output: VertexOutput;
  output.position = vec4<f32>(scaledPos + aspectCorrectedPos, 0.0, 1.0);

  output.size=particle.size;
 
  output.uv = position;   // Les UV centrés

  return output;
}



  //  @builtin(vertex_index) vertexIndex: u32,