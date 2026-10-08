import re

def add_import(file_path):
    with open(file_path, 'r') as f:
        code = f.read()
    
    code = code.replace("ColonyModule,", "ColonistWorker,\n  ColonyModule,")
    
    with open(file_path, 'w') as f:
        f.write(code)

add_import('src/App.tsx')
add_import('src/components/MarsCanvas.tsx')

