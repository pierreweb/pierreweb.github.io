@group(0) @binding(0) var<storage, read_write> positions : array<vec2<f32>>;
@group(0) @binding(1) var<storage, read_write> velocities : array<vec2<f32>>;
@group(0) @binding(2) var<uniform> u_aspect: f32;




fn check_collision(pos1: vec2<f32>, pos2: vec2<f32>, radius: f32) -> bool {
   
    return distance(pos1, pos2) < radius;  // ✅ Utilise `center` pour tester la collision
}



fn resolve_collision(idx1: u32, idx2: u32) {
    let v1 = velocities[idx1];
    let v2 = velocities[idx2];

    // Calculer une direction ajustée après impact
    let impact_direction = normalize(positions[idx1 * 4] - positions[idx2 * 4]); 

    velocities[idx1] = reflect(v1, impact_direction);
    velocities[idx2] = reflect(v2, impact_direction);

       // ✅ Debug : Vérifier si la fonction est bien appelée
   // positions[idx1 * 4] = vec2<f32>(0.5, 0.5);  
    //positions[idx2 * 4] = vec2<f32>(-0.5, -0.5);
}







@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) id : vec3<u32>) {
    let i = id.x;
    if (i >= arrayLength(&positions) / 4) { return; }  // ✅ Vérification correcte de la taille

    var vel = velocities[i];

    

    // **1️⃣ Calculer le centre du carré**
    var center = vec2<f32>(0.0, 0.0);

 
    
  //var j=u32(0);
  //positions[i * 4 + j] = vec2<f32>(0.5, 1.0); // ✅ Vérifie si `j` est bien entre 0 et 3


for (var j = 0; j < 4; j++) {
  //positions[i * 4 + u32(j)] = vec2<f32>(8.5, 1.0); // ✅ Vérifie si `j` est bien entre 0 et 3
center += positions[i * 4 + u32(j)];  // ✅ Utiliser `j_signed` pour éviter l'erreur

   //  positions[i * 4 + u32(j)] = vec2<f32>(3.5, 0.50); // ✅ Vérifie si `j` est bien entre 0 et 3
}



  //positions[i * 4] = center;
  
    
    center /= 4.0;
  
//positions[i * 4] = vec2<f32>(0.9, 0.9);

    // **2️⃣ Vérifier les collisions et ajuster les vitesses**

 
  var length=u32(arrayLength(&positions));
  length /=4;

     for (var j:u32 = 0; j < length; j++) {
        
  
       //positions[0 * 4] = vec2<f32>(-0.9, -0.9);
       //positions[i * 4] = vec2<f32>(0.9, 0.9);  // ✅ Marquer visuellement l’entrée dans la boucle
                
    if (i !=j) {
        for (var k: u32 = 0; k < 4; k++) {  
            for (var m: u32 = 0; m < 4; m++) {  
               // positions[i * 4] = vec2<f32>(0.9, 0.9);
                if (check_collision(positions[i * 4 + k], positions[j * 4 + m], 0.05)) {
                     resolve_collision(i, j);
                    break;
                }
            }
        }
    }
}





    // **3️⃣ Mettre à jour la position**
    var new_center = center + vel;

    // **4️⃣ Reconstruire les sommets pour éviter le rétrécissement**
 

let size = vec2<f32>(0.05, 0.05);  // ✅ Taille fixe du carré
positions[i * 4 + 0] = new_center + vec2<f32>(-size.x, -size.y);  // Haut gauche
positions[i * 4 + 1] = new_center + vec2<f32>(size.x, -size.y);   // Haut droit
positions[i * 4 + 2] = new_center + vec2<f32>(size.x, size.y);    // Bas droit
positions[i * 4 + 3] = new_center + vec2<f32>(-size.x, size.y);   // Bas gauche

 


//if (new_center.x > (1.0 * u_aspect)) { 
    //vel.x = -abs(vel.x); 
//}
//if (new_center.x < (-1.0 * u_aspect)) { 
   // vel.x = abs(vel.x); 
//}


//var u_aspect: f32 = 2.0; // ✅ Correct : WebGPU/WGSL utilise `f32`
// **5️⃣ Vérifier les rebonds sur les bords**
  if (new_center.x > 1.0*u_aspect || new_center.x < -1.0* u_aspect) { vel.x = -vel.x; }
  if (new_center.y > 1.0 || new_center.y < -1.0) { vel.y = -vel.y; }
  velocities[i] = vel;
}




    //for (var j: u32 = 0; j < arrayLength(&positions) / 4; j++) {
    //    if (i != j && !check_collision(center, positions[j * 4], 0.01)) {
      //      resolve_collision(i, j);
      //  }
  //  }



  //fn resolve_collision(idx1: u32, idx2: u32) {
   // let v1 = velocities[idx1];
   // let v2 = velocities[idx2];

    // Simuler un choc en inversant les vitesses
   // velocities[idx1] = vec2<f32>(-v1.x, -v1.y);
  //  velocities[idx2] = vec2<f32>(-v2.x, -v2.y);
//}
