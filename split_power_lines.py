import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# First, extract the block that is currently placed AFTER colonist workers
start_marker = "      // =====================================================================\\n      // 7. HIGH-VOLTAGE POWER LINES WITH ENERGY BLOOM & STRUCTURAL PYLONS"
end_marker = "      // =====================================================================\\n      // 11. ATMOSPHERIC DRIFT PARTICLES"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)
power_lines_block = code[start_idx:end_idx]

# Remove it from the current location
code = code[:start_idx] + code[end_idx:]

# Split the block into two: Ground and Elevated
# Let's find where the casing starts: "// 3. High-voltage ambient electromagnetic bloom" or "// 4. Heavy insulated casing"
split_marker = "        // 3. High-voltage ambient electromagnetic bloom"
split_idx = power_lines_block.find(split_marker)

ground_block = power_lines_block[:split_idx] + "      }\n\n"
elevated_block = "      // =====================================================================\\n      // 10.8. ELEVATED HIGH-VOLTAGE POWER CABLES & PYLONS\\n      // =====================================================================\\n      for (let i = 0; i < activePowerLines.length; i++) {\\n        const line = activePowerLines[i];\\n        const { x1, y1, x2, y2, length } = line;\\n\\n" + power_lines_block[split_idx:]

# Put ground block before Tire Tracks (original position)
tire_marker = "      // =====================================================================\\n      // 8. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES"
tire_idx = code.find(tire_marker)
code = code[:tire_idx] + ground_block + code[tire_idx:]

# Put elevated block before 11. ATMOSPHERIC DRIFT PARTICLES
atmos_idx = code.find(end_marker)
code = code[:atmos_idx] + elevated_block + code[atmos_idx:]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

