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
  let halfSize = p.size * 0.5;
 // let halfSizeH=p.size*0.5*u_aspect;
    let count = arrayLength(&particlesDatas);

     // **Collisions entre particules**
  for (var j = 0u; j < count; j++) {
    if (i == j) {
      continue;
    }
    var other = particlesDatas[j];

    let delta = other.pos - p.pos;
    let dist = length(delta);
    let minDist = halfSize + other.size * 0.5;

    if (dist < minDist && dist > 0.0001) { // Évite la division par zéro
      let normal = normalize(delta);
      let relativeVelocity = p.velocity - other.velocity;
      let speed = dot(relativeVelocity, normal);

      if (speed < 0.0) { // Corrige si les particules s’éloignent déjà
        continue;
      }

      // Réponse simple : échange de vitesses projetées sur la normale (rebond élastique approximatif)
      p.velocity -= speed * normal;
    }
  }
 


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
  p.pos.y  = (yLimit - p.size * 0.5);
  p.velocity.y = -p.velocity.y;
}
if (p.pos.y - p.size*0.5 < -yLimit) {
  p.pos.y = (-yLimit + p.size * 0.5);
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
