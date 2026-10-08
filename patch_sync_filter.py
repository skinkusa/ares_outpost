import re

with open('src/components/ResourceMonitor.tsx', 'r') as f:
    code = f.read()

old_state = """  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  // Format Sol time"""

new_state = """  const [isMaximized, setIsMaximized] = useState<boolean>(false);

  React.useEffect(() => {
    if (isOpen && initialFilter) {
      setSelectedResource(initialFilter);
    }
  }, [isOpen, initialFilter]);

  // Format Sol time"""

code = code.replace(old_state, new_state)

with open('src/components/ResourceMonitor.tsx', 'w') as f:
    f.write(code)

