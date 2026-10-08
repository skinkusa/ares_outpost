import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_recall = """        return h;
      })
    );
    addLog('info', 'Harvester Recalled', 'Harvester ordered to return immediately to base depot.');
  };"""

new_recall = """        return h;
      })
    );
    setSelectedHarvester((prev) => prev && prev.id === harvesterId ? { ...prev, state: 'returning_to_depot' } : prev);
    addLog('info', 'Harvester Recalled', 'Harvester ordered to return immediately to base depot.');
  };"""

code = code.replace(old_recall, new_recall)

old_toggle_auto = """  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
    );
  };"""

new_toggle_auto = """  const handleToggleAutoHarvest = (harvesterId: string) => {
    setHarvesters((prev) =>
      prev.map((h) => (h.id === harvesterId ? { ...h, autoHarvest: !h.autoHarvest } : h))
    );
    setSelectedHarvester((prev) => prev && prev.id === harvesterId ? { ...prev, autoHarvest: !prev.autoHarvest } : prev);
  };"""

code = code.replace(old_toggle_auto, new_toggle_auto)

old_inline_repair = """        onRepair={(id) => {
          if (stats.alloy >= 15) {
            setStats((prev) => ({ ...prev, alloy: prev.alloy - 15 }));
            setHarvesters((prev) =>
              prev.map((h) => (h.id === id ? { ...h, health: h.maxHealth } : h))
            );
            sound.playBuild();
            addLog('info', 'Rover Repaired', 'Harvester chassis repaired to 100% hull.');
          }
        }}"""

new_inline_repair = """        onRepair={(id) => {
          if (stats.alloy >= 15) {
            setStats((prev) => ({ ...prev, alloy: prev.alloy - 15 }));
            setHarvesters((prev) =>
              prev.map((h) => (h.id === id ? { ...h, health: h.maxHealth } : h))
            );
            setSelectedHarvester((prev) => prev && prev.id === id ? { ...prev, health: prev.maxHealth } : prev);
            sound.playBuild();
            addLog('info', 'Rover Repaired', 'Harvester chassis repaired to 100% hull.');
          }
        }}"""

code = code.replace(old_inline_repair, new_inline_repair)

with open('src/App.tsx', 'w') as f:
    f.write(code)

