.DEFAULT_GOAL := help

help:
	@echo "Anime-CLI Build System"
	@echo ""
	@echo "Available targets:"
	@echo "  make lite          Build standalone anime-lite (C Edition) binary"
	@echo "  make install-lite  Build and install anime-lite to $(HOME)/.local/bin"
	@echo "  make test-lite     Execute anime-lite test suites"
	@echo "  make clean-lite    Clean anime-lite build artifacts"
	@echo ""

lite:
	$(MAKE) -C lite

install-lite: lite
	install -d $(HOME)/.local/bin
	install -m 755 lite/bin/anime-lite $(HOME)/.local/bin/anime-lite
	@echo "✓ Installed anime-lite to $(HOME)/.local/bin/anime-lite"

test-lite:
	@if [ -f lite/Makefile ]; then \
		if $(MAKE) -C lite -q test 2>/dev/null || grep -q "^test:" lite/Makefile; then \
			$(MAKE) -C lite test; \
		elif $(MAKE) -C lite -q test_all 2>/dev/null || grep -q "^test_all:" lite/Makefile; then \
			$(MAKE) -C lite test_all; \
		else \
			$(MAKE) -C lite test_cjson test_http test_api test_ui test_player; \
		fi \
	fi

clean-lite:
	$(MAKE) -C lite clean

.PHONY: help lite install-lite test-lite clean-lite
