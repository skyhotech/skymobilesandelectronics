"""Import the supplied visual reference as React sections and local optimized assets.

This is a one-time design import, not a runtime HTML renderer. Exported scripts are discarded.
Re-running overwrites generated homepage sections; edit the resulting React files normally.
"""
import concurrent.futures
import hashlib
import io
import json
import re
import urllib.request
from dataclasses import dataclass, field
from html.parser import HTMLParser
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
REFERENCE = ROOT / "docs/design-reference/homepage"
FRONTEND = ROOT / "frontend"
DESTINATION = FRONTEND / "src/components/home"
ASSETS = FRONTEND / "public/images/homepage"
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Parser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                self.stack = self.stack[:index]
                break

    def handle_data(self, data):
        if data.strip():
            self.stack[-1].children.append(data)


def walk(node):
    yield node
    for child in node.children:
        if isinstance(child, Node):
            yield from walk(child)


def content(node):
    return " ".join(c.strip() if isinstance(c, str) else content(c) for c in node.children).strip()


def fetch(url):
    last = None
    for _ in range(3):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(request, timeout=40) as response:
                return response.read()
        except (OSError, TimeoutError) as error:
            last = error
    raise RuntimeError(f"Unable to download {url}: {last}")


def import_image(url):
    name = hashlib.sha256(url.encode()).hexdigest()[:12] + ".webp"
    destination = ASSETS / name
    if not destination.exists():
        original = fetch(url)
        image = ImageOps.exif_transpose(Image.open(io.BytesIO(original)))
        image.thumbnail((1600, 1600), Image.Resampling.LANCZOS)
        if image.mode not in ("RGB", "RGBA"):
            image = image.convert("RGBA" if "transparency" in image.info else "RGB")
        image.save(destination, "WEBP", quality=85, method=6)
    with Image.open(destination) as image:
        dimensions = image.size
    return url, {"path": "/images/homepage/" + name, "width": dimensions[0], "height": dimensions[1], "bytes": destination.stat().st_size}


def import_fonts(icons):
    directory = FRONTEND / "public/fonts/homepage"
    directory.mkdir(parents=True, exist_ok=True)
    urls = [
        "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap",
        "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&icon_names=" + ",".join(sorted(icons)) + "&display=block",
    ]
    styles = []
    for url in urls:
        css = fetch(url).decode()
        for asset_url in sorted(set(re.findall(r"url\((https://[^)]+)\)", css))):
            suffix = Path(asset_url.split("?")[0]).suffix or ".woff2"
            name = hashlib.sha256(asset_url.encode()).hexdigest()[:12] + suffix
            path = directory / name
            if not path.exists():
                path.write_bytes(fetch(asset_url))
            css = css.replace(asset_url, "/fonts/homepage/" + name)
        styles.append(css)
    (DESTINATION / "fonts.css").write_text("\n".join(styles), encoding="utf-8")


parser = Parser()
source = (REFERENCE / "code.html").read_text(encoding="utf-8")
parser.feed(source)
body = next(n for n in walk(parser.root) if n.tag == "body")
all_nodes = list(walk(body))
ASSETS.mkdir(parents=True, exist_ok=True)
DESTINATION.mkdir(parents=True, exist_ok=True)
urls = set()
icons = set()
for node in all_nodes:
    if node.tag == "img":
        urls.add(node.attrs["src"])
    urls.update(re.findall(r"url\(['\"]?(https://[^)'\"]+)", node.attrs.get("style", "")))
    if "material-symbols-outlined" in node.attrs.get("class", ""):
        icons.add(content(node))
print(f"Importing {len(urls)} images and {len(icons)} icon glyphs", flush=True)
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
    images = dict(pool.map(import_image, sorted(urls)))
(REFERENCE / "asset-manifest.json").write_text(json.dumps(images, indent=2) + "\n", encoding="utf-8")
import_fonts(icons)

config_match = re.search(r"tailwind.config\s*=\s*(\{.*?\});</script>", source, re.DOTALL)
config_text = config_match.group(1).replace('darkMode: "class", theme:', '"darkMode": "class", "theme":')
config_text = config_text.replace(' { extend:', ' { "extend":')
config = json.loads(config_text)["theme"]["extend"]
css = ['@import "tailwindcss";', '@import "../components/home/fonts.css";', "", "@theme {"]
for name, value in config["colors"].items():
    css.append(f"  --color-{name}: {value};")
for name, value in config["spacing"].items():
    css.append(f"  --spacing-{name}: {value};")
css.extend(["  --radius-lg: 0.5rem;", "  --radius-xl: 0.75rem;", "  --radius-2xl: 1rem;", "  --radius-3xl: 1.5rem;"])
for name in config["fontFamily"]:
    css.append(f'  --font-{name}: "Inter", Arial, sans-serif;')
for name, (size, properties) in config["fontSize"].items():
    css.append(f"  --text-{name}: {size};")
    css.append(f"  --text-{name}--line-height: {properties['lineHeight']};")
    css.append(f"  --text-{name}--letter-spacing: {properties['letterSpacing']};")
    css.append(f"  --text-{name}--font-weight: {properties['fontWeight']};")
css.append("}")
(FRONTEND / "src/app/globals.css").write_text("\n".join(css) + "\n", encoding="utf-8")

main = next(n for n in body.children if isinstance(n, Node) and n.tag == "main")
container = next(n for n in main.children if isinstance(n, Node) and n.tag == "div")
sections = [n for n in container.children if isinstance(n, Node) and n.tag == "section"]
names = ["HeroCarousel", "ServiceAssurance", "CategoryCollection", "BrandCollection", "SmartphoneCollection", "FeaturedOffers", "LaptopCollection", "GadgetCollection", "HomeEntertainment", "WhySky", "CommunityCollection", "FinancePartners"]
ids = ["hero", "services", "categories", "brands", "smartphones", "offers", "laptops", "gadgets", "entertainment", "why-sky", "community", "finance"]
assert len(sections) == len(names), f"Unexpected section count: {len(sections)}"
for node, id_ in zip(sections, ids):
    node.attrs["id"] = id_

links = {
    "mobiles-and-5g": "#smartphones", "laptops-and-tablets": "#laptops",
    "3dot-audio-gadgets": "#gadgets", "tvs-and-soundbars": "#entertainment",
    "appliances": "#entertainment", "wearables": "#gadgets", "brands": "#brands",
    "deals-and-offers": "#offers", "store-locator": "#contact", "emi-finance": "#finance",
}
product_index = 0
for section in sections:
    for node in walk(section):
        if node.tag == "div" and "group" in node.attrs.get("class", "").split() and any(
            n.tag == "h3" for n in walk(node)
        ) and any(n.tag == "img" for n in walk(node)) and "rounded-2xl" in node.attrs.get("class", ""):
            heading = next(n for n in walk(node) if n.tag == "h3")
            node.attrs["data-product"] = content(heading)
            node.attrs["data-product-id"] = str(product_index)
            product_index += 1

for node in all_nodes:
    node.attrs = {k: v for k, v in node.attrs.items() if not k.startswith("on")}
    if node.tag == "img":
        image = images[node.attrs["src"]]
        node.attrs["src"] = image["path"]
        node.attrs["alt"] = node.attrs.get("alt") or node.attrs.get("data-alt", "SKY electronics")
        node.attrs["width"] = str(image["width"])
        node.attrs["height"] = str(image["height"])
        node.attrs["loading"] = "lazy"
        node.attrs["decoding"] = "async"
    for url, image in images.items():
        if "style" in node.attrs:
            node.attrs["style"] = node.attrs["style"].replace(url, image["path"])
    if node.tag == "a" and node.attrs.get("href") == "#":
        path = node.attrs.get("data-path", "")
        node.attrs["href"] = links.get(path, "#contact")
        if path == "product-details":
            node.attrs["data-action"] = "details"
        elif path in ("login", "cart", "wishlist", "compare", "track-order"):
            node.attrs["data-action"] = path
    if "material-symbols-outlined" in node.attrs.get("class", ""):
        node.attrs["aria-hidden"] = "true"
    if node.tag == "button":
        node.attrs.setdefault("type", "button")
        label = content(node)
        if label == "menu All Categories":
            node.attrs["data-action"] = "categories"
        elif label == "search":
            node.attrs["data-action"] = "search"
            node.attrs["aria-label"] = "Search products"
        elif node.attrs.get("aria-label") == "Add to Wishlist":
            node.attrs["data-action"] = "wishlist-product"
            node.attrs["aria-pressed"] = "false"
        elif label in ("Add to Cart", "Add to cart", "Buy Now"):
            node.attrs["data-action"] = "enquire"
        elif "Details" in label:
            node.attrs["data-action"] = "details"
        if not node.attrs.get("aria-label") and label in ("favorite", "shopping_cart", "visibility"):
            node.attrs["aria-label"] = {"favorite": "Save product", "shopping_cart": "Enquire about product", "visibility": "View product details"}[label]

header = next(n for n in body.children if isinstance(n, Node) and n.tag == "header")
header.attrs["class"] += " sky-header"
header_sections = next(n for n in header.children if isinstance(n, Node)).children
for node, class_name in zip([n for n in header_sections if isinstance(n, Node)], ["sky-promo-bar", "sky-main-header", "sky-nav-bar"]):
    node.attrs["class"] += " " + class_name
search = next(n for n in walk(header) if n.tag == "input")
search.attrs["aria-label"] = "Search products"
search.attrs["id"] = "product-search"
search.attrs["type"] = "search"
select = next(n for n in walk(header) if n.tag == "select")
select.attrs["aria-label"] = "Search category"
select.attrs["id"] = "search-category"
footer = next(n for n in body.children if isinstance(n, Node) and n.tag == "footer")
footer.attrs["id"] = "contact"
floating = next(n for n in body.children if isinstance(n, Node) and n.tag == "a")
floating.attrs["aria-label"] = "Chat with SKY on WhatsApp"

# Restore the category title visible in the screenshot but omitted from the exported heading.
category_heading = next(n for n in sections[2].children if isinstance(n, Node))
category_heading.children.insert(0, Node("div", {}, [
    Node("span", {"class": "font-label-sm text-label-sm uppercase tracking-wider text-secondary font-bold"}, ["Everything Tech"]),
    Node("h2", {"class": "font-headline-lg text-headline-lg font-bold text-primary"}, ["Explore Our Categories"]),
    Node("p", {"class": "font-body-md text-body-md text-text-secondary mt-1"}, ["Mobiles, laptops, entertainment, wearables, charging and smart appliances — all in one place."]),
]))


def style_object(style):
    result = {}
    for rule in style.split(";"):
        if ":" in rule:
            key, value = rule.split(":", 1)
            key = re.sub(r"-([a-z])", lambda m: m[1].upper(), key.strip())
            result[key] = value.strip()
    return json.dumps(result, ensure_ascii=False)


def jsx(node, depth=0, hero=False):
    if isinstance(node, str):
        return "  " * depth + "{" + json.dumps(re.sub(r"\s+", " ", node).strip(), ensure_ascii=False) + "}"
    if node.tag in ("script", "style"):
        return ""
    attributes = []
    for name, value in node.attrs.items():
        react_name = {"class": "className", "tabindex": "tabIndex", "readonly": "readOnly", "for": "htmlFor", "crossorigin": "crossOrigin"}.get(name, name)
        if name == "style":
            attributes.append("style={" + style_object(value) + "}")
        elif value is None:
            attributes.append(react_name)
        else:
            attributes.append(react_name + "=" + json.dumps(value, ensure_ascii=False))
    if hero and "hero-slide" in node.attrs.get("class", ""):
        index = hero_slides.index(node)
        attributes = [a for a in attributes if not a.startswith("className=")]
        base_class = re.sub(r"\b(opacity-100|opacity-0|z-10|z-0)\b", "", node.attrs["class"])
        attributes += ["className={" + json.dumps(base_class) + f' + (activeSlide === {index} ? " opacity-100 z-10" : " opacity-0 z-0 hidden")' + "}", f"aria-hidden={{activeSlide !== {index}}}"]
    if hero and "carousel-dot" in node.attrs.get("class", ""):
        index = int(node.attrs["data-slide"])
        attributes = [a for a in attributes if not a.startswith("className=")]
        attributes += [f'onClick={{() => goToSlide({index})}}', f'aria-pressed={{activeSlide === {index}}}',
                       'className={"carousel-dot h-2 rounded-full transition-all " + ' + f'(activeSlide === {index} ? "bg-secondary-container w-7" : "bg-surface-canvas/40 w-2")' + "}"]
    if hero and node.attrs.get("id") in ("carousel-prev", "carousel-next"):
        delta = "-1" if node.attrs["id"] == "carousel-prev" else "1"
        attributes.append(f"onClick={{() => goToSlide(activeSlide + ({delta}))}}")
    opening = "  " * depth + "<" + node.tag + (" " + " ".join(attributes) if attributes else "")
    if node.tag in VOID:
        return opening + " />"
    children = [jsx(child, depth + 1, hero) for child in node.children]
    children = [child for child in children if child]
    return opening + ">\n" + "\n".join(children) + "\n" + "  " * depth + "</" + node.tag + ">"


hero_slides = [n for n in walk(sections[0]) if "hero-slide" in n.attrs.get("class", "").split()]
for section, name in zip(sections, names):
    if name == "HeroCarousel":
        continue
    output = '// Adapted from the supplied Stitch homepage reference.\nexport function ' + name + '() {\n  return (\n' + jsx(section, 2) + '\n  );\n}\n'
    (DESTINATION / (re.sub(r"(?<!^)(?=[A-Z])", "-", name).lower() + ".tsx")).write_text(output, encoding="utf-8")
for node, name, filename in [(header, "StoreHeader", "store-header"), (footer, "StoreFooter", "store-footer"), (floating, "WhatsAppLink", "whatsapp-link")]:
    output = '// Adapted from the supplied Stitch homepage reference.\nexport function ' + name + '() {\n  return (\n' + jsx(node, 2) + '\n  );\n}\n'
    (DESTINATION / (filename + ".tsx")).write_text(output, encoding="utf-8")
hero_prefix = '''"use client";

import { useEffect, useState } from "react";

export function HeroCarousel() {
  const [activeSlide, setActiveSlide] = useState(4);
  const [paused, setPaused] = useState(false);
  const goToSlide = (index: number) => setActiveSlide((index + 6) % 6);
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setActiveSlide((slide) => (slide + 1) % 6), 7000);
    return () => window.clearInterval(interval);
  }, [paused, activeSlide]);
  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
         onFocusCapture={() => setPaused(true)} onBlurCapture={() => setPaused(false)}
         aria-roledescription="carousel" aria-label="SKY offers">
'''
(DESTINATION / "hero-carousel.tsx").write_text(hero_prefix + jsx(sections[0], 3, True) + "\n    </div>\n  );\n}\n", encoding="utf-8")
print(f"Created {len(names) + 3} React components; {sum(i['bytes'] for i in images.values()) / 1024:.0f} KB of local images.", flush=True)
