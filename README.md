# AI-Native Software Engineering Whitepaper

This repository contains the whitepaper "The Era of AI-Native Software Engineering" along with build tooling to generate styled PDFs from Markdown.

## Prerequisites

- [Pandoc](https://pandoc.org/installing.html) (document converter)
- [XeLaTeX](https://www.latex-project.org/get/) (PDF engine, typically via TeX Live or MacTeX)
- [Node.js](https://nodejs.org/) with `mmdc` (Mermaid CLI) for diagram rendering
- Optional: `latexmk` for multi-pass compilation (resolves cross-references automatically)

```bash
# macOS (Homebrew)
brew install pandoc mactex-no-gui node
npm install -g @mermaid-js/mermaid-cli
```

## Project Structure

```
├── whitepaper.md          # Main Markdown source (single source of truth)
├── references.bib         # BibTeX bibliography for citations
├── makefile               # Build automation
├── templates/             # LaTeX templates for PDF styling
│   ├── clean-serif.tex
│   ├── modern-sans.tex
│   ├── notebook.tex
│   ├── press-release.tex
│   └── tech-report.tex
├── assets/figures/        # Images referenced in the document
└── build/                 # Generated PDFs
```

## Quick Start

```bash
# Build PDF with default Pandoc template
make pdf-default

# Build PDF with a specific template
make pdf-clean-serif
make pdf-modern-sans
make pdf-notebook
make pdf-press-release
make pdf-tech-report

# Build all templates at once
make test-all-templates

# List available templates
make list-templates
```

## Working with References (BibTeX)

Citations use BibTeX format via Pandoc's `citeproc`. Add entries to `references.bib`:

```bibtex
@online{my-source,
  title   = {Article Title},
  author  = {Author Name},
  year    = {2025},
  url     = {https://example.com},
  urldate = {2025-11-30}
}
```

Reference in Markdown with `[@my-source]`. For multiple citations: `[@source1; @source2]`.

### Why `make md` is Required

The raw `whitepaper.md` contains BibTeX citation keys (e.g., `[@faros-dora-2025]`) that Markdown viewers cannot render natively. Running:

```bash
make md
```

Processes the file through Pandoc's `citeproc`, which:
1. Replaces citation keys with formatted inline citations
2. Generates the full References section from `references.bib`
3. Overwrites `whitepaper.md` with the rendered output

**Run `make md` after any changes to citations or `references.bib`** to keep the Markdown viewer display in sync.

## Table of Contents

The Table of Contents is generated automatically by Pandoc during PDF builds via the `--toc` flag. You do not need to maintain a manual TOC in the Markdown file—Pandoc creates it from your `##` and `###` headings.

## Adding Images

Place images in `assets/figures/` and reference them in Markdown:

```markdown
![Caption text](assets/figures/my-image.png){ width=70% }
```

To center an image:

```markdown
<div align="center">

![Caption text](assets/figures/my-image.png){ width=70% }

</div>
```

## Adding Diagrams (Mermaid)

Mermaid diagrams are rendered automatically during PDF builds. Use fenced code blocks:

````markdown
```mermaid
flowchart LR
    A[Start] --> B[Process] --> C[End]
```
````

Wrap in `<div align="center">` for centering.

## Makefile Targets Reference

| Target | Description |
|--------|-------------|
| `make pdf-default` | Build PDF with Pandoc's default template |
| `make pdf-clean-serif` | Build with clean-serif.tex template |
| `make pdf-modern-sans` | Build with modern-sans.tex template |
| `make pdf-notebook` | Build with notebook.tex template |
| `make pdf-press-release` | Build with press-release.tex template |
| `make pdf-tech-report` | Build with tech-report.tex template |
| `make test-all-templates` | Build PDFs for all templates in `templates/` |
| `make md` | Render citations for Markdown viewer |
| `make list-templates` | Show available LaTeX templates |

## Typical Workflow

1. Edit `whitepaper.md` (add content, citations, images, diagrams)
2. If you changed citations → run `make md`
3. Build PDFs → run `make pdf-clean-serif` (or your preferred template)
4. Review output in `build/` directory

---

**© 2025 Talent Pool AI Consultancy. All rights reserved.**
