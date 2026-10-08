import re

with open('src/App.tsx', 'r') as f:
    code = f.read()

# Insert the derived objects just before they are used, or right after state declarations
# Let's just find where they are rendered and pass the looked-up object inline

old_mod_modal = """      {/* Selected Module Details Drawer */}
      <ModuleDetailsModal
        module={selectedModule}"""

new_mod_modal = """      {/* Selected Module Details Drawer */}
      <ModuleDetailsModal
        module={modules.find((m) => m.id === selectedModule?.id) || selectedModule}"""

code = code.replace(old_mod_modal, new_mod_modal)

old_harv_modal = """      {/* Selected Harvester Details Drawer */}
      <HarvesterDetailsModal
        harvester={selectedHarvester}"""

new_harv_modal = """      {/* Selected Harvester Details Drawer */}
      <HarvesterDetailsModal
        harvester={harvesters.find((h) => h.id === selectedHarvester?.id) || selectedHarvester}"""

code = code.replace(old_harv_modal, new_harv_modal)

# Also update MarsCanvas props so the selection rings update instantly?
# MarsCanvas receives selectedModule and selectedHarvester.
old_canvas_props = """        selectedModule={selectedModule}
        selectedHarvester={selectedHarvester}"""

new_canvas_props = """        selectedModule={modules.find((m) => m.id === selectedModule?.id) || selectedModule}
        selectedHarvester={harvesters.find((h) => h.id === selectedHarvester?.id) || selectedHarvester}"""

code = code.replace(old_canvas_props, new_canvas_props)

with open('src/App.tsx', 'w') as f:
    f.write(code)

