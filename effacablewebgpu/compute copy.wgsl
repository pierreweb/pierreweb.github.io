@group(0) @binding(0) var<storage, read_write> positions : array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities : array<vec2<f32>>;




@compute @workgroup_size(64)

fn main(@builtin(global_invocation_id) id : vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&positions)) { return; }

    var vel = velocities[i];

    // Mettre à jour **les 4 sommets** de la balle
    for (var j = 0; j < 4; j++) {
        //positions[i * 4 + j] += vel;
        positions[i32(i) * 4 + j] += vel;

    }

    if (positions[i * 4].x > 1.0 || positions[i * 4].x < -1.0) { vel.x = -vel.x; }
    if (positions[i * 4].y > 1.0 || positions[i * 4].y < -1.0) { vel.y = -vel.y; }

    velocities[i] = vel;
}

---------------------------------------------------------------------
 // Vérifier les rebonds sur les bords
    for (var j = 0; j < 4; j++) {
        if (positions[i * 4 + u32(j)].x > 1.0 || positions[i * 4 + u32(j)].x < -1.0) { vel.x = -vel.x; }

      
        if (positions[i * 4 + u32(j)].y > 1.0 || positions[i * 4 + u32(j)].y < -1.0) { vel.y = -vel.y; }
    }
------------------------------------------------------------------------

    // Vérifier les collisions avec toutes les autres balles
   for (var j = 0; j < i32(arrayLength(&positions)); j++) {
          if (i32(i) != j && check_collision(positions[i], positions[j], 0.05)) {
              resolve_collision(i, u32(j));
        }
    }

------------------------------------------------------------------------------------
@group(0) @binding(0) var<storage, read_write> positions : array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities : array<vec2<f32>>;

fn check_collision(pos1: vec2<f32>, pos2: vec2<f32>, radius: f32) -> bool {
    return distance(pos1, pos2) < radius * 2.0;
}

fn resolve_collision(idx1: u32, idx2: u32) {
    let v1 = velocities[idx1];
    let v2 = velocities[idx2];
    velocities[idx1] = v2;
    velocities[idx2] = v1;
}

@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&positions)) { return; }

    var vel = velocities[i];

    // Mettre à jour **les 4 sommets** de la balle
    for (var j = 0; j < 4; j++) {
        positions[i32(i) * 4 + i32(j)] += vel;
    }

   
    if (positions[i * 4].x > 1.0 || positions[i * 4].x < -1.0) { vel.x = -vel.x; }
    if (positions[i * 4].y > 1.0 || positions[i * 4].y < -1.0) { vel.y = -vel.y; }


      // Vérifier les collisions avec toutes les autres balles
   for (var j = 0; j < i32(arrayLength(&positions)); j++) {
          if (i32(i) != j && check_collision(positions[i], positions[j], 0.05)) {
              resolve_collision(i, u32(j));
        }
    }

----------------------------------------------------------