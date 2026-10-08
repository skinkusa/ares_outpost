import re

with open('src/components/TutorialModal.tsx', 'r') as f:
    code = f.read()

old_step4 = """              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Export spice to Earth corporations via the <strong>Trade Shuttle</strong> for Galactic Credits (₡). Fund Science Labs to unlock high-yield technologies, culminating in the <strong>Atmospheric Genesis Engine</strong>!
              </p>"""

new_step4 = """              <p className="text-xs text-stone-400 mt-1 leading-relaxed">
                Export spice to Earth corporations via the <strong>Trade Shuttle</strong> for Galactic Credits (₡). You can use credits to requisition supplies, titanium alloy, and most importantly, <strong>Specialist Crew</strong> to increase your colony's population! Fund Science Labs to unlock high-yield technologies, culminating in the <strong>Atmospheric Genesis Engine</strong>!
              </p>"""

code = code.replace(old_step4, new_step4)

with open('src/components/TutorialModal.tsx', 'w') as f:
    f.write(code)

