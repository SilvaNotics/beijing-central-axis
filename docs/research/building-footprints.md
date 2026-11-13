# Actual mapped building footprints

Downloaded 2026-11-13 from the public OpenStreetMap Overpass API. This supplements the earlier schematic atlas context; the original failed network attempts are historical, and a subsequent compressed POST download succeeded.

## Download and provenance

- Endpoint: `https://overpass-api.de/api/interpreter`
- Query: `[out:json][timeout:30];way[building](39.862,116.368,39.952,116.428);out tags geom qt;`
- OSM base snapshot: `2026-11-13T07:08:00Z`.
- Raw response: `docs/research/osm-buildings.raw.json.gz` (898,361 bytes gzip; 7,146,655 bytes decompressed).
- Derived public data: `public/data/buildings.json` (2,729,656 bytes UTF-8).
- CRS: **WGS84**, with every point encoded `[longitude, latitude]`. Do not overlay directly on GCJ-02 Amap points; convert only in the display pipeline.
- Query bounds: `[116.368,39.862,116.428,39.952]` in west/south/east/north order. Ways intersecting the query rectangle retain their original entire footprint, so some vertices lie outside it.
- Source and license: © OpenStreetMap contributors, [ODbL 1.0](https://www.openstreetmap.org/copyright). Display attribution to OpenStreetMap and identify the data license. Raw and derived footprint databases retain ODbL obligations; application code is separate.

## Public data contract

`buildings.json` is an object containing `coordinateSystem`, `bbox`, `source`, `notes`, and `buildings`.

Each building record contains `id` (OSM way ID), `ring` (closed WGS84 outer ring), and `building` (original OSM building class). Optional values copied from OSM include `height` in metres, `levels`, `roofHeight`, `roof` (roof:shape), and `name`. A missing height is unknown, not zero; any rendering default must be described as an estimated display height.

All 12,661 queried ways had a closed ring of at least four coordinates. None were discarded, invented, randomized, relocated or generated procedurally. Coordinates are rounded to seven decimal places for compact storage. 532 have a parseable positive height, 2,563 a parseable positive floor count, and 746 a roof-shape tag. Non-numeric or zero height/floor tags are omitted from the compact derivative while preserved in the raw response.

## Limits

This is volunteered OSM mapping, not a complete cadastral survey or a claim that every physical building is mapped. The query retrieves building **ways**, not building multipolygon relations or building parts. Height coverage is partial and roof-shape tags do not establish a fully measured roof model. Names and attributes retain the quality and temporal limits of OSM. Heritage structures must use their documented special models; regular surroundings can extrude these real footprints with clearly labelled display-height assumptions.

## Access attempts

The successful command used direct network access (`curl --noproxy "*"`), POST query parameters, a descriptive User-Agent, `--compressed`, and a bounded transfer window. The earlier 42-second transfer had already returned real JSON but stopped partway; the compressed retry completed and was validated as a full JSON document. Alternative mirror DNS failures/timeouts were not treated as proof the data did not exist.

Microsoft GlobalMLBuildingFootprints was also checked as an alternative source; its primary repository documents worldwide footprint distribution and CDLA Permissive 2.0. No Microsoft geometry is used here. GABLE and Sino_BFmap research repositories were reviewed as further routes; no downloaded geometry from those products is used.


## Actual roads, parks and lakes

`public/data/context.geojson` now supplies **real OSM geographic context**, replacing the need for schematic shapes in the visual pipeline. It is a standard WGS84 GeoJSON FeatureCollection with an explicit `coordinateSystem` foreign member, source/license metadata, and 1,641 features: 1,464 road LineStrings, 129 park Polygons and 48 water Polygons. Every feature contains `properties.kind` (`road`, `park`, `water`), `name`, `osmId`, `osmType` and original relevant OSM tags. Named roads retain highway class, lanes and width tags when mapped; missing width is not surveyed.

The initial way query used `[out:json][timeout:25];(way["water"](39.86,116.365,39.957,116.43);way["leisure"="park"](39.86,116.365,39.957,116.43);way["highway"~"^(primary|secondary|tertiary|trunk)$"](39.86,116.365,39.957,116.43););out tags geom qt;`. Its base snapshot was `2026-11-13T07:10:03Z`; raw response is cached as `docs/research/osm-context.raw.json.gz`.

Large lakes are OSM multipolygon relations, so a supplementary `[out:json][timeout:25];relation["natural"="water"](39.86,116.365,39.957,116.43);out body geom;` query retrieves member geometry. Its raw response is cached in `docs/research/osm-lakes.raw.json.gz`. Fourteen valid water multipolygons were appended, including actual 中海、南海、北海、前海、什刹后海、西海. Their inner island rings are retained as polygon holes. One aggregate `type=site` relation named 什刹海 was skipped because its three member lakes were already included individually. This avoids duplicating water polygons and filling their islands. Exterior rings are counterclockwise and island rings clockwise, following GeoJSON winding conventions.

Validation checked all 12,661 building rings against their raw OSM coordinate arrays, unique IDs and finite coordinates; all source building rings are closed. Context validation checked 1,641 unique OSM feature IDs, valid geometries, closed finite polygon rings, and inclusion of all six named inner/outer lakes. Rendering must preserve polygon holes and apply WGS84-to-GCJ02 transformation consistently with the heritage anchors. No actual data in these two public files was generated procedurally. The earlier `src/data/context.ts` remains a labelled historical schematic fallback, not the source of these downloaded geometries.
