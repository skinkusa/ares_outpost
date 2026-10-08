import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_upgrade = """    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, level: m.level + 1 } : m))
    );

    sound.playBuild();
    addLog('info', 'Module Upgraded', `${bp.name} upgraded to Tier ${mod.level + 1}.`);"""

new_upgrade = """    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, level: m.level + 1 } : m))
    );

    // Update selected module to reflect changes instantly
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, level: prev.level + 1 } : prev));

    sound.playBuild();
    addLog('info', 'Module Upgraded', `${bp.name} upgraded to Tier ${mod.level + 1}.`);"""

code = code.replace(old_upgrade, new_upgrade)

with open('src/App.tsx', 'w') as f:
    f.write(code)

