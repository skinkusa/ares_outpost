import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_content = """        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Top Row: Predictive Trend Horizon Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">"""

new_content = """        {/* Top Navigation Tabs */}
        <div className="flex flex-wrap bg-stone-950 border-b border-stone-800 p-2 gap-2 text-xs font-title font-bold justify-center">
          <button onClick={() => setSelectedResource('all')} className={`px-4 py-2 rounded-md transition-colors ${category === 'vitals' ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700/50' : 'text-stone-500 hover:text-stone-300'}`}>VITALS & LIFE SUPPORT</button>
          <button onClick={() => setSelectedResource('crew')} className={`px-4 py-2 rounded-md transition-colors ${category === 'crew' ? 'bg-purple-900/80 text-purple-200 border border-purple-700/50' : 'text-stone-500 hover:text-stone-300'}`}>PERSONNEL & HEALTH</button>
          <button onClick={() => setSelectedResource('alloy')} className={`px-4 py-2 rounded-md transition-colors ${category === 'industry' ? 'bg-orange-900/80 text-orange-200 border border-orange-700/50' : 'text-stone-500 hover:text-stone-300'}`}>INDUSTRY & RESOURCES</button>
          <button onClick={() => setSelectedResource('credits')} className={`px-4 py-2 rounded-md transition-colors ${category === 'commerce' ? 'bg-amber-900/80 text-amber-200 border border-amber-700/50' : 'text-stone-500 hover:text-stone-300'}`}>COMMERCE & TRADE</button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          {/* Top Row: Predictive Trend Horizon Cards */}
          {category === 'vitals' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 font-mono text-xs">"""

code = code.replace(old_content, new_content)

old_cards_end = """              </div>
            </div>
          </div>

          {/* Interactive Chart Control Toolbar */}"""

new_cards_end = """              </div>
            </div>
          </div>
          )}

          {/* Interactive Chart Control Toolbar */}"""

code = code.replace(old_cards_end, new_cards_end)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

