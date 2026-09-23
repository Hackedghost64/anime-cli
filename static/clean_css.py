import cssutils
import logging
cssutils.log.setLevel(logging.CRITICAL)

with open('/home/divyam/Downloads/projects/anime-cli/static/style.css', 'r') as f:
    css = f.read()

sheet = cssutils.parseString(css)

classes_to_remove = set([
    'player-overlay', 'overlay-top', 'overlay-bottom', 'overlay-center',
    'touch-seek-btn', 'touch-play-btn',
    'scrubber-container', 'scrubber-track', 'scrubber-fill', 'scrubber-buffer', 'scrubber-thumb',
    'time-tooltip',
    'controls-row', 'controls-left', 'controls-right',
    'ctrl-btn', 'ctrl-select',
    'auto-skip-toggle',
    'play-pulse',
    'rebuffering-badge',
    'tap-ripple',
    'time-display',
    'desktop-only', 'mobile-only',
    'sheet-card', 'sheet-pill', 'setting-group', 'setting-label', 'setting-row', 'switch', 'slider',
    'sheet-drag-handle', 'sheet-body', 'sheet-pill-group'
])

def should_remove_rule(rule):
    if not hasattr(rule, 'selectorList'):
        return False
    selector_text = rule.selectorText
    for cls in classes_to_remove:
        if '.' + cls in selector_text:
            return True
    if 'bottom-sheet' in selector_text or 'slideSheetUp' in selector_text:
        return True
    if rule.selectorText == '.video-wrapper video':
        return True
    return False

def process_rules(rule_list):
    to_remove = []
    for rule in rule_list:
        if hasattr(rule, 'type'):
            if hasattr(rule, 'STYLE_RULE') and rule.type == rule.STYLE_RULE:
                if should_remove_rule(rule):
                    to_remove.append(rule)
                elif rule.selectorText == '.video-wrapper':
                    rule.style.cssText = 'position: relative;\nwidth: 100%;'
            elif hasattr(rule, 'MEDIA_RULE') and rule.type == rule.MEDIA_RULE:
                process_rules(rule.cssRules)
            elif hasattr(rule, 'KEYFRAMES_RULE') and rule.type == rule.KEYFRAMES_RULE:
                if 'slideSheetUp' in rule.name:
                    to_remove.append(rule)
    
    for rule in to_remove:
        rule_list.remove(rule)

process_rules(sheet.cssRules)

with open('/home/divyam/Downloads/projects/anime-cli/static/style.css', 'wb') as f:
    f.write(sheet.cssText)

