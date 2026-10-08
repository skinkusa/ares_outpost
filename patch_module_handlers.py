import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_toggle = """  const handleToggleModuleActive = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, isActive: !m.isActive } : m))
    );
  };"""

new_toggle = """  const handleToggleModuleActive = (moduleId: string) => {
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, isActive: !m.isActive } : m))
    );
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, isActive: !prev.isActive } : prev));
  };"""

code = code.replace(old_toggle, new_toggle)

old_repair = """    setStats((prev) => ({ ...prev, alloy: prev.alloy - costAlloy }));
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, health: m.maxHealth } : m))
    );

    sound.playBuild();"""

new_repair = """    setStats((prev) => ({ ...prev, alloy: prev.alloy - costAlloy }));
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, health: m.maxHealth } : m))
    );
    setSelectedModule((prev) => (prev && prev.id === moduleId ? { ...prev, health: prev.maxHealth } : prev));

    sound.playBuild();"""

code = code.replace(old_repair, new_repair)

with open('src/App.tsx', 'w') as f:
    f.write(code)

