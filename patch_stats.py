import re

with open('src/types/colony.ts', 'r') as f:
    code = f.read()

old_stats = """  spiceCapacity: number;
  ore: number;"""

new_stats = """  spiceCapacity: number;
  autoExportSpice?: boolean;
  autoExportThreshold?: number;
  ore: number;"""

code = code.replace(old_stats, new_stats)

with open('src/types/colony.ts', 'w') as f:
    f.write(code)

