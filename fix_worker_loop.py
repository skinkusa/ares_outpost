import re

with open('src/components/MarsCanvas.tsx', 'r') as f:
    code = f.read()

# We need to replace the entire 10.5 section
pattern = r"// =====================================================================\n\s*// 10\.5\. COLONIST WORKERS \(EVA Suits\)\n\s*// =====================================================================\n\s*workers\.forEach\(\(w\) => \{.*?ctx\.restore\(\);\n\s*\}\);"

new_loop = """// =====================================================================
      // 10.5. COLONIST WORKERS (EVA Suits)
      // =====================================================================
      const workerTime = performance.now();
      workers.forEach((w) => {
        drawColonist(ctx, w, workerTime);
      });"""

code = re.sub(pattern, new_loop, code, flags=re.DOTALL)

with open('src/components/MarsCanvas.tsx', 'w') as f:
    f.write(code)

