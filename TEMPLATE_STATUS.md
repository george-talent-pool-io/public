# Template Testing Status

## ✅ Working Templates

### Default Pandoc Template
**Command:** `make pdf` or `make pdf-default`
**Output:** `build/ai-native-software-engineering.pdf`
**Status:** ✅ Fully working
**Features:**
- Clean, professional output
- Table of contents
- Numbered sections
- Mermaid diagrams render correctly
- Proper margins and spacing

## ⚠️ Templates Needing Fixes

### Eisvogel Template
**Command:** `make pdf-eisvogel`
**Status:** ⚠️ Has LaTeX errors (table counter issue)
**Issue:** Template has compatibility issues with certain table formats
**Next Steps:** May need to update Eisvogel version or adjust table formatting

## Current Template Location

**Default Template:**
- Location: Built into Pandoc
- Exported copy: `default-pandoc-template.tex` (for reference)

**Custom Templates:**
- Location: `templates/` directory
- Current: `templates/eisvogel.tex`

## Recommendations

1. **For now:** Use default template (`make pdf`) - it's working perfectly
2. **To try Eisvogel:** May need to update to latest version or fix table issues
3. **Alternative:** I can create a custom template based on default with your brand styling

## Quick Commands

```bash
# Default (working)
make pdf

# List templates
make list-templates

# Try Eisvogel (currently has errors)
make pdf-eisvogel

# Custom template
make pdf TEMPLATE=your-template.tex
```

