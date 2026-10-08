import re

with open('src/components/TopBar.tsx', 'r') as f:
    code = f.read()

# Food
code = code.replace("""        {/* Food (with subtle shake & pulse animation when critical) */}
        <div
          onClick={() => onOpenResourceMonitor('all')}""", """        {/* Food (with subtle shake & pulse animation when critical) */}
        <div
          onClick={() => onOpenResourceMonitor('food')}""")

# Crew
code = code.replace("""        {/* Colonists / Pop */}
        <div
          onClick={() => onOpenResourceMonitor('all')}""", """        {/* Colonists / Pop */}
        <div
          onClick={() => onOpenResourceMonitor('crew')}""")

# Health
code = code.replace("""              onClick={() => onOpenResourceMonitor('all')}
              className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded cursor-pointer hover:border-emerald-500/70 hover:bg-stone-900 transition-colors ${
                isCrit""", """              onClick={() => onOpenResourceMonitor('health')}
              className={`relative group flex-1 min-w-[80px] flex flex-col border px-2.5 py-1 rounded cursor-pointer hover:border-emerald-500/70 hover:bg-stone-900 transition-colors ${
                isCrit""")

# Alloy
code = code.replace("""        {/* Construction Alloy */}
        <div
          onClick={() => onOpenResourceMonitor('all')}""", """        {/* Construction Alloy */}
        <div
          onClick={() => onOpenResourceMonitor('alloy')}""")

# Ore
code = code.replace("""        {/* Raw Iron Ore */}
        <div
          onClick={() => onOpenResourceMonitor('all')}""", """        {/* Raw Iron Ore */}
        <div
          onClick={() => onOpenResourceMonitor('ore')}""")

# Spice
code = code.replace("""        {/* SPICE (Key Feature!) */}
        <div
          className="relative group flex flex-col bg-gradient-to-r from-purple-950/80 to-fuchsia-950/60 border border-fuchsia-600/70 px-2.5 py-1 rounded shadow-lg glow-purple\"""", """        {/* SPICE (Key Feature!) */}
        <div
          onClick={() => onOpenResourceMonitor('spice')}
          className="relative group flex flex-col bg-gradient-to-r from-purple-950/80 to-fuchsia-950/60 border border-fuchsia-600/70 px-2.5 py-1 rounded shadow-lg glow-purple cursor-pointer\"""")

# Credits
code = code.replace("""        {/* Galactic Credits */}
        <div
          className="relative group flex-1 min-w-[80px] flex flex-col bg-amber-950/50 border border-amber-700/60 px-2.5 py-1 rounded\"""", """        {/* Galactic Credits */}
        <div
          onClick={() => onOpenResourceMonitor('credits')}
          className="relative group flex-1 min-w-[80px] flex flex-col bg-amber-950/50 border border-amber-700/60 px-2.5 py-1 rounded cursor-pointer\"""")

with open('src/components/TopBar.tsx', 'w') as f:
    f.write(code)

