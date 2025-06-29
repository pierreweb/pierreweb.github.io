struct Particle {
  pos: vec2<f32>,
  size: f32,
  _pad: f32, // padding pour l'alignement
  velocity: vec2<f32>,
};
struct Correction {
  pos: vec2<f32>,
  velocity: vec2<f32>,
};

@group(0) @binding(0)
var<storage, read_write> particlesDatas: array<Particle>;

// Buffer séparé pour corrections
@group(0) @binding(2)
//var<storage, read_write> corrections: array<vec2<f32>>;
var<storage, read_write> corrections: array<Correction>;

@group(0) @binding(1)
var<uniform> u_aspect: f32;



@compute @workgroup_size(1)
fn apply_corrections(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    var corr=corrections[i];
    var p=particlesDatas[i];
    p.pos =corr.pos;
    p.velocity=corr.velocity;
    particlesDatas[i]=p;
}


@compute @workgroup_size(1)
fn simulate(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  var p = particlesDatas[i];
  let xLimit = 1.0;
  let yLimit=1.0;
  let halfSize = p.size * 0.5;
  let count = arrayLength(&particlesDatas);
  
  // Utilisation des corrections séparées
  var corr = corrections[i];
  // Réinitialiser la correction de cette balle
  corr.pos =vec2<f32>(0.0, 0.0);
  corr.velocity =vec2<f32>(0.0, 0.0);
  
  


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
      let overlap = minDist - dist;


      if (speed < 0.0) { // Corrige si les particules s’éloignent déjà
        continue;
      }
      // Réponse simple : échange de vitesses projetées sur la normale (rebond élastique approximatif)
      p.velocity =-1.0* length(p.velocity)*normal;
      // Corrige les positions pour éviter l'interpénétration
     // p.pos -= 0.5 * overlap * normal;
      p.pos-=halfSize*normal*overlap;
     //other.pos += 0.5 * overlap * normal;
    }


  // Mise à jour de la position
  p.pos += p.velocity;




// collision avec les bords

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
  }

// Vérifie collision bord haut et bas 
//if (abs(p.pos.y) + p.size*0.5 > yLimit) {
 // p.pos.x = yLimit - (p.size*0.5); // Recalage exact
 // p.velocity.y = -p.velocity.y;
//}



 // p.pos += corr;
  // Réinitialise la correction pour la frame suivante
  //corrections[i] = vec2<f32>(0.0, 0.0);

  // Enregistre les modifications
//  particlesDatas[i] = p;
 
  corrections[i].pos=p.pos;
  corrections[i].velocity=p.velocity;

}
