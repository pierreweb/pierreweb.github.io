struct VertexOutput {
  @builtin(position) pos : vec4<f32>,
  @location(0) v_pos : vec2<f32>,
};

@vertex
fn main(@location(0) pos : vec2<f32>) -> VertexOutput {
  var out : VertexOutput;
  out.pos = vec4<f32>(pos, 0.0, 1.0);
  out.v_pos = pos;
  return out;
}


struct VertexOutput {
  @builtin(position) pos : vec4<f32>,
  @location(0) v_pos : vec2<f32>,
};

@vertex
fn main(@location(0) pos : vec2<f32>, @builtin(vertex_index) vertex_index : u32) -> VertexOutput {
  var out : VertexOutput;

  var size: f32 = 0.1; // Taille du quad
  var offsets = array(
    vec2<f32>(-size, -size),
    vec2<f32>(size, -size),
    vec2<f32>(size, size),
    vec2<f32>(-size, size)
  );

  out.pos = vec4<f32>(pos + offsets[vertex_index], 0.0, 1.0);
  out.v_pos = pos;
  
  return out;
}


