import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

# Add all the missing lines right before </LineChart>
chart_end_marker = "                </LineChart>"

missing_lines = """                  {/* Morale Line */}
                  {(category === 'crew' && (selectedResource === 'crew' || selectedResource === 'morale')) && (
                    <Line type="monotone" dataKey="morale" name="Morale" stroke="#a855f7" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#a855f7', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {/* Health Line */}
                  {(category === 'crew' && (selectedResource === 'crew' || selectedResource === 'health')) && (
                    <Line type="monotone" dataKey="health" name="Health" stroke="#10b981" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#10b981', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {/* Alloy Line */}
                  {(category === 'industry' && (selectedResource === 'all' || selectedResource === 'alloy')) && (
                    <Line type="monotone" dataKey="alloy" name="Alloy" stroke="#f97316" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#f97316', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {/* Ore Line */}
                  {(category === 'industry' && (selectedResource === 'all' || selectedResource === 'ore')) && (
                    <Line type="monotone" dataKey="ore" name="Ore" stroke="#fbbf24" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#fbbf24', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {/* Spice Line */}
                  {(category === 'industry' && (selectedResource === 'all' || selectedResource === 'spice')) && (
                    <Line type="monotone" dataKey="spice" name="Spice" stroke="#d946ef" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#d946ef', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
                  {/* Credits Line */}
                  {(category === 'commerce' && (selectedResource === 'all' || selectedResource === 'credits')) && (
                    <Line type="monotone" dataKey="credits" name="Credits" stroke="#eab308" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#eab308', stroke: '#1c1917', strokeWidth: 2 }} />
                  )}
"""

code = code.replace(chart_end_marker, missing_lines + chart_end_marker)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

