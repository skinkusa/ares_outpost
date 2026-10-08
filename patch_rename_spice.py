import os

def replace_in_file(filepath, replacements):
    with open(filepath, 'r') as f:
        content = f.read()
    
    for old, new in replacements:
        content = content.replace(old, new)
        
    with open(filepath, 'w') as f:
        f.write(content)

replace_in_file('src/App.tsx', [
    ('spice melange', 'spice'),
    ('Spice Melange', 'Spice')
])

replace_in_file('src/utils/constants.ts', [
    ('Spice Melange Refinery', 'Spice Refinery'),
    ('High-Density Melange Refinement', 'High-Density Spice Refinement')
])

replace_in_file('src/components/HarvesterDetailsModal.tsx', [
    ('MINING RAW MELANGE', 'MINING RAW SPICE')
])

replace_in_file('src/components/TopBar.tsx', [
    ('SPICE MELANGE', 'SPICE'),
    ('Spice Melange', 'Spice'),
    ('MELANGE', 'SPICE')
])

replace_in_file('src/components/HarvesterManager.tsx', [
    ('spice melange', 'spice')
])

replace_in_file('src/components/TradeRocketModal.tsx', [
    ('spice melange', 'spice')
])

replace_in_file('src/components/TutorialModal.tsx', [
    ('spice melange', 'spice')
])

