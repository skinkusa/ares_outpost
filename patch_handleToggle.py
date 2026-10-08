import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """  // Toggle Auto-harvest
  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
    );
  };"""

new_code = """  // Toggle Auto-harvest
  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
    );
  };

  // Toggle Mining Target
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

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

