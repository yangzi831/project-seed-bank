# Dungeon PBR texture sources

The production scene uses the 1K JPG packages from ambientCG and keeps procedural Canvas/DataTexture fallbacks in `src/three/DungeonBoardScene.tsx`.

- Rock 035: https://ambientcg.com/a/Rock035
- Wood 026: https://ambientcg.com/a/Wood026
- Metal 032: https://ambientcg.com/a/Metal032
- License: Creative Commons CC0 1.0 Universal, https://docs.ambientcg.com/license/

Only the color, OpenGL normal, roughness, and (for Metal032) metalness maps required by the web scene are included. Rock035 also retains its ambient-occlusion map for possible later use.
