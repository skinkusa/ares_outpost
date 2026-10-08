import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """  // Toggle Mining Target
  const handleToggleMiningTarget = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => {
        if (h.id === harvesterId) {
          const newTarget = h.miningTarget === 'ore' ? 'spice' : 'ore';
          return {
            ...h,
            miningTarget: newTarget,
            state: 'idle', // Reset state so it immediately paths to the new target
            targetSpiceId: null,
            targetX: null,
            targetY: null,
            waypoints: []
          };
        }
        return h;
      })
    );
  };"""

new_code = """  // Toggle Mining Target
  const handleToggleMiningTarget = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => {
        if (h.id === harvesterId) {
          const newTarget = h.miningTarget === 'ore' ? 'spice' : 'ore';
          const newDepot = newTarget === 'ore'
            ? (modules.find((m) => m.type === 'refinery') || modules[0])
            : (modules.find((m) => m.type === 'depot') || modules.find((m) => m.type === 'command') || modules[0]);
          return {
            ...h,
            miningTarget: newTarget,
            homeDepotId: newDepot.id,
            state: 'idle', // Reset state so it immediately paths to the new target
            targetSpiceId: null,
            targetX: null,
            targetY: null,
            waypoints: []
          };
        }
        return h;
      })
    );
  };"""

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

