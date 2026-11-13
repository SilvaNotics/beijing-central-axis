# Scene reference review

Reviewed 2026-11-13 for the second 3D architecture pass. Reference photographs were inspected online but are not bundled as runtime assets.

## Architectural photographs

- People's Great Hall: [20251026 Great Hall of the People](https://commons.wikimedia.org/wiki/File:20251026_Great_Hall_of_the_People.jpg), Wikimedia Commons. The square-facing elevation has a long stone portico, deep columns, a shallow overhanging roof, vertical wings, flags, and restrained modern detailing.
- National Museum of China: [20251026 National Museum of China](https://commons.wikimedia.org/wiki/File:20251026_National_Museum_of_China.jpg), Windmemories, CC BY-SA 4.0. The west elevation has a tall central colonnade, long symmetrical wings, two end towers with stepped caps, recessed glazing, and a shallow roof rather than a palace roof.
- Tiananmen: [Tiananmen Gate 2019](https://commons.wikimedia.org/wiki/File:Tiananmen_Gate_2019.jpg). Its five-arch red wall carries a large portrait, paired long inscriptions, and a tall double-eaved gatehouse; this treatment distinguishes it from Duanmen.
- Duanmen: [Duanmen Gate of the Forbidden City](https://commons.wikimedia.org/wiki/File:Duanmen_Gate_of_the_Forbidden_City.jpg). Duanmen has a lower, wider red platform, five passages, a more compressed double-eaved hall, and low flanking roof masses without the Tiananmen portrait or declaration panels.
- Forbidden City: [Aerial view of Forbidden City](https://commons.wikimedia.org/wiki/File:China_(Beijing)_Aerial_view_of_Forbidden_City_(38884882275).jpg), Güldem Üstün, CC BY 2.0. The overview confirms the density of continuous courtyard halls, walls, galleries, trees, and ochre/gray roofs around the axial halls.
- Hall of Prayer for Good Harvests: [20200110 Temple of Heaven-1](https://commons.wikimedia.org/wiki/File:20200110_Temple_of_Heaven-1.jpg), Balon Greyjoy, CC0. The dominant silhouette is a low circular red drum carrying three broad, deep-blue circular roofs on a white marble terrace, topped by a gold finial.
- Circular Mound Altar: [Circular Mound Altar, Beijing](https://commons.wikimedia.org/wiki/File:Circular_Mound_Altar,_Beijing.jpg), CC BY-SA 4.0. White marble three-tier terraces and dense stone balustrades dominate; it has no red enclosing hall.
- Imperial Vault of Heaven: [2017-05-02 Imperial Vault of Heaven](https://commons.wikimedia.org/wiki/File:2017-05-02_Imperial_Vault_of_Heaven.jpg), Windmemories, CC BY-SA 4.0. A single round red hall with one deep-blue conical roof sits within the circular Echo Wall.

## Geographic and layout evidence

The Amap web page initially returned a login/slider challenge. The Amap connector subsequently returned usable POI details on 2026-11-13. The verified gate, Taimiao and Zhushikou church coordinates are recorded in `amap-alignment-check.json`; earlier responses remain in `amap-points.json`. POI centres establish location, not building outlines or excavation boundaries.

## Shared alignment and southern road correction

The entire display plane is rotated using the checked Wumen–Shenwumen direction. Roads, water, buildings, forest, picking and both map modes use this one projection. Geographic coordinates and distances are retained; axial sites are no longer individually forced onto x=0. The four palace corner-wall footprints determine its paving boundary, and the water layer supplies its moat. Concave wall polygons are extruded as polygons, rather than rendered as solid rectangular halls. The camera uses a parallel projection to keep parallel walls parallel; Shift-drag rotates the view and the compass is projected from geographic north.

- [Beijing Cultural Heritage Bureau: Southern Section Road Remains](https://wwj.beijing.gov.cn/bjww/362771/362782/743928533/743928539/index.html), published 2026-02-14, identifies separate protection areas, including paired Y01/Y02 remains north of Yongdingmen. It does not describe a continuous exposed ancient road.
- [Beijing Central Axis Heritage Protection Centre, republished by Beijing social-science popularisation](https://www.bjskpj.cn/bjzzx/bjzzx-jz/18036-2022-12-01-14-15-17): paired granite remains about 100 m north of the gate, stacked road remains about 400 m north, and a separate brick drainage site south of Zhushikou church.
- [Archaeological account and photographs](https://www.bjskpj.cn/bjzzx/bjzzx-sy-syzs/20083-2024-09-24-05-47-29), 2024-09-25: the Qing stone roadway was 4.8 m wide with three adjacent stone strips; seven road layers survive at the excavated site.

The park path uses shared longitudinal stations from the Amap gate anchor towards the mapped crossing at Xiannongtan Qianjie. Its northern control points are inferred from the paired OSM carriageways in the bundled dataset (including ways 723613424, 1010380377, 1467640121 and 127464698). This is a navigation-scale interpretation, not a surveyed excavation plan. Stone-remain display lengths are schematic. The former repeated 1.65 km ladder of fabricated excavation slabs has been removed. The Zhushikou drainage detail is still pending; its location must not be conflated with the Yongdingmen remains.

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

## Courtyard collision corrections

The Taimiao perimeter now follows bundled wall ways 684772294, 684772301, 685106006, 685106007, 685107465 and 685107468. Its three main halls use ways 684772333, 684772314 and 60540211. Shejitan uses perimeter ways 687587940–687587943, hall 60540199 and open altar 687599164. Their former fixed rectangles and arbitrarily extended wings were removed. Zhongshan Park Concert Hall (149216919) keeps its mapped outline with a modern flat roof.

Tiantan's authored halls, gates and corridor have exclusive footprint ownership, so the generic building pass cannot duplicate them. The prayer compound extents come from its mapped gates, side halls and Huangqiandian; wall segments leave openings at intersecting mapped gate roofs. The long corridor retains way 31099286's bent outline. The Circular Mound center is inferred from opposing Lingxing gates 727026433 and 727026437, with 727026438 and 727026439 completing the four-sided arrangement. This replaces the erroneous fixed offset from Huangqiongyu. Circular terrace sizes, railing patterns and courtyard wall heights remain schematic. The Echo Wall now has physical inner and outer surfaces with a local procedural brick texture; no external image is required at runtime.
