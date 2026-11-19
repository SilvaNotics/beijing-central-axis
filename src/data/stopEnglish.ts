/**
 * 游览停靠点的英文名。表里查不到的，退回该遗产项的 enName（见 heritage.ts）。
 * 停靠点颗粒度比遗产项细：故宫、天坛、广场、南段道路在游览里被拆成若干单体。
 */
export const stopEnglish: Record<string, string> = {
  '南段道路 · 石板道路': 'Southern Section Road · Stone Paving',
  '南段道路 · 叠压遗存': 'Southern Section Road · Overlaid Remains',
  '广场 · 毛主席纪念堂': "Square · Chairman Mao Memorial Hall",
  '广场 · 人民英雄纪念碑': "Square · Monument to the People's Heroes",
  '圜丘坛': 'Circular Mound Altar',
  '皇穹宇': 'Imperial Vault of Heaven',
  '祈年殿': 'Hall of Prayer for Good Harvests',
  '太岁殿': 'Hall of Tai Sui',
  '中山堂': 'Zhongshan Hall',
  '寝殿': 'Hall of Rest',
  '太和门': 'Gate of Supreme Harmony',
  '太和殿': 'Hall of Supreme Harmony',
  '保和殿': 'Hall of Preserving Harmony',
  '乾清门': 'Gate of Heavenly Purity',
  '乾清宫': 'Palace of Heavenly Purity',
  '交泰殿': 'Hall of Union',
  '坤宁宫': 'Palace of Earthly Tranquility',
  '钦安殿': 'Hall of Imperial Peace',
  '神武门': 'Gate of Divine Might',
  '万春亭': 'Wanchun Pavilion',
  '寿皇殿': 'Shouhuang Hall',
  '鼓楼': 'Drum Tower',
  '钟楼': 'Bell Tower'
};
