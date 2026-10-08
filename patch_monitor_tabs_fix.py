import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add category right before return (
old_return = "  return ("
new_return = """  const category = ['all', 'power', 'water', 'oxygen', 'food'].includes(selectedResource)
    ? 'vitals'
    : ['crew', 'health', 'morale'].includes(selectedResource)
    ? 'crew'
    : ['alloy', 'ore', 'spice'].includes(selectedResource)
    ? 'industry'
    : 'commerce';

  return ("""

if "const category = " not in code:
    code = code.replace(old_return, new_return)

# Now fix the Body section
# The current body start in the file is from patch_monitor_ui.py
old_body = """        {/* Body */}
        <div className="flex flex-col border-b border-stone-800 bg-stone-900/50 p-2 gap-2 sm:flex-row sm:justify-center">
          <div className="flex bg-stone-950 border border-stone-800 rounded-lg p-1 w-full sm:w-auto">
            <button
              onClick={() => setSelectedResource('all')}
              className={`flex-1 px-4 py-1.5 rounded-md text-xs font-title font-bold transition-colors ${['all', 'power', 'water', 'oxygen', 'food'].includes(selectedResource) ? 'bg-cyan-900/80 text-cyan-200' : 'text-stone-500 hover:text-stone-300'}`}
            >
              VITALS
            </button>
            <button
              onClick={() => setSelectedResource('crew')}
              className={`flex-1 px-4 py-1.5 rounded-md text-xs font-title font-bold transition-colors ${['crew', 'health', 'morale'].includes(selectedResource) ? 'bg-purple-900/80 text-purple-200' : 'text-stone-500 hover:text-stone-300'}`}
            >
              PERSONNEL
            </button>
            <button
              onClick={() => setSelectedResource('alloy')}
              className={`flex-1 px-4 py-1.5 rounded-md text-xs font-title font-bold transition-colors ${['alloy', 'ore', 'spice', 'credits'].includes(selectedResource) ? 'bg-orange-900/80 text-orange-200' : 'text-stone-500 hover:text-stone-300'}`}
            >
              INDUSTRY & TRADE
            </button>
          </div>
        </div>
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

# Close the condition for the left sidebar
old_sidebar_end = """            </div>
          </div>

          {/* Right Main Area: Interactive Historical Chart */}"""

new_sidebar_end = """            </div>
          </div>
          )}

          {/* Right Main Area: Interactive Historical Chart */}"""

code = code.replace(old_sidebar_end, new_sidebar_end)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

