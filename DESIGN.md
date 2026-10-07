# TRAIT — Document de design

> *Le maître a perdu ses encres dans l'orage. Va les chercher, une couleur à la fois.*
> *The master lost his inks in the storm. Go and find them, one colour at a time.*

Action-RPG en monde ouvert, vue de dessus, à la Diablo, dans un monde peint au lavis d'encre. Navigateur, **ordinateur et mobile**. Bilingue français / anglais.

> **Révision 3.** Après playtest du prototype en arène : les vagues dans une arène vide manquaient de variété, de but et d'évolution. On passe à un **monde ouvert** qu'on explore librement, avec des **camps d'ennemis**, des **niveaux**, des **boss** qui ouvrent les régions, et **plusieurs encres de couleur** qui sont autant d'armes. Le moteur (rendu lavis d'encre, audio procédural, le Trait et l'ensō) est conservé.

> **Révision 4 — Acte I.** Retour de playtest : « on avance dans tous les sens, on chope tout direct ». Le jeu se rapproche d'un Diablo : une **ville** avec ses habitants, une **quête principale** qui ouvre le monde pas à pas, des **donjons** à étages, du **lore** (le carnet du maître gravé sur des stèles), et des encres de couleur **limitées** (pigment).

---

## 0. Acte I (implémenté)

**Le Hameau des Saules** : maisons à toits de tuiles, marché, puits, porte du hameau, rizières. Habitants : l'**Aïeule Saule** (quête principale), **Garance** la teinturière (recharge le pigment), **Orme** le garde (au vieux pont), **Pip** (rumeurs), le **vieux Tilleul** (rizières). Dialogues sur une feuille de papier, portrait et sceau ; on touche ou on clique sur un personnage pour lui parler.

**La progression ouvre le monde** :
1. Parler à l'Aïeule → purifier trois camps du verger → elle donne une lanterne.
2. **La Grotte aux lucioles** (au nord, inaccessible sans lanterne) : deux étages générés (salles, couloirs, torches, lucioles, obscurité hors de la lanterne), une fresque par étage. Gardienne : **la Mère des Taches** (crachats, couvée, plongée sous l'encre). Elle garde l'**indigo**.
3. **Les ronces d'encre** couvrent le vieux pont, seul passage sur la rivière : le pinceau rebondit, l'indigo les gèle et les brise.
4. **La Plaine des pruniers**, ses sanctuaires et ses camps, puis **le Bélier-Roi** au Cercle de pierres. Sa chute fait se retirer les eaux du temple.
5. **Le Temple englouti** (au sud) : deux étages, une vasque de soin, **le Gardien noyé**, insensible à tout tant qu'on ne l'a pas figé à l'indigo (des jarres de pigment autour de l'arène). Il garde l'**or**.
6. Rapporter l'or à l'Aïeule : fin de l'Acte I. Les couleurs du monde reviennent au fil de l'histoire (le monde est d'abord délavé).

**Pigment** : le vermillon se recharge seul ; l'indigo et l'or puisent dans une jauge de pigment qui ne remonte pas toute seule (sanctuaires, Garance, orbes de pigment).

**Lore** : huit pages du **carnet du maître** sur des stèles dans le monde. Elles racontent le premier saule, le sceau vermillon, l'encre broyée avec la rivière… et que le maître a renversé l'encrier exprès.

**Donjons** : générateur à graine (salles reliées par des couloirs, boucles), murs de roche peints avec une face éclairée, escaliers, torches ; les ennemis contournent les murs (champ de distances) et ne voient pas à travers la roche.

## 0 ter. Acte II — Les Rizières en terrasses (en cours)

Monde ouvert de 200 × 150 au-delà du col de l'Est (sortie à l'est du Cercle de pierres, ouverte quand l'or est rendu). Zones avec chacune leur musique et leur palette (les couleurs glissent d'une zone à l'autre) : **le Col des Brumes** (pins, brouillard ; chèvres de brume, spectres), **les Terrasses de Jade** (bandes de rizières en anneaux autour d'une colline ; grenouilles d'encre, tanuki), **le Village des Roseaux** (Dame Héron-Blanc, le vieux Cheng, Tao, Mina, Lin la marchande), **le Lac aux Lotus** (kappa), **la Bambouseraie** (mantes de jade ; la hutte de Maître Yu, la clairière de la Reine), **le Parvis de la Pagode** (Frère Gong, l'escalier aux quatre lanternes). Carte d'acte peinte à l'arrivée.

Quête principale : trouver le village, parler à la Dame Héron-Blanc, rouvrir les trois vannes (chaque bassin crache des grenouilles ; l'eau claire rend la couleur aux terrasses) ; l'eau se retire du **Grand Bassin**, la vieille citerne au sud des terrasses (donjon de deux niveaux, style citerne : dalles, flaques, mousse, sa propre musique) où le **Roi Crapaud** boit toute l'eau. Le Roi Crapaud : bond écrasant, langue qui ramène l'enfant, ventre qui gonfle avant de cracher un éventail d'encre (frappe assez fort et il éclate), coassement qui appelle des têtards. Blessé, il plonge dans un des trois bassins noirs pour boire et guérir, et ressort par un autre : la foudre d'or frappée dans son bassin l'en chasse (150 dégâts, étourdi), l'indigo l'y enferme dans la glace, et un bassin gelé lui est interdit. Ensuite : Maître Yu, l'ermite de la Bambouseraie, ancien moine parti peindre les bambous plutôt que les réciter, connaît les sept prières (« des souffles, pas des mots ») ; il faut d'abord abattre la **Reine des mantes** dans sa clairière (taillades en éventail, charge à travers la clairière — esquivée, elle s'écrase contre les bambous —, lames de jade ; blessée, elle se fond dans les bambous et frappe dans le dos ; elle appelle sa couvée). Yu donne alors une flûte de roseau : jouée sur le ponton à l'ouest du lac, elle fait monter un chemin de lotus jusqu'à l'île du **Héron d'encre** (coup de bec, bourrasque d'ailes qui repousse, pluie de plumes d'encre ; son **regard** brûle le long d'une ligne qui suit l'enfant — un trait frais tracé en travers l'arrête, et si elle fixe ton encre trop longtemps elle est éblouie ; blessée, elle s'envole et plonge, appelle les grenouilles du lac). Dans son nid, la prière du lac : un rouleau vide (« inspirer comme l'eau qui monte, expirer comme l'eau qui se retire ») ; Frère Gong la respire, et les portes de la Pagode du Ciel s'ouvrent (l'ascension au prochain épisode).

Bestiaire de l'acte : grenouilles d'encre (bond sur un cercle peint, langue), chèvres de brume (charges en zigzag), spectres de brume (deviennent brume, crachent des orbes), mantes de jade (faux levées, taillade, bond), **têtards** (essaims, morsures), **kappa** (la carapace détourne le pinceau de face ; une boucle l'enserre, un coup dans le dos le surprend ; après chaque assaut il s'incline et l'eau de sa coupelle se renverse : sans défense), **tanuki farceurs** (déguisés en lanternes de pierre — la feuille sur le toit les trahit —, volent des pièces et s'enfuient ; rattrapés, ils rendent tout avec les intérêts).

Quêtes secondaires : *Le thé des brumes* (+1 gorgée de gourde), *Le filet de Mina*, *Le chapelet de Frère Gong*, *Le crapaud de fortune* (Lin : chasser les tanuki de leur terrier, reprendre son crapaud de jade), *Les lanternes de l'escalier* (Frère Gong : allumer les quatre lanternes de pierre à la foudre d'or, la lumière réveille les spectres ; +1 point de trait). À venir : l'ascension de la Pagode du Ciel, le Moine sans visage, le jade.

Technique : le peintre de morceaux de monde est générique (`Land`) ; l'Acte I et l'Acte II sont deux terres.

## 0 bis. Butin, arbre des traits

**Butin** : pinceaux, robes, talismans, sceaux ; commun, magique, rare, unique ; qualités tirées au sort (dégâts, vie, encre, pigment, critiques, parade, vitesse, ensō, soin ou pigment à chaque victoire). Sac de 16 places, comparaison avec l'objet porté, objets broyés en pigment.

**Arbre des traits** : un point par niveau, trois branches de quatre rangs (un rang s'ouvre avec 2 points par rang dans la branche) :
- **Vermillon** : Trait affûté, Long trait, *Tourbillon*, Ensō écarlate, Encre vive, *Pluie de sceaux*.
- **Couleurs** : Broyage fin, Réserve, *Vague d'indigo*, Gel profond, Foudre en chaîne, *Orage*.
- **Lavis** : Souffle, Garde, *Lavis de soin*, Second souffle, Pas léger, *Brume*.
Les compétences actives (en italique) se rechargent et se rangent dans trois emplacements (R, T, G ; boutons ronds sur mobile). Les rangs s'ouvrent aux niveaux 1, 4, 9 et 15 ; les compétences de couleur demandent leur encre (indigo : vague, gel ; or : orage, foudre en chaîne).

**Quêtes secondaires** : moteur de quêtes à étapes (parler, trouver un objet posé dans le monde, chasser, prouver), avec des choix de dialogue qui changent la fin, des objets uniques de quête et des dons durables (vie, pigment, point de compétence, bénédiction des sanctuaires). Acte I : *Le cerf-volant de Pip*, *La teinture du ciel* (Garance), *Le frère d'Orme* (casque et lettre dans la grotte ; dire la vérité ou épargner), *Le fantôme du moulin* (la poupée de la vieille Prune ; deux fins), *Les lampes des sanctuaires* (Sœur Lotus ; huile du temple), *Le défi du peintre errant* (Kaze ; ensō à quatre, combo de quinze ; le laisser partir ou s'allier). Nouveaux personnages : la vieille Prune, le meunier fantôme, Sœur Lotus, Kaze.

**Secrets et utilité des compétences** : coffres dans les coins du monde ; étangs à îlot (l'indigo gèle l'eau quatorze secondes : trait, boucle ou Vague) ; clairières fermées par des ronces d'encre (on passe en *Brume*), par des bambous (seul le *Tourbillon* les tranche) ou par une dalle scellée entre deux braseros (la foudre de l'or les rallume). Trois pages cachées du carnet du maître (IX à XI). Retour en arrière récompensé quand une nouvelle compétence s'ouvre.

**Économie** : sapèques de cuivre (créatures, coffres, ventes). Gourde de soin (40 % de la vie par gorgée, rechargée aux sanctuaires et vasques, touche H ou bouton). Lun le colporteur au marché du hameau : gourde plus grande, remplissage, pigment, carte des secrets, encens de l'oubli (réattribuer les points), quelques pièces d'équipement renouvelées à chaque repos ; il rachète le contenu du sac.

**Événements sur la route** (un à la fois, toutes les une à deux minutes hors du hameau et hors combat) : le Pâté doré (fuit, replonge dans l'encre après vingt secondes, éclate en pièces), la pluie d'encre (trois vagues, ciel assombri, trésor à la fin), le champion nommé (deux traits parmi véloce, enragé, cuirassé, colosse, explosif ; escorte ; butin garanti).

**Écran titre et cinématiques** : titre peint par-dessus le monde vivant (ensō tracé, nom écrit, sceau tamponné ; continuer, nouvelle partie, langue). Cinématique d'introduction en six plans peints (le papier, le maître peint le monde, les quatre couleurs, l'orage d'encre, le maître disparaît, le dernier trait rouge, c'est toi). Une feuille courte à chaque couleur retrouvée.

**Menu** (Échap, bouton rouleau en haut à gauche) : la grande carte (brouillard levé là où l'on marche, sanctuaires, camps, stèles, personnages avec une quête, gardiens, objectif), le journal (quêtes accomplies et en cours, progrès ; bestiaire : une page et un portrait par créature vaincue ; carnet du maître : stèles, fresques, histoire de chaque région parcourue), le sac, l'arbre et les réglages (volumes, secousses, mini-carte, langue, nouvelle partie, commandes). Une mini-carte ronde sous la quête, en haut à droite.

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
| Aller à un endroit | Clic gauche (maintenir = suivre le curseur), ou ZQSD / WASD | Pouce gauche : un joystick apparaît là où on appuie (ou taper le sol à droite) |
| Attaquer un ennemi | Clic gauche sur lui | Taper sur lui |
| **Tracer avec l'encre** | Clic droit glissé (clic droit seul = Trait droit), ou Espace | Glisser le doigt sur la moitié droite de l'écran |
| Changer d'encre | Touches 1 à 4, `Q`, ou molette | Pots d'encre à l'écran |

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
- **Par région** : Corbeaux d'encre et Épouvantail au verger ; Sangliers et Renards de fumée dans la plaine ; Chauves-souris et Larves dans la grotte ; Soldats d'argile (bouclier de face, à figer) et Lanternes de papier dans le temple.
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

100 % Web Audio. La musique s'écrit en jouant :
- **Sections de huit mesures**, chacune avec sa grille d'accords, son instrument soliste et son groove ; un **motif** est énoncé, répondu, puis résolu sur la phrase. Les sections s'enchaînent au hasard (A, B, respiration), donc rien ne boucle à l'identique.
- **Couches adaptatives** qui montent et descendent en douceur : calme (nappe + soliste clairsemé), tension (arpège pincé), combat (basse, tambours, remplissages toutes les quatre mesures, tempo un peu plus vif), danger quand Shu va tomber (le son s'étouffe, un battement de cœur monte). Un combat qui se termine se résout sur la tonique.
- **Thèmes par lieu** (hameau, verger, plaine, grotte, temple), en fondu enchaîné quand on change de région.
- Un son par encre ; tonnerre, pluie, vent.

## 9. Étapes

1. ~~Monde ouvert (village + plaine), camps, élites, niveaux, ramassables, chiffres de dégâts, sanctuaires, encres vermillon et indigo, Bélier-Roi.~~
2. ~~Acte I : ville, habitants, quêtes, lore, pigment, donjons (grotte, temple), deux nouveaux gardiens, encre or.~~
3. **Prochaine** : Acte II, les Rizières, l'encre jade, le Héron d'encre ; objets et équipement.
4. Forêt de bambous, Col des neiges, leurs gardiens.
5. L'Encrier, la fin, l'écran titre et la finition.

Overlay de debug sur `F3`. Déploiement automatique sur GitHub Pages à chaque fusion sur `main`.
