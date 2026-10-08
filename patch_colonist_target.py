import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_target = """                // Target a point slightly outside the building
                const tx = targetMod.x * 48 + 24 + (Math.random() * 40 - 20);
                const ty = targetMod.y * 48 + 24 + (Math.random() * 40 - 20);
                updated.targetX = tx;
                updated.targetY = ty;
                updated.waypoints = findNavigationPath(updated.x, updated.y, tx, ty, modules, []);"""

new_target = """                // Target a valid point right outside the building doors
                const apron = findDockingApron(targetMod, updated.x, updated.y, modules, 18, []);
                updated.targetX = apron.x;
                updated.targetY = apron.y;
                updated.waypoints = findNavigationPath(updated.x, updated.y, apron.x, apron.y, modules, []);"""

code = code.replace(old_target, new_target)

with open('src/App.tsx', 'w') as f:
    f.write(code)

