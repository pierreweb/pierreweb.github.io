@group(0) @binding(1) var<uniform> u_aspect: f32;


//fn correct_aspect(pos: vec2<f32>) -> vec2<f32> {
 //   return vec2<f32>(pos.x * u_aspect, pos.y);
//}

fn correct_aspect(pos: vec2<f32>) -> vec2<f32> {
    return vec2<f32>(pos.x * (1.0 / u_aspect), pos.y); 
}


struct VertexOutput {
  @builtin(position) pos : vec4<f32>,
  @location(0) v_pos : vec2<f32>,
};


@vertex
fn main(@location(0) pos : vec2<f32>) -> VertexOutput {
    var out : VertexOutput;
    
    // Appliquer la correction d'aspect avant projection
    let correctedPos = correct_aspect(pos);
    
    out.pos = vec4<f32>(correctedPos, 0.0, 1.0);
    out.v_pos = correctedPos;

    return out;
}


