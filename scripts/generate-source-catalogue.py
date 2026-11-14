#!/usr/bin/env python3
"""Render the local source register without fetching or changing verification dates."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
RESEARCH = ROOT / 'docs/research'
LABELS = {
    'publisher': '机构 / 提供方', 'author': '作者', 'url': '原始来源 URL',
    'originalUrl': '原始出处', 'kind': '资料类型', 'titleStyle': '题名口径',
    'recordedOn': '登记日期', 'verifiedOn': '原记录核验日期',
    'capturedOn': '采集日期', 'publishedOn': '发布日期', 'verifiedTitle': '核验题名',
    'reviewStatus': '原记录核验状态', 'supports': '支持的结论', 'limits': '限制与待补',
    'evidenceRecord': '本地记录', 'license': '许可', 'pages': '页码',
    'localReference': '原本地参考位置（可能未随仓库归档）',
    'imageSource': '图片出处', 'referenceImages': '图片记录',
    'localVerification': '本地核对', 'localVerifications': '分轮本地核对',
    'onlineVerifications': '分轮联网核验', 'detailReview': '细部复核',
    'interiorModelReview': '内部模型复核', 'modelUseReview': '模型使用复核',
}


def generate():
    register = json.loads((RESEARCH / 'source-register.json').read_text())
    sources = register['sources']
    remote = sum(bool(source.get('url')) for source in sources)
    reviewed_on = register.get('documentationReview', {}).get('reviewedOn', register['compiledOn'])
    lines = [
        '# 研究来源目录', '',
        f'本地重整日期：{reviewed_on}。结构化登记共 **{len(sources)} 条**，其中 {remote} 条有来源 URL，'
        f'{len(sources)-remote} 条未登记外部 URL。空 URL 明确标为待补，不参与外部链接去重。', '',
        '本页由 [source-register.json](source-register.json) 生成。生成命令为 '
        '`python3 scripts/generate-source-catalogue.py`，在仓库根目录运行。'
        '仅重排本地登记，不访问外链，不改变各条核验日期和状态。', '',
        '文字、地图、照片和用户反馈各自只能支持其适用结论；图片作者、许可、页码及原文归档缺口按原记录保留。'
        '分轮追加的旧编排见 [历史目录](source-catalogue-history.md)。', '',
        '## 来源索引', '',
        '| ID | 题名 | 提供方 |', '| --- | --- | --- |',
    ]
    for source in sources:
        lines.append(f"| [{source['id']}](#{source['id'].lower()}) | {source['title']} | {source.get('publisher', '待补')} |")
    for source in sources:
        # Explicit ID anchors remain stable if a descriptive title later changes.
        lines += ['', f'<a id="{source["id"].lower()}"></a>', '', f'## {source["id"]} · {source["title"]}', '']
        for key, value in source.items():
            if key in ('id', 'title'):
                continue
            label = LABELS.get(key, key)
            if isinstance(value, (dict, list)):
                lines += [f'**{label}**', '', '```json', json.dumps(value, ensure_ascii=False, indent=2), '```', '']
            elif value is None or value == '':
                lines += [f'- {label}：待补；本轮未编造。']
            elif key == 'url':
                lines += [f'- {label}：[打开原始来源]({value})。']
            elif key == 'evidenceRecord':
                candidate = value.split('#')[0]
                target = candidate.removeprefix('docs/research/')
                if (RESEARCH / target).is_file():
                    fragment = '#' + value.split('#', 1)[1] if '#' in value else ''
                    lines += [f'- {label}：[专题记录]({target}{fragment})。']
                else:
                    lines += [f'- {label}：{value}。']
            else:
                lines += [f'- {label}：{value}。']
    (RESEARCH / 'source-catalogue.md').write_text('\n'.join(lines).rstrip() + '\n')
    print(f'Generated catalogue for {len(sources)} records; no network requests.')


if __name__ == '__main__':
    generate()
