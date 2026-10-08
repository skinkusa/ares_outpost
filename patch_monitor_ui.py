import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add categories to the top of the modal body
old_body_start = """        {/* Body */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">"""

new_body_start = """        {/* Body */}
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
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">"""

code = code.replace(old_body_start, new_body_start)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

