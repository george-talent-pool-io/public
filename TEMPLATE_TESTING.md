# Template Testing Guide

## Available Templates

### 1. Default Pandoc Template (Current)
**Command:** `make pdf` or `make pdf-default`
**Status:** ✅ Working
**Features:** Basic, clean LaTeX output

### 2. Eisvogel Template
**Command:** `make pdf-eisvogel`
**Status:** ⚠️ Testing (may need adjustments)
**Features:** Beautiful academic template with title page, better typography

## How to Test Templates

1. **List available templates:**
   ```bash
   make list-templates
   ```

2. **Generate PDF with default template:**
   ```bash
   make pdf-default
   ```

3. **Generate PDF with Eisvogel:**
   ```bash
   make pdf-eisvogel
   ```

4. **Generate PDF with custom template:**
   ```bash
   make pdf TEMPLATE=your-template.tex
   ```

## Template Locations

- **Downloaded templates:** `templates/` directory
- **Default template:** Built into Pandoc (exported to `default-pandoc-template.tex`)

## Adding More Templates

1. Download template `.tex` file to `templates/` directory
2. Use: `make pdf TEMPLATE=template-name.tex`

## Popular Templates to Try

- **Eisvogel** - Already downloaded
- **Academic Pandoc Template** - Clean academic style
- **Pandoc Thesis Template** - For longer documents
- **Letter Template** - For formal letters

