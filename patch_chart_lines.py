import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add new buttons for the current category in the Toolbar
old_toolbar = """            {/* Left: Filter Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-stone-400 font-mono text-[11px] mr-1 hidden sm:inline">SERIES:</span>
              <button
                onClick={() => setSelectedResource('all')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  selectedResource === 'all'
                    ? 'bg-stone-700 text-white font-semibold'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'
                }`}
              >
                All Vitals
              </button>
              <button
                onClick={() => setSelectedResource('power')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'power'
                    ? 'bg-yellow-900/80 text-yellow-200 border border-yellow-700 font-semibold'
                    : 'text-yellow-400 hover:bg-yellow-950/40'
                }`}
              >
                <Zap className="w-3 h-3" /> Power
              </button>
              <button
                onClick={() => setSelectedResource('water')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'water'
                    ? 'bg-blue-900/80 text-blue-200 border border-blue-700 font-semibold'
                    : 'text-blue-400 hover:bg-blue-950/40'
                }`}
              >
                <Droplets className="w-3 h-3" /> Water
              </button>
              <button
                onClick={() => setSelectedResource('oxygen')}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${
                  selectedResource === 'oxygen'
                    ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700 font-semibold'
                    : 'text-cyan-400 hover:bg-cyan-950/40'
                }`}
              >
                <Wind className="w-3 h-3" /> Oxygen
              </button>
            </div>"""

new_toolbar = """            {/* Left: Filter Buttons */}
            <div className="flex items-center gap-1">
              <span className="text-stone-400 font-mono text-[11px] mr-1 hidden sm:inline">SERIES:</span>
              
              {category === 'vitals' && (
                <>
                  <button onClick={() => setSelectedResource('all')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selectedResource === 'all' ? 'bg-stone-700 text-white font-semibold' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>All Vitals</button>
                  <button onClick={() => setSelectedResource('power')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'power' ? 'bg-yellow-900/80 text-yellow-200 border border-yellow-700 font-semibold' : 'text-yellow-400 hover:bg-yellow-950/40'}`}><Zap className="w-3 h-3" /> Power</button>
                  <button onClick={() => setSelectedResource('water')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'water' ? 'bg-blue-900/80 text-blue-200 border border-blue-700 font-semibold' : 'text-blue-400 hover:bg-blue-950/40'}`}><Droplets className="w-3 h-3" /> Water</button>
                  <button onClick={() => setSelectedResource('oxygen')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'oxygen' ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700 font-semibold' : 'text-cyan-400 hover:bg-cyan-950/40'}`}><Wind className="w-3 h-3" /> Oxygen</button>
                </>
              )}
              
              {category === 'crew' && (
                <>
                  <button onClick={() => setSelectedResource('crew')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${selectedResource === 'crew' ? 'bg-stone-700 text-white font-semibold' : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800'}`}>All Personnel</button>
                  <button onClick={() => setSelectedResource('morale')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'morale' ? 'bg-purple-900/80 text-purple-200 border border-purple-700 font-semibold' : 'text-purple-400 hover:bg-purple-950/40'}`}>Morale</button>
                  <button onClick={() => setSelectedResource('health')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'health' ? 'bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-semibold' : 'text-emerald-400 hover:bg-emerald-950/40'}`}>Health</button>
                </>
              )}

              {category === 'industry' && (
                <>
                  <button onClick={() => setSelectedResource('alloy')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'alloy' ? 'bg-orange-900/80 text-orange-200 border border-orange-700 font-semibold' : 'text-orange-400 hover:bg-orange-950/40'}`}>Alloy</button>
                  <button onClick={() => setSelectedResource('ore')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'ore' ? 'bg-amber-900/80 text-amber-200 border border-amber-700 font-semibold' : 'text-amber-400 hover:bg-amber-950/40'}`}>Raw Ore</button>
                  <button onClick={() => setSelectedResource('spice')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'spice' ? 'bg-fuchsia-900/80 text-fuchsia-200 border border-fuchsia-700 font-semibold' : 'text-fuchsia-400 hover:bg-fuchsia-950/40'}`}>Spice</button>
                </>
              )}

              {category === 'commerce' && (
                <>
                  <button onClick={() => setSelectedResource('credits')} className={`px-2.5 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1 ${selectedResource === 'credits' ? 'bg-yellow-900/80 text-yellow-200 border border-yellow-700 font-semibold' : 'text-yellow-400 hover:bg-yellow-950/40'}`}>Galactic Credits</button>
                </>
              )}
            </div>"""

code = code.replace(old_toolbar, new_toolbar)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

