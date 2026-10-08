import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_code = """              </div>
            </div>
          </div>
        </div>

        {/* Footer */}"""

new_code = """              </div>
            </div>
            )}
          </div>
        </div>

        {/* Footer */}"""

code = code.replace(old_code, new_code)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

