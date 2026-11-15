const { JSDOM } = require('jsdom');
const assert = require('assert');
const MoodleScraper = require('../src/scraper.js');

// Mock HTML matching User's Image 2 & Image 3 (Multi-level tabs in Moodle OneTopic)
const htmlOneTopic = `
<!DOCTYPE html>
<html>
<head><title>Cours : Algorithmique avancée et programmation C</title></head>
<body>
<div id="page-header">
    <nav class="breadcrumb">
        <span class="breadcrumb-item"><a href="#">ITI</a></span> / 
        <span class="breadcrumb-item"><a href="#">ITI (Informatique et Technologies de l'Information)</a></span> / 
        <span class="breadcrumb-item"><span>TP5</span></span>
    </nav>
    <div class="page-header-headings">
        <h1>Algorithmique avancée et programmation C</h1>
    </div>
</div>

<!-- Main Tabs (Row 1) -->
<ul class="nav nav-tabs onetopic-tabs">
    <li class="nav-item"><a class="nav-link" href="#">Introduction</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Remise à Niveau</a></li>
    <li class="nav-item"><a class="nav-link" href="#">v Cours</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Travaux dirigés</a></li>
    <li class="nav-item active"><a class="nav-link active" href="#">v Travaux pratiques</a></li>
    <li class="nav-item"><a class="nav-link" href="#">Examens théoriques</a></li>
</ul>

<!-- Sub Tabs (Row 2) -->
<ul class="nav nav-tabs onetopic-tabs subtopics">
    <li class="nav-item"><a class="nav-link" href="#">Index</a></li>
    <li class="nav-item"><a class="nav-link" href="#">TP1</a></li>
    <li class="nav-item"><a class="nav-link" href="#">TP2</a></li>
    <li class="nav-item"><a class="nav-link" href="#">TP3-4</a></li>
    <li class="nav-item active"><a class="nav-link active" href="#">TP5</a></li>
    <li class="nav-item"><a class="nav-link" href="#">TP6-7</a></li>
</ul>

<div class="course-content">
    <div class="activity resource modtype_resource">
        <div class="activityinstance">
            <a href="https://moodle.univ.fr/mod/resource/view.php?id=500">
                <span class="instancename">PDF du sujet jeu de la vie</span>
            </a>
        </div>
    </div>
    <div class="activity resource modtype_resource">
        <div class="activityinstance">
            <a href="https://moodle.univ.fr/mod/resource/view.php?id=501">
                <span class="instancename">Source à compléter.zip</span>
            </a>
        </div>
    </div>
</div>
</body>
</html>
`;

// Mock HTML for Page with sub-page (GCC-DDD from Image 4 & 6)
const htmlTP1WithPage = `
<!DOCTYPE html>
<html>
<head><title>Cours : Algorithmique avancée et programmation C</title></head>
<body>
<div id="page-header">
    <nav class="breadcrumb">
        <span class="breadcrumb-item"><a href="#">ITI3-Algo</a></span> / 
        <span class="breadcrumb-item"><span>TP1</span></span>
    </nav>
    <div class="page-header-headings"><h1>Algorithmique avancée et programmation C</h1></div>
</div>
<ul class="nav nav-tabs">
    <li class="nav-item active"><a class="nav-link active" href="#">v Travaux pratiques</a></li>
</ul>
<ul class="nav nav-tabs subtopics">
    <li class="nav-item active"><a class="nav-link active" href="#">TP1</a></li>
</ul>
<div class="course-content">
    <div class="activity page modtype_page">
        <div class="activityinstance">
            <a href="https://moodle.univ.fr/mod/page/view.php?id=777">
                <img src="icon.png" class="icon" alt="Page">
                <span class="instancename">GCC-DDD</span>
            </a>
            <div class="contentafterlink">TP d'une séance sur la compilation avec gcc...</div>
        </div>
    </div>
</div>
</body>
</html>
`;

const htmlSubPageGCC = `
<!DOCTYPE html>
<html>
<head><title>GCC-DDD</title></head>
<body>
<div id="page-header">
    <nav class="breadcrumb">
        <span class="breadcrumb-item"><a href="#">ITI3-Algo</a></span> / 
        <span class="breadcrumb-item"><a href="#">TP1</a></span> / 
        <span class="breadcrumb-item"><span>GCC-DDD</span></span>
    </nav>
    <h1>GCC-DDD</h1>
</div>
<div id="region-main">
    <h3>Sujet</h3>
    <p>L'objectif de ce TP est de comprendre la chaîne de compilation...</p>
    <ul>
        <li>Sujet détaillé : <a href="https://moodle.univ.fr/mod/resource/view.php?id=801">Fichier PDF</a></li>
        <li>Jeu du snake : <a href="https://moodle.univ.fr/pluginfile.php/123/mod_page/content/newnsnake.tar.gz">newnsnake.tar.gz</a></li>
    </ul>
</div>
</body>
</html>
`;

async function runTests() {
  console.log("=== Testing Section Hierarchy Extraction ===");
  const dom1 = new JSDOM(htmlOneTopic, { url: "https://moodle.univ.fr/course/view.php?id=1" });
  const res1 = MoodleScraper.extractDocuments(dom1.window.document);

  console.log("Section detected:", res1.activeSection);
  assert.strictEqual(res1.activeSection, "Travaux pratiques / TP5");
  console.log("Files:", res1.items.map(i => i.filename));

  console.log("\n=== Testing Sub-page (GCC-DDD) Crawling ===");
  const dom2 = new JSDOM(htmlTP1WithPage, { url: "https://moodle.univ.fr/course/view.php?id=1" });
  
  const mockFetcher = async (url) => {
    if (url.includes('id=777')) {
      return htmlSubPageGCC;
    }
    return null;
  };

  const res2 = await MoodleScraper.extractAllDocuments(dom2.window.document, mockFetcher);
  console.log("Section detected:", res2.activeSection);
  console.log("Sub-pages found:", res2.subPagesFound);
  console.log("Total files found (including sub-pages):", res2.totalFound);
  res2.items.forEach(i => console.log(` -> ${i.filename} [${i.contextPath}]`));

  assert.strictEqual(res2.activeSection, "Travaux pratiques / TP1");
  assert.strictEqual(res2.subPagesFound[0], "GCC-DDD");
  assert.strictEqual(res2.totalFound, 2);
  assert.strictEqual(res2.items[0].filename, "GCC-DDD - Sujet détaillé.pdf");
  assert.strictEqual(res2.items[1].filename, "GCC-DDD - Jeu du snake.tar.gz");

  console.log("\n✅ All hierarchy and sub-page tests passed!");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
