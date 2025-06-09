struct PosBuffer {
  pos: vec2<f32>
};
@group(0) @binding(0) var<storage, read_write> posBuffer: PosBuffer;

@compute @workgroup_size(1)
fn main() {
 // let x = f32(rand()) * 2.0 - 1.0;
 //let y =3.0* f32(rand()) * 2.0 - 1.0;
 
 let x=posBuffer.pos.x+0.000001;
 let y=posBuffer.pos.y+0.000001;
  posBuffer.pos = vec2<f32>(0.0,0.0);
}

// Générateur de nombre aléatoire simple
var<private> seed: u32 = 0x12345678u;
fn rand() -> f32 {
  seed = seed * 1664525u + 1013904223u;
  return f32(seed & 0x00FFFFFFu) / f32(0x01000000u);
}
