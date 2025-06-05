@group(0) @binding(0) var<storage, read_write> positions : array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities : array<vec2<f32>>;
@group(0) @binding(2) var<uniform> u_aspect: f32;


fn hash(n: f32) -> f32 {
    let x = fract(sin(n) * 43758.5453);
    return x;
}


fn compute_center(idx: u32) -> vec2<f32> {
  var center = vec2<f32>(0.0, 0.0);
  for (var j: u32 = 0; j < 4; j++) {
    center += positions[idx * 4 + j];
  }
  return center / 4.0;
}

fn check_collision(idx1: u32, idx2: u32, radius: f32) -> bool {
  let c1 = compute_center(idx1);
  let c2 = compute_center(idx2);
  return distance(c1, c2) < radius;
}

fn resolve_collision(idx1: u32, idx2: u32) ->vec2<f32>{
  let v1 = velocities[idx1];
  let v2 = velocities[idx2];

  let c1 = compute_center(idx1);
  let c2 = compute_center(idx2);

  let impact_dir = normalize(c1 - c2);

  // Réflexion simple
  velocities[idx1] =reflect(v1, impact_dir);
  velocities[idx2] =reflect(v2, impact_dir);
  let randomValue = 0.0001-hash(v1.x)/10000.0; // ✅ Génère un nombre pseudo-aléatoire basé sur la position

  //velocities[idx1] = v2;//+randomValue;
  //velocities[idx2] =v1;// vec2(randomValue,-randomValue);
  var zero=0.0;
  return v2;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  let square_count = arrayLength(&positions) / 4;
  if (i >= square_count) { return; }

  var vel = velocities[i];
  var center = compute_center(i);
  var poubelle=vec2(0.0,0.0);

    // Rebonds sur les bords
  if (center.x > 1.0 * u_aspect || center.x < -1.0 * u_aspect) {
    vel= reflect(vel, vec2<f32>(1.0, 0.0));
  }
  if (center.y > 1.0 || center.y < -1.0) {
    //vel.y = -vel.y;
    vel= reflect(vel, vec2<f32>(0.0, 1.0));
  }




  // Vérifier collisions avec les autres carrés
  for (var j: u32 = 0; j < square_count; j++) {
    if (i != j && check_collision(i, j, 0.1)) {
      poubelle=resolve_collision(i, j);
       vel=poubelle;
      //poubelle=resolve_collision(i,j);
    }
  }

        velocities[i] = vel;
  // Mise à jour de la position
  center += vel;

  // Taille des carrés
  let size = vec2<f32>(0.05, 0.05);
  positions[i * 4 + 0] = center + vec2<f32>(-size.x, -size.y);
  positions[i * 4 + 1] = center + vec2<f32>(size.x, -size.y);
  positions[i * 4 + 2] = center + vec2<f32>(size.x, size.y);
  positions[i * 4 + 3] = center + vec2<f32>(-size.x, size.y);

 


}
