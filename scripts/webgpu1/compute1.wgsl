struct Particle {
  pos: vec2<f32>,
  size: f32,
  // _pad: f32,
  velocity: vec2<f32>,
};

@group(0) @binding(0)
var<storage, read_write> particlesDatas: array<Particle>;

@group(0) @binding(1)
var<uniform> u_aspect: f32;

@compute @workgroup_size(64)

fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let index = id.x;
  if (index >= arrayLength(&particlesDatas)) { return; }

  // Pas de lecture, pas d’écriture
}

