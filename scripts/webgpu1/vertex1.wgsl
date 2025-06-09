struct Particle {
  pos: vec2<f32>,
  size: f32,
  _pad: f32,
  velocity: vec2<f32>,
};

@group(0) @binding(0)
var<storage, read> particlesDatas: array<Particle>;

@group(0) @binding(1)
var<uniform> u_aspect: f32;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
    @location(0) size: f32,
};

@vertex


fn main(
  @location(0) position: vec2<f32>,
  //  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) index: u32
) -> VertexOutput {
  let particle = particlesDatas[index];

  // Ajuste aspect ratio
  let aspectCorrectedPos = vec2<f32>(particle.pos.x * u_aspect, particle.pos.y);

  // Échelle du cercle modèle
  let scaledPos = position * particle.size;

  var output: VertexOutput;
  output.position = vec4<f32>(scaledPos + aspectCorrectedPos, 0.0, 1.0);
  output.size=particle.size;

  return output;
}
