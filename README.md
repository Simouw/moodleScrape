# 🎓 Moodle Smart Downloader (Extension Navigateur)

Extension de navigateur (Chrome, Edge, Brave, Firefox) conçue pour extraire, renommer intelligemment et télécharger en lot les documents hébergés sur une page de cours Moodle.

---

## ✨ Fonctionnalités Principales

1. **Renommage Contextuel Intelligent (Smart Renaming) :**
   * Moodle nomme souvent tous les liens simplement *« Fichier PDF »*.
   * Cette extension remonte l'arborescence DOM (fil d'Ariane, titre du cours, onglet/section active, année, libellés de la liste, textes frères) pour reconstruire des noms parfaits :
     * `Année 2005-2006 - Partiel - Sujet.pdf`
     * `Année 2005-2006 - Partiel - Correction.pdf`
     * `Année 2005-2006 - Examen - Sujet.pdf`
     * `Année 2005-2006 - Examen - Correction.pdf`
2. **Sélection du Dossier Local (Option A - File System Access API) :**
   * Cliquez sur **« 📁 Choisir un dossier & Télécharger »**.
   * L'explorateur de fichiers natif de votre système d'exploitation s'ouvre : vous sélectionnez **le dossier exact de votre choix** sur votre ordinateur (ou disque externe).
   * Les fichiers sont écrits directement dans ce dossier (avec création automatique d'un sous-dossier par cours/section si souhaité).
3. **Sélection Personnalisée :**
   * Cochez / Décochez tout en un clic.
   * Filtrez instantanément par mot-clé (ex: `2008`, `Partiel`, `Correction`).
   * **Chaque nom de fichier est éditable** directement dans la popup avant le téléchargement si vous désirez apporter une retouche.
4. **Session & Authentification Préservées :**
   * L'extension tourne dans le contexte de votre session Moodle active : zéro mot de passe à renseigner, tous les cookies de connexion sont automatiquement pris en compte.
5. **Mode Plein Écran / Onglet Dédié :**
   * Un bouton permet de détacher l'extension dans un onglet classique pour examiner confortablement de longues listes de documents sans risque de fermeture inopinée de la popup.

---

## 🚀 Installation dans le navigateur

### Sur Google Chrome / Brave / Edge / Chromium :

1. Ouvrez votre navigateur et accédez à la page des extensions :
   * **Chrome / Brave :** `chrome://extensions/`
   * **Edge :** `edge://extensions/`
2. Activez le **« Mode développeur »** (interrupteur en haut à droite).
3. Cliquez sur le bouton **« Charger l'extension non empaquetée »** (ou *Load unpacked*).
4. Sélectionnez le dossier du projet :
   ```
   /home/cmo/code/moodleScrape
   ```
5. L'icône de **Moodle Smart Downloader** apparaît dans votre barre d'extensions ! Épinglez-la pour y accéder facilement.

---

## 📖 Utilisation pas à pas

1. Rendez-vous sur votre espace Moodle, connectez-vous et naviguez dans un cours / section contenant des documents (comme dans votre capture d'écran).
2. Cliquez sur l'icône de l'extension.
3. La popup s'ouvre, scanne la page et affiche :
   * Le nom du cours et de la section détectés.
   * La liste de tous les documents trouvés avec leurs noms propres générés automatiquement.
4. Ajustez votre sélection ou personnalisez des noms si nécessaire.
5. Cliquez sur **« 📁 Choisir un dossier & Télécharger »** :
   * Choisissez le dossier de destination dans la boîte de dialogue de votre OS.
   * Les documents se téléchargent et s'enregistrent en direct avec une barre de progression.

---

## 🛠️ Structure du Projet

```
moodleScrape/
├── manifest.json            # Configuration Manifest V3
├── icons/                   # Icônes de l'extension (16, 32, 48, 128px)
├── src/
│   ├── scraper.js           # Moteur d'analyse DOM & renommage contextuel
│   ├── content.js           # Script injecté dans la page Moodle
│   └── background.js        # Service Worker (gestion des téléchargements)
├── popup/
│   ├── popup.html           # Interface graphique utilisateur
│   ├── popup.css            # Styles modernes et adaptatifs
│   └── popup.js             # Logique d'interaction et File System API
├── test/
│   ├── test_scraper.js      # Test unitaire basé sur la capture d'écran exacte
│   └── test_other_formats.js# Test unitaire sur les formats standards Moodle
└── README.md
```

---

## 🧪 Tests Unitaires

Pour relancer les tests automatisés du scraper :
```bash
node test/test_scraper.js
node test/test_other_formats.js
```
