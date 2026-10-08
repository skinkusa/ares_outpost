import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

old_code = """          });
        }
        
        return updatedWorkers;
      });"""

new_code = """          });
        }
        
        // Despawn logic (if population drops)
        if (updatedWorkers.length > maxWorkers) {
           updatedWorkers = updatedWorkers.slice(0, maxWorkers);
        }

        return updatedWorkers;
      });"""

code = code.replace(old_code, new_code)

with open('src/App.tsx', 'w') as f:
    f.write(code)

