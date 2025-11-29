# PDF Template Guide for Whitepaper

## Current Template Location

**Current Status:** Pandoc is using its **default embedded LaTeX template** (no custom template file).

The default template is built into Pandoc and can be viewed with:
```bash
pandoc --print-default-template=latex
```

## Template Options

### Option 1: Use Pandoc's Default Template (Current)
**Location:** Built into Pandoc (no file)
**Pros:** Simple, works out of the box
**Cons:** Basic styling, limited customization

**Current setup:** Your YAML controls the output:
```yaml
documentclass: article
classoption: [11pt, a4paper]
geometry: [margin=2.5cm, top=3cm, bottom=2.5cm]
```

---

### Option 2: Use a Custom Template File
**Location:** `~/.local/share/pandoc/templates/` or project directory

**Steps:**
1. Export default template:
   ```bash
   pandoc --print-default-template=latex > custom-template.tex
   ```

2. Customize `custom-template.tex` with:
   - Custom fonts
   - Brand colors
   - Headers/footers
   - Professional styling

3. Use in Makefile:
   ```makefile
   --template=custom-template.tex
   ```

---

### Option 3: Use Official Journal Templates

#### ACM Template (acmart)
```yaml
documentclass: acmart
classoption: [sigconf, anonymous, review]
```

#### IEEE Template (IEEEtran)
```yaml
documentclass: IEEEtran
classoption: [conference]
```

#### Springer Template (svjour3)
```yaml
documentclass: svjour3
```

**Note:** These require installing the LaTeX packages first.

---

### Option 4: Use Pre-made Academic Templates

Popular options:
- **Eisvogel** - Beautiful academic template
- **Academic Pandoc Template** - Clean, professional
- **Pandoc LaTeX Template Collection** - Multiple styles

Installation:
```bash
# Eisvogel example
mkdir -p ~/.local/share/pandoc/templates
wget https://github.com/Wandmalfarbe/pandoc-latex-template/releases/download/v2.0.0/eisvogel.tex
mv eisvogel.tex ~/.local/share/pandoc/templates/
```

Then use: `--template=eisvogel`

---

## Recommended: Create Custom Template

I can create a custom template for you that:
- Matches your brand (cyan colors)
- Professional typography
- Proper headers/footers
- Optimized for whitepapers
- Works with Mermaid diagrams

Would you like me to create a custom template?

