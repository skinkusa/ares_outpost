import re

with open('src/types/colony.ts', 'r') as f:
    code = f.read()

new_type = """export interface ColonistWorker {
  id: string;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  waypoints: { x: number; y: number }[];
  angle: number;
  state: 'idle' | 'walking';
  timer: number;
}

export interface ColonyModule {"""

code = code.replace("export interface ColonyModule {", new_type)

with open('src/types/colony.ts', 'w') as f:
    f.write(code)

