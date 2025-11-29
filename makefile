build:
	mkdir -p build

# Find pandoc-mermaid-filter and mmdc
MERMAID_FILTER := $(shell which pandoc-mermaid-filter 2>/dev/null || find ~/Library/Python -name "pandoc-mermaid" -type f 2>/dev/null | head -1 || echo "pandoc-mermaid-filter")
MERMAID_BIN := $(shell which mmdc 2>/dev/null || which mermaid 2>/dev/null || echo "mmdc")

# Template selection (default: none, uses Pandoc default)
TEMPLATE ?= 

pdf: build
	@echo "Generating PDF with Mermaid support..."
	@echo "Using Mermaid binary: $(MERMAID_BIN)"
	@if [ -n "$(TEMPLATE)" ]; then \
		echo "Using template: $(TEMPLATE)"; \
		MERMAID_BIN=$(MERMAID_BIN) pandoc whitepaper.md \
		  -o build/ai-native-software-engineering.pdf \
		  --template=templates/$(TEMPLATE) \
		  --toc \
		  --number-sections \
		  --pdf-engine=xelatex \
		  --filter $(MERMAID_FILTER); \
	else \
		echo "Using default Pandoc template"; \
		MERMAID_BIN=$(MERMAID_BIN) pandoc whitepaper.md \
		  -o build/ai-native-software-engineering.pdf \
		  --toc \
		  --number-sections \
		  --pdf-engine=xelatex \
		  --filter $(MERMAID_FILTER); \
	fi

# Convenience targets for different templates
pdf-eisvogel:
	$(MAKE) pdf TEMPLATE=eisvogel.tex

pdf-default:
	$(MAKE) pdf TEMPLATE=

# List available templates
list-templates:
	@echo "Available templates:"
	@ls -1 templates/*.tex 2>/dev/null | xargs -n1 basename || echo "No templates found in templates/ directory"

.PHONY: pdf pdf-eisvogel pdf-default list-templates build
