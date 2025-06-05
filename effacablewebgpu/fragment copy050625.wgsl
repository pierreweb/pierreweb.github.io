@group(0) @binding(0) var<uniform> color : vec4<f32>;


@fragment
fn main(@location(0) v_pos : vec2<f32>) -> @location(0) vec4<f32> {
  //return color;
   return vec4f(0.0, 1.0, 0.0, 1.0);//pour test 
}

