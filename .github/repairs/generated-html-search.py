"""Guarded follow-up for the H1 file-heading regression exposed by browser tests."""
from pathlib import Path


def repair_search(text):
    replacements = [
        ("document.querySelectorAll('.main h2, .main h3, .main h4, .main p')",
         "document.querySelectorAll('.main h1, .main h2, .main h3, .main h4, .main h5, .main h6, .main p')"),
        ("if (tag === 'H2') currentH2 = text;",
         "if (tag === 'H1' || tag === 'H2') currentH2 = text;"),
        ("document.querySelectorAll('.main h2, .main h3, .main h4, .main h5, .main h6')",
         "document.querySelectorAll('.main h1, .main h2, .main h3, .main h4, .main h5, .main h6')"),
    ]
    for old, new in replacements:
        if text.count(old) != 1:
            raise RuntimeError(f"Expected one unchanged search/tracking anchor: {old}")
        text = text.replace(old, new, 1)
    return text


if __name__ == '__main__':
    source = Path('src/services/htmlTemplate.ts')
    source.write_text(repair_search(source.read_text()))
    print('Included H1 file headings in search and active navigation; browser acceptance remains authoritative.')
