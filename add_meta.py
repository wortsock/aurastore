"""AuraStore: adds SEO, social-sharing and icon tags to every .html page.
Run it once from inside the project folder:   python add_meta.py
It is safe to run again; it replaces its own block instead of adding a second one."""
import glob, html, json, os, re

BASE = "https://wortsock.github.io/aurastore/"   # change this if your live address changes
SITE = "AuraStore"
OG_IMAGE = BASE + "images/brand/og-image.jpg"
START, END = "<!-- brand-meta:start -->", "<!-- brand-meta:end -->"
PUBLIC = {"index.html", "shop.html", "product.html", "privacy.html", "terms.html"}   # pages worth sharing and indexing

def meta_of(src):
    t = re.search(r"<title>(.*?)</title>", src, re.S)
    d = re.search(r'<meta name="description" content="(.*?)"', src, re.S)
    return (html.unescape(t.group(1).strip()) if t else SITE), (html.unescape(d.group(1).strip()) if d else "")

def block(name, title, desc):
    e = lambda s: html.escape(s, quote=True)
    lines = [START,
        '<link rel="icon" type="image/svg+xml" href="images/brand/favicon.svg">',
        '<link rel="icon" type="image/png" sizes="32x32" href="images/brand/favicon-32x32.png">',
        '<link rel="apple-touch-icon" sizes="180x180" href="images/brand/apple-touch-icon.png">',
        '<link rel="manifest" href="site.webmanifest">',
        '<meta name="theme-color" content="#0f172a">']
    if name in PUBLIC:
        url = BASE if name == "index.html" else BASE + name
        lines += [f'<link rel="canonical" href="{url}">',
            f'<meta property="og:site_name" content="{SITE}">', '<meta property="og:locale" content="en_NG">',
            '<meta property="og:type" content="website">', f'<meta property="og:title" content="{e(title)}">',
            f'<meta property="og:description" content="{e(desc)}">', f'<meta property="og:url" content="{url}">',
            f'<meta property="og:image" content="{OG_IMAGE}">', '<meta property="og:image:width" content="1200">',
            '<meta property="og:image:height" content="630">', f'<meta property="og:image:alt" content="{SITE}: tech and workspace gear in naira">',
            '<meta name="twitter:card" content="summary_large_image">', f'<meta name="twitter:title" content="{e(title)}">',
            f'<meta name="twitter:description" content="{e(desc)}">', f'<meta name="twitter:image" content="{OG_IMAGE}">']
        if name == "index.html":
            data = [{"@context": "https://schema.org", "@type": "Organization", "name": SITE, "url": BASE, "logo": BASE + "images/brand/icon-512.png"},
                    {"@context": "https://schema.org", "@type": "WebSite", "name": SITE, "url": BASE,
                     "potentialAction": {"@type": "SearchAction", "target": BASE + "shop.html?q={search_term_string}", "query-input": "required name=search_term_string"}}]
        else:
            data = [{"@context": "https://schema.org", "@type": "WebPage", "name": title, "description": desc, "url": BASE + name,
                     "isPartOf": {"@type": "WebSite", "name": SITE, "url": BASE}}]
        for d in data:
            lines.append('<script type="application/ld+json">' + json.dumps(d, ensure_ascii=False).replace("</", "<\\/") + "</script>")
    lines.append(END)
    return "\n".join(lines)

for path in sorted(glob.glob("*.html")):
    src = open(path, encoding="utf-8").read()
    src = re.sub(re.escape(START) + r".*?" + re.escape(END) + r"\n?", "", src, flags=re.S)   # remove an earlier run
    src = re.sub(r'<link rel="icon" href="data:image/svg\+xml[^>]*>\n?', "", src)            # remove the old inline favicon
    title, desc = meta_of(src)
    if "</head>" not in src:
        print("skipped (no </head>):", path); continue
    src = src.replace("</head>", block(path, title, desc) + "\n</head>", 1)
    open(path, "w", encoding="utf-8").write(src)
    print("updated", path, "(full social tags)" if path in PUBLIC else "(icons and theme colour)")
