# Scene reference review

Reviewed 2026-11-13 for the second 3D architecture pass. Reference photographs were inspected online but are not bundled as runtime assets.

## Architectural photographs

- People's Great Hall: [20251026 Great Hall of the People](https://commons.wikimedia.org/wiki/File:20251026_Great_Hall_of_the_People.jpg), Wikimedia Commons. The square-facing elevation has a long stone portico, deep columns, a shallow overhanging roof, vertical wings, flags, and restrained modern detailing.
- National Museum of China: [20251026 National Museum of China](https://commons.wikimedia.org/wiki/File:20251026_National_Museum_of_China.jpg), Windmemories, CC BY-SA 4.0. The west elevation has a tall central colonnade, long symmetrical wings, two end towers with stepped caps, recessed glazing, and a shallow roof rather than a palace roof.
- Forbidden City: [Aerial view of Forbidden City](https://commons.wikimedia.org/wiki/File:China_(Beijing)_Aerial_view_of_Forbidden_City_(38884882275).jpg), Güldem Üstün, CC BY 2.0. The overview confirms the density of continuous courtyard halls, walls, galleries, trees, and ochre/gray roofs around the axial halls.
- Hall of Prayer for Good Harvests: [20200110 Temple of Heaven-1](https://commons.wikimedia.org/wiki/File:20200110_Temple_of_Heaven-1.jpg), Balon Greyjoy, CC0. The dominant silhouette is a low circular red drum carrying three broad, deep-blue circular roofs on a white marble terrace, topped by a gold finial.
- Circular Mound Altar: [Circular Mound Altar, Beijing](https://commons.wikimedia.org/wiki/File:Circular_Mound_Altar,_Beijing.jpg), CC BY-SA 4.0. White marble three-tier terraces and dense stone balustrades dominate; it has no red enclosing hall.
- Imperial Vault of Heaven: [2017-05-02 Imperial Vault of Heaven](https://commons.wikimedia.org/wiki/File:2017-05-02_Imperial_Vault_of_Heaven.jpg), Windmemories, CC BY-SA 4.0. A single round red hall with one deep-blue conical roof sits within the circular Echo Wall.

## Geographic and layout evidence

The Amap (高德地图) search page was reachable on 2026-11-13, but its POI detail response was replaced by a login/slider challenge (`FAIL_SYS_USER_VALIDATE`). No coordinates or geometry were invented from that blocked response. Earlier saved Amap responses remain in `docs/research/amap-points.json`.

An OpenStreetMap Overpass query on 2026-11-13 returned the following named real-world relations. Their WGS84 bounds were used only to derive display dimensions and positions, then converted to the atlas GCJ-02 display plane:

- Tiananmen Square: approximately 500 m east-west by 880 m north-south.
- Great Hall of the People: approximately 217 m east-west by 340 m north-south.
- National Museum of China: approximately 211 m east-west by 335 m north-south.
- Chairman Mao Memorial Hall: approximately 108 m east-west by 122 m north-south.
- Monument to the People's Heroes complex: approximately 57 m east-west by 69 m north-south; the obelisk height tag is 37.94 m.
- Tiananmen Square flagpole: 22.5 m.
- Hall of Prayer for Good Harvests: footprint approximately 29 m by 29 m, OSM height tag 38 m.
- Imperial Vault of Heaven: footprint approximately 19 m by 19 m, OSM height tag 19.02 m.

The building renderer uses the supplied OSM building footprint rings to derive oriented rectangles for unmodeled palace and Tiantan structures. These remain schematic, navigation-scale interpretations. They are not official heritage boundaries, surveyed reconstructions, or a claim of complete architectural documentation.
