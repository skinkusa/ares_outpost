import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_diag = """          {/* Diagnostic Advisory & Early Warning System */}
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-3.5 flex flex-col gap-2.5">"""

new_diag = """          {/* Diagnostic Advisory & Early Warning System */}
          {category === 'vitals' && (
          <div className="bg-stone-900/60 border border-stone-800 rounded-lg p-3.5 flex flex-col gap-2.5">"""

code = code.replace(old_diag, new_diag)

old_diag_end = """              </div>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}"""

new_diag_end = """              </div>
            </div>
            )}
          </div>
          )}
        </div>

        {/* Footer */}"""

code = code.replace(old_diag_end, new_diag_end)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

