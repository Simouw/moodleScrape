import os
from PIL import Image, ImageDraw

def create_icon(size):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Outer rounded rectangle (Moodle orange gradient/theme)
    # Background: #F98012 (Moodle Orange) with rounded corners
    radius = int(size * 0.22)
    # Draw background circle or rounded rect
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(242, 114, 23, 255))
    
    # Inner subtle border
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, outline=(200, 80, 10, 255), width=max(1, int(size * 0.04)))
    
    # Draw a stylized document / down-arrow icon in white
    # Center coordinates
    c = size / 2.0
    
    # Draw Document Sheet
    doc_left = size * 0.26
    doc_right = size * 0.74
    doc_top = size * 0.20
    doc_bottom = size * 0.80
    corner_fold = size * 0.16
    
    # Polygon with folded corner
    pts = [
        (doc_left, doc_top),
        (doc_right - corner_fold, doc_top),
        (doc_right, doc_top + corner_fold),
        (doc_right, doc_bottom),
        (doc_left, doc_bottom)
    ]
    draw.polygon(pts, fill=(255, 255, 255, 255))
    
    # Fold triangle
    fold_pts = [
        (doc_right - corner_fold, doc_top),
        (doc_right - corner_fold, doc_top + corner_fold),
        (doc_right, doc_top + corner_fold)
    ]
    draw.polygon(fold_pts, fill=(230, 230, 230, 255))
    
    # Download Arrow inside doc (in Moodle Orange/Blue)
    arrow_color = (24, 75, 140, 255) # Navy blue
    arrow_w = size * 0.10
    arrow_h = size * 0.20
    arrow_center_x = c
    arrow_center_y = size * 0.50
    
    # Stem of arrow
    draw.rectangle([
        arrow_center_x - arrow_w / 2,
        arrow_center_y - arrow_h / 2,
        arrow_center_x + arrow_w / 2,
        arrow_center_y + arrow_h * 0.2
    ], fill=arrow_color)
    
    # Head of arrow
    head_pts = [
        (arrow_center_x - size * 0.16, arrow_center_y + arrow_h * 0.15),
        (arrow_center_x + size * 0.16, arrow_center_y + arrow_h * 0.15),
        (arrow_center_x, arrow_center_y + arrow_h * 0.55)
    ]
    draw.polygon(head_pts, fill=arrow_color)
    
    # Tray at the bottom of the arrow
    tray_y = size * 0.68
    draw.line([
        (arrow_center_x - size * 0.16, tray_y),
        (arrow_center_x + size * 0.16, tray_y)
    ], fill=arrow_color, width=max(1, int(size * 0.05)))
    
    return img

os.makedirs('/home/cmo/code/moodleScrape/icons', exist_ok=True)
for s in [16, 32, 48, 128]:
    im = create_icon(s)
    im.save(f'/home/cmo/code/moodleScrape/icons/icon{s}.png')
print("Icons generated successfully!")
