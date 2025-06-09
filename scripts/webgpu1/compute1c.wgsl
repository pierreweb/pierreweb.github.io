struct Particle {
  pos: vec2<f32>,
  size: f32,
  _pad: f32, // padding pour l'alignement
  velocity: vec2<f32>,
};

@group(0) @binding(0)
var<storage, read_write> particlesDatas: array<Particle>;

@group(0) @binding(1)
var<uniform> u_aspect: f32;

@compute @workgroup_size(1)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  var p = particlesDatas[i];
  let xLimit = 1.0;
  let yLimit=1.0;
 let halfSize=p.size*0.5;
  //let halfSizeV = p.size * 0.5;
 // let halfSizeH=p.size*0.5*u_aspect;

  // Mise à jour de la position
  p.pos += p.velocity;



if ((p.pos.x *u_aspect+ p.size*0.5) > xLimit) {
  p.pos.x  = (xLimit - p.size*.5)/u_aspect;
  p.velocity.x = -p.velocity.x;
}
if (p.pos.x*u_aspect - p.size*0.5 < -xLimit) {
  p.pos.x = (-xLimit + p.size*0.5)/u_aspect;
  p.velocity.x = -p.velocity.x;
}

if ((p.pos.y + p.size*0.5) > yLimit) {
  p.pos.y  = (yLimit - p.size*.5);
  p.velocity.y = -p.velocity.y;
}
if (p.pos.y - p.size*0.5 < -yLimit) {
  p.pos.y = (-yLimit + p.size*0.5);
  p.velocity.y = -p.velocity.y;
}

// Vérifie collision bord haut et bas 
//if (abs(p.pos.y) + p.size*0.5 > yLimit) {
 // p.pos.x = yLimit - (p.size*0.5); // Recalage exact
 // p.velocity.y = -p.velocity.y;
//}








  // Enregistre les modifications
  particlesDatas[i] = p;
}
