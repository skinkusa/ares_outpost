import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# 1. We replace the original HIGH-VOLTAGE POWER LINES block with just the ground pass.
# We will use regex to find the block safely.

start_marker = r"      // =====================================================================\n      // 7\. HIGH-VOLTAGE POWER LINES WITH ENERGY BLOOM & STRUCTURAL PYLONS\n      // =====================================================================\n"
end_marker = r"      // =====================================================================\n      // 8\. TIRE TRACKS WITH DYNAMIC FADING GLOW & DUST KICK PARTICLES\n"

match = re.search(start_marker + r"(.*?)" + end_marker, code, re.DOTALL)
if match:
    # We found the block!
    pass
else:
    print("ERROR: Could not match the power lines block")
    exit(1)

with open('ground_pass.txt', 'r') as f:
    ground_pass = f.read()

# The ground_pass contains the // 7. HIGH-VOLTAGE ... header already
# And it doesn't contain the // 8. TIRE TRACKS header.
code = code[:match.start()] + ground_pass + "\n" + code[match.end() - len(end_marker) + 1:]

# 2. Insert the elevated pass right BEFORE the 11. ATMOSPHERIC DRIFT PARTICLES block.
atmos_marker = r"      // =====================================================================\n      // 11\. ATMOSPHERIC DRIFT PARTICLES \(Swirling Martian Dust\)\n"
match_atmos = re.search(atmos_marker, code)
if match_atmos:
    pass
else:
    print("ERROR: Could not match the atmospheric particles block")
    exit(1)

with open('elevated_pass.txt', 'r') as f:
    elevated_pass = f.read()

code = code[:match_atmos.start()] + elevated_pass + "\n" + code[match_atmos.start():]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

