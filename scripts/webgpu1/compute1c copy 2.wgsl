struct Particle {
  pos: vec2<f32>,
  size: f32,
  _pad: f32, // Padding pour alignement
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
  let count = arrayLength(&particlesDatas);

  let restitution = 0.95; // Bounciness
  let deltaTime = 1.0;  // Facteur temporel
  let friction = 1.0;   // Réduction vitesse

  // Gestion des collisions
  for (var j = 0u; j < count; j++) {
    if (i == j) { continue; }

    let other = particlesDatas[j];
    let delta = other.pos - p.pos;
    let dist = length(delta);
    let minDist = 0.5 * (p.size + other.size);

    if (dist < minDist && dist > 0.0) {
      let normal = normalize(delta);
      let relativeVelocity = p.velocity - other.velocity;
      let velAlongNormal = dot(relativeVelocity, normal);

      // Correction de position (seulement p bouge ici)
      let overlap = minDist - dist;
      p.pos -= 0.5 * overlap * normal;

      // Impulsion si approche
      if (velAlongNormal < 0.0) {
        let impulse = -(1.0 + restitution) * velAlongNormal;
        p.velocity += impulse * normal * 0.5; // Ajuste à 0.5 pour « p » seul
      }
    }
  }

  // Mise à jour de la position
  p.velocity *= friction;
  p.pos += p.velocity * deltaTime;

  // Gestion des rebonds sur les bords
  let xLimit = 1.0 / u_aspect;
  let yLimit = 1.0;
  let halfSize = p.size * 0.5;

  if (p.pos.x + halfSize > xLimit) {
    p.pos.x = xLimit - halfSize;
    p.velocity.x = -p.velocity.x * restitution;
  }
  if (p.pos.x - halfSize < -xLimit) {
    p.pos.x = -xLimit + halfSize;
    p.velocity.x = -p.velocity.x * restitution;
  }
  if (p.pos.y + halfSize > yLimit) {
    p.pos.y = yLimit - halfSize;
    p.velocity.y = -p.velocity.y * restitution;
  }
  if (p.pos.y - halfSize < -yLimit) {
    p.pos.y = -yLimit + halfSize;
    p.velocity.y = -p.velocity.y * restitution;
  }

  // Sauvegarde finale
  particlesDatas[i] = p;
}


///////////////////////////
//if ((p.pos.x *u_aspect+ p.size*0.5) > xLimit) {
//  p.pos.x  = (xLimit - p.size*.5)/u_aspect;
 // p.velocity.x = -p.velocity.x;
//}
//if (p.pos.x*u_aspect - p.size*0.5 < -xLimit) {
  //p.pos.x = (-xLimit + p.size*0.5)/u_aspect;
  //p.velocity.x = -p.velocity.x;
//}

//if ((p.pos.y + p.size*0.5) > yLimit) {
  //p.pos.y  = (yLimit - p.size * 0.5);
  //p.velocity.y = -p.velocity.y;
//}
//if (p.pos.y - p.size*0.5 < -yLimit) {
  //p.pos.y = (-yLimit + p.size * 0.5);
  //p.velocity.y = -p.velocity.y;
//}








