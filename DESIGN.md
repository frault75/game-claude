# TRAIT — Document de design

> *Le maître a perdu ses encres dans l'orage. Va les chercher, une couleur à la fois.*
> *The master lost his inks in the storm. Go and find them, one colour at a time.*

Action-RPG en monde ouvert, vue de dessus, à la Diablo, dans un monde peint au lavis d'encre. Navigateur, **ordinateur et mobile**. Bilingue français / anglais.

> **Révision 3.** Après playtest du prototype en arène : les vagues dans une arène vide manquaient de variété, de but et d'évolution. On passe à un **monde ouvert** qu'on explore librement, avec des **camps d'ennemis**, des **niveaux**, des **boss** qui ouvrent les régions, et **plusieurs encres de couleur** qui sont autant d'armes. Le moteur (rendu lavis d'encre, audio procédural, le Trait et l'ensō) est conservé.

---

## 1. L'histoire en bref

Un orage d'encre noire a renversé l'encrier du vieux maître calligraphe. Ses **encres de couleur** se sont dispersées dans sa grande peinture, gardées par des bêtes d'encre. Tu es **Shu**, son dernier trait, d'encre vermillon. Région après région, tu rends ses couleurs au monde. Au cœur de l'orage t'attend le maître lui-même. Le dernier geste du jeu est un ensō tracé lentement autour de lui, avec toutes les couleurs retrouvées.

Peu de texte : un titre par région, une phrase par sanctuaire, une phrase par encre retrouvée.

## 2. Boucle de jeu

1. **Explorer** la carte librement. Chemins, forêts, étangs, ruines, village.
2. **Nettoyer des camps** d'ennemis, de plus en plus coriaces à mesure qu'on s'éloigne du village. Certains ennemis sont des **élites** : plus gros, plus forts, avec un trait particulier.
3. **Gagner de l'expérience**, monter de **niveau** : plus de vie, plus d'encre, plus de dégâts.
4. **Activer les sanctuaires** : soin complet et point de reprise.
5. **Vaincre le gardien** de la région : il libère une **nouvelle encre** et ouvre la région suivante.

## 3. Commandes

Une même logique sur ordinateur et sur mobile.

| Action | Ordinateur | Mobile |
|--------|-----------|--------|
| Aller à un endroit | Clic gauche (maintenir = suivre le curseur), ou ZQSD / WASD | Taper (maintenir = suivre le doigt) |
| Attaquer un ennemi | Clic gauche sur lui | Taper sur lui |
| **Tracer avec l'encre** | Clic droit glissé (clic droit seul = Trait droit), ou Espace | Glisser vite le doigt |
| Changer d'encre | Touches 1 à 4, ou molette | Pots d'encre à l'écran |

Tout trait consomme de l'**encre** (sa longueur). La jauge se recharge vite quand on ne peint pas, et des **orbes d'encre** tombent des ennemis.

## 4. Les encres (armes)

Chaque encre change ce que fait un **trait** et ce que fait une **boucle fermée** (ensō).

| Encre | Trait | Boucle (ensō) | Rôle |
|-------|-------|---------------|------|
| 🔴 **Vermillon** (départ) | Shu court sur le trait, tranche tout ce qu'il traverse, intouchable pendant la course | Tout ce qui est dedans explose | Mobilité, dégâts au corps à corps |
| 🔵 **Indigo** (marée) | Le trait se peint à distance puis déferle : il gèle et blesse ce qu'il touche | Tourbillon qui fige tout ce qui est dedans | Contrôle, défense |
| 🟡 **Or** (foudre) | La foudre frappe tout le long du trait après un court instant | Orage : plusieurs frappes à l'intérieur | Gros dégâts à distance |
| 🟢 **Jade** (bambou) | Un mur de bambous pousse le long du trait, bloque et blesse | Bosquet qui soigne Shu tant qu'il reste dedans | Soutien, blocage |

## 5. Le monde

Une grande carte continue, générée et peinte par code (graine fixe), découpée en régions avec leur palette :

| Région | Palette (pigments) | Ennemis | Gardien | Encre libérée |
|--------|-------------------|---------|---------|---------------|
| Le Village (départ, sûr) | crème, encre, rose prunier | — | — | — |
| La Plaine des pruniers | rose prunier, vert tendre | Pâtés, Nuées, Feux follets, Taches-mères, Puits d'encre, Béliers | **Le Bélier-Roi** | Indigo |
| Les Rizières (étape suivante) | vert de pousse, ciel d'eau | créatures d'eau | Le Héron d'encre | Or |
| La Forêt de bambous | bambou, lumière filtrée | rapides, embusqués | Le Tigre d'ombre | Jade |
| Le Col des neiges | gris-bleu, bois | lourds, à distance | Le Moine de pierre | — |
| L'Encrier | encre d'orage | tout | L'Orage, puis le maître | — |

### Ennemis

- **Pâté** : rampe et bondit après un télégraphe.
- **Nuée** : petites taches volantes en groupe, idéales à encercler.
- **Feu follet** : à distance, crache des gouttes lentes.
- **Tache-mère** : grosse ; se divise en trois Pâtés quand on la tue.
- **Puits d'encre** : fixe, fait naître des Pâtés tant qu'il n'est pas détruit. C'est l'objectif du camp.
- **Bélier** : cuirassé de face, charge en ligne.
- **Élites** : version plus grosse et plus résistante, auréolée de lavis, avec un trait (rapide, explosive...).

### Gardien 1 : Le Bélier-Roi

Arène de pierres levées au bout de la plaine.
- **Charges** en ligne, longuement annoncées.
- **Piétinement** : anneaux de choc qui s'étendent, avec des trouées.
- **Appel de la Nuée.**
- **Phase 2** : doubles charges, piétinements plus rapides.

## 6. Progression

- **Expérience** : chaque ennemi en donne, les élites et boss beaucoup plus.
- **Niveau** : à chaque niveau, vie + encre + dégâts, soin complet, grand ensō vermillon autour de Shu.
- **Ramassables** : gouttes d'encre noire (soin), orbes vermillon (encre).
- **Chiffres de dégâts** calligraphiés au-dessus des ennemis.
- **Sauvegarde** : niveau, expérience, encres libérées, boss vaincus, dernier sanctuaire.

## 7. Direction artistique

On garde le **lavis d'encre sur papier** et son pipeline. Chaque encre a sa couleur opaque (gouache), rendue dans un tampon d'accent dédié ; le reste du monde reste en encre et pigments de région. Les combats laissent des traces de couleur et des taches au sol.

Le monde est découpé en **morceaux** de 16 × 16 cases, peints à la volée autour du joueur à partir de tampons pré-peints (herbes, pierres, fleurs) et de variantes d'arbres et de rochers pré-dessinées. C'est indispensable pour tenir sur mobile.

## 8. Audio

100 % Web Audio : musique générative par région, pilotée par l'intensité du combat (tambours, ostinato) ; un son par encre ; tonnerre, pluie, vent.

## 9. Étapes

1. **Maintenant** : monde ouvert (village + plaine), camps, élites, niveaux, ramassables, chiffres de dégâts, sanctuaires, encres vermillon et indigo, Bélier-Roi.
2. Encres or et jade, région des Rizières et son gardien.
3. Forêt de bambous, Col des neiges, leurs gardiens.
4. L'Encrier, la fin, l'écran titre et la finition.

Overlay de debug sur `F3`. Déploiement automatique sur GitHub Pages à chaque fusion sur `main`.
