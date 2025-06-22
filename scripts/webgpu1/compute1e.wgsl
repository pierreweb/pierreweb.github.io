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

@group(0) @binding(1)
var<uniform> u_aspect: f32;

@group(0) @binding(2)
var<storage, read_write> corrections: array<Correction>;

@group(0) @binding(3)
var<uniform> u_particlesCount: u32;

@compute @workgroup_size(64)
fn apply_corrections(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= u_particlesCount) {
        return;
    }

    let correction = corrections[i];
    var particle = particlesDatas[i];

    // 📦 Appliquer les corrections
    particle.pos = correction.pos;
    particle.velocity = correction.velocity;

    particlesDatas[i] = particle;
}

@compute @workgroup_size(64)
fn simulate(@builtin(global_invocation_id) id: vec3<u32>) {
    let i = id.x;
    if (i >= u_particlesCount) {
        return;
    }

    var p = particlesDatas[i];
    let halfSize = 0.5 * p.size;
    let xLimit = 1.0;
    let yLimit = 1.0;

   // var correction = Correction(
      //  vec2<f32>(0.0, 0.0),
       // vec2<f32>(0.0, 0.0)
   // );
    var correction = corrections[i];//pour eviter modifier p

    // 💥 Collision avec autres particules
    for (var j = 0u; j < u_particlesCount; j = j + 1u) {
        if (i == j) { continue; }

        var other = particlesDatas[j];
        let direction = other.pos - p.pos;
        let distance = length(direction);
        let minDistance = halfSize + 0.5 * other.size;

        if (distance < minDistance && distance > 0.0001) {
            let normalizeDirection = normalize(direction);
            let overlap = minDistance - distance;

            // 🚧 Correction de position douce
           // correction.pos -= halfSize * overlap * n;
           // var otherCorr = corrections[j];
            //other.pos += halfSize * overlap * normalizeDirection;
           // p.pos-=halfSize*overlap*normalizeDirection;
            //corrections[j] = otherCorr;

            // 💫 Rebond élastique avec échange d'impulsions
            let relativeVelocity = p.velocity - other.velocity;
            let impact = dot(relativeVelocity, normalizeDirection);

            if (impact < 0.0) {// Corrige si les particules s’éloignent déjà
               // let impulse = 0.8 * impact; // 0.8 = élasticité (1.0 = parfait)???
               // other.velocity += impulse * normalizeDirection;
                //p.velocity-=impulse*normalizeDirection;

                p.pos-=halfSize*2.0*normalizeDirection*overlap;
                other.pos += halfSize *2.0* overlap * normalizeDirection;
 
            }
              // Réponse simple : échange de vitesses projetées sur la normale (rebond élastique approximatif)
            p.velocity =-1.0* length(p.velocity)*normalizeDirection;
            other.velocity =1.0*length(other.velocity)*normalizeDirection;
        }
    }

    // 🏃 Déplacement
    p.pos += p.velocity;

    // 🧱 Collisions avec les murs
    let halfW = halfSize / u_aspect;

    if (p.pos.x + halfW > xLimit) {
        p.pos.x = xLimit - halfW;
        p.velocity.x = -abs(p.velocity.x) * 1.0; // rebond amorti
    } else if (p.pos.x - halfW < -xLimit) {
        p.pos.x = -xLimit + halfW;
        p.velocity.x = abs(p.velocity.x) * 1.0;
    }

    if (p.pos.y + halfSize > yLimit) {
        p.pos.y = yLimit - halfSize;
        p.velocity.y = -abs(p.velocity.y) * 1.0;
    } else if (p.pos.y - halfSize < -yLimit) {
        p.pos.y = -yLimit + halfSize;
        p.velocity.y = abs(p.velocity.y) * 1.0;
    }

    // 🧠 Amortissement global
    p.velocity *= 1.0;

    // 🔄 Stockage dans corrections le changement dans particules se fera avec apply_corrections
    correction.pos = p.pos;
    correction.velocity = p.velocity;
    corrections[i] = correction;
}
