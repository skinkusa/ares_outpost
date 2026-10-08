import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add lines for other categories
old_lines = """                  {/* Oxygen Line */}
                  {(selectedResource === 'all' || selectedResource === 'oxygen') && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'oxygenPct' : 'oxygenActual'}
                      name="Oxygen"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#06b6d4', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}
                </LineChart>"""

new_lines = """                  {/* Oxygen Line */}
                  {(category === 'vitals' && (selectedResource === 'all' || selectedResource === 'oxygen')) && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'oxygenPct' : 'oxygenActual'}
                      name="Oxygen"
                      stroke="#06b6d4"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#06b6d4', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}

                  {/* Crew Lines */}
                  {(category === 'crew' && (selectedResource === 'crew' || selectedResource === 'morale')) && (
                    <Line type="monotone" dataKey="morale" name="Morale (%)" stroke="#c084fc" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#c084fc', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {(category === 'crew' && (selectedResource === 'crew' || selectedResource === 'health')) && (
                    <Line type="monotone" dataKey="health" name="Health (%)" stroke="#34d399" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#34d399', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}

                  {/* Industry Lines */}
                  {(category === 'industry' && (selectedResource === 'alloy' || selectedResource === 'industry')) && (
                    <Line type="monotone" dataKey="alloy" name="Alloy" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f97316', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {(category === 'industry' && (selectedResource === 'ore' || selectedResource === 'industry')) && (
                    <Line type="monotone" dataKey="ore" name="Raw Ore" stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#fbbf24', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {(category === 'industry' && (selectedResource === 'spice' || selectedResource === 'industry')) && (
                    <Line type="monotone" dataKey="spice" name="Spice" stroke="#e879f9" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#e879f9', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}

                  {/* Commerce Line */}
                  {category === 'commerce' && (
                    <Line type="monotone" dataKey="credits" name="Credits" stroke="#fcd34d" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#fcd34d', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}

                </LineChart>"""

code = code.replace(old_lines, new_lines)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

