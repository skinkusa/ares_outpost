import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# 1. Extract the power lines block
start_marker = "      // =====================================================================\\n      // 7. HIGH-VOLTAGE POWER LINES WITH ENERGY BLOOM & STRUCTURAL PYLONS"
end_marker = "      // =====================================================================\\n      // 8. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

power_lines_block = code[start_idx:end_idx]

# Remove it from the original location
code = code[:start_idx] + code[end_idx:]

# 2. Extract colonist workers block
colonist_marker = "      // =====================================================================\\n      // 11. ATMOSPHERIC DRIFT PARTICLES"

colonist_idx = code.find(colonist_marker)

# Insert power lines block before 11. ATMOSPHERIC DRIFT PARTICLES
code = code[:colonist_idx] + power_lines_block + code[colonist_idx:]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

