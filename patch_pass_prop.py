import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """        onRecallHarvester={handleRecallHarvester}
        onScrapHarvester={handleScrapHarvester}
        onToggleAutoHarvest={handleToggleAutoHarvest}"""

new_code = """        onRecallHarvester={handleRecallHarvester}
        onScrapHarvester={handleScrapHarvester}
        onToggleAutoHarvest={handleToggleAutoHarvest}
        onToggleMiningTarget={handleToggleMiningTarget}"""

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

