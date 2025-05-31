# pierreweb.github.io

✅ Qu’est-ce qu’un shader
✅ Les différents types de shaders
✅ Comment ça fonctionne avec la carte graphique (GPU)
✅ Le rôle dans la pipeline graphique
🎨 Introduction aux Shaders

Un shader est un petit programme qui s’exécute directement sur la carte graphique (GPU). Son rôle principal est de déterminer comment les pixels et les formes doivent être affichés à l’écran.

Les shaders sont essentiels pour :

    Créer des effets visuels (ombres, lumières, reflets…)

    Optimiser les performances en utilisant le GPU, qui est beaucoup plus rapide que le CPU pour traiter de nombreux pixels en parallèle.

🖋️ Les différents types de Shaders
1️⃣ Vertex Shader

    Rôle : Prend chaque sommet (point 3D) d’un objet et le transforme (rotation, mise à l’échelle, perspective).

    Entrée : Coordonnées du sommet.

    Sortie : Position du sommet dans l’espace 3D de l’écran.

    Exemple : déplacer un cube pour l’orienter correctement.

2️⃣ Fragment Shader (aussi appelé Pixel Shader)

    Rôle : Détermine la couleur finale de chaque pixel (couleur, transparence, effets de lumière).

    Entrée : Coordonnées du fragment/pixel, informations de texture ou lumière.

    Sortie : Couleur finale du pixel.

    Exemple : appliquer un dégradé, un effet de lumière ou une texture sur un mur.

3️⃣ Geometry Shader (plus rare)

    Rôle : Peut créer ou supprimer des géométries à la volée (par exemple, ajouter des lignes pour un maillage).

    Utilisé surtout pour : les effets avancés comme la tessellation (découper un polygone en plusieurs petits).

4️⃣ Compute Shader

    Rôle : Effectuer des calculs intensifs en parallèle (pas directement lié à l’affichage d’un pixel ou sommet).

    Utilisé pour : les calculs scientifiques, l’intelligence artificielle ou les simulations physiques (fluides, particules…).

5️⃣ Texture Shader (ou Shader de Texture)

    En réalité, ce n’est pas un type de shader spécifique !

    Texture = image 2D utilisée par un shader (souvent dans un fragment shader).

    Le fragment shader utilise la texture pour colorier les pixels (comme un papier peint sur un objet).

🖥️ Principe de fonctionnement sur la carte graphique (GPU)

La carte graphique (GPU) est spécialisée pour faire des calculs massivement parallèles. Elle contient des milliers de petits processeurs appelés cœurs CUDA (chez NVIDIA) ou cœurs de shader (AMD, Intel).
🎬 Pipeline graphique (simplifié)

1️⃣ Le CPU envoie la géométrie (sommets, indices, textures…) au GPU.
2️⃣ Le Vertex Shader transforme les sommets.
3️⃣ (Optionnel) Le Geometry Shader modifie ou génère des sommets supplémentaires.
4️⃣ Les triangles sont découpés en fragments (pixels).
5️⃣ Le Fragment Shader décide de la couleur de chaque pixel.
6️⃣ L’image finale est affichée à l’écran.
⚡ Pourquoi utiliser des Shaders ?

✅ Ils sont ultra rapides (calcul parallèle sur des milliers de cœurs).
✅ Ils permettent de créer des effets impossibles à faire uniquement sur le CPU.
✅ Ils sont hautement personnalisables (effets dynamiques en temps réel).
✍️ En résumé

    Un shader est un programme qui tourne sur la carte graphique.

    Vertex Shader : transforme les points d’un objet.

    Fragment Shader : colore chaque pixel.

    Compute Shader : calculs intensifs, pas toujours lié à l’affichage.

    Texture : image utilisée par les shaders, pas un shader en soi.

    Pourquoi ? Pour des visuels rapides et époustouflants, grâce à la puissance du GPU !

    liens utiles:
    WebGL Tutorial - Hello, Triangle! https://youtu.be/y2UsQB3WSvo
