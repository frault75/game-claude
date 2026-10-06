# TRAIT — Document de design

> *Chaque esquive est un coup de pinceau. Chaque boucle, une explosion d'encre.*
> *Every dodge is a brushstroke. Every loop, a burst of ink.*

Action/puzzle RPG en vue de dessus, nerveux, pour navigateur desktop. Durée visée : 20 à 30 minutes. Jeu bilingue français / anglais.

> **Révision 2.** Le premier concept (le fil rouge, ton mélancolique et lent) a été abandonné après playtest : sensations molles, concept peu amusant, ambiance trop calme. On garde le moteur de rendu en lavis d'encre et l'audio procédural, mais tout le reste change : jeu rapide, impacts forts, ambiance d'orage.

---

## 1. L'idée en une phrase

Un orage d'encre noire a renversé l'encrier du vieux maître calligraphe et noyé le monde peint sous des bêtes de tache. Tu es **Shu**, le dernier trait qu'il a tracé, un trait vivant d'encre vermillon. Tu fends l'orage à coups de pinceau et tu refermes des cercles parfaits (des *ensō*) pour rendre l'encre au papier.

## 2. Piliers

1. **Ça claque.** Chaque action donne un retour fort : gel d'image, éclaboussures, caméra qui réagit, coups de tambour.
2. **Tracer, c'est se battre.** La même action sert à esquiver, frapper, résoudre une énigme et dessiner. On progresse en traçant mieux, pas en ramassant des objets.
3. **Lire avant de foncer.** Les attaques ennemies sont clairement annoncées. La vitesse récompense le joueur qui a lu la scène et choisi son tracé.
4. **L'orage est vivant.** Pluie battante, éclairs qui blanchissent le papier, tambours qui montent avec le combo.

## 3. La mécanique : le Trait

| Action | Clavier et souris | Manette | Mobile (tactile) |
|--------|----------------|---------|------------------|
| Se déplacer | ZQSD / WASD / flèches | Stick gauche | Stick virtuel sous le pouce gauche |
| **Trait** (dash vers le curseur) | Clic droit ou Espace | A (direction du stick) | Toucher l'écran : Trait vers ce point |
| Coup de pinceau | Clic gauche | X | Bouton pinceau en bas à droite (visée auto) |

**Le jeu doit tourner sur mobile** : commandes tactiles, interface qui s'adapte au paysage comme au portrait, budget de pixels réduit et résolution adaptative, bruits du shader précalculés en texture.

### Règles

1. **Le Trait est un dash vers le curseur**, de 4 cases au plus, invulnérable pendant sa durée. Il laisse derrière lui un trait d'encre vermillon.
2. **Un trait tranche.** Les ennemis traversés pendant le dash prennent un coup.
3. **Le pinceau a 3 charges d'encre**, qui se rechargent vite. On peut enchaîner 3 traits d'affilée ; plus le combo monte, plus la recharge est rapide.
4. **Fermer une boucle déclenche un ensō.** Quand un nouveau trait croise un trait encore frais, la boucle se referme. Tout ce qu'elle contient explose : gros dégâts aux ennemis, interrupteurs activés, projectiles effacés. Trois traits autour d'un ennemi suffisent à l'encercler.
5. **Le trait frais est de l'encre solide** pendant ~2,5 s : il absorbe les projectiles d'encre et sert de pont au-dessus du vide.
6. **Le trait coupe** les cordes, les lianes et les cloisons de papier qu'il croise.

Le coup de pinceau (clic gauche) reste l'attaque de base, rapide et à courte portée.

### Pourquoi ça marche

- **Lire et se placer** : on ne peut encercler un ennemi qu'en lisant ses déplacements. Tracer un triangle autour d'une bête qui charge, c'est du placement, pas du réflexe.
- **Une seule action, plusieurs usages** : esquive, attaque, tracé de pont, bouclier, ciseaux, boucle. Chaque boss en teste un usage différent.

## 4. Direction artistique

On garde le **lavis d'encre sur papier**, avec un seul accent vermillon, mais en plus contrasté et plus vivant :

- **Le vermillon, c'est toi.** Shu, ses traits, ses ensō. Les ennemis sont noirs. Lisibilité immédiate.
- **Le monde se peint pendant le combat.** Les traits laissent de fines traces rouges qui s'accumulent, les ennemis vaincus laissent des taches noires. Une arène après le combat raconte la bataille.
- **L'orage** : pluie oblique, éclairs qui blanchissent le papier une fraction de seconde, brume qui défile.
- **Télégraphes peints** : un lavis pâle annonce l'attaque et fonce jusqu'à l'impact. Le télégraphe inverse (le papier qui blanchit) est réservé aux attaques d'effacement.
- **Pipeline existant** : rendu par densités de pigment, puis un shader de peinture (tremblement de ligne, accumulation de pigment aux bords, granulation, vermillon opaque, lumière et obscurité, vignette).

### Palettes

Chaque zone se limite à papier + encre + 2 pigments + vermillon.

| Zone | Papier | Encre | Pigment A | Pigment B |
|------|--------|-------|-----------|-----------|
| Arène / Prologue (la cour du temple) | `#E8E2D0` | `#15171C` | `#4A6A8A` indigo d'orage | `#D9A441` or de lanterne |
| 1. Les Rizières inondées | `#E6E4D2` | `#1A2026` | `#5F8A6A` vert de pousse | `#B9C7CF` ciel d'eau |
| 2. Le Marché des lanternes | `#ECDCC0` | `#241A16` | `#D08C3A` ocre | `#9C3F2E` laque |
| 3. La Forêt de bambous | `#E4E6D8` | `#141A16` | `#6E8F5A` bambou | `#C9C27A` lumière filtrée |
| 4. Le Col des neiges | `#F2F1EC` | `#191C23` | `#98A6B6` gris-bleu | `#B7AB98` bois |
| 5. L'Encrier (cœur de l'orage) | `#DCD6C8` | `#0E0E10` | `#3A3A44` encre d'orage | `#E8E2D0` éclair |
| Partout | | | **Vermillon `#C23A2B`** | |

## 5. Histoire

Ton énergique, quelques mots seulement, et une fin émouvante.

- **Prologue.** Le maître trace Shu, son plus beau trait, au moment où l'orage frappe. L'encrier se renverse et le maître disparaît dans l'encre noire. Shu s'élance.
- **Les cinq zones** sont les grandes peintures du maître, envahies par l'orage. Chacune a un gardien : une œuvre du maître corrompue par l'encre noire. Le vaincre en le fermant dans un ensō rend ses couleurs à la peinture.
- **Fin.** Au cœur de l'orage, Shu retrouve le maître. L'orage, c'est son pinceau qui tremble : il vieillit et il a peur de ne plus savoir tracer. Le dernier geste du jeu est un **ensō complet, tracé lentement autour du maître** : pas une explosion, une étreinte. L'orage se dissout, et le maître reprend le pinceau pour signer de son sceau vermillon, à côté de Shu.

> *« Un cercle n'est jamais parfait. C'est pour ça qu'on le trace encore. »*
> *"A circle is never perfect. That's why we keep drawing it."*

## 6. Zones et gardiens

Chaque zone dure de 4 à 6 minutes : arènes de combat enchaînées, une ou deux énigmes de tracé, puis le gardien. Chaque gardien teste **un usage du Trait**.

| Zone | Mécanique d'environnement | Gardien | Usage testé |
|------|--------------------------|---------|-------------|
| 1. Rizières inondées | L'eau monte et descend ; les traits frais servent de ponts entre les diguettes | **Le Héron d'encre**, qui pique depuis les airs | **Pont** : tracer des chemins sur l'eau pour atteindre ses îlots |
| 2. Marché des lanternes | Des cordes à lanternes barrent les rues ; les couper libère des passages | **Le Dragon de papier**, une procession articulée | **Couper** : trancher ses segments au bon moment |
| 3. Forêt de bambous | Les bambous bloquent les dashs ; il faut tracer entre eux | **Le Tigre d'ombre**, rapide, qui charge en ligne | **Boucle** : l'encercler pendant ses temps morts |
| 4. Col des neiges | Le vent dévie les traits ; la glace fait glisser | **Le Moine de pierre**, qui crache des rafales d'encre | **Bouclier** : absorber ses projectiles avec des traits frais |
| 5. L'Encrier | L'encre efface le sol par vagues | **L'Orage**, puis le maître | **Tout** : la dernière boucle, tracée lentement |

### Ennemis communs (peu nombreux, très lisibles)

- **Pâté** : rampe, se ramasse puis bondit. Fragile.
- **Feu follet** : garde ses distances et crache des gouttes lentes, que les traits frais absorbent.
- **Bélier** : gros et cuirassé de face. Il charge en ligne après un long télégraphe. Le traverser d'un Trait pendant sa charge le blesse deux fois plus.
- **Nuée** : petites taches volantes en groupe, idéales à encercler d'un seul ensō.

## 7. Sensations : la checklist

- Gel d'image : coup 50 ms, Trait 40 ms, ensō 140 ms suivi de 0,3 s de ralenti.
- Caméra : léger recul dans la direction du coup, petit zoom sur l'ensō.
- Éclaboussures d'encre qui restent au sol, traits vermillon qui sèchent en laissant une trace.
- Combo calligraphié en grand ; il accélère la recharge d'encre et l'intensité de la musique.
- Chaque coup a son son : souffle, impact sec, tambour sur l'ensō.

## 8. Direction audio

100 % Web Audio, aucun fichier.

- **Musique générative pilotée par l'intensité** : tambours taiko, cithare en ostinato, flûte. Au calme : pluie et cithare clairsemée. En combat : les tambours entrent. Combo élevé : la flûte et les doubles croches arrivent.
- **Par zone** : un mode pentatonique et un instrument signature (rizières : flûte ; marché : vièle et percussions ; bambous : bois frappés ; col : cloches ; Encrier : silence et tambours).
- **Le motif du maître**, cinq notes : entendu inachevé pendant tout le jeu, complété lors du dernier ensō.
- **Effets** : souffle du Trait, coupe nette, impact humide, tonnerre, ensō (gong grave et accord), télégraphes ascendants.

## 9. Ce que le jeu n'a pas

Pas de butin, pas d'inventaire, pas d'expérience, pas de monnaie. On progresse en traçant mieux.

## 10. Méthode

1. **Prototype de sensations (maintenant)** : une arène sous l'orage, vagues d'ennemis, Trait, ensō, combo, musique d'intensité. Objectif : valider le fun avant tout le reste.
2. Si le prototype plaît : zone 1 complète avec son gardien.
3. Puis les zones 2 à 5 et leurs gardiens.
4. Puis l'histoire, la fin, l'écran titre et la finition.

Overlay de debug sur `F3`, déploiement automatique sur GitHub Pages à chaque fusion sur `main`.
