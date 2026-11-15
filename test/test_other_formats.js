const { JSDOM } = require('jsdom');
const MoodleScraper = require('../src/scraper.js');
const assert = require('assert');

const htmlStandard = `
<!DOCTYPE html>
<html>
<head><title>Cours : Systèmes d'exploitation</title></head>
<body>
<div id="page-header"><h1>Systèmes d'exploitation</h1></div>
<div class="course-content">
    <div class="activity resource modtype_resource">
        <div class="activityinstance">
            <a href="https://moodle.univ.fr/mod/resource/view.php?id=999">
                <span class="instancename">Chapitre 1 - Introduction aux processus<span class="accesshide"> Fichier</span></span>
            </a>
        </div>
    </div>
    <div class="activity resource modtype_resource">
        <div class="activityinstance">
            <a href="https://moodle.univ.fr/mod/resource/view.php?id=1000">
                <span class="instancename">TP 2 - Fork et Pipes (Enoncé)<span class="accesshide"> Fichier</span></span>
            </a>
        </div>
    </div>
</div>
</body>
</html>
`;

console.log("=== Test Activités Moodle standard ===");
const dom = new JSDOM(htmlStandard, { url: "https://moodle.univ.fr/course/view.php?id=10" });
const result = MoodleScraper.extractDocuments(dom.window.document);

assert.strictEqual(result.items.length, 2);
console.log("1:", result.items[0].filename);
console.log("2:", result.items[1].filename);

assert.strictEqual(result.items[0].filename, "Chapitre 1 - Introduction aux processus.pdf");
assert.strictEqual(result.items[1].filename, "TP 2 - Fork et Pipes (Enoncé).pdf");

console.log("✅ Test activités standard validé !");
