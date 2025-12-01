# PDF Generation Prerequisites for Ubuntu

This document explains how to install all required tools for generating PDFs from Markdown files with Mermaid diagram support.

## Required Tools

| Tool | Purpose | Install Command |
|------|---------|----------------|
| **Pandoc** | Document converter | `sudo apt install pandoc` |
| **TeX Live** | XeLaTeX + latexmk for PDF generation | `sudo apt install texlive-xetex texlive-latex-extra texlive-fonts-recommended latexmk` |
| **Mermaid CLI** | Diagram rendering | `sudo npm install -g @mermaid-js/mermaid-cli` |
| **pandoc-mermaid-filter** | Pandoc filter for Mermaid | `pip3 install --user --break-system-packages pandoc-mermaid-filter` |

## Installation Instructions

### Step 1: Install System Packages

```bash
# Update package list
sudo apt update

# Install Pandoc
sudo apt install pandoc

# Install TeX Live (XeLaTeX + latexmk)
sudo apt install texlive-xetex texlive-latex-extra texlive-fonts-recommended latexmk
```

### Step 2: Install Mermaid CLI

**Option A: Using npm (Global Installation)**
```bash
sudo npm install -g @mermaid-js/mermaid-cli
```

**Option B: Using npm (User Installation - Recommended)**
```bash
npm install -g @mermaid-js/mermaid-cli
```

**Note**: If you don't have npm installed:
```bash
sudo apt install npm
```

### Step 3: Install pandoc-mermaid-filter

```bash
# Install using pip3 (user installation)
pip3 install --user --break-system-packages pandoc-mermaid-filter
```

**Note**: The `--user` flag installs to `~/.local/bin/`, which may not be in your PATH.

### Step 4: Configure PATH (If Needed)

If `~/.local/bin` is not in your PATH, add it to your shell configuration:

**For Bash:**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

**For Zsh:**
```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

**Verify PATH is set:**
```bash
echo $PATH | grep -q "$HOME/.local/bin" && echo "✓ PATH configured" || echo "✗ PATH not configured"
```

## Verification

### Quick Verification

Run the verification script to check all prerequisites:

```bash
cd public/
./verify-prerequisites.sh
```

**Expected Output:**
```
==========================================
PDF Generation Prerequisites Check
==========================================

✓ Pandoc: /usr/bin/pandoc (pandoc 3.1.3)
✓ XeLaTeX: /usr/bin/xelatex (XeTeX 3.141592653-2.6-0.999995)
✓ latexmk: /usr/bin/latexmk (Latexmk, John Collins...)
✓ Mermaid CLI (mmdc): /usr/bin/mmdc (11.12.0)
✓ pandoc-mermaid-filter (as pandoc-mermaid): /home/george/.local/bin/pandoc-mermaid

Testing pandoc-mermaid-filter...
✓ pandoc-mermaid-filter is executable and valid

==========================================
✓ All prerequisites verified successfully!
```

### Manual Verification

You can also verify each tool individually:

```bash
# Check Pandoc
pandoc --version

# Check XeLaTeX
xelatex --version

# Check latexmk
latexmk --version

# Check Mermaid CLI
mmdc --version

# Check pandoc-mermaid-filter
which pandoc-mermaid-filter || which pandoc-mermaid
```

## Common Issues and Solutions

### Issue 1: "pandoc-mermaid-filter not found"

**Symptoms:**
```
ERROR: pandoc-mermaid-filter not found!
option `--filter' requires an argument PROGRAM
```

**Solution:**
1. Verify installation:
   ```bash
   ls -la ~/.local/bin/pandoc-mermaid*
   ```

2. If not found, reinstall:
   ```bash
   pip3 install --user --break-system-packages pandoc-mermaid-filter
   ```

3. If installed but not found, add to PATH (see Step 4 above)

4. The Makefile will also check `~/.local/bin` directly, so it should work even if not in PATH

### Issue 2: "mmdc: command not found"

**Symptoms:**
```
Using Mermaid binary: mmdc
mmdc: command not found
```

**Solution:**
```bash
# Install Mermaid CLI
sudo npm install -g @mermaid-js/mermaid-cli

# Or if npm is not installed:
sudo apt install npm
sudo npm install -g @mermaid-js/mermaid-cli

# Verify installation
which mmdc
mmdc --version
```

### Issue 3: "xelatex: command not found"

**Symptoms:**
```
Error producing PDF
xelatex: command not found
```

**Solution:**
```bash
# Install TeX Live with XeLaTeX
sudo apt install texlive-xetex texlive-latex-extra texlive-fonts-recommended

# Verify installation
which xelatex
xelatex --version
```

### Issue 4: "pandoc-mermaid-filter found but not executable"

**Symptoms:**
```
✗ pandoc-mermaid-filter found but not executable
```

**Solution:**
```bash
# Make executable
chmod +x ~/.local/bin/pandoc-mermaid

# Verify
ls -la ~/.local/bin/pandoc-mermaid
```

### Issue 5: Python Module Not Found

**Symptoms:**
```
ModuleNotFoundError: No module named 'pandoc_mermaid_filter'
```

**Solution:**
```bash
# Reinstall the filter
pip3 install --user --break-system-packages pandoc-mermaid-filter

# Verify Python can import it
python3 -c "import pandoc_mermaid_filter; print('OK')"
```

## Testing the Installation

After installing all prerequisites, test PDF generation:

```bash
cd public/
make pdf
```

**Expected Output:**
```
mkdir -p build
Generating PDF with Mermaid support...
Using Mermaid binary: /usr/bin/mmdc
Using Mermaid filter: /home/george/.local/bin/pandoc-mermaid
Using default Pandoc template
...
[PDF generation completes successfully]
```

**Verify PDF was created:**
```bash
ls -lh build/*.pdf
```

## Installation Summary

**Complete Installation Command (Copy-Paste):**

```bash
# Update package list
sudo apt update

# Install system packages
sudo apt install pandoc texlive-xetex texlive-latex-extra texlive-fonts-recommended latexmk

# Install npm if not already installed
sudo apt install npm

# Install Mermaid CLI (global)
sudo npm install -g @mermaid-js/mermaid-cli

# Install pandoc-mermaid-filter (user)
pip3 install --user --break-system-packages pandoc-mermaid-filter

# Add ~/.local/bin to PATH (if not already)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
cd public/
./verify-prerequisites.sh
```

## Version Requirements

**Minimum Versions (Tested):**
- Pandoc: 3.1.3+
- XeLaTeX: 3.141592653-2.6+ (TeX Live 2023)
- latexmk: 4.83+
- Mermaid CLI: 11.12.0+
- pandoc-mermaid-filter: Latest from PyPI

**Note**: These are the versions tested. Older versions may work but are not guaranteed.

## Additional Resources

- **Pandoc Documentation**: https://pandoc.org/
- **Mermaid Documentation**: https://mermaid.js.org/
- **TeX Live Documentation**: https://www.tug.org/texlive/
- **pandoc-mermaid-filter**: https://pypi.org/project/pandoc-mermaid-filter/

## Troubleshooting

If you encounter issues not covered above:

1. **Run the verification script:**
   ```bash
   ./verify-prerequisites.sh
   ```

2. **Check Makefile output:**
   ```bash
   make pdf 2>&1 | tee make-output.log
   ```

3. **Verify all tools are in PATH:**
   ```bash
   which pandoc xelatex latexmk mmdc pandoc-mermaid
   ```

4. **Check file permissions:**
   ```bash
   ls -la ~/.local/bin/pandoc-mermaid*
   ```

5. **Test individual components:**
   ```bash
   # Test Pandoc
   echo "# Test" | pandoc -t pdf -o test.pdf
   
   # Test Mermaid
   echo "graph TD; A-->B" | mmdc -i - -o test.png
   ```

For additional help, check the Makefile comments or run `make help` (if available).

