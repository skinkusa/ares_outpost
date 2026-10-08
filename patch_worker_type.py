import re

with open('src/types/colony.ts', 'r') as f:
    code = f.read()

old_interface = """export interface ColonistWorker {
  id: string;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  waypoints: { x: number; y: number }[];
  angle: number;
  state: 'idle' | 'walking';
  timer: number;
}"""

new_interface = """export interface ColonistWorker {
  id: string;
  x: number;
  y: number;
  targetX: number | null;
  targetY: number | null;
  waypoints: { x: number; y: number }[];
  angle: number;
  state: 'idle' | 'walking';
  timer: number;
  transport?: 'walking' | 'rover';
}"""

code = code.replace(old_interface, new_interface)

with open('src/types/colony.ts', 'w') as f:
    f.write(code)

