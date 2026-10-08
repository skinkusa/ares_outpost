import re

with open('src/components/TradeRocketModal.tsx', 'r') as f:
    code = f.read()

code = code.replace('translate-x-4.5', 'translate-x-4')

with open('src/components/TradeRocketModal.tsx', 'w') as f:
    f.write(code)

