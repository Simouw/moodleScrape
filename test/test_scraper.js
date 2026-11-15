const { JSDOM } = require('jsdom');
const MoodleScraper = require('../src/scraper.js');
const assert = require('assert');

const htmlFromScreenshot = `
<!DOCTYPE html>
<html>
<head>
    <title>Cours : Algorithmique avancée et programmation C</title>
</head>
<body>
<div id="page-header">
    <nav class="breadcrumb">
        <span class="breadcrumb-item"><a href="#">ITI</a></span> / 
        <span class="breadcrumb-item"><a href="#">ITI (Informatique et Technologies de l'Information)</a></span> / 
        <span class="breadcrumb-item"><span>Examens théoriques</span></span>
    </nav>
    <div class="page-header-headings">
        <h1>Algorithmique avancée et programmation C</h1>
    </div>
</div>

<ul class="nav nav-tabs">
    <li class="nav-item"><a class="nav-link" href="#">Introduction</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Remise à Niveau</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Cours</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Travaux dirigés</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Travaux pratiques</a></li>
    <li class="nav-item active"><a class="nav-link active" href="#">Examens théoriques</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Examens pratiques</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Liens utiles</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Références</a></li>
</ul>

<div class="course-content">
    <p>Voici les examens des années précédentes.</p>
    <p>Attention certains exercices sont aujourd'hui hors programme et la notation a aussi légèrement changé.</p>
    <p>Certaines corrections sont proposées (elles peuvent comporter quelques erreurs).</p>

    <ul>
        <li>Année 2005-2006 :
            <ul>
                <li>Partiel : <a href="https://moodle.univ.fr/mod/resource/view.php?id=101">Fichier PDF</a>, correction <a href="https://moodle.univ.fr/mod/resource/view.php?id=102">Fichier PDF</a></li>
                <li>Examen : <a href="https://moodle.univ.fr/mod/resource/view.php?id=103">Fichier PDF</a>, correction <a href="https://moodle.univ.fr/mod/resource/view.php?id=104">Fichier PDF</a></li>
            </ul>
        </li>
        <li>Année 2006-2007 :
            <ul>
                <li>Partiel : <a href="https://moodle.univ.fr/mod/resource/view.php?id=105">Fichier PDF</a>, correction <a href="https://moodle.univ.fr/mod/resource/view.php?id=106">Fichier PDF</a></li>
                <li>Examen : <a href="https://moodle.univ.fr/mod/resource/view.php?id=107">Fichier PDF</a>, correction <a href="https://moodle.univ.fr/mod/resource/view.php?id=108">Fichier PDF</a></li>
            </ul>
        </li>
    </ul>
</div>
</body>
</html>
`;

console.log("=== Running Moodle Scraper Test ===");

const dom = new JSDOM(htmlFromScreenshot, { url: "https://moodle.univ.fr/course/view.php?id=42" });
const result = MoodleScraper.extractDocuments(dom.window.document);

console.log("Course detected:", result.courseTitle);
console.log("Section detected:", result.activeSection);
console.log("Total items found:", result.totalFound);

assert.strictEqual(result.courseTitle, "Algorithmique avancée et programmation C");
assert.strictEqual(result.activeSection, "Examens théoriques");
assert.strictEqual(result.totalFound, 8);

const filenames = result.items.map(i => i.filename);
console.log("\nSmartly renamed files:");
filenames.forEach((fn, idx) => console.log(` [${idx + 1}] ${fn}`));

assert.strictEqual(filenames[0], "Année 2005-2006 - Partiel - Subject.pdf");
assert.strictEqual(filenames[1], "Année 2005-2006 - Partiel - Correction.pdf");
assert.strictEqual(filenames[2], "Année 2005-2006 - Examen - Subject.pdf");
assert.strictEqual(filenames[3], "Année 2005-2006 - Examen - Correction.pdf");
assert.strictEqual(filenames[4], "Année 2006-2007 - Partiel - Subject.pdf");
assert.strictEqual(filenames[5], "Année 2006-2007 - Partiel - Correction.pdf");
assert.strictEqual(filenames[6], "Année 2006-2007 - Examen - Subject.pdf");
assert.strictEqual(filenames[7], "Année 2006-2007 - Examen - Correction.pdf");

console.log("\n✅ All unit tests passed successfully!");
