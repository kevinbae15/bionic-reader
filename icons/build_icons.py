#!/usr/bin/env python3
"""
Bionic Reading — icon generator.

Single source of truth for every icon asset. Run it and it (re)generates the
full set of PNGs (active + inactive, all toolbar sizes) plus canonical SVGs,
straight from the geometry defined below — no external tools, no dependencies,
just the Python standard library.

    python3 icons/build_icons.py

Design: "fixation lines" — three rows of reading text, each a bold leading
"head" (what Bionic Reading emphasizes) and a quieter "tail". Active state uses
the amber accent; inactive uses a muted slate so the toolbar clearly shows
on/off. Small sizes use a chunkier geometry (optical sizing) so the mark stays
crisp at 16px.
"""

import os
import struct
import zlib

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

# ---- palette ---------------------------------------------------------------
INK = "#14161F"
ACTIVE = {"bg": INK, "head": "#F5A524", "tail": "#3A4055"}
INACTIVE = {"bg": INK, "head": "#565D72", "tail": "#2B3040"}

# ---- geometry (128x128 design space) --------------------------------------
# Each line: (x, y, w, h, radius, role)
REFINED = {
    "bg_radius": 30,
    "lines": [
        (26, 36, 34, 12, 6, "head"), (64, 36, 38, 12, 6, "tail"),
        (26, 58, 28, 12, 6, "head"), (58, 58, 44, 12, 6, "tail"),
        (26, 80, 40, 12, 6, "head"), (70, 80, 20, 12, 6, "tail"),
    ],
}
# Chunkier bars + more breathing room so it survives an 8x downscale to 16px.
BOLD = {
    "bg_radius": 26,
    "lines": [
        (22, 28, 40, 18, 9, "head"), (70, 28, 36, 18, 9, "tail"),
        (22, 55, 32, 18, 9, "head"), (62, 55, 44, 18, 9, "tail"),
        (22, 82, 46, 18, 9, "head"), (76, 82, 18, 18, 9, "tail"),
    ],
}


def geometry_for(size):
    """Optical sizing: bolder shapes for tiny toolbar icons."""
    return BOLD if size <= 32 else REFINED


def hex_rgb(h):
    h = h.lstrip("#")
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


def in_round_rect(px, py, x, y, w, h, r):
    x0, y0, x1, y1 = x, y, x + w, y + h
    if px < x0 or px > x1 or py < y0 or py > y1:
        return False
    if (x0 + r <= px <= x1 - r) or (y0 + r <= py <= y1 - r):
        return True
    for cx, cy in ((x0 + r, y0 + r), (x1 - r, y0 + r), (x0 + r, y1 - r), (x1 - r, y1 - r)):
        if (px - cx) ** 2 + (py - cy) ** 2 <= r * r:
            return True
    return False


def render_rgba(size, colors, ss=4):
    """Supersampled (ss x ss) box-filtered RGBA buffer with transparent corners."""
    geo = geometry_for(size)
    bg, head, tail = hex_rgb(colors["bg"]), hex_rgb(colors["head"]), hex_rgb(colors["tail"])
    role = {"bg": bg, "head": head, "tail": tail}
    bg_r = geo["bg_radius"]
    lines = geo["lines"]
    hi = size * ss
    scale = 128.0 / hi
    hibuf = bytearray(hi * hi * 4)
    for j in range(hi):
        py = (j + 0.5) * scale
        for i in range(hi):
            px = (i + 0.5) * scale
            col = None
            for (x, y, w, h, r, rl) in lines:
                if in_round_rect(px, py, x, y, w, h, r):
                    col = role[rl]
                    break
            if col is None and in_round_rect(px, py, 0, 0, 128, 128, bg_r):
                col = bg
            o = (j * hi + i) * 4
            if col is None:
                hibuf[o + 3] = 0
            else:
                hibuf[o], hibuf[o + 1], hibuf[o + 2], hibuf[o + 3] = col[0], col[1], col[2], 255
    out = bytearray(size * size * 4)
    n = ss * ss
    for j in range(size):
        for i in range(size):
            r = g = b = a = 0
            for dy in range(ss):
                row = (j * ss + dy) * hi
                for dx in range(ss):
                    o = (row + i * ss + dx) * 4
                    al = hibuf[o + 3]
                    r += hibuf[o] * al
                    g += hibuf[o + 1] * al
                    b += hibuf[o + 2] * al
                    a += al
            oo = (j * size + i) * 4
            if a == 0:
                out[oo + 3] = 0
            else:
                out[oo], out[oo + 1], out[oo + 2], out[oo + 3] = r // a, g // a, b // a, a // n
    return bytes(out)


def write_png(path, size, rgba):
    def chunk(typ, data):
        return struct.pack(">I", len(data)) + typ + data + struct.pack(">I", zlib.crc32(typ + data) & 0xffffffff)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = size * 4
    for j in range(size):
        raw.append(0)  # filter: none
        raw += rgba[j * stride:(j + 1) * stride]
    idat = zlib.compress(bytes(raw), 9)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b""))


def write_svg(path, colors):
    """Canonical SVG (refined geometry) for the store listing / README / scaling."""
    geo = REFINED
    rects = [f'<rect width="128" height="128" rx="{geo["bg_radius"]}" fill="{colors["bg"]}"/>']
    for (x, y, w, h, r, rl) in geo["lines"]:
        rects.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{r}" fill="{colors[rl]}"/>')
    body = "\n  ".join(rects)
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" '
        'viewBox="0 0 128 128">\n  ' + body + "\n</svg>\n"
    )
    with open(path, "w") as f:
        f.write(svg)


def main():
    sizes = (16, 32, 48, 128)
    for size in sizes:
        write_png(os.path.join(OUT_DIR, f"active-icon-{size}.png"), size, render_rgba(size, ACTIVE))
        write_png(os.path.join(OUT_DIR, f"inactive-icon-{size}.png"), size, render_rgba(size, INACTIVE))
    # high-res store tile
    write_png(os.path.join(OUT_DIR, "active-icon-256.png"), 256, render_rgba(256, ACTIVE, ss=3))
    # canonical vectors
    write_svg(os.path.join(OUT_DIR, "active-icon.svg"), ACTIVE)
    write_svg(os.path.join(OUT_DIR, "inactive-icon.svg"), INACTIVE)
    print("Generated icons in", OUT_DIR)
    for f in sorted(os.listdir(OUT_DIR)):
        if f.endswith((".png", ".svg")):
            print("  ", f)


if __name__ == "__main__":
    main()
