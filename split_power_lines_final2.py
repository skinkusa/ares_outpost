import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

start_marker = "      // 7. HIGH-VOLTAGE POWER LINES"
start_idx = code.find(start_marker)
start_idx = code.rfind("      // ==", 0, start_idx)

end_marker = "      // 8. TIRE TRACKS"
end_idx = code.find(end_marker)
end_idx = code.rfind("      // ==", 0, end_idx)

with open('ground_pass.txt', 'r') as f:
    ground_pass = f.read()

# Replace original block with ground_pass
code = code[:start_idx] + ground_pass + "\n" + code[end_idx:]

with open('elevated_pass.txt', 'r') as f:
    elevated_pass = f.read()

colonist_marker = "      // 11. ATMOSPHERIC DRIFT PARTICLES"
colonist_idx = code.find(colonist_marker)
colonist_idx = code.rfind("      // ==", 0, colonist_idx)

if colonist_idx == -1:
    print("ERROR: Could not find colonist marker")
else:
    code = code[:colonist_idx] + elevated_pass + "\n" + code[colonist_idx:]

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

