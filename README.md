# **CMA Qualification Capability Crawler Tools**

## Project Overview

The Guangdong Provincial Market Supervision Administration publishes the CMA qualification and capability scopes of all inspection and testing institutions within the province. However, this data is scattered across multiple pages and cannot be directly exported or batch-queried. This toolset provides Tampermonkey user scripts that automatically crawl and export the data as CSV files, enabling efficient searching, comparison, and analysis.

**Target Users**: Laboratory quality personnel, business development staff, industry researchers, regulatory agencies.

## Repository Contents

```text
cma-crawler-tools/
├── README.md                              # Project documentation
├── CHANGELOG.md                           # Version history
├── LICENSE                                # MIT License
├── scripts/
│   ├── cma-ability-crawler.user.js        # CMA capability scope crawler (main tool)
│   ├── cma-parameter-crawler.user.js      # CMA parameter library crawler (auxiliary)
│   └── README.md                          # Script usage instructions
├── docs/
│   ├── how-it-works.md                    # Technical design
│   ├── demo-screenshots/                  # Screenshots
│   │   ├── panel.png
│   │   ├── exported-csv.png
│   │   └── sample-data.png
│   └── field-mapping.md                   # CSV field mapping
└── examples/
    └── sample-cma-data.csv                # Sample data (anonymized)
```

## Core Tools

|Tool|Function|Use Case|
|----|--------|--------|
|CMA Capability Scope Crawler|Auto-crawl institution capability tables across multiple pages|Query a specific institution's full testing capabilities; compare with peer institutions|
|CMA Parameter Library Crawler	Crawl the CMA parameter library table|Quickly export all standard parameters for a specific domain|

## Why This Tool Matters

|Problem|Solution|
|-------|--------|
|Data is displayed across 10+ pages, cannot be copied in bulk|Auto-flip pages and collect all data in one go|
|Manual copy-paste takes 20-30 minutes per institution|Complete the task in under 2 minutes|
|No way to compare multiple institutions side-by-side|Export to CSV for Excel analysis and comparison|
|Business development teams need to quickly identify competitor capabilities|Instant access to comprehensive capability data|

## Quick Start

*Prerequisites*

1. Tampermonkey Extension

- [Tampermonkey for Chrome](https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?pli=1)
- [Tampermonkey for Firefox](https://addons.mozilla.org/zh-CN/firefox/addon/tampermonkey/)

2. Access Permission

- You must have access to the Guangdong Provincial Market Supervision Administration public platform

## Installation

- Option 1: One-Click Installation

Click the links below to install directly (Tampermonkey will open the installation dialog):

- [Install CMA Capability Scope Crawler](https://www.tampermonkey.net/script_installation.php#url=https://scripts/cma-ability-crawler.user.js)
- [Install CMA Parameter Library Crawler](https://www.tampermonkey.net/script_installation.php#url=https://scripts/cma-parameter-crawler.user.js)

- Option 2: Manual Installation
1. Open Tampermonkey Dashboard
2. Click "Create a new script"
3. Copy the script content from the scripts/ directory
4. Save (Ctrl+S)

## Usage

*For Capability Scope Export (Main Tool)*

1. Navigate to an institution's detail page on the Guangdong Provincial Market Supervision Administration platform
2. Look for the "📊 数据采集工具" (Data Collection Tool) panel in the upper right corner
3. Click "▶ 开始采集" (Start Crawling)
4. The tool will:

- Automatically detect total pages
- Crawl each page one by one
- Display real-time progress (current page, total records, elapsed time)

5. Upon completion, the CSV file will automatically download
6. The file name format: {Institution Name}_CMA能力范围.csv

*For Parameter Library Export (Auxiliary Tool)*

1. Navigate to the CMA parameter library page with your selected domain and profession
2. Click the "▶ CMA在库参数导出" (Export CMA Parameter Library) button in the upper right corner
3. Wait for the crawl to complete
4. The CSV file will automatically download

## Interface Preview

|UI Element|Description|
|----------|-----------|
|Status indicator|Displays current status: Idle / Crawling / Completed / Error|
|Progress bar|Visual progress of page crawling|
|Page counter|Current page / Total pages|
|Record counter|Total records collected so far|
|Timer|Elapsed time|
|Start/Stop buttons|Control the crawling process|
|Export button|Manual export (data is auto-exported upon completion)|

## Configuration Parameters

*Both scripts include configurable parameters at the top of the file*:

|Parameter|Default|Description|
|---------|-------|-----------|
|delayBetweenPages|1200ms|Delay between page navigations (adjust if network is slow)|
|maxEmptyPages|3|Maximum consecutive empty pages before stopping|
|WAIT_TABLE_MS|1000ms|Wait time for table to load after page navigation|
|MAX_PAGE_FAIL|3|Maximum consecutive page failures before aborting|

## Technical Architecture
### How It Works
````text
┌─────────────────────────────────────────────────────────────────────┐
│                     CMA Capability Crawler                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. User navigates to institution detail page                      │
│                    ↓                                                │
│  2. UI panel appears automatically                                 │
│                    ↓                                                │
│  3. User clicks "Start"                                            │
│                    ↓                                                │
│  4. Script detects table structure                                 │
│                    ↓                                                │
│  5. Extracts header (once, from first page)                        │
│                    ↓                                                │
│  6. Extracts data rows from current page                           │
│                    ↓                                                │
│  7. Finds and clicks "Next Page" button                            │
│                    ↓                                                │
│  8. Waits for page to load                                         │
│                    ↓                                                │
│  9. Repeats steps 4-8 until last page                              │
│                    ↓                                                │
│  10. Generates CSV with BOM (UTF-8)                                │
│                    ↓                                                │
│  11. Triggers automatic download                                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
````

## Key Design Decisions

|Decision|Rationale|
|--------|---------|
|Tampermonkey|Client-side execution, no server required, works within browser|
|DOM parsing|Relies on stable DOM structure of the target website|
|CSV output|Universally readable format, opens in Excel/Numbers/LibreOffice|
|UTF-8 with BOM|Ensures Chinese characters display correctly in Excel|
|Progress UI|Provides real-time feedback for long-running tasks|
|Stop button|Allows users to interrupt the process at any time|

## Data Flow
```
graph LR
    A[Web Page] --> B[DOM Parser]
    B --> C[Data Buffer]
    C --> D[CSV Builder]
    D --> E[Browser Download]
    
    subgraph "Control Loop"
        F[Pagination Detector] --> G[Page Navigator]
        G --> B
    end
```

## Sample Output

### CSV Structure

|Column|Description|Example|
|------|-----------|-------|
|序号|Serial number|1|
|检测项目类别|Test item category|食品检测|
|检测项目名称|Test item name|铅含量测定|
|检测标准/方法|Standard/method|GB 5009.12-2017|
|检测参数|Detection parameter|铅(Pb)|
|检测范围|Detection range|0.1-100 mg/kg|
|备注|Remarks|-|

>Note: Actual columns may vary depending on the institution's specific capability table structure.

## Troubleshooting

|Issue|Solution|
|-----|--------|
|Script does not appear|Ensure Tampermonkey is enabled and the URL matches https://amr.gd.gov.cn/xksp/public/*|
|No data exported|Check if the page contains a table. Try refreshing the page and restarting|
|CSV shows garbled text|Excel: Open via Data → From Text/CSV and select UTF-8 encoding|
|Crawl stuck on a page|Click the stop button and restart. Check if the page has loaded completely|
|"No such table" error|The page structure may have changed. Please open an issue on GitHub|

## Future Enhancements

- Multi-institution batch crawling

- Export to Excel (.xlsx) format

- Filter by specific columns (e.g., only export "食品检测")

- Data deduplication

- Comparison mode for multiple institutions

- Save to cloud storage (Google Drive, etc.)

## Contributing

This project is primarily a personal portfolio piece, but contributions are welcome. Please open an issue or submit a pull request for any improvements.

## License

MIT License - free to use, share, and adapt with attribution.

## About the Author

Gilbert Chen – Laboratory quality management professional with 15 years of cross-industry experience. This tool reflects my approach: Identify industry pain points → Design practical automation → Deliver immediate value.

- GitHub: [GilbertChen86](https://github.com/GilbertChen86)

- Project Repository: [cma-crawler-tools](https://github.com/GilbertChen86/cma-crawler-tools)

# **CMA资质能力采集工具集**

## 项目简介

广东省市场监督管理局公示了全省检验检测机构的CMA资质能力范围，但数据分散在多个页面，无法直接导出或批量查询。本工具集通过Tampermonkey用户脚本，一键采集并导出为CSV格式，便于后续查询、比对和分析。

**适用用户**：实验室质量人员、业务发展人员、行业研究者、监管部门。

## 仓库结构

```text
cma-crawler-tools/
├── README.md                              # 项目文档
├── CHANGELOG.md                           # 版本历史
├── LICENSE                                # MIT许可证
├── scripts/
│   ├── cma-ability-crawler.user.js        # CMA能力范围爬虫（主工具）
│   ├── cma-parameter-crawler.user.js      # CMA参数库爬虫（辅助工具）
│   └── README.md                          # 脚本使用说明
├── docs/
│   ├── how-it-works.md                    # 技术设计说明
│   ├── demo-screenshots/                  # 演示截图
│   │   ├── panel.png
│   │   ├── exported-csv.png
│   │   └── sample-data.png
│   └── field-mapping.md                   # CSV字段映射说明
└── examples/
    └── sample-cma-data.csv                # 示例数据（已脱敏）
```

## 核心工具

|工具|功能|适用场景|
|----|----|--------|
|CMA能力范围爬虫|自动翻页抓取机构资质能力表|查询特定机构的全部检测能力，对比同行业机构|
|CMA参数库爬虫|抓取CMA参数库表格|快速导出特定领域的全部标准参数|

## 为什么需要这个工具

|痛点|解决方案|
|----|--------|
|数据分散在10+页，无法批量复制|自动翻页，一次性采集全部数据|
|手动复制粘贴每机构需20-30分钟|2分钟内自动完成|
|无法横向对比多家机构|导出CSV后在Excel中分析比对|
|业务拓展需快速了解竞品能力|即时获取完整能力数据|

## 快速开始

### 前置条件

1. 安装Tampermonkey扩展

- [Chrome版 Tampermonkey]https://chromewebstore.google.com/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?pli=1)

- [Firefox版 Tampermonkey](https://www.tampermonkey.net/script_installation.php#url=https://scripts/cma-parameter-crawler.user.js)


2. 访问权限

- 需能访问广东省市场监督管理局公示平台

3. 安装脚本

- 方式一：一键安装

点击以下链接直接安装（Tampermonkey会弹出安装对话框）：

- 安装[CMA能力范围爬虫](https://www.tampermonkey.net/script_installation.php#url=https://scripts/cma-ability-crawler.user.js)

- 安装[CMA参数库爬虫](https://www.tampermonkey.net/script_installation.php#url=https://scripts/cma-parameter-crawler.user.js)

- 方式二：手动安装

1. 打开Tampermonkey仪表板
2. 点击"创建新脚本"
3. 从 scripts/ 目录复制脚本内容
4. 保存（Ctrl+S）

## 使用方法
### 能力范围导出（主工具）
1. 进入广东省市场监管局平台中某机构详情页
2. 页面右上角会出现 "📊 数据采集工具" 面板
3. 点击 "▶ 开始采集"
4. 工具将自动：
- 检测总页数
- 逐页抓取数据
- 实时显示进度（当前页、总记录数、用时）
5. 完成后自动下载CSV文件
6. 文件名格式：{机构名称}_CMA能力范围.csv

### 参数库导出（辅助工具）

1. 进入CMA参数库页面，选择领域和专业类别
2. 点击右上角 "▶ CMA在库参数导出" 按钮
3. 等待采集完成
4. CSV文件自动下载

## 界面说明
|UI元素|说明|
|------|----|
|状态指示器|显示当前状态：就绪/采集中/完成/错误|
|进度条|翻页进度可视化|
|页码|当前页 / 总页数|
|数据计数|已采集的记录总数|
|计时器|已用时间|
|开始/停止按钮|控制采集进程|
|导出按钮|手动导出（完成后自动导出）|

## 配置参数

两个脚本均在文件顶部包含可调参数：

|参数|默认值|说明|
|----|------|----|
|delayBetweenPages|1200ms|翻页间隔（网络慢时可调大）|
|maxEmptyPages|3|最大连续空页数后停止|
|WAIT_TABLE_MS|1000ms|翻页后等待表格加载的时间|
|MAX_PAGE_FAIL|3\最大连续失败页数后终止|

## 技术架构

### 工作原理

```text
┌─────────────────────────────────────────────────────────────────────┐
│                     CMA能力范围爬虫                                 │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. 用户进入机构详情页                                             │
│                    ↓                                                │
│  2. UI面板自动出现                                                 │
│                    ↓                                                │
│  3. 用户点击"开始"                                                 │
│                    ↓                                                │
│  4. 脚本检测表格结构                                               │
│                    ↓                                                │
│  5. 提取表头（仅首页一次）                                         │
│                    ↓                                                │
│  6. 提取当前页数据行                                               │
│                    ↓                                                │
│  7. 找到并点击"下一页"按钮                                         │
│                    ↓                                                │
│  8. 等待页面加载                                                   │
│                    ↓                                                │
│  9. 重复步骤4-8直到最后一页                                        │
│                    ↓                                                │
│  10. 生成带BOM的CSV文件（UTF-8）                                   │
│                    ↓                                                │
│  11. 触发自动下载                                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## 关键设计决策

|决策|原因|
|----|----|
|Tampermonkey|客户端执行，无需服务器，浏览器内运行|
|DOM解析|基于目标网站稳定的DOM结构|
|CSV输出|通用格式，Excel/Numbers/LibreOffice均可打开|
|UTF-8 with BOM|确保Excel中中文显示正常|
|进度UI|长任务提供实时反馈|
|停止按钮|用户可随时中断|


## 数据流
```
graph LR
    A[网页] --> B[DOM解析器]
    B --> C[数据缓存]
    C --> D[CSV构建器]
    D --> E[浏览器下载]
    
    subgraph "控制循环"
        F[分页检测器] --> G[页面导航器]
        G --> B
    end

```


## 示例输出

### CSV结构

|列名|说明|示例|
|----|----|----|
序号|行号|1|
|检测项目类别|检测分类|食品检测|
检测项目名称\具体项目|铅含量测定|
检测标准/方法|执行标准|GB 5009.12-2017|
检测参数|检测参数|铅(Pb)|
检测范围|检测范围|0.1-100 mg/kg|
|备注|附加说明|-|

>注意：实际列名可能因机构而异，取决于其能力表的字段结构。

## 常见问题
|问题|解决方案|
|----|--------|
|脚本不显示|确保Tampermonkey已启用，且URL匹配 https://amr.gd.gov.cn/xksp/public/*|
|无数据导出|检查页面是否包含表格，尝试刷新页面后重新开始|
|CSV乱码|Excel：通过 数据 → 从文本/CSV 导入，选择UTF-8编码|
|卡在某一页|点击停止按钮后重新开始，检查该页是否加载完成|
|"未找到表格"错误|页面结构可能已变化，请在GitHub提交Issue|

## 未来增强

- 多机构批量采集
- 导出Excel (.xlsx) 格式
- 按列筛选导出（如仅导出"食品检测"）
- 数据去重
- 多机构对比模式
- 云存储（Google Drive等）

## 贡献

本项目主要为个人作品集展示，但也欢迎贡献。如有改进建议，请提交Issue或Pull Request。

## 许可证

MIT License —— 可自由使用、分享、改编，请保留署名。

## 关于作者

Gilbert Chen —— 实验室质量管理从业者，15年跨行业经验。本工具体现了我的方法：发现行业痛点 → 设计实用自动化工具 → 创造即时价值。
