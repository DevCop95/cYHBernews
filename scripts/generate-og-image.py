import os
from PIL import Image, ImageDraw, ImageFont

WIDTH = 1200
HEIGHT = 630

# Crear lienzo (Dark Obsidian / Carbon Tech)
img = Image.new("RGBA", (WIDTH, HEIGHT), (10, 14, 24, 255))
draw = ImageDraw.Draw(img)

# 1. Gradiente de fondo suave
for y in range(HEIGHT):
    factor = y / HEIGHT
    r = int(9 + 5 * factor)
    g = int(13 + 5 * factor)
    b = int(22 + 9 * factor)
    draw.line([(0, y), (WIDTH, y)], fill=(r, g, b, 255))

# 2. Resplandor radial central (halo azul/cian tecnológico muy sutil y amplio)
glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
glow_draw = ImageDraw.Draw(glow)
center_x = WIDTH // 2
center_y = HEIGHT // 2 - 20

for radius in range(500, 40, -30):
    alpha = int(22 * (1 - radius / 500))
    glow_draw.ellipse(
        [center_x - radius, center_y - radius, center_x + radius, center_y + radius],
        fill=(0, 122, 255, alpha)
    )

# Resplandor cian suave en la parte superior central
for radius in range(250, 30, -25):
    alpha = int(16 * (1 - radius / 250))
    glow_draw.ellipse(
        [center_x - radius, 140 - radius, center_x + radius, 140 + radius],
        fill=(14, 165, 233, alpha)
    )

# Malla o cuadrícula técnica tenue
grid_layer = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
grid_draw = ImageDraw.Draw(grid_layer)
grid_step = 40
for x in range(0, WIDTH, grid_step):
    grid_draw.line([(x, 0), (x, HEIGHT)], fill=(255, 255, 255, 5), width=1)
for y in range(0, HEIGHT, grid_step):
    grid_draw.line([(0, y), (WIDTH, y)], fill=(255, 255, 255, 5), width=1)

img = Image.alpha_composite(img, glow)
img = Image.alpha_composite(img, grid_layer)
draw = ImageDraw.Draw(img)

# Fuentes
font_bold = "C:/Windows/Fonts/segoeuib.ttf"
font_reg = "C:/Windows/Fonts/segoeui.ttf"
font_semi = "C:/Windows/Fonts/seguisb.ttf"
font_mono = "C:/Windows/Fonts/consola.ttf"

f_brand = ImageFont.truetype(font_bold, 62)
f_headline = ImageFont.truetype(font_semi, 28)
f_tags = ImageFont.truetype(font_reg, 21)
f_domain = ImageFont.truetype(font_semi, 21)
f_logo = ImageFont.truetype(font_mono, 32)
f_live = ImageFont.truetype(font_semi, 13)

# Borde exterior sofisticado y limpio (estilo tarjeta premium)
draw.rounded_rectangle([24, 24, WIDTH - 24, HEIGHT - 24], radius=24, outline=(34, 48, 72, 160), width=1)

# ─────────────────────────────────────────────────────────────
# 1. PILL SUPERIOR: "COBERTURA 24/7 EN VIVO"
# ─────────────────────────────────────────────────────────────
live_txt = "COBERTURA 24/7  •  INTELIGENCIA & CIBERSEGURIDAD"
l_bb = f_live.getbbox(live_txt)
l_w = l_bb[2] - l_bb[0]
live_y = 65
lx = center_x - (l_w + 36) // 2

draw.rounded_rectangle([lx, live_y, lx + l_w + 36, live_y + 30], radius=15, fill=(16, 26, 44, 240), outline=(0, 140, 255, 130), width=1)
draw.ellipse([lx + 12, live_y + 11, lx + 18, live_y + 17], fill=(0, 230, 118, 255))
draw.text((lx + 24, live_y + 6), live_txt, font=f_live, fill=(140, 195, 255, 255))

# ─────────────────────────────────────────────────────────────
# 2. LOGO + NOMBRE CENTRAL
# ─────────────────────────────────────────────────────────────
brand_row_y = 135
icon_w = 84
icon_h = 84

# Medir texto "cYHBernews"
b_bb = f_brand.getbbox("cYHBernews")
b_w = b_bb[2] - b_bb[0]
b_h = b_bb[3] - b_bb[1]

gap = 22
total_brand_w = icon_w + gap + b_w
start_x = (WIDTH - total_brand_w) // 2

# Dibujar icono terminal
icon_x = start_x
draw.rounded_rectangle(
    [icon_x, brand_row_y, icon_x + icon_w, brand_row_y + icon_h],
    radius=20,
    fill=(11, 17, 30, 255),
    outline=(0, 122, 255, 180),
    width=2
)
# Puntos macOS
draw.ellipse([icon_x + 16, brand_row_y + 18, icon_x + 25, brand_row_y + 27], fill=(255, 95, 86, 255))
draw.ellipse([icon_x + 32, brand_row_y + 18, icon_x + 41, brand_row_y + 27], fill=(255, 189, 46, 255))
draw.ellipse([icon_x + 48, brand_row_y + 18, icon_x + 57, brand_row_y + 27], fill=(39, 201, 63, 255))
# Línea divisoria
draw.line([(icon_x + 10, brand_row_y + 36), (icon_x + icon_w - 10, brand_row_y + 36)], fill=(38, 52, 78, 255), width=1)
# Texto cY y cursor
draw.text((icon_x + 14, brand_row_y + 41), "cY", font=f_logo, fill=(0, 140, 255, 255))
draw.rectangle([icon_x + 56, brand_row_y + 50, icon_x + 68, brand_row_y + 72], fill=(0, 140, 255, 220))

# Texto "cYHBernews"
brand_text_x = icon_x + icon_w + gap
draw.text((brand_text_x, brand_row_y + 7), "cYHBernews", font=f_brand, fill=(255, 255, 255, 255))

# ─────────────────────────────────────────────────────────────
# 3. TITULAR PRINCIPAL: Centrado y espacioso
# ─────────────────────────────────────────────────────────────
headline_txt = "Tu Periódico Digital Tech"
h_bb = f_headline.getbbox(headline_txt)
h_w = h_bb[2] - h_bb[0]
head_y = 265
draw.text(((WIDTH - h_w) // 2, head_y), headline_txt, font=f_headline, fill=(241, 245, 249, 255))

# ─────────────────────────────────────────────────────────────
# 4. SUBTÍTULO DESCRIPTIVO: Con amplio espacio
# ─────────────────────────────────────────────────────────────
tags_txt = "Ciberseguridad  •  Inteligencia Artificial  •  Amenazas Globales & Tech"
t_bb = f_tags.getbbox(tags_txt)
t_w = t_bb[2] - t_bb[0]
tags_y = 330
draw.text(((WIDTH - t_w) // 2, tags_y), tags_txt, font=f_tags, fill=(148, 163, 184, 255))

# ─────────────────────────────────────────────────────────────
# 5. PILL DEL DOMINIO: Protagonista, amplio, elegante y centrado
# ─────────────────────────────────────────────────────────────
dom_y = 445
dom_text = "cyhbernews.dev101x.online"
d_bb = f_domain.getbbox(dom_text)
dom_w = d_bb[2] - d_bb[0]

pill_padding_x = 26
pill_padding_y = 14
pill_total_w = dom_w + 34 + pill_padding_x * 2
pill_total_h = 56
pill_x = (WIDTH - pill_total_w) // 2

# Caja del Dominio
draw.rounded_rectangle(
    [pill_x, dom_y, pill_x + pill_total_w, dom_y + pill_total_h],
    radius=28,
    fill=(14, 24, 44, 255),
    outline=(0, 130, 255, 180),
    width=1
)

# Candado HTTPS
lock_x = pill_x + pill_padding_x
lock_y = dom_y + 19
# Cuerpo
draw.rounded_rectangle([lock_x, lock_y + 6, lock_x + 16, lock_y + 18], radius=2, fill=(0, 180, 255, 255))
# Arco
draw.arc([lock_x + 2, lock_y - 1, lock_x + 14, lock_y + 11], start=180, end=0, fill=(0, 180, 255, 255), width=2)
# Orificio
draw.ellipse([lock_x + 6, lock_y + 10, lock_x + 10, lock_y + 14], fill=(14, 24, 44, 255))

# Texto del dominio
draw.text((lock_x + 26, dom_y + 13), dom_text, font=f_domain, fill=(255, 255, 255, 255))

# Guardar imágenes
img.save("og-image.png", "PNG", optimize=True)
rgb_img = img.convert("RGB")
rgb_img.save("og-image.jpg", "JPEG", quality=95, optimize=True)

print("Versión centrada y con máximo aire generada correctamente.")
