import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_tooltip_readings = """                          {/* Power Reading */}
                          <div className="flex items-center justify-between text-yellow-300">
                            <span className="flex items-center gap-1">
                              <Zap className="w-3 h-3 text-yellow-400" /> Power:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.power)} kW ({Math.round(pt.powerPct)}%)
                            </span>
                          </div>

                          {/* Water Reading */}
                          <div className="flex items-center justify-between text-blue-300">
                            <span className="flex items-center gap-1">
                              <Droplets className="w-3 h-3 text-blue-400" /> Water:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.water)} L ({Math.round(pt.waterPct)}%)
                            </span>
                          </div>

                          {/* Oxygen Reading */}
                          <div className="flex items-center justify-between text-cyan-300">
                            <span className="flex items-center gap-1">
                              <Wind className="w-3 h-3 text-cyan-400" /> Oxygen:
                            </span>
                            <span className="font-bold">
                              {Math.round(pt.oxygen)} m³ ({Math.round(pt.oxygenPct)}%)
                            </span>
                          </div>"""

new_tooltip_readings = """                          {category === 'vitals' && (
                            <>
                              <div className="flex items-center justify-between text-yellow-300">
                                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400" /> Power:</span>
                                <span className="font-bold">{Math.round(pt.power)} kW ({Math.round(pt.powerPct)}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-blue-300">
                                <span className="flex items-center gap-1"><Droplets className="w-3 h-3 text-blue-400" /> Water:</span>
                                <span className="font-bold">{Math.round(pt.water)} L ({Math.round(pt.waterPct)}%)</span>
                              </div>
                              <div className="flex items-center justify-between text-cyan-300">
                                <span className="flex items-center gap-1"><Wind className="w-3 h-3 text-cyan-400" /> Oxygen:</span>
                                <span className="font-bold">{Math.round(pt.oxygen)} m³ ({Math.round(pt.oxygenPct)}%)</span>
                              </div>
                            </>
                          )}
                          {category === 'crew' && (
                            <>
                              <div className="flex items-center justify-between text-purple-300">
                                <span className="flex items-center gap-1">Morale:</span>
                                <span className="font-bold">{Math.round(pt.morale)}%</span>
                              </div>
                              <div className="flex items-center justify-between text-emerald-300">
                                <span className="flex items-center gap-1">Health:</span>
                                <span className="font-bold">{Math.round(pt.health)}%</span>
                              </div>
                            </>
                          )}
                          {category === 'industry' && (
                            <>
                              <div className="flex items-center justify-between text-orange-300">
                                <span className="flex items-center gap-1">Alloy:</span>
                                <span className="font-bold">{Math.round(pt.alloy)}</span>
                              </div>
                              <div className="flex items-center justify-between text-amber-300">
                                <span className="flex items-center gap-1">Ore:</span>
                                <span className="font-bold">{Math.round(pt.ore)}</span>
                              </div>
                              <div className="flex items-center justify-between text-fuchsia-300">
                                <span className="flex items-center gap-1">Spice:</span>
                                <span className="font-bold">{Math.round(pt.spice)}</span>
                              </div>
                            </>
                          )}
                          {category === 'commerce' && (
                            <div className="flex items-center justify-between text-yellow-300">
                              <span className="flex items-center gap-1">Credits:</span>
                              <span className="font-bold">₡{Math.round(pt.credits)}</span>
                            </div>
                          )}"""

code = code.replace(old_tooltip_readings, new_tooltip_readings)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

