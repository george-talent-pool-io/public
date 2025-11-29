build:
	mkdir -p build

# Find pandoc-mermaid-filter and mmdc
MERMAID_FILTER := $(shell which pandoc-mermaid-filter 2>/dev/null || find ~/Library/Python -name "pandoc-mermaid" -type f 2>/dev/null | head -1 || echo "pandoc-mermaid-filter")
MERMAID_BIN := $(shell which mmdc 2>/dev/null || which mermaid 2>/dev/null || echo "mmdc")

# Prefer latexmk for multi-pass compilation if available
LATEXMK := $(shell which latexmk 2>/dev/null)
PDF_ENGINE := $(if $(LATEXMK),latexmk,xelatex)
PDF_ENGINE_OPTS := $(if $(LATEXMK),--pdf-engine-opt=-xelatex --pdf-engine-opt=-quiet,)

# Source files
SOURCE_MD ?= whitepaper.source.md
VIEW_MD ?= whitepaper.md

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
		MERMAID_BIN=$(MERMAID_BIN) pandoc $(SOURCE_MD) \
		  -o $(OUTPUT) \
		  --template=templates/$(TEMPLATE) \
		  --toc \
		  --number-sections \
		  --citeproc \
		  --pdf-engine=$(PDF_ENGINE) \
		  $(PDF_ENGINE_OPTS) \
		  --filter $(MERMAID_FILTER); \
	else \
		echo "Using default Pandoc template"; \
		MERMAID_BIN=$(MERMAID_BIN) pandoc $(SOURCE_MD) \
		  -o $(OUTPUT) \
		  --toc \
		  --number-sections \
		  --citeproc \
		  --pdf-engine=$(PDF_ENGINE) \
		  $(PDF_ENGINE_OPTS) \
		  --filter $(MERMAID_FILTER); \
	fi

# Local templates directory and discovery
TEMPLATES_DIR := templates
LOCAL_TEMPLATES := $(notdir $(wildcard $(TEMPLATES_DIR)/*.tex))

# No-op download target retained for compatibility
download-templates:
	@echo "All templates are stored locally in $(TEMPLATES_DIR)/"
	@echo "Add new .tex files there to include them in the tooling."

# Convenience targets for different templates
pdf-clean-serif:
	$(MAKE) pdf TEMPLATE=clean-serif.tex OUTPUT=build/$(OUTPUT_BASENAME).clean-serif.pdf

pdf-modern-sans:
	$(MAKE) pdf TEMPLATE=modern-sans.tex OUTPUT=build/$(OUTPUT_BASENAME).modern-sans.pdf

pdf-notebook:
	$(MAKE) pdf TEMPLATE=notebook.tex OUTPUT=build/$(OUTPUT_BASENAME).notebook.pdf

pdf-press-release:
	$(MAKE) pdf TEMPLATE=press-release.tex OUTPUT=build/$(OUTPUT_BASENAME).press-release.pdf

pdf-tech-report:
	$(MAKE) pdf TEMPLATE=tech-report.tex OUTPUT=build/$(OUTPUT_BASENAME).tech-report.pdf

pdf-default:
	$(MAKE) pdf TEMPLATE=

md:
	@echo "Rendering $(VIEW_MD) for Markdown viewers..."
	@pandoc $(SOURCE_MD) \
	  --citeproc \
	  -t gfm \
	  --wrap=none \
	  -o $(VIEW_MD)

# Test all templates (iterate over every .tex in templates/)
test-all-templates: download-templates
	@echo "Testing all templates..."
	@if [ -z "$(LOCAL_TEMPLATES)" ]; then \
		echo "No templates found in $(TEMPLATES_DIR)/"; \
	else \
		for template in $(LOCAL_TEMPLATES); do \
			name=$${template%.tex}; \
			output=build/$(OUTPUT_BASENAME).$$name.pdf; \
			echo "Testing $$template -> $$output"; \
			$(MAKE) pdf TEMPLATE=$$template OUTPUT=$$output || echo "Failed to generate PDF with $$template"; \
		done; \
	fi
	@echo "Template testing complete. Check build/ directory for PDFs."

# List available templates
list-templates:
	@echo "Available templates:"
	@ls -1 $(TEMPLATES_DIR)/*.tex 2>/dev/null | xargs -n1 basename || echo "No templates found in $(TEMPLATES_DIR)/ directory"

.PHONY: pdf pdf-eisvogel pdf-academic pdf-thesis pdf-modern-cv pdf-letter pdf-default pdf-clean-serif pdf-modern-sans pdf-notebook md list-templates build download-templates download-eisvogel download-academic download-thesis download-modern-cv download-letter test-all-templates
