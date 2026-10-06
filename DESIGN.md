# VERMILLON — Document de design

> *Un fil rouge dans un monde d'encre.*
> *A red thread through a world of ink.*

Action/puzzle RPG en vue de dessus pour navigateur desktop. Durée visée : 20 à 30 minutes.
Jeu bilingue **français / anglais**, sélectionnable à l'écran titre et dans le menu pause (par défaut : langue du navigateur).

---

## 1. L'idée en une phrase

Une peintre âgée perd la mémoire. Avant d'oublier, elle peint une dernière petite silhouette sur un rouleau : un enfant au poignet noué d'un fil rouge. La pluie de l'oubli délave le rouleau. L'enfant le traverse saison par saison et rattache chaque souvenir avec son fil, jusqu'à la page blanche où la peintre attend.

## 2. Thème

- **La mémoire comme encre.** Ce qui est peint peut être délavé. L'oubli n'est pas un méchant, c'est de l'eau : il ne détruit pas, il dilue.
- **Le fil rouge du destin.** Selon la légende, un fil rouge invisible relie les êtres destinés à se retrouver. Ici il est visible, c'est la seule couleur vive du jeu, et l'eau ne peut pas l'effacer.
- **Tenir, puis lâcher.** Chaque mécanique parle de lien : tirer, attacher, tendre, transmettre, entourer. La fin parle d'accepter de lâcher.

Ton : mélancolique et tendre, jamais larmoyant. Peu de mots, beaucoup de silence et de papier vierge.

## 3. Histoire

Racontée à 90 % par l'environnement : traces de pas, objets abandonnés, fragments calligraphiés à moitié délavés sur le sol (une ligne chacun, 4 à 6 par zone). Chaque boss vaincu libère un souvenir de deux lignes au plus.

### Structure

Le jeu est **un seul rouleau horizontal**. Les zones s'enchaînent comme les panneaux d'un rouleau peint. Les transitions déroulent le papier de droite à gauche, dans le sens de lecture traditionnel.

| # | Zone | Âge de la peintre | Gardien |
|---|------|------------------|---------|
| 0 | Prologue : la table de la peintre | — | — |
| 1 | Le Verger sous la pluie *(The Orchard in the Rain)* | Enfance | Le Cerf-volant *(The Kite)* |
| 2 | La Rivière aux lanternes *(Lantern River)* | Jeunesse, l'amour | La Carpe des lanternes *(The Lantern Carp)* |
| 3 | Les Collines aux kakis *(Persimmon Hills)* | Le deuil | La Porteuse de lanternes *(The Mourner)* |
| 4 | L'Atelier sous la neige *(The Studio under Snow)* | La vieillesse | L'Ermite des neiges *(The Snow Hermit)* |
| 5 | La Page blanche *(The Blank Page)* | Maintenant | Le Lavis *(The Wash)* |

### Déroulé

**Prologue (≈1 min).** Fond de papier crème. Un pinceau invisible trace l'enfant, trait par trait. Texte, écrit au pinceau lettre par lettre :
> *« Avant que j'oublie… laisse-moi te dessiner. »* / *"Before I forget… let me draw you."*

La main tremble, une goutte d'encre tombe, la pluie commence. Le fil part du poignet de l'enfant vers la gauche, hors du cadre, et indique toujours la direction de la peintre : c'est la boussole du jeu, intégrée au monde.

**1. Le Verger (enfance).** Un village de vergers de pruniers au printemps. Un cerf-volant coincé dans un arbre, des petites traces de pas dans la boue, un poteau où un fil a été noué puis coupé. Fragment au sol :
> *« Papa dit que le ciel tient l'autre bout. »* / *"Father says the sky holds the other end."*

Souvenir libéré (Cerf-volant) :
> *« Papa a lâché le fil pour que je puisse courir. J'ai cru que le ciel le tenait. »*
> *"Father let go of the string so I could run. I thought the sky was holding it."*

**2. La Rivière (jeunesse).** Nuit d'été, fête des lanternes. Deux séries de traces de pas qui se rejoignent, une barque à deux rames, un poteau d'amarrage avec deux nœuds gravés.
> *« Nous avions attaché la barque au vieux poteau. Nous avons oublié l'heure. »*
> *"We tied the boat to the old post, and forgot the time."*

**3. Les Collines (deuil).** Crépuscule d'automne, procession des lanternes pour les morts. Une seule série de traces de pas, des kakis posés sur une tombe, un parapluie ouvert abandonné, une chaise tournée vers les collines.
> *« Chaque automne je lui envoyais une lanterne. Le courant me la rendait toujours. »*
> *"Every autumn I sent him a lantern. The current always brought it back."*

**4. L'Atelier (vieillesse).** Un atelier de montagne sous la neige. Des peintures inachevées appuyées contre les murs : chacune représente une zone déjà traversée. Des pinceaux gelés dans un pot, une lettre commencée.
> *« Mes mains oublient le pinceau avant que mon cœur n'oublie. »*
> *"My hands forget the brush before my heart does."*

**5. La Page blanche (maintenant).** Le papier n'est pas encore peint. Il n'y a que le dessin préparatoire au graphite : des esquisses de tout ce qu'on a vu. Les seules traces d'encre sont les pas de l'enfant. Au centre, le Lavis : l'oubli lui-même.

**Fin (≈3 min).** Le Lavis rétrécit et révèle en son cœur la vieille peintre, assise sous la pluie, recroquevillée. La pluie s'arrête. Plus de combat : on marche jusqu'à elle. La dernière action du jeu est le geste appris dès le début, **attacher le fil**, cette fois de son poignet à son doigt.
> *« Ah… c'est toi. »* / *"Oh… it's you."*

**Révélation, sans un mot :** le nœud rouge au poignet de l'enfant a exactement la forme du sceau de la peintre. L'enfant, c'est elle, petite.

Elle reprend le pinceau. La couleur revient dans tout le rouleau. La caméra remonte les cinq zones restaurées, de gauche à droite cette fois, sur le leitmotiv joué en entier pour la première fois (voir §9). Elle appose son sceau vermillon à côté de l'enfant, puis le rouleau s'enroule doucement. Le fil reste le dernier élément visible.
> *« La pluie emporte l'encre. Jamais le fil. »* / *"Rain carries away the ink. Never the thread."*

Après la fin, l'écran titre montre le rouleau entièrement colorié.

---

## 4. Direction artistique

### Médium : lavis d'encre (sumi-e / shuimo) sur papier, avec un seul accent vermillon

Tout est peint : terrain, personnages, interface, particules, texte. Trois règles :

1. **L'encre a une densité, pas une couleur.** Chaque élément est une quantité d'encre : lavis dilué (gris pâle), trait chargé (noir), pinceau sec (traînées hachées).
2. **Le papier respire.** Au moins 40 % de chaque écran reste du papier nu (le *ma*, l'espace vide). Le blanc est un matériau, pas un fond.
3. **Le vermillon est sacré.** Il est réservé au fil, au nœud du poignet, aux points accrochables et au sceau. **Si c'est rouge, le fil peut le prendre.** Aucun ennemi, aucun décor, aucun danger n'est jamais rouge.

Le style s'inspire de la peinture à l'encre d'Asie de l'Est, mais le monde est **original et non situé**. On n'utilise **aucun faux idéogramme** : les sceaux et la calligraphie décorative sont des glyphes-nœuds inventés, et le texte lisible est en français ou en anglais.

### Vue

Vue de dessus en **3/4 oblique**, façon Zelda 2D : le sol est vu en plan, les objets (arbres, personnages, maisons) sont dessinés debout et triés en profondeur selon Y. Cela permet de peindre arbres et personnages comme dans un vrai lavis tout en gardant une lecture claire de l'espace. Caméra orthographique.

### Langage des formes

| Élément | Formes |
|--------|--------|
| Enfant, éléments amicaux | Ronds, doux, un seul trait assuré. Chapeau de paille rond, écharpe et fil rouges. |
| Taches (ennemis) | Bavures irrégulières aux bords qui saignent. Les « yeux » sont deux trous de papier nu, là où l'encre n'a pas pris. Jamais de rouge. |
| Boss | Chacun est construit à partir de l'objet de son souvenir : Cerf-volant en losanges et baguettes ; Carpe en cercles et courbes ; Porteuse en longs drapés verticaux ; Ermite en masses lourdes et fissurées ; Lavis sans forme. |
| Printemps | Points ronds (pétales, fleurs), traits souples. |
| Été | Horizontales : rides de l'eau, reflets, courant. |
| Automne | Diagonales : feuilles qui tombent, longues ombres. |
| Hiver | Verticales rares, énormément de blanc. |
| Page blanche | Hachures fines au graphite, presque rien d'encre. |

### Langage des télégraphes (universel)

Le médium sert directement à lire le danger :

- **Une attaque se peint avant de frapper.** Un lavis dilué apparaît à l'endroit visé (gris pâle : « bientôt »), fonce (« maintenant »), puis le trait noir frappe. Durée de 0,6 s minimum, 0,8 à 1,5 s typiquement.
- **Le télégraphe inverse est réservé à l'effacement.** Pour le souffle de l'Ermite et le Lavis, le papier *blanchit* au lieu de foncer : on voit la page se vider.
- **Chaque préparation a un son montant** et chaque impact un claquement de pinceau sec. On peut jouer à l'oreille.
- **Les points accrochables portent un petit nœud vermillon.**

### Palettes par zone

Chaque zone se limite à **papier + encre + 2 pigments + vermillon**. Les pigments se superposent par multiplication, comme des glacis d'aquarelle. Tant que le gardien d'une zone n'est pas vaincu, ses pigments sont désaturés et pâles (zone « délavée ») ; ils reviennent quand le souvenir est libéré.

| Zone | Papier | Encre | Pigment A | Pigment B |
|------|--------|-------|-----------|-----------|
| 1. Verger | `#EEE5CF` crème chaud | `#2A2420` noir sépia | `#D7A3A0` rose prunier | `#A9B58C` vert tendre |
| 2. Rivière | `#E4E0CE` crème du soir | `#1B2228` noir froid | `#3F5F82` indigo | `#D9B56A` or de lanterne |
| 3. Collines | `#EAD9B8` papier vieilli | `#2B1E18` noir brun | `#D08C3A` ocre kaki | `#8E4A2E` rouille |
| 4. Atelier | `#F2F1EC` blanc froid | `#191C23` noir bleuté | `#98A6B6` gris-bleu | `#B7AB98` bois pâle |
| 5. Page blanche | `#F7F3E9` papier neuf | `#8E8B85` graphite *(l'encre `#141414` n'apparaît que là où l'on restaure)* | — | — |
| Partout | | | **Vermillon `#C23A2B`** | |

Le feu, l'unique source chaude de l'hiver, est peint en vermillon dilué et en lueur de papier : le feu est « vivant », il appartient au fil.

### Pipeline de rendu

Three.js, caméra orthographique, monde 2D en **plans superposés** :

| Couche | Contenu |
|--------|---------|
| 0. Papier | Texture de fibres procédurale, ancrée au monde : on se déplace sur un rouleau, ce n'est pas un filtre d'écran. |
| 1. Lavis de sol | Grandes formes de lavis : champs, eau, chemins, tons du terrain. |
| 2. Détail de sol | Herbes au pinceau sec, cailloux, traces de pas. |
| 3. Ombres | Taches d'encre diluée sous les objets. |
| 4. Acteurs et objets | Sprites plans triés en profondeur selon Y. |
| 5. Canopée | Feuillages et toits, qui s'estompent quand l'enfant passe dessous. |
| 6. Météo et particules | Pluie, pétales, neige, éclaboussures d'encre. |
| 7. Brume | Nappes de bruit qui défilent lentement. |
| 8. Calque vermillon | Fil, nœuds, sceau, feu : rendu séparé pour que le rouge reste pur et toujours lisible. |

**Couleur appliquée en dernier.** Les textures ne sont pas peintes en couleurs, mais en **cartes de densité de pigments** (R = encre, G = pigment A, B = pigment B). Le shader final mélange ces densités avec la palette de la zone. On gagne trois choses : la palette est garantie, le même dessin d'arbre sert dans toutes les zones, et la restauration d'une zone n'est qu'une animation d'uniforms.

**Post-processing GLSL**, dans l'ordre :

1. **Composition pigmentaire** : papier × glacis multiplicatifs ; l'absorption est modulée par les fibres du papier (granulation).
2. **Assombrissement des bords** : le pigment s'accumule au bord des lavis, comme en aquarelle.
3. **Diffusion** : léger saignement de l'encre dans les fibres.
4. **Tremblement de ligne (*line boil*)** : déplacement d'UV par bruit basse fréquence, rafraîchi par paliers de 8 à 12 Hz pour un effet « redessiné à la main ». Désactivable via l'option *mouvements réduits*.
5. **Étalonnage** : interpolation délavé ↔ restauré, plus voile atmosphérique (pluie, nuit, blizzard).
6. **Vignette et vieillissement** : bords du papier plus sombres, piqûres (*foxing*), taches d'eau discrètes.
7. **Grain** fin.

### Générateurs procéduraux (modules réutilisables)

Tout passe par un petit noyau de primitives. Le style reste cohérent parce que tout est dessiné avec les mêmes outils.

- `rng(seed)`, `noise2D`, `fbm` : aléatoire et bruit déterministes.
- `brushStroke(ctx, path, {width, pressure, load, dryness, seed})` : **la primitive centrale**. Trait sur courbe de Bézier à largeur variable, avec traînées de poils, charge d'encre (sombre au départ, sec à la fin) et éclaboussures.
- `washBlob(ctx, shape, {density, bloom, edgeDarkening, seed})` : lavis humide avec auréoles et granulation.
- `paperTexture(size, seed)` : papier tuilable.
- Objets : `drawTree(seed, palette, species)` (prunier, saule, kaki, pin, bambou), `drawRock`, `drawGrass`, `drawHouse`, `drawBridge`, `drawLantern`, `drawPost`, `drawBoat`, `drawBrazier`, `drawGrave`…
- Personnages : `drawChild(pose, seed)`, `drawBlot(seed)`, un générateur par boss. L'animation est procédurale : poses-clés redessinées avec de légères variations (effet *boil*), squash/stretch et inclinaison dans le mouvement.
- Texte : `brushText(str, style)`. Polices système à empattements (`"Iowan Old Style", "Palatino Linotype", "Book Antiqua", Georgia, serif`), rendues sur canvas, contours rugosifiés puis révélés trait par trait.

### Interface

Minimale et peinte :

- **Vie** : 5 gouttes d'encre en haut à gauche. Une goutte perdue s'éclabousse et sèche.
- **Fil** : pas de jauge, le fil lui-même montre son état.
- **Boss** : son nom calligraphié au début du combat. Sa vitalité est un long trait de pinceau en bas de l'écran, qui se délave quand on le frappe.
- **Menus** : une carte de papier, sélection marquée d'un petit nœud rouge.
- **Indications de commandes** : à la première utilisation seulement, en petites lettres au pinceau dans le monde.

---

## 5. Mécanique signature : le Fil rouge

Un seul outil, une poignée de règles physiques cohérentes. On progresse en comprenant ces règles, pas en débloquant des améliorations.

### Les règles du fil

1. **Lancer.** On vise à la souris et on lance le fil vers un nœud vermillon à portée (~7 cases). Il s'y accroche : le fil relie alors l'enfant à cette cible.
2. **Le plus léger va vers le plus lourd.**
   - Ancre fixe (poteau, arbre, rocher) : **l'enfant est tiré** vers elle. Cela sert à traverser un vide ou l'eau, ou d'esquive longue.
   - Objet léger (cerf-volant, lanterne, pot, petit ennemi) : **il vient à l'enfant**.
   - Créature lourde : **c'est elle qui tire l'enfant**.
3. **Attacher.** Fil en main, on lance à nouveau vers un second nœud : le fil relie maintenant **ces deux choses**, et plus l'enfant. La règle 2 s'applique entre elles : la plus légère est tirée vers la plus lourde.
4. **Un fil tendu est un mur.** Les créatures d'encre ne peuvent pas le franchir. Ce qui flotte ou dérive rebondit dessus, avec un angle de réflexion égal à l'angle d'incidence.
5. **Le fil transmet.** Le feu et la lumière courent d'un bout à l'autre.
6. **Un seul fil à la fois.** Lancer un nouveau fil lâche l'ancien.
7. **Le fil s'enroule** autour des obstacles qu'il contourne. Cette règle n'est enseignée qu'à la Page blanche.

### Progression par la maîtrise

Chaque zone enseigne **une seule** règle, la fait pratiquer dans 2 ou 3 petites énigmes, puis la teste sous pression avec le boss :

| Zone | Règle enseignée | Le boss teste… |
|------|----------------|----------------|
| 1 | Tirer (règles 1-2) | Faire tomber un ennemi léger |
| 2 | Attacher (règle 3) | Qu'un ennemi lourd vous entraîne : il faut l'attacher à plus lourd que lui |
| 3 | Un fil tendu fait mur (règle 4) | Renvoyer ses propres projectiles en lisant les angles |
| 4 | Transmettre (règle 5) | Porter le feu jusqu'à lui en enchaînant les braseros |
| 5 | Enrouler (règles 6-7) | Entourer l'oubli : tout combiner, sans frapper |

### Ressenti du fil

- Le lancer est une flèche rouge rapide (0,12 s).
- L'accroche fait un *twang* de corde dont **la hauteur dépend de la longueur** (court = aigu) : un fil tendu entre deux poteaux sonne comme une corde de koto.
- La traction est rapide (~14 cases/s), avec une petite anticipation et une glissade à l'arrivée.
- Au repos, le fil ondule légèrement ; tendu, il est parfaitement droit.

---

## 6. Combat

**Principe : lire, se placer, puis punir.** Les dégâts réels passent presque toujours par une ouverture créée avec le fil. Frapper au hasard est inefficace, comprendre ce qui se passe est efficace.

| Action | Détail |
|--------|--------|
| Coup de pinceau | Arc de ~100° devant soi, portée ~1,2 case, combo de 2 coups avec petite fente vers l'avant. *Hitstop* de 60 à 80 ms et éclaboussure à l'impact. |
| Esquive | Coup de pinceau sec de 0,18 s sur ~2,5 cases, invulnérable pendant 0,22 s, recharge de 0,45 s. Pas d'endurance. |
| Fil | Voir §5. |
| Vie | 5 gouttes. Chaque coup reçu en retire une, suivi d'1 s d'invulnérabilité. |
| Soin et sauvegarde | **Pierres à encre** (l'encrier de la peintre) : vie restaurée et point de reprise. Toujours une juste avant chaque boss. |
| Mort | L'enfant se dissout dans l'eau, puis il est redessiné à la dernière pierre à encre en ~2 s. Pas d'écran de game over. |

### Ennemis communs

Peu nombreux et très lisibles. Au plus un type nouveau par zone, et coupé s'il n'apporte rien.

- **Tache** *(Blot)* : rampe, se ramasse sur elle-même (télégraphe de 0,7 s) puis bondit. 2 coups pour la vaincre.
- **Feu follet d'encre** *(Ink Wisp)* : flotte et crache une goutte lente. 1 coup. **Ne peut pas traverser un fil tendu.**
- Variantes de zone (optionnelles) :
  - Oiseaux de papier (1, légers : on peut les tirer à soi) ;
  - Grenouilles d'encre (2, sauts en arc annoncés par un cercle d'atterrissage) ;
  - Lanternes errantes (3, réfléchissables) ;
  - Taches de givre (4, gèlent le sol derrière elles).

### Boss : règles communes

- Arène fixe, entièrement visible à l'écran.
- 2 phases, la seconde se déclenchant à 50 % de vitalité.
- Chaque attaque a un télégraphe visuel **et** sonore.
- Vaincre un boss ne le tue pas : on le **rattache**. Le fil s'enroule autour de lui, il redevient le souvenir paisible qu'il était, et la zone retrouve ses couleurs.

---

## 7. Les zones et leurs gardiens

Chaque zone dure de 4 à 6 minutes : 3 petites salles (traversée, énigmes, un ou deux combats), une pierre à encre, puis l'arène du gardien.

### Zone 1 : Le Verger sous la pluie *(Enfance)*

- **Palette** : crème chaud, noir sépia, rose prunier, vert tendre.
- **Mécanique d'environnement : les rafales.** Des coulées de pétales annoncent la direction du vent, qui pousse l'enfant et les objets légers. Accroché à une ancre, on ne bouge plus. Derrière un arbre, on est à l'abri du vent.
- **Salles** :
  1. *L'éveil* : apprendre à se déplacer, frapper et esquiver contre deux Taches.
  2. *Les terrasses* : se tirer d'un prunier à l'autre au-dessus des ravines, en pleine rafale.
  3. *La place du village* : tirer à soi des objets légers (un cerf-volant coincé, un pot) pour ouvrir un passage. Pierre à encre.
- **Musique** : pentatonique majeure (mode *gong*) en ré, cithare pincée clairsemée, phrases de flûte, pluie légère. Sentiment d'espoir.

#### Gardien : Le Cerf-volant *(The Kite)*
*Le cerf-volant que son père lui avait fabriqué, déchiré par l'orage. Un masque peint aux larmes d'encre, une queue de rubans de papier. Les bouts effilochés de sa ficelle portent des nœuds rouges.*

**Arène** : une colline, trois pruniers (ancres), une falaise au nord. Y tomber coûte une goutte.

**Teste : TIRER un ennemi léger.** Il vole trop haut pour le pinceau. Après chaque piqué, il rase le sol et ses bouts de ficelle traînent dans l'herbe : on accroche, on tire, il s'écrase, empêtré, et on frappe pendant 3 s. C'est la leçon de la zone : ce qui est léger vient à vous.

| Attaque | Télégraphe | Réponse |
|--------|-----------|---------|
| **Piqué** | Il s'arrête face à l'enfant. Une bande de lavis pâle se peint à travers l'arène et fonce en 1,0 s. | Esquiver latéralement, puis accrocher sa ficelle pendant qu'il rase le sol (~1,5 s). |
| **Rafale** | Il bat de sa voilure ; des traînées de pinceau sec balaient l'arène 1,2 s avant le vent. | S'accrocher à un prunier, ou s'abriter derrière. Sinon le vent pousse vers la falaise. |
| **Coup de queue** | Arc de lavis devant lui, quand il est bas et que l'enfant est proche. | Reculer ou traverser l'arc en esquivant. |
| *Phase 2* : **Nuée** | Il lâche 3 oiseaux de papier qui zigzaguent lentement vers l'enfant. | Les tirer à soi et les frapper, ou les éviter. |
| *Phase 2* : **Double piqué** | Deux bandes successives ; la seconde apparaît pendant le premier piqué. | Lire les deux lignes, se placer hors des deux. |

### Zone 2 : La Rivière aux lanternes *(Jeunesse)*

- **Palette** : crème du soir, noir froid, indigo, or de lanterne.
- **Mécanique d'environnement : le courant.** La rivière emporte barques, nénuphars et lanternes. L'eau est profonde : y tomber coûte une goutte et ramène sur la dernière terre ferme. Attacher une barque à un poteau la transforme en pont.
- **Salles** :
  1. *La berge* : se tirer de nénuphar en nénuphar.
  2. *L'amarrage* : attacher des barques à la dérive pour bâtir un passage, et découvrir qu'un objet trop lourd entraîne l'enfant.
  3. *Le marais aux lanternes* : courants croisés et grenouilles d'encre. Pierre à encre.
- **Musique** : pentatonique en mode *zhi*, nappes d'eau, insectes nocturnes, bourdon chaud et grave, arpèges pincés plus fluides.

#### Gardien : La Carpe des lanternes *(The Lantern Carp)*
*La grande carpe qui avait sauté hors de l'eau la nuit de leur rencontre. Écailles en cercles d'encre, longs barbillons. Une ficelle de lanterne rouge est prise dans sa nageoire.*

**Arène** : un îlot rond, quatre poteaux d'amarrage aux points cardinaux, la rivière tout autour.

**Teste : ATTACHER un ennemi lourd.** Si on la tire simplement quand elle saute sur l'îlot, *c'est elle qui entraîne l'enfant*, jusque dans l'eau quand elle replonge. La solution : l'accrocher, puis attacher le fil à un poteau. Elle reste échouée et se débat pendant 4 s, et on frappe. Choisir le poteau d'en face la tire plus loin sur la terre.

| Attaque | Télégraphe | Réponse |
|--------|-----------|---------|
| **Bond** | Des cercles de rides foncent au point d'impact sur l'îlot pendant 1,2 s, et son ombre grandit. | S'écarter, puis l'accrocher et l'attacher à un poteau pendant qu'elle se débat (2 s). |
| **Jet d'eau** | Une fine ligne pâle part de sa bouche et traverse l'îlot en 1 s. | Pas de côté ; le jet balaie légèrement. |
| **Vague** | Un coup de queue ; un anneau de lavis s'étend depuis la rivière. | Traverser la crête en esquivant. |
| *Phase 2* : **Double bond** | Deux zones d'impact successives. | Lire l'ordre des cercles. |
| *Phase 2* : **Poteau brisé** | Après chaque amarrage réussi, ce poteau se brise. | Repérer les poteaux restants et se placer en conséquence. |

### Zone 3 : Les Collines aux kakis *(Deuil)*

- **Palette** : papier vieilli, noir brun, ocre kaki, rouille.
- **Mécanique d'environnement : le crépuscule et la procession.** La lumière baisse et la vision se resserre autour des lampes. Des lanternes errantes dérivent sur des trajets fixes et brûlent au contact. Un fil tendu entre deux poteaux les fait rebondir, et en les guidant vers les lampes des sanctuaires on éclaire le chemin.
- **Salles** :
  1. *Le sentier* : se protéger des feux follets avec un fil tendu, qu'ils ne peuvent franchir.
  2. *La procession* : énigmes d'angles pour renvoyer des lanternes dans les lampes des sanctuaires.
  3. *Le cimetière en terrasses* : combinaison des deux. Pierre à encre.
- **Musique** : pentatonique mineure (mode *yu*) en la, vièle frottée avec glissandos, cloche lointaine, vent dans les herbes sèches. Très clairsemé.

#### Gardienne : La Porteuse de lanternes *(The Mourner)*
*Une grande femme voilée dont le voile coule comme la pluie, une perche à lanternes à la main. C'est le chagrin. Ses lanternes sont des lettres aux morts.*

**Arène** : une terrasse funéraire, six poteaux de pierre en cercle, un tertre au centre.

**Teste : LE FIL TENDU COMME MUR (réflexion).** Le pinceau traverse son voile comme de la brume : seules ses propres lanternes peuvent le brûler. On tend un fil entre deux poteaux pour qu'elles lui reviennent. Voile brûlé, son masque est exposé et on frappe pendant 4 s. Elle se téléporte : il faut sans cesse relire les angles et choisir deux autres poteaux.

| Attaque | Télégraphe | Réponse |
|--------|-----------|---------|
| **Volée de lanternes** | Elle lève la perche ; 3 à 5 lanternes apparaissent avec leurs trajectoires en pointillés de lavis. Dérive lente. | Tendre un fil entre deux poteaux pour les réfléchir vers elle. |
| **Voile de pluie** | Un large cône de pluie d'encre devant elle, pâle puis foncé. | Se décaler hors du cône. |
| **Glas** | Elle frappe le sol ; des anneaux concentriques s'étendent, avec des trouées visibles. | Se placer dans une trouée ou traverser un anneau en esquivant. |
| **Effacement** | Elle se dissout ; sa silhouette pâle apparaît 0,8 s avant à sa nouvelle position. | Anticiper le nouvel angle. |
| *Phase 2* : **Deux volées croisées** | Lanternes venant de deux côtés. | Un seul fil : choisir quelle volée renvoyer et esquiver l'autre. |
| *Phase 2* : **Lanternes éteintes** | Certaines lanternes sont noires et lourdes : elles cassent le fil au lieu de rebondir. | Distinguer les lanternes allumées des éteintes. |

### Zone 4 : L'Atelier sous la neige *(Vieillesse)*

- **Palette** : blanc froid, noir bleuté, gris-bleu, bois pâle. Le feu en vermillon.
- **Mécanique d'environnement : la glace et le blizzard.** Sur la glace on glisse : l'inertie est conservée, et s'accrocher à une ancre permet de s'arrêter. Le blizzard efface la vision et éteint les feux. Les braseros éclairent, et un fil tendu entre un brasero allumé et un brasero éteint transmet la flamme.
- **Salles** :
  1. *Le col* : progresser dans le blizzard de brasero en brasero.
  2. *L'étang gelé* : glisser, s'ancrer, et faire fondre des murs de glace en y portant le feu.
  3. *L'atelier* : intérieur calme, peintures inachevées des zones précédentes. Pierre à encre.
- **Musique** : quasi-silence. Cloches aiguës isolées, très longue réverbération, vent. De rares notes pincées en mode *jue*, étrange et suspendu.

#### Gardien : L'Ermite des neiges *(The Snow Hermit)*
*Une énorme silhouette voûtée de neige et de pinceaux brisés, masque de glace fêlé, mains gelées en griffes. C'est le froid qui lui vole ses mains.*

**Arène** : une cour gelée devant l'atelier, quatre braseros (un seul allumé au départ), des plaques de glace.

**Teste : TRANSMETTRE.** Son armure de glace renvoie le pinceau, qui rebondit avec un tintement. On attache un fil entre un brasero allumé et le nœud sur sa poitrine : la flamme court le long du fil en ~1 s et fait fondre une plaque d'armure. Trois plaques ; derrière chacune, on peut frapper.

| Attaque | Télégraphe | Réponse |
|--------|-----------|---------|
| **Poing de glace** | Il lève le poing (1,2 s, préparation longue) ; un cercle de lavis fonce au sol. | Sortir du cercle ; l'onde d'éclats qui suit se traverse en esquivant. |
| **Ligne de pics** | Il traîne sa griffe ; une ligne de marques pâles court vers la position de l'enfant au départ, et les pics jaillissent l'un après l'autre. | Pas de côté perpendiculaire. |
| **Souffle de blizzard** | **Télégraphe inverse** : un cône où le papier blanchit. | Sortir du cône. Il éteint les braseros touchés et ralentit fortement l'enfant ; il faudra rallumer les feux par le fil. |
| *Phase 2* : **Grand souffle** | Tout l'écran pâlit sauf un brasero, qu'il garde derrière lui. | Enchaîner la flamme de brasero en brasero (allumé → éteint → éteint) pour la ramener de son côté. |

### Zone 5 : La Page blanche *(Maintenant)*

- **Palette** : papier neuf, graphite. L'encre n'apparaît que là où l'on restaure.
- **Mécanique d'environnement : l'inachevé.** Le sol n'existe que là où il est esquissé au graphite. Des vagues d'effacement (télégraphe inverse) gomment par moments des pans du chemin. Le fil s'enroule désormais autour des obstacles (règle 7). Petite énigme d'introduction : enrouler le fil autour d'un pilier pour tenir une porte ouverte.
- **Musique** : une seule note tenue. À mesure qu'on avance, des fragments des musiques de chaque zone reviennent. À la fin, le leitmotiv complet.
- Zone courte (≈3 min avant le combat final).

#### Gardien : Le Lavis *(The Wash)*
*L'oubli lui-même. Ni monstre ni visage : une immense tache grise qui s'étend, et de la pluie qui tombe de nulle part.*

**Arène** : la page vierge, quatre **pierres-souvenirs** dressées autour du centre. Chacune porte le pigment d'un souvenir restauré (rose, indigo, ocre, gris-bleu) et un nœud rouge.

**Teste : ENTOURER, sans frapper.** Le pinceau se dilue dans le Lavis : impossible de le frapper. Seul le fil résiste à l'eau. On accroche une pierre, on court autour du Lavis en passant par l'extérieur des trois autres (le fil s'enroule), puis on revient attacher la première : la boucle se ferme et se resserre. Le Lavis rétrécit d'un cran. Trois boucles en tout. Les souvenirs tiennent le fil.

| Phase | Ce qu'il fait | Ce qu'on fait |
|------|---------------|---------------|
| **1** | Une marée grise s'étend et reflue ; des vagues d'effacement (télégraphe inverse) balaient l'arène. | Boucler en lisant les reflux, se tirer de pierre en pierre pour échapper à la marée. |
| **2** | Il ajoute des **échos** des gardiens : rafales du Cerf-volant et volées de lanternes de la Porteuse. | Les segments de la boucle déjà posés réfléchissent les lanternes ; s'ancrer contre les rafales. |
| **3** | Tous les échos, plus vite : bonds de la Carpe et souffle de l'Ermite en plus. | Tout ce qu'on a appris, sous pression. |
| **Fin** | Il a rétréci jusqu'à révéler la peintre, recroquevillée. La pluie s'arrête. | Marcher jusqu'à elle. Attacher le fil. (Voir §3, Fin.) |

---

## 8. Commandes

| Action | Clavier et souris | Manette (API Gamepad) |
|--------|----------------|----------------------|
| Se déplacer | ZQSD / WASD (détection automatique de la disposition) et flèches | Stick gauche |
| Viser | Souris | Stick droit (assistance de visée vers le nœud le plus proche) |
| Coup de pinceau | Clic gauche | X / Carré |
| Lancer, attacher le fil | Clic droit | RT / R2 |
| Lâcher le fil | F, ou clic droit dans le vide | B / Rond |
| Esquiver | Espace | A / Croix |
| Interagir, lire | E | Y / Triangle |
| Pause | Échap | Start |
| Overlay de debug | F3 ou ` | — |

---

## 9. Direction audio

**100 % Web Audio, généré à l'exécution.** Aucun fichier son.

### Instruments synthétisés

| Instrument | Technique |
|-----------|----------|
| Cithare pincée (koto / guzheng) | Karplus-Strong, avec filtrage de corps |
| Flûte de bambou | Sinusoïde avec vibrato, plus bruit de souffle filtré |
| Vièle frottée (erhu) | Dent de scie à travers des filtres formants, avec portamento |
| Cloche de temple | Synthèse additive à partiels inharmoniques (1 ; 2,76 ; 5,40 ; 8,93…), longue décroissance |
| Bourdon | Sinusoïdes désaccordées |
| Tambour grave (taiko) | Sinusoïde à chute de hauteur, plus bruit bref |
| Bois frappé | Rafale de bruit filtrée passe-bande |
| Pluie, vent, eau, feu | Bruits filtrés modulés : gouttes aléatoires, balayages passe-bande, gargouillis sinusoïdaux, crépitements impulsionnels |

Réverbération par convolution avec une **réponse impulsionnelle générée** (bruit à décroissance exponentielle), et compresseur sur le master.

### Musique générative par zone

Chaque zone est un petit système de règles : mode pentatonique, tonique, densité de notes, registre, instruments, motifs de phrases avec variations aléatoires semées. Pas de boucle fixe : la musique ne se répète jamais tout à fait. Les combats de boss ajoutent une couche rythmique (tambour, bois) par-dessus l'ambiance de la zone, sans la remplacer.

| Zone | Mode | Humeur | Instruments |
|------|------|-------|-------------|
| Verger | *Gong* (majeur) en ré | Espoir, enfance | Cithare clairsemée, flûte, pluie |
| Rivière | *Zhi* | Chaleur nocturne, tendresse | Bourdon chaud, arpèges pincés, eau, insectes |
| Collines | *Yu* (mineur) en la | Deuil retenu | Vièle, cloche lointaine, vent |
| Atelier | *Jue* | Froid, solitude | Cloches aiguës isolées, silence, vent |
| Page blanche | Une note tenue | Suspension | Fragments des quatre zones qui reviennent |

### Le leitmotiv du fil

Un motif de 5 notes est associé au fil. **Pendant tout le jeu, on n'en entend que les 4 premières** : dans l'accroche du fil, dans chaque musique de zone (transposées dans le mode de la zone), dans chaque souvenir libéré. **La 5e note, qui résout la phrase, ne sonne qu'une fois : quand l'enfant attache le fil au doigt de la peintre.** C'est la récompense émotionnelle du jeu.

### Effets sonores

- Coup de pinceau : souffle de bruit à balayage passe-bande.
- Esquive : souffle d'air bref.
- Fil lancé : pincement montant. Fil accroché : *twang* dont la hauteur suit la longueur.
- Impact : éclaboussure humide. Dégâts reçus : papier qui se déchire.
- Pierre à encre : goutte, puis carillon.
- Boss étourdi : cloche.
- Souvenir libéré : accord qui gonfle, puis les 4 notes du motif.

L'audio démarre au premier geste du joueur, sur l'écran titre (« appuyez sur une touche »), conformément aux règles des navigateurs.

---

## 10. Ce que le jeu n'a pas (volontairement)

Pas de butin, pas d'inventaire, pas d'expérience, pas d'améliorations, pas de jauge d'endurance, pas de mini-carte, pas de monnaie, pas de quêtes annexes. On progresse en comprenant le fil.

**Principe de coupe :** si un élément est médiocre, on le coupe plutôt que de le livrer. Candidats à couper en priorité si le temps manque ou si le ressenti n'est pas bon : variantes d'ennemis de zone, phase 2 de certaines attaques, salle 3 de chaque zone.

---

## 11. Architecture technique

- **Vite + TypeScript** (vanilla, sans framework). Le typage strict compense le fait que je ne vois pas le jeu tourner. `tsc --noEmit` fait partie du build.
- **Three.js**, une seule scène orthographique. Les textures sont générées sur canvas 2D puis passées en `CanvasTexture`, au chargement de chaque zone, avec un écran de chargement où l'on « broie l'encre ».
- **Simulation à pas fixe de 60 Hz**, rendu interpolé.
- **Collisions** simples : cercles contre segments et polygones. Niveaux décrits en données TypeScript (murs, eau, ancres, objets, déclencheurs), avec graines fixes pour un rendu stable.
- **Sauvegarde** dans `localStorage` : dernière pierre à encre, langue, options.
- **i18n** : `src/i18n/fr.ts` et `en.ts` ; aucun texte en dur dans le code de jeu.
- **Build statique**, hébergeable partout. `base: '/game-claude/'` dans la configuration Vite pour GitHub Pages.
- **Cible** : 60 fps à 1080p sur un GPU intégré récent.

Arborescence prévue :

```
src/
  core/      boucle, entrées (clavier, souris, manette), caméra, rendu, sauvegarde
  gfx/       rng, bruit, pinceau, lavis, papier, texte au pinceau
    gen/     drawTree, drawRock, drawChild, boss…
  post/      shaders GLSL de post-processing
  audio/     moteur, instruments, musique générative par zone, effets
  game/      enfant, fil, combat, ennemis, boss/, zones/
  ui/        HUD, menus, titres, overlay de debug
  i18n/      fr.ts, en.ts
```

### Outils de playtest

- **Overlay de debug (F3 ou `)** : FPS et temps de frame, zone et salle, état du boss (nom, phase, attaque en cours, vitalité), position et vie de l'enfant, état du fil.
- **Paramètre d'URL `?debug`** : active des raccourcis de test pour aller directement à une zone (1-5), devenir invulnérable ou vaincre le boss. Cela permet de tester les zones avancées sans tout rejouer.

---

## 12. Jalons

Chaque jalon est jouable et livré dans sa propre PR. Le build doit passer avant chaque remise.

| Jalon | Contenu | Ce que tu pourras tester |
|-------|---------|-------------------------|
| **(a) Rendu et style** | Projet Vite + TS, **workflow GitHub Actions** (build puis déploiement sur GitHub Pages à chaque push sur `main`), base path `/game-claude/`, pipeline pigmentaire, post-processing, primitives pinceau/lavis/papier, scène de test (Verger), overlay de debug. | Le rendu tient-il la route ? Le papier, l'encre, le tremblement de ligne. |
| **(b) Enfant et Fil** | Déplacement, pinceau, esquive, règles 1 à 6 du fil sur un terrain d'essai, sons de base, manette. | Le ressenti : la traction, l'attache, le *twang*. |
| **(c) Zone 1 complète** | Verger (3 salles, rafales), Taches, pierre à encre, Cerf-volant, souvenir, restauration des couleurs, musique du Verger. | Une tranche verticale complète. |
| **(d) Zones 2 à 5** | Rivière, Collines, Atelier, Page blanche et leurs gardiens, musiques. | Le jeu entier de bout en bout. |
| **(e) Histoire et finition** | Prologue, fin, écran titre, sélecteur FR/EN, options (volume, mouvements réduits), équilibrage selon tes retours. | La version finale. |

---

## 13. Points à valider

1. **Le titre** *Vermillon / Vermilion* : il fonctionne dans les deux langues et désigne l'unique couleur du jeu.
2. **La révélation** (l'enfant est la peintre petite) : elle n'est montrée que par le sceau, jamais dite. Assez claire, ou faut-il un indice de plus ?
3. **Le sens des zones** : les panneaux se déroulent de droite à gauche comme un rouleau traditionnel. Déroutant, ou charmant ?
4. **La difficulté** : pensée accessible, avec télégraphes généreux et reprise immédiate. Une option « télégraphes plus longs » peut être ajoutée au jalon (e).
