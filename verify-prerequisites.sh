#!/bin/bash

# Verification script for PDF generation prerequisites
# Run this to check if all required tools are properly installed

echo "=========================================="
echo "PDF Generation Prerequisites Check"
echo "=========================================="
echo ""

ERRORS=0
WARNINGS=0

# Function to check if a command exists
check_command() {
    local cmd=$1
    local name=$2
    local required=${3:-true}
    
    if command -v "$cmd" >/dev/null 2>&1; then
        local version=$($cmd --version 2>/dev/null | head -1 || echo "installed")
        echo "✓ $name: $(command -v $cmd) ($version)"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo "✗ $name: NOT FOUND (REQUIRED)"
            ((ERRORS++))
            return 1
        else
            echo "⚠ $name: NOT FOUND (optional)"
            ((WARNINGS++))
            return 1
        fi
    fi
}

# Function to check if a file exists
check_file() {
    local file=$1
    local name=$2
    local required=${3:-true}
    
    if [ -f "$file" ]; then
        echo "✓ $name: $file"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo "✗ $name: NOT FOUND (REQUIRED)"
            ((ERRORS++))
            return 1
        else
            echo "⚠ $name: NOT FOUND (optional)"
            ((WARNINGS++))
            return 1
        fi
    fi
}

# Check Pandoc
check_command "pandoc" "Pandoc"

# Check TeX Live components
check_command "xelatex" "XeLaTeX"
check_command "latexmk" "latexmk" false

# Check Mermaid CLI
check_command "mmdc" "Mermaid CLI (mmdc)" || check_command "mermaid" "Mermaid CLI (mermaid)"

# Check pandoc-mermaid-filter
# It might be installed as 'pandoc-mermaid' or 'pandoc-mermaid-filter'
MERMAID_FILTER=""
if command -v pandoc-mermaid-filter >/dev/null 2>&1; then
    MERMAID_FILTER=$(command -v pandoc-mermaid-filter)
    echo "✓ pandoc-mermaid-filter: $MERMAID_FILTER"
elif command -v pandoc-mermaid >/dev/null 2>&1; then
    MERMAID_FILTER=$(command -v pandoc-mermaid)
    echo "✓ pandoc-mermaid-filter (as pandoc-mermaid): $MERMAID_FILTER"
else
    # Check common installation locations
    if [ -f "$HOME/.local/bin/pandoc-mermaid" ]; then
        MERMAID_FILTER="$HOME/.local/bin/pandoc-mermaid"
        echo "✓ pandoc-mermaid-filter (found at): $MERMAID_FILTER"
        echo "  ⚠ WARNING: Not in PATH. Add ~/.local/bin to your PATH or use full path in Makefile"
        ((WARNINGS++))
    elif [ -f "$HOME/.local/bin/pandoc-mermaid-filter" ]; then
        MERMAID_FILTER="$HOME/.local/bin/pandoc-mermaid-filter"
        echo "✓ pandoc-mermaid-filter (found at): $MERMAID_FILTER"
        echo "  ⚠ WARNING: Not in PATH. Add ~/.local/bin to your PATH or use full path in Makefile"
        ((WARNINGS++))
    else
        # Check Python user site-packages
        PYTHON_USER_BIN=$(python3 -m site --user-base 2>/dev/null)/bin
        if [ -f "$PYTHON_USER_BIN/pandoc-mermaid" ]; then
            MERMAID_FILTER="$PYTHON_USER_BIN/pandoc-mermaid"
            echo "✓ pandoc-mermaid-filter (found at): $MERMAID_FILTER"
            echo "  ⚠ WARNING: Not in PATH. Add $PYTHON_USER_BIN to your PATH"
            ((WARNINGS++))
        elif [ -f "$PYTHON_USER_BIN/pandoc-mermaid-filter" ]; then
            MERMAID_FILTER="$PYTHON_USER_BIN/pandoc-mermaid-filter"
            echo "✓ pandoc-mermaid-filter (found at): $MERMAID_FILTER"
            echo "  ⚠ WARNING: Not in PATH. Add $PYTHON_USER_BIN to your PATH"
            ((WARNINGS++))
        else
            echo "✗ pandoc-mermaid-filter: NOT FOUND (REQUIRED)"
            echo "  Install with: pip3 install --user --break-system-packages pandoc-mermaid-filter"
            ((ERRORS++))
        fi
    fi
fi

# Check if ~/.local/bin is in PATH
if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
    echo ""
    echo "⚠ WARNING: ~/.local/bin is not in your PATH"
    echo "  Add to ~/.bashrc or ~/.zshrc:"
    echo "    export PATH=\"\$HOME/.local/bin:\$PATH\""
    ((WARNINGS++))
fi

# Test pandoc-mermaid-filter if found
if [ -n "$MERMAID_FILTER" ]; then
    echo ""
    echo "Testing pandoc-mermaid-filter..."
    if [ -x "$MERMAID_FILTER" ]; then
        # Try to run it (it might not have --help/--version, but should be callable)
        if python3 -c "import sys; sys.path.insert(0, '$(dirname $MERMAID_FILTER)'); import pandoc_mermaid_filter" 2>/dev/null || \
           "$MERMAID_FILTER" --help >/dev/null 2>&1 || \
           "$MERMAID_FILTER" --version >/dev/null 2>&1 || \
           file "$MERMAID_FILTER" | grep -q "Python script"; then
            echo "✓ pandoc-mermaid-filter is executable and valid"
        else
            echo "⚠ pandoc-mermaid-filter found but may have issues (check manually)"
            ((WARNINGS++))
        fi
    else
        echo "✗ pandoc-mermaid-filter found but not executable (chmod +x $MERMAID_FILTER)"
        ((ERRORS++))
    fi
fi

echo ""
echo "=========================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✓ All prerequisites verified successfully!"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo "✓ All required prerequisites found ($WARNINGS warnings)"
    exit 0
else
    echo "✗ Found $ERRORS error(s) and $WARNINGS warning(s)"
    echo ""
    echo "Fix the errors above and run this script again."
    exit 1
fi

