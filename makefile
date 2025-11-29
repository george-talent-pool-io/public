build:
	mkdir -p build

# Find pandoc-mermaid-filter and mmdc
MERMAID_FILTER := $(shell which pandoc-mermaid-filter 2>/dev/null || find ~/Library/Python -name "pandoc-mermaid" -type f 2>/dev/null | head -1 || echo "pandoc-mermaid-filter")
MERMAID_BIN := $(shell which mmdc 2>/dev/null || which mermaid 2>/dev/null || echo "mmdc")

# Template selection (default: none, uses Pandoc default)
TEMPLATE ?= 

# Output selection (default path)
OUTPUT_BASENAME ?= ai-native-software-engineering
OUTPUT ?= build/$(OUTPUT_BASENAME).pdf

pdf: build
	@echo "Generating PDF with Mermaid support..."
	@echo "Using Mermaid binary: $(MERMAID_BIN)"
	@if [ -n "$(TEMPLATE)" ]; then \
		echo "Using template: $(TEMPLATE)"; \
		MERMAID_BIN=$(MERMAID_BIN) pandoc whitepaper.md \
		  -o $(OUTPUT) \
		  --template=templates/$(TEMPLATE) \
		  --toc \
		  --number-sections \
		  --pdf-engine=xelatex \
		  --filter $(MERMAID_FILTER); \
	else \
		echo "Using default Pandoc template"; \
		MERMAID_BIN=$(MERMAID_BIN) pandoc whitepaper.md \
		  -o $(OUTPUT) \
		  --toc \
		  --number-sections \
		  --pdf-engine=xelatex \
		  --filter $(MERMAID_FILTER); \
	fi

# Template download URLs
TEMPLATES_DIR := templates
EISVOGEL_URL := https://raw.githubusercontent.com/Wandmalfarbe/pandoc-latex-template/v2.0.0/eisvogel.tex
# Note: Other template URLs may need to be updated if repositories change
ACADEMIC_URL := https://raw.githubusercontent.com/tompollard/pandoc_academic_writing_template/master/templates/academic-pandoc.tex
THESIS_URL := https://raw.githubusercontent.com/tompollard/pandoc_thesis_template/master/templates/thesis.tex
MODERN_CV_URL := https://raw.githubusercontent.com/elipapa/markdown-cv/master/templates/cv.tex
LETTER_URL := https://raw.githubusercontent.com/aaronwolen/pandoc-letter-template/master/template.tex

# Download templates (continues even if some fail)
download-templates:
	@echo "Downloading all available templates..."
	@$(MAKE) download-eisvogel || true
	@$(MAKE) download-academic || true
	@$(MAKE) download-thesis || true
	@$(MAKE) download-modern-cv || true
	@$(MAKE) download-letter || true
	@echo ""
	@echo "Template download complete. Use 'make list-templates' to see what's available."

download-eisvogel:
	@echo "Downloading Eisvogel template..."
	@mkdir -p $(TEMPLATES_DIR)
	@if curl -L -f -o $(TEMPLATES_DIR)/eisvogel.tex $(EISVOGEL_URL) 2>/dev/null && [ -s $(TEMPLATES_DIR)/eisvogel.tex ] && ! grep -q "404: Not Found" $(TEMPLATES_DIR)/eisvogel.tex; then \
		echo "✓ Eisvogel template downloaded successfully"; \
	else \
		echo "✗ Failed to download Eisvogel template"; \
		rm -f $(TEMPLATES_DIR)/eisvogel.tex; \
		exit 1; \
	fi

download-academic:
	@echo "Downloading Academic Pandoc template..."
	@mkdir -p $(TEMPLATES_DIR)
	@if curl -L -f -o $(TEMPLATES_DIR)/academic-pandoc.tex $(ACADEMIC_URL) 2>/dev/null && [ -s $(TEMPLATES_DIR)/academic-pandoc.tex ] && ! grep -q "404: Not Found" $(TEMPLATES_DIR)/academic-pandoc.tex; then \
		echo "✓ Academic template downloaded successfully"; \
	else \
		echo "✗ Failed to download Academic template (URL may be outdated)"; \
		rm -f $(TEMPLATES_DIR)/academic-pandoc.tex; \
	fi

download-thesis:
	@echo "Downloading Thesis template..."
	@mkdir -p $(TEMPLATES_DIR)
	@if curl -L -f -o $(TEMPLATES_DIR)/thesis.tex $(THESIS_URL) 2>/dev/null && [ -s $(TEMPLATES_DIR)/thesis.tex ] && ! grep -q "404: Not Found" $(TEMPLATES_DIR)/thesis.tex; then \
		echo "✓ Thesis template downloaded successfully"; \
	else \
		echo "✗ Failed to download Thesis template (URL may be outdated)"; \
		rm -f $(TEMPLATES_DIR)/thesis.tex; \
	fi

download-modern-cv:
	@echo "Downloading Modern CV template..."
	@mkdir -p $(TEMPLATES_DIR)
	@if curl -L -f -o $(TEMPLATES_DIR)/modern-cv.tex $(MODERN_CV_URL) 2>/dev/null && [ -s $(TEMPLATES_DIR)/modern-cv.tex ] && ! grep -q "404: Not Found" $(TEMPLATES_DIR)/modern-cv.tex; then \
		echo "✓ Modern CV template downloaded successfully"; \
	else \
		echo "✗ Failed to download Modern CV template (URL may be outdated)"; \
		rm -f $(TEMPLATES_DIR)/modern-cv.tex; \
	fi

download-letter:
	@echo "Downloading Letter template..."
	@mkdir -p $(TEMPLATES_DIR)
	@if curl -L -f -o $(TEMPLATES_DIR)/letter.tex $(LETTER_URL) 2>/dev/null && [ -s $(TEMPLATES_DIR)/letter.tex ] && ! grep -q "404: Not Found" $(TEMPLATES_DIR)/letter.tex; then \
		echo "✓ Letter template downloaded successfully"; \
	else \
		echo "✗ Failed to download Letter template (URL may be outdated)"; \
		rm -f $(TEMPLATES_DIR)/letter.tex; \
	fi

# Convenience targets for different templates
pdf-eisvogel:
	$(MAKE) pdf TEMPLATE=eisvogel.tex OUTPUT=build/$(OUTPUT_BASENAME).eisvogel.pdf

pdf-academic:
	$(MAKE) pdf TEMPLATE=academic-pandoc.tex OUTPUT=build/$(OUTPUT_BASENAME).academic.pdf

pdf-thesis:
	$(MAKE) pdf TEMPLATE=thesis.tex OUTPUT=build/$(OUTPUT_BASENAME).thesis.pdf

pdf-modern-cv:
	$(MAKE) pdf TEMPLATE=modern-cv.tex OUTPUT=build/$(OUTPUT_BASENAME).modern-cv.pdf

pdf-letter:
	$(MAKE) pdf TEMPLATE=letter.tex OUTPUT=build/$(OUTPUT_BASENAME).letter.pdf

pdf-clean-serif:
	$(MAKE) pdf TEMPLATE=clean-serif.tex OUTPUT=build/$(OUTPUT_BASENAME).clean-serif.pdf

pdf-modern-sans:
	$(MAKE) pdf TEMPLATE=modern-sans.tex OUTPUT=build/$(OUTPUT_BASENAME).modern-sans.pdf

pdf-notebook:
	$(MAKE) pdf TEMPLATE=notebook.tex OUTPUT=build/$(OUTPUT_BASENAME).notebook.pdf

pdf-default:
	$(MAKE) pdf TEMPLATE=

# Test all templates (download remote ones first, then generate PDFs)
test-all-templates: download-templates
	@echo "Testing all templates..."
	@for template in clean-serif.tex modern-sans.tex notebook.tex eisvogel.tex academic-pandoc.tex thesis.tex modern-cv.tex letter.tex; do \
		if [ -f $(TEMPLATES_DIR)/$$template ]; then \
			name=$${template%.tex}; \
			output=build/$(OUTPUT_BASENAME).$$name.pdf; \
			echo "Testing $$template -> $$output"; \
			$(MAKE) pdf TEMPLATE=$$(basename $$template) OUTPUT=$$output || echo "Failed to generate PDF with $$template"; \
		else \
			echo "Skipping $$template (not found)"; \
		fi; \
	done
	@echo "Template testing complete. Check build/ directory for PDFs."

# List available templates
list-templates:
	@echo "Available templates:"
	@ls -1 $(TEMPLATES_DIR)/*.tex 2>/dev/null | xargs -n1 basename || echo "No templates found in $(TEMPLATES_DIR)/ directory"

.PHONY: pdf pdf-eisvogel pdf-academic pdf-thesis pdf-modern-cv pdf-letter pdf-default pdf-clean-serif pdf-modern-sans pdf-notebook list-templates build download-templates download-eisvogel download-academic download-thesis download-modern-cv download-letter test-all-templates
