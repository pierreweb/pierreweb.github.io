@group(0) @binding(0)
var<storage, read_write> positions: array<vec2<f32>>;
@group(0) @binding(1)
var<storage, read_write> velocities: array<vec2<f32>>;
@group(0) @binding(2)
var<uniform> u_aspect: f32;

// Génère un nombre pseudo-aléatoire à partir d'une seule composante
fn hash(n: f32) -> f32 {
  return fract(sin(n) * 43758.5453);
}

// Calcule le centre d’un carré à partir de ses 4 sommets
fn compute_center(idx: u32) -> vec2<f32> {
  var center = vec2<f32>(0.0, 0.0);
  for (var j: u32 = 0; j < 4; j++) {
    center += positions[idx * 4 + j];
  }
  return center / 4.0;
}

// Vérifie si deux carrés sont en collision en comparant la distance entre leurs centres
fn check_collision(idx1: u32, idx2: u32, radius: f32) -> bool {
  let c1 = compute_center(idx1);
  let c2 = compute_center(idx2);
  return distance(c1, c2) < radius;
}

// Résout la collision entre deux carrés en inversant leurs vitesses le long de la direction d’impact
fn resolve_collision(idx1: u32, idx2: u32) -> vec2<f32> {
  let v1 = velocities[idx1];
  let v2 = velocities[idx2];
  let c1 = compute_center(idx1);
  let c2 = compute_center(idx2);

  let impact_dir = normalize(c1 - c2);

  // Réflexion simple le long de l’axe d’impact
  velocities[idx1] = reflect(v1, impact_dir);
  velocities[idx2] = reflect(v2, impact_dir);

  // Décale un tout petit peu pour éviter le tremblement
  //let randomValue = 0.0001 - hash(v1.x) / 10000.0;
  //return v2 + vec2<f32>(0.01,0.01);//vec2<f32>(randomValue, -randomValue);

    // ⚠️ Ajout d’une séparation minimale pour éviter la pénétration
    let overlap = 0.1 - distance(c1, c2);
    if (overlap > 0.0) {
        let correction = impact_dir * (overlap * 1.0);
        for (var j: u32 = 0; j < 4; j++) {
            positions[idx1 * 4 + j] +=correction;
            positions[idx2 * 4 + j] -=correction;
        }
    }
  //return v2;
  return velocities[idx2];

}

// Gère la collision avec les bords de l’écran, corrige la vitesse et la position
// Définir le type de retour pour la fonction
struct CollisionResult {
  corrected_vel: vec2<f32>,
  corrected_center: vec2<f32>,
};
// Gère la collision avec les bords de l’écran
fn side_collision(center: vec2<f32>, vel: vec2<f32>, aspect: f32) -> CollisionResult {
  var new_vel = vel;
  var new_center = center;

  // Rebonds horizontaux
  if (center.x > aspect) {
    new_vel = reflect(new_vel, vec2<f32>(1.0, 0.0));
    new_center.x = aspect;
  }
  if (center.x < -aspect) {
    new_vel = reflect(new_vel, vec2<f32>(1.0, 0.0));
    new_center.x = -aspect;
  }

  // Rebonds verticaux
  if (center.y > 1.0) {
    new_vel = reflect(new_vel, vec2<f32>(0.0, 1.0));
    new_center.y = 1.0;
  }
  if (center.y < -1.0) {
    new_vel = reflect(new_vel, vec2<f32>(0.0, 1.0));
    new_center.y = -1.0;
  }
  // Limiter la vitesse à une valeur maximale pour éviter l'emballement
  let max_speed = 0.03; // Par exemple, ajustable selon ton projet
  let speed = length(new_vel);
  if (speed > max_speed) {
    new_vel = normalize(new_vel) * max_speed;
  }


  // Retourne les valeurs corrigées
  return CollisionResult(new_vel, new_center);
}


@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id: vec3<u32>) {
  let i = id.x;
  let square_count = arrayLength(&positions) / 4;
  if (i >= square_count) { return; }

  var vel = velocities[i];
  var center = compute_center(i);

  // Vérifie et corrige la collision avec les bords
  let result = side_collision(center, vel, u_aspect);
  vel = result.corrected_vel;
  center = result.corrected_center;


  // Vérifie les collisions avec les autres carrés
  for (var j: u32 = 0; j < square_count; j++) {
    if (i != j && check_collision(i, j, 0.1)) {
      vel = resolve_collision(i, j);
    }
  }

  // Met à jour la vitesse
  velocities[i] = vel;

  // Met à jour la position (centre + vitesse)
  center += vel;

  // Taille du carré
  let size = vec2<f32>(0.05, 0.05);
  positions[i * 4 + 0] = center + vec2<f32>(-size.x, -size.y);
  positions[i * 4 + 1] = center + vec2<f32>(size.x, -size.y);
  positions[i * 4 + 2] = center + vec2<f32>(size.x, size.y);
  positions[i * 4 + 3] = center + vec2<f32>(-size.x, size.y);
}
