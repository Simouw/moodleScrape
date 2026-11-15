from bs4 import BeautifulSoup
import re

html_sample = """
<!DOCTYPE html>
<html>
<head>
    <title>Cours: Algorithmique avancée et programmation C</title>
</head>
<body>
<div id="page-header">
    <nav class="breadcrumb">
        <a href="#">ITI</a> / 
        <a href="#">ITI (Informatique et Technologies de l'Information)</a> / 
        <span>Examens théoriques</span>
    </nav>
    <div class="page-header-headings">
        <h1>Algorithmique avancée et programmation C</h1>
    </div>
</div>

<div class="nav-tabs-container">
    <ul class="nav nav-tabs">
        <li class="nav-item"><a class="nav-link" href="#">Introduction</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Remise à Niveau</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Cours</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Travaux dirigés</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Travaux pratiques</a></li>
        <li class="nav-item"><a class="nav-link active" href="#">Examens théoriques</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Examens pratiques</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Liens utiles</a></li>
        <li class="nav-item"><a class="nav-link" href="#">Références</a></li>
    </ul>
</div>

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
"""

def sanitize(s):
    if not s:
        return ""
    # remove invalid filename characters
    s = re.sub(r'[\\/*?:"<>|]', '_', s)
    s = re.sub(r'\s+', ' ', s).strip()
    return s

def extract_from_html(html):
    soup = BeautifulSoup(html, 'html.parser')
    
    # 1. Course Title
    h1 = soup.select_one('#page-header h1, .page-header-headings h1, h1')
    course_name = sanitize(h1.get_text() if h1 else "Cours")
    
    # 2. Active Tab / Section
    active_tab = soup.select_one('.nav-tabs .active, .nav-pills .active, button.active, .onetopic .active')
    section_name = sanitize(active_tab.get_text() if active_tab else "")
    
    results = []
    
    # Find all links
    links = soup.find_all('a', href=True)
    for a in links:
        href = a['href']
        text = a.get_text().strip()
        
        # Check if it looks like a resource
        is_resource = (
            '/mod/resource/' in href or
            '/pluginfile.php/' in href or
            re.search(r'\.(pdf|zip|docx?|xlsx?|pptx?|c|cpp|h|py|tar|gz|txt)$', href, re.I) or
            'Fichier PDF' in text or 'PDF' in text
        )
        
        if not is_resource:
            continue
            
        # Determine extension
        ext = '.pdf'
        m_ext = re.search(r'\.([a-zA-Z0-9]{2,4})(?:[\?#]|$)', href)
        if m_ext:
            ext = '.' + m_ext.group(1).lower()
        elif 'pdf' in text.lower():
            ext = '.pdf'
            
        # Context extraction:
        # A) Preceding text siblings
        prev_texts = []
        curr = a.previous_sibling
        while curr:
            if isinstance(curr, str):
                prev_texts.append(curr.strip())
            else:
                prev_texts.append(curr.get_text().strip())
            curr = curr.previous_sibling
        prev_str = " ".join(reversed(prev_texts))
        
        # B) Line / Parent LI
        parent_li = a.find_parent('li')
        li_context = ""
        ancestor_context = []
        
        if parent_li:
            # Check ancestor LIs
            p = parent_li.find_parent('li')
            while p:
                # get text before any sub-ul/ol
                # e.g., "Année 2005-2006 :"
                direct_text = "".join([c for c in p.children if isinstance(c, str)]).strip()
                if not direct_text:
                    # fallback to first string in p
                    direct_text = next(p.stripped_strings, "")
                direct_text = re.sub(r'[:\s]+$', '', direct_text)
                if direct_text:
                    ancestor_context.append(direct_text)
                p = p.find_parent('li')
                
            ancestor_context.reverse()
        
        # Analyze role & item type
        # In: "Partiel : [PDF], correction [PDF]"
        # If prev_str contains "correction" -> Role is "Correction"
        # Item prefix: what was at the beginning of the li?
        role = ""
        if re.search(r'\b(correction|corrigé|corriges?|solution)\b', prev_str, re.I):
            role = "Correction"
        elif re.search(r'\b(sujet|énoncé|enonce)\b', prev_str, re.I):
            role = "Sujet"
        else:
            role = "Sujet" # default if paired with correction
            
        # Identify item type (Partiel, Examen, TD1, TP1, etc.)
        item_type = ""
        full_line_text = parent_li.get_text() if parent_li else prev_str
        m_type = re.search(r'\b(Partiel|Examen|Rattrapage|Session \d+|TP\s*\d*|TD\s*\d*|Devoir|Projet)\b', prev_str or full_line_text, re.I)
        if m_type:
            item_type = m_type.group(1)
            
        # Build components
        parts = []
        for anc in ancestor_context:
            parts.append(sanitize(anc))
        if item_type:
            parts.append(sanitize(item_type))
        if role:
            # If item_type is already present, add role
            parts.append(role)
            
        # If parts is empty or generic, use link text or URL filename
        if not parts:
            if text and text.lower() not in ['fichier pdf', 'pdf', 'document', 'télécharger', 'download', 'lien']:
                parts.append(sanitize(text))
            else:
                parts.append("Document")
                
        # Join components nicely
        filename = " - ".join(parts) + ext
        # Clean duplicate dashes or spaces
        filename = re.sub(r'\s+-\s+', ' - ', filename)
        filename = sanitize(filename)
        
        results.append({
            'url': href,
            'filename': filename,
            'course': course_name,
            'section': section_name,
            'context': f"{' > '.join(ancestor_context)} > {item_type} ({role})"
        })
        
    return course_name, section_name, results

if __name__ == '__main__':
    course, sec, res = extract_from_html(html_sample)
    print(f"Cours : {course}")
    print(f"Section : {sec}")
    print(f"Nombre de fichiers : {len(res)}\n")
    for r in res:
        print(f" -> {r['filename']}  [{r['context']}]")
