import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_tb = """<button onClick={() => setSelectedResource('oxygen')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'oxygen' ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700 font-semibold' : 'text-cyan-400 hover:bg-cyan-950/40'}`}><Wind className="w-3 h-3" /> Oxygen</button>"""

new_tb = """<button onClick={() => setSelectedResource('oxygen')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'oxygen' ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700 font-semibold' : 'text-cyan-400 hover:bg-cyan-950/40'}`}><Wind className="w-3 h-3" /> Oxygen</button>
                  <button onClick={() => setSelectedResource('food')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'food' ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-semibold' : 'text-emerald-400 hover:bg-emerald-950/40'}`}><Wind className="w-3 h-3" /> Food</button>"""

code = code.replace(old_tb, new_tb)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

