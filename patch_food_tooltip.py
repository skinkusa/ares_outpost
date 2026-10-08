import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_tt = """                              <div className="flex items-center justify-between text-cyan-300">
                                <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-400" /> Oxygen:</span>
                                <span className="font-bold">{Math.round(pt.oxygen)} m³ ({Math.round(pt.oxygenPct)}%)</span>
                              </div>
                            </>
                          )}"""

new_tt = """                              <div className="flex items-center justify-between text-cyan-300">
                                <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-400" /> Oxygen:</span>
                                <span className="font-bold">{Math.round(pt.oxygen)} m³ ({Math.round(pt.oxygenPct)}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-emerald-300">
                                <span className="flex items-center gap-1"><Activity className="w-3 h-3 text-emerald-400" /> Food:</span>
                                <span className="font-bold">{Math.round(pt.food)} ({Math.round(pt.foodPct)}%)</span>
                              </div>
                            </>
                          )}"""

code = code.replace(old_tt, new_tt)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

