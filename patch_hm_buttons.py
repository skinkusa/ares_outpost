import re

with open('src/components/HarvesterManager.tsx', 'r') as f:
    code = f.read()

old_code = """                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onFocusHarvester(h)}"""

new_code = """                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => onToggleMiningTarget(h.id)}
                            className={`px-2 py-1 rounded text-[10px] font-bold flex items-center gap-1 font-mono transition-colors border ${
                              h.miningTarget === 'ore'
                                ? 'bg-amber-950 border-amber-700/60 text-amber-400 hover:bg-amber-900'
                                : 'bg-fuchsia-950 border-fuchsia-700/60 text-fuchsia-400 hover:bg-fuchsia-900'
                            }`}
                            title={`Mining: ${h.miningTarget.toUpperCase()}. Click to re-assign target.`}
                          >
                            <span>MINE: {h.miningTarget.toUpperCase()}</span>
                          </button>

                          <button
                            onClick={() => onFocusHarvester(h)}"""

code = code.replace(old_code, new_code)

with open('src/components/HarvesterManager.tsx', 'w') as f:
    f.write(code)

