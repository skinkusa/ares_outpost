import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_diag = """            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Power Diagnosis */}"""

new_diag = """            {category === 'vitals' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mt-3">
              {/* Power Diagnosis */}"""

code = code.replace(old_diag, new_diag)

old_diag_end = """              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};"""

new_diag_end = """              </div>
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};"""

code = code.replace(old_diag_end, new_diag_end)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

