struct PosBuffer {
  pos: vec2<f32>
};
@group(0) @binding(0) var<storage, read> posBuffer: PosBuffer;

struct VertexOut {
  @builtin(position) pos: vec4<f32>,
  @location(0) uv: vec2<f32>,
};

@vertex
fn main(@location(0) position: vec2<f32>) -> VertexOut {
  var output: VertexOut;
  // Décale le cercle avec (x, y)
  let par =vec2<f32>(0.0,0.0);
  //posBuffer.pos=par;
  output.pos = vec4<f32>(position + posBuffer.pos, 0.0, 1.0);
  //output.pos = vec4<f32>(position + par, 0.0, 1.0);
  output.uv = position;
  return output;
}

