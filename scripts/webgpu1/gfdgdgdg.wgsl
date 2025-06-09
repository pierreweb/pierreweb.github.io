@group(0) @binding(0)
//var<uniform> particlesDatas: array<Particle>; // ✅ Correct : Aligné avec le `BindGroupLayout`
//var<storage, read> particlesDatas: array<Particle>; // ✅ Correct : Le tableau doit être `storage`
//@group(0) @binding(1)
var<storage, read> particlesDatas: array<Particle>; // ✅ Correction : `read-only storage`




struct Particle {
    pos: vec2<f32>,
    size: f32,
    velocity: vec2<f32>
};

@group(0) @binding(1)
var<uniform> u_aspect: f32; // ✅ Aspect ratio écran

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) size: f32, // ✅ Transfert de la taille au fragment shader
};

@vertex
fn main(@builtin(instance_index) index: u32) -> VertexOutput {
    let particle = particlesDatas[index];
   // let pos = vec2<f32>(particle.pos.x * u_aspect, particle.pos.y);
    let pos = vec2<f32>(particle.pos.x * u_aspect, particle.pos.y);

    var output: VertexOutput;
    output.position = vec4<f32>(0.5,0.5,0.0,1.0);//vec4<f32>(pos, 0.0, 1.0);
    output.size = 0.1;//particle.size;
    return output;
}




------------------------------
//@vertex
//fn main(@builtin(vertex_index) index: u32) -> @builtin(position) vec4<f32> {
  //  return vec4<f32>(0.0, 0.0, 0.0, 0.10); // ✅ Place un point au centre de l'écran
//}


struct VertexOutput {
    @builtin(position) position: vec4<f32>
};

@vertex
fn main(@builtin(vertex_index) index: u32) -> VertexOutput {
    var positions = array<vec2<f32>, 3>(
        vec2<f32>(-0.5, -0.5), // ✅ Bas gauche
        vec2<f32>(0.5, -0.5),  // ✅ Bas droite
        vec2<f32>(0.0, 0.5)    // ✅ Haut
    );

    var output: VertexOutput;
    output.position = vec4<f32>(positions[index], 0.0, 1.0);
    return output;
}