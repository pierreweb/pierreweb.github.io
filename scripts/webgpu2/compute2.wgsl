struct PosBuffer {
  pos: vec2<f32>
};
@group(0) @binding(0) var<storage, read_write> posBuffer: PosBuffer;

struct TimeBuffer {
  time: f32
};
@group(0) @binding(1) var<uniform> timeBuffer: TimeBuffer;

@compute @workgroup_size(1)
fn main() {
  // Exemple d’oscillation en fonction du temps
  let offsetX = 0.5 * sin(timeBuffer.time);
  let offsetY = 0.5 * cos(timeBuffer.time);

  posBuffer.pos = vec2<f32>(offsetX, offsetY);
}
