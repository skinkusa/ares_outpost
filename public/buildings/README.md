# Custom Building Sprites Directory

Place your custom PNG graphics for buildings in this folder.
The game engine will automatically detect and render them in place of procedural canvas vector graphics!

## Supported Filenames & Grid Dimensions

| Filename | Module Name | Grid Size | Recommended Pixel Resolution | Description |
| :--- | :--- | :--- | :--- | :--- |
| `command.png` | Command Outpost | 3x3 tiles | 144x144 px (or 288x288 @2x) | Central headquarters & antenna hub |
| `solar.png` | Solar Array | 2x2 tiles | 96x96 px (or 192x192 @2x) | Photovoltaic solar array |
| `rtg.png` | RTG Nuclear Cell | 2x2 tiles | 96x96 px (or 192x192 @2x) | Nuclear thermal generator |
| `battery.png` | Battery Substation | 2x2 tiles | 96x96 px (or 192x192 @2x) | Energy storage substation |
| `scrubber.png` | MOXIE O2 Scrubber | 2x2 tiles | 96x96 px (or 192x192 @2x) | Atmospheric oxygen generator |
| `vaporator.png` | Moisture Vaporator | 2x2 tiles | 96x96 px (or 192x192 @2x) | Atmospheric water condenser |
| `greenhouse.png` | Hydroponic Bio-Dome | 3x3 tiles | 144x144 px (or 288x288 @2x) | Crop farming dome |
| `habitat.png` | Pressurized Habitat | 3x3 tiles | 144x144 px (or 288x288 @2x) | Colonist living quarters |
| `refinery.png` | Spice Melange Refinery | 3x3 tiles | 144x144 px (or 288x288 @2x) | Spice silo & purification tanks |
| `depot.png` | Harvester Garage & Bay | 3x3 tiles | 144x144 px (or 288x288 @2x) | Rover docking bay & hangar |
| `research.png` | Ares Science Lab | 3x3 tiles | 144x144 px (or 288x288 @2x) | Tech research complex |
| `launchpad.png` | Orbital Trade Launchpad | 4x4 tiles | 192x192 px (or 384x384 @2x) | Rocket launchpad & gantry |
| `radar.png` | Seismic & Storm Radar | 2x2 tiles | 96x96 px (or 192x192 @2x) | Rotating radar dish array |
| `medbay.png` | Trauma & Medical Bay | 2x2 tiles | 96x96 px (or 192x192 @2x) | Medical clinic & stasis pods |

## Image Guidelines
- **Format**: PNG with transparency (alpha channel recommended)
- **Aspect Ratio**: Square (1:1) matching width x height tile proportions
- **Top-down perspective**: Overhead or 45-degree pseudo-topdown angle matching the Mars terrain
- **Fallback**: If a PNG file is not present or fails to load, the game automatically uses the detailed procedural sci-fi canvas graphics without breaking.
