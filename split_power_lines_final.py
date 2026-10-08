import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

start_marker = "      // =====================================================================\\n      // 7. HIGH-VOLTAGE POWER LINES WITH ENERGY BLOOM & STRUCTURAL PYLONS"
end_marker = "      // =====================================================================\\n      // 8. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

with open('ground_pass.txt', 'r') as f:
    ground_pass = f.read()

# Replace original block with ground_pass
code = code[:start_idx] + ground_pass + "\n" + code[end_idx:]

with open('elevated_pass.txt', 'r') as f:
    elevated_pass = f.read()

colonist_marker = "      // =====================================================================\\n      // 11. ATMOSPHERIC DRIFT PARTICLES (Swirling Martian Dust)"
colonist_idx = code.find(colonist_marker)

if colonist_idx == -1:
    print("ERROR: Could not find colonist marker")
else:
    code = code[:colonist_idx] + elevated_pass + "\n" + code[colonist_idx:]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

