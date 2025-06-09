@group(0) @binding(0)

var<storage, read> particlesDatas: array<Particle>; // ✅ Correction : `read-only storage`

struct Particle {
    pos: vec2<f32>,
    size: f32,
    _pad: f32,  // Pour aligner à 16 octets
    velocity: vec2<f32>
};

@group(0) @binding(1)
var<uniform> u_aspect: f32; // ✅ Aspect ratio écran

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) size: f32, // ✅ Transfert de la taille au fragment shader
     //@location(0) uv: vec2<f32>,
};

@vertex
fn main(
  @location(0) position: vec2<f32>,
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) index: u32
) -> VertexOutput
{    
    let particle = particlesDatas[index];
  let pos = vec2<f32>(particle.pos.x * u_aspect, particle.pos.y);

    var output: VertexOutput;
output.position = vec4<f32>(0.0,0.0,0.0,1.0);//vec4<f32>(pos, 0.0, 1.0);
  // output.position=vec4<f32>(position+particle.pos,0.0,1.0);
   //output.size =particle.size;
  output.size = particle.size;
  // output.position = vec4<f32>(position + pos, 0.0, 1.0);

     //output.uv = position;
    return output;
}




@fragment
fn main(@location(0) size: f32) -> @location(0) vec4<f32> {
      discard;
          return vec4<f32>(0.0, 0.0, 1.0, 1.0); //
   // let alpha = clamp(size * 2.0, 0.3, 1.0); // ✅ Variation de l’opacité selon la taille
   // return vec4<f32>(colorBuffer.rgb, alpha); // ✅ Application de la couleur
}



 // ✅ Vérifier les collisions avec les bords
   // if (particle.pos.x - particle.size < -u_aspect || particle.pos.x + particle.size > u_aspect) {
            if (particle.pos.x - particle.size < -1.0 || particle.pos.x + particle.size > 1.0) {
        particle.velocity.x *= -1.0;  
       // particle.pos.x = clamp(particle.pos.x, -u_aspect + particle.size, u_aspect - particle.size);
        particle.pos.x = clamp(particle.pos.x, -1.0 + particle.size, 1.0 - particle.size);
    }
    
    if (particle.pos.y - particle.size < -1.0 || particle.pos.y + particle.size > 1.0) {
        particle.velocity.y *= -1.0;  
        particle.pos.y = clamp(particle.pos.y, -1.0 + particle.size, 1.0 - particle.size);
    }