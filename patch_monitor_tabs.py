import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add category variable right before return (
code = code.replace("  return (", """
  const category = ['all', 'power', 'water', 'oxygen', 'food'].includes(selectedResource)
    ? 'vitals'
    : ['crew', 'health', 'morale'].includes(selectedResource)
    ? 'crew'
    : ['alloy', 'ore', 'spice'].includes(selectedResource)
    ? 'industry'
    : 'commerce';

  return (""")

# Change body layout to include tabs and hide sidebar if not vitals
old_body = """        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Active Resource Diagnosis Cards */}
          <div className="w-full md:w-80 flex flex-col gap-3 p-4 bg-stone-900/50 border-r border-stone-800 overflow-y-auto">"""

new_body = """        {/* Top Navigation Tabs */}
        <div className="flex flex-wrap bg-stone-950 border-b border-stone-800 p-2 gap-2 text-xs font-title font-bold">
          <button onClick={() => setSelectedResource('all')} className={`px-4 py-2 rounded-md transition-colors ${category === 'vitals' ? 'bg-cyan-900/80 text-cyan-200 border border-cyan-700/50' : 'text-stone-500 hover:text-stone-300'}`}>VITALS & LIFE SUPPORT</button>
          <button onClick={() => setSelectedResource('crew')} className={`px-4 py-2 rounded-md transition-colors ${category === 'crew' ? 'bg-purple-900/80 text-purple-200 border border-purple-700/50' : 'text-stone-500 hover:text-stone-300'}`}>PERSONNEL & HEALTH</button>
          <button onClick={() => setSelectedResource('alloy')} className={`px-4 py-2 rounded-md transition-colors ${category === 'industry' ? 'bg-orange-900/80 text-orange-200 border border-orange-700/50' : 'text-stone-500 hover:text-stone-300'}`}>INDUSTRY & RESOURCES</button>
          <button onClick={() => setSelectedResource('credits')} className={`px-4 py-2 rounded-md transition-colors ${category === 'commerce' ? 'bg-amber-900/80 text-amber-200 border border-amber-700/50' : 'text-stone-500 hover:text-stone-300'}`}>COMMERCE & TRADE</button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Sidebar: Active Resource Diagnosis Cards */}
          {category === 'vitals' && (
          <div className="w-full md:w-80 flex flex-col gap-3 p-4 bg-stone-900/50 border-r border-stone-800 overflow-y-auto">"""

code = code.replace(old_body, new_body)

# Close the left sidebar condition
old_left_end = """            </div>
          </div>

          {/* Right Main Area: Interactive Historical Chart */}"""

new_left_end = """            </div>
          </div>
          )}

          {/* Right Main Area: Interactive Historical Chart */}"""

code = code.replace(old_left_end, new_left_end)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

