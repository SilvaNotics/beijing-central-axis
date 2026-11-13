import type { Landmark, Region, Source } from './types';

// GCJ-02 display anchors; footprints are approximate east-west / north-south metres.
// They are illustration dimensions, not surveyed heritage boundaries.
export const landmarks: Landmark[] = [
  {
    "id": "bell-drum",
    "name": "钟鼓楼",
    "enName": "Bell and Drum Towers",
    "region": "north",
    "category": "古代城市管理设施",
    "era": "元代肇建 · 明清重建",
    "coords": [
      116.3959,
      39.94155
    ],
    "footprint": [
      150,
      280
    ],
    "kind": "tower",
    "summary": "钟楼与鼓楼一北一南，构成北京中轴线的北端。两楼曾是元、明、清都城的报时中心，以钟鼓声协调城市生活。它们以高耸的体量从平缓的胡同屋顶间显现，将城市管理、日常节律与都城空间联系在一起。",
    "fact": "钟楼、鼓楼合为一项遗产构成要素。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "wanning",
    "name": "万宁桥",
    "enName": "Wanning Bridge",
    "region": "north",
    "category": "居中道路遗存",
    "era": "元至元二十二年 · 1285",
    "coords": [
      116.396105,
      39.936545
    ],
    "footprint": [
      50,
      45
    ],
    "kind": "bridge",
    "summary": "万宁桥位于地安门外大街，跨越什刹海通向玉河的水道。石桥建于元代，桥下曾设澄清上闸，是理解大都城水陆交通关系的重要实物。道路在此跨水而行，使南北中轴与大运河相关水系在城市中心相遇。",
    "fact": "桥与澄清上闸遗址共同保存了元代水利交通的线索。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "jingshan",
    "name": "景山",
    "enName": "Jingshan Hill",
    "region": "north",
    "category": "古代皇家宫苑建筑",
    "era": "明代成形 · 清代完善",
    "coords": [
      116.396551,
      39.925875
    ],
    "footprint": [
      510,
      550
    ],
    "kind": "hill",
    "summary": "景山南依故宫，西邻北海，是北京老城中轴上的山岳标志。皇家园林以山体抬升视线，令宫城、街巷与远处的钟鼓楼形成层次分明的景观。由山顶向南望，紫禁城的院落与屋脊次第展开，都城居中的规划秩序清晰可读。",
    "fact": "景山曾是北京城中心的最高点。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "forbidden-city",
    "name": "故宫",
    "enName": "The Forbidden City",
    "region": "central",
    "category": "古代皇家宫苑建筑",
    "era": "明永乐十八年建成 · 1420",
    "coords": [
      116.397029,
      39.917839
    ],
    "footprint": [
      753,
      961
    ],
    "kind": "palace",
    "summary": "紫禁城是明清两代的皇宫，也是中轴线宫苑序列的核心。重重宫门、院落与大殿沿南北方向展开，外朝与内廷以不同空间尺度承载礼仪与生活。昔日宫城于二十世纪转为博物馆，建筑本身与院藏文物共同讲述都城的历史。",
    "fact": "故宫博物院于1925年10月10日成立。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "shejitan",
    "name": "社稷坛",
    "enName": "Altar of Land and Grain",
    "region": "central",
    "category": "古代皇家祭祀建筑",
    "era": "明永乐十八年 · 1420",
    "coords": [
      116.394822,
      39.911235
    ],
    "footprint": [
      410,
      470
    ],
    "kind": "altar",
    "summary": "社稷坛位于宫城前方西侧，是明清皇帝祭祀土地神与五谷神的场所，与东侧太庙呼应。坛庙将农耕社会对土地、谷物与国家的认识纳入都城格局。近代开辟为公园后，古坛、院墙和树木继续保存着礼制空间的基本结构。",
    "fact": "它与太庙构成“左祖右社”的都城礼制布局。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "taimiao",
    "name": "太庙",
    "enName": "Imperial Ancestral Temple",
    "region": "central",
    "category": "古代皇家祭祀建筑",
    "era": "明永乐十八年 · 1420",
    "coords": [
      116.4012,
      39.9118
    ],
    "footprint": [
      430,
      460
    ],
    "kind": "temple",
    "summary": "太庙位于天安门东侧，是明清皇帝祭祀祖先的宗庙，与西侧社稷坛形成对称关系。享殿、寝殿、祧庙与层层院墙构成肃穆的祭祀序列。这里在1950年成为劳动人民文化宫，皇家礼制建筑由此延续出面向公众的文化生活。",
    "fact": "1950年5月1日，劳动人民文化宫向公众开放。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "duanmen",
    "name": "端门",
    "enName": "Duanmen Gate",
    "region": "central",
    "category": "古代皇家宫苑建筑",
    "era": "明代 · 清代修葺",
    "coords": [
      116.397413,
      39.910396
    ],
    "footprint": [
      110,
      65
    ],
    "kind": "gate",
    "summary": "端门坐落在天安门与午门之间，是进入宫城前的礼仪门阙。它与前后相继的城门共同限定行进方向，通过院落的收放和建筑体量的变化，逐步强化宫廷空间的秩序。沿中轴穿行至此，可以感受到由皇城进入宫城的层层递进。",
    "fact": "端门是明清进出宫城前导性礼仪序列的一环。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "jinshui",
    "name": "外金水桥",
    "enName": "Outer Jinshui Bridges",
    "region": "central",
    "category": "国家礼仪和公共建筑",
    "era": "明代 · 清代修葺",
    "coords": [
      116.397663,
      39.908002
    ],
    "footprint": [
      260,
      35
    ],
    "kind": "bridge",
    "summary": "外金水桥横跨天安门前的外金水河，七座桥以中轴为中心排列。桥的位置与天安门券门及两侧坛庙南门对应，宽度与石栏细部体现礼仪等级。桥与河共同构成进入皇城前的横向界面，也让中轴的行进节奏在水岸前短暂停驻。",
    "fact": "七座桥共同组成这一遗产构成要素。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "tiananmen",
    "name": "天安门",
    "enName": "Tiananmen Gate",
    "region": "south",
    "category": "国家礼仪和公共建筑",
    "era": "明代肇建 · 清代改建",
    "coords": [
      116.397488,
      39.908717
    ],
    "footprint": [
      120,
      65
    ],
    "kind": "gate",
    "summary": "天安门是明清皇城的正门，处于宫城前导礼仪序列与现代公共空间的交接处。这里曾用于颁布诏令，也见证了中华人民共和国的成立。城楼、华表、石狮与前方广场相互映衬，记录中轴线从皇家都城走向现代首都的历史变革。",
    "fact": "天安门持续承担重大国家礼仪活动的空间角色。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "square",
    "name": "天安门广场及建筑群",
    "enName": "Tiananmen Square Complex",
    "region": "south",
    "category": "国家礼仪和公共建筑",
    "era": "明代起源 · 20世纪中叶扩建",
    "coords": [
      116.397755,
      39.903182
    ],
    "footprint": [
      1050,
      880
    ],
    "kind": "square",
    "summary": "天安门广场及建筑群延续中轴居中、两侧均衡的原则，将古都秩序转化为现代公共空间。人民英雄纪念碑与毛主席纪念堂位于轴线上，人民大会堂和中国国家博物馆分列东西。广场的开放尺度体现了中轴线在二十世纪的公共化转变。",
    "fact": "一项遗产构成要素包含广场及四组重要公共建筑。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "zhengyang",
    "name": "正阳门",
    "enName": "Zhengyangmen Gate",
    "region": "south",
    "category": "古代城市管理设施",
    "era": "明永乐十七年 · 1419",
    "coords": [
      116.397902,
      39.900583
    ],
    "footprint": [
      120,
      220
    ],
    "kind": "gate",
    "summary": "正阳门俗称前门，是明清北京内城的正南门，城楼与箭楼沿中轴南北相望。它兼具城市防御、管理和礼仪功能，连接皇城方向的庄严空间与南侧繁华街市。两座楼体之间的开阔地段，也留下近代城市交通改变城门格局的痕迹。",
    "fact": "正阳门是老北京“京师九门”之一。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "tiantan",
    "name": "天坛",
    "enName": "Temple of Heaven",
    "region": "south",
    "category": "古代皇家祭祀建筑",
    "era": "明永乐十八年 · 1420",
    "coords": [
      116.410829,
      39.881913
    ],
    "footprint": [
      1650,
      1780
    ],
    "kind": "temple",
    "summary": "天坛位于中轴线南段东侧，是明清皇帝祭天、祈谷的坛庙建筑群。祈年殿、皇穹宇与圜丘通过礼仪道路联系，坛墙、古树和开阔空间共同构成祭祀环境。它与西侧先农坛形成均衡关系，体现都城对天时、农业和国家礼仪的重视。",
    "fact": "天坛占地约273公顷，1998年列入世界遗产名录。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis",
      "unesco-tiantan"
    ]
  },
  {
    "id": "xiannongtan",
    "name": "先农坛",
    "enName": "Altar of the God of Agriculture",
    "region": "south",
    "category": "古代皇家祭祀建筑",
    "era": "明永乐十八年 · 1420",
    "coords": [
      116.393164,
      39.879311
    ],
    "footprint": [
      680,
      650
    ],
    "kind": "altar",
    "summary": "先农坛位于中轴线南段西侧，和天坛分列两旁，是明清皇帝祭祀先农并举行亲耕礼的地方。祭坛、殿宇与耤田将农事活动纳入国家礼仪，表达重农的治国观念。现存建筑群与北京古代建筑博物馆一起，呈现中国传统营造与农耕文化。",
    "fact": "皇帝亲耕的耤田留下了“一亩三分地”的文化记忆。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "southern-road",
    "name": "中轴线南段道路遗存",
    "enName": "Southern Section Road Remains",
    "region": "south",
    "category": "居中道路遗存",
    "era": "明清道路 · 考古遗存",
    "coords": [
      116.399324,
      39.879879
    ],
    "footprint": [
      35,
      1650
    ],
    "kind": "road",
    "summary": "南段道路遗存保存了中轴线作为真实行进路线的物质证据。珠市口以南道路、排水沟渠与永定门附近石板道等遗存，把城门、坛庙和城市公共空间连成序列。它们并非一条完整裸露的古路，而是散布在今天城市中的历史片段。",
    "fact": "该项遗产包含多处道路与排水遗存，不能等同于整条现代街道。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  },
  {
    "id": "yongdingmen",
    "name": "永定门",
    "enName": "Yongdingmen Gate",
    "region": "south",
    "category": "古代城市管理设施",
    "era": "明嘉靖三十二年 · 1553",
    "coords": [
      116.399324,
      39.872468
    ],
    "footprint": [
      80,
      100
    ],
    "kind": "gate",
    "summary": "永定门是北京外城的正南门，也是中轴线的南端标志。它与北方的正阳门、宫城和钟鼓楼共同限定都城南北序列。原城楼在二十世纪拆除后于二十一世纪初复建，今天的城楼与地面标识共同展示历史门址的空间关系。",
    "fact": "现存城楼为21世纪初复建，并非明代原构。",
    "sourceIds": [
      "beijing-axis",
      "unesco-axis"
    ]
  }
];

export const regions: Region[] = [
  {
    "id": "north",
    "title": "北段 · 晨钟山水",
    "kicker": "CHAPTER 01 · THE NORTHERN RHYTHM",
    "subtitle": "从城市的时间，走向山水的中心",
    "description": "钟鼓声确定城市节律，万宁桥让水陆交通交汇，景山将目光引向南方。北段保存了元大都以来中轴空间的重要线索。",
    "color": "#7e9da4",
    "entryUrl": "./chapters/north/index.html",
    "siteIds": [
      "bell-drum",
      "wanning",
      "jingshan"
    ]
  },
  {
    "id": "central",
    "title": "中段 · 宫阙礼序",
    "kicker": "CHAPTER 02 · THE IMPERIAL ORDER",
    "subtitle": "重门层叠，读懂一座都城的秩序",
    "description": "故宫居中，太庙与社稷坛分列两侧，端门与外金水桥延续礼仪序列。在院落、门阙与水岸之间，传统都城的空间法则逐渐显现。",
    "color": "#c59a59",
    "entryUrl": "./chapters/central/index.html",
    "siteIds": [
      "forbidden-city",
      "shejitan",
      "taimiao",
      "duanmen",
      "jinshui"
    ]
  },
  {
    "id": "south",
    "title": "南段 · 家国长街",
    "kicker": "CHAPTER 03 · THE CIVIC HORIZON",
    "subtitle": "从国家礼仪，走向大地与生活",
    "description": "天安门与广场展开现代首都的公共空间，正阳门以南，道路串起东西坛庙，直达永定门。历史道路与城市生活在南段彼此交织。",
    "color": "#a47358",
    "entryUrl": "./chapters/south/index.html",
    "siteIds": [
      "tiananmen",
      "square",
      "zhengyang",
      "tiantan",
      "xiannongtan",
      "southern-road",
      "yongdingmen"
    ]
  }
];

export const sources: Source[] = [
  {
    "id": "unesco-tiantan",
    "title": "UNESCO｜北京皇家祭坛—天坛",
    "url": "https://whc.unesco.org/en/list/881/",
    "note": "天坛独立世界遗产项目；历史格局与祭天礼仪。"
  },
  {
    "id": "unesco-axis",
    "title": "UNESCO｜北京中轴线世界遗产",
    "url": "https://whc.unesco.org/en/list/1714/",
    "note": "世界遗产官方说明，遗产价值、历史演变与15项构成要素。"
  },
  {
    "id": "beijing-axis",
    "title": "首都之窗｜北京中轴线",
    "url": "https://www.beijing.gov.cn/renwen/zt/pwzz/",
    "note": "北京市政府专题；逐项核对名称、区位、历史功能与年代。"
  },
  {
    "id": "beijing-components",
    "title": "北京旅游网｜15个遗产构成要素",
    "url": "https://www.visitbeijing.com.cn/article/4InqF5nPNRA",
    "note": "2024年7月29日公布的15项完整名单；钟鼓楼合为一项。"
  },
  {
    "id": "beijing-plan",
    "title": "北京市政府｜中轴线遗产全景与保护规划",
    "url": "https://www.beijing.gov.cn/ywdt/gzdt/202211/t20221128_2866699.html",
    "note": "中轴线长度、沿线连接道路、东西对称坛庙与保护范围的背景。"
  },
  {
    "id": "beijing-water",
    "title": "首都之窗｜北京的“六海”",
    "url": "https://www.beijing.gov.cn/renwen/jrbj/sjc/201702/t20170223_1874494.html",
    "note": "什刹海、北海、中南海水系位置关系；不提供测绘边界。"
  },
  {
    "id": "amap-geocoder",
    "title": "高德地图｜地理编码与POI检索",
    "url": "https://lbs.amap.com/api/webservice/guide/api/georegeo",
    "note": "2026年11月13日检索；GCJ-02坐标，原始响应与筛选限制见本地研究记录。"
  },
  {
    "id": "osm-geodata",
    "title": "OpenStreetMap｜建筑、道路与水系",
    "url": "https://www.openstreetmap.org/copyright",
    "note": "© OpenStreetMap contributors，ODbL 1.0；2026-11-13下载的WGS84原始轮廓，渲染时统一转换为GCJ-02。"
  }
];

