import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_oxy = """                  {/* Oxygen Line */}
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
                  )}"""

new_oxy = """                  {/* Oxygen Line */}
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

                  {/* Food Line */}
                  {(category === 'vitals' && (selectedResource === 'all' || selectedResource === 'food')) && (
                    <Line
                      type="monotone"
                      dataKey={unitMode === 'pct' ? 'foodPct' : 'foodActual'}
                      name="Food"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 5, fill: '#10b981', stroke: '#1c1917', strokeWidth: 2 }}
                    />
                  )}"""

code = code.replace(old_oxy, new_oxy)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

