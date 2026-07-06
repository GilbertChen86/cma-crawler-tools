# **How It Works: CMA Crawler Tools**

# **工作原理：CMA采集工具**

This document explains the technical architecture and working principles of the two CMA crawler scripts.

## Tool 1: CMA Capability Scope Crawler (v1.13)

### Purpose

This script crawls the CMA capability scope of a specific inspection and testing institution. When you open an institution's detail page on the Guangdong Provincial Market Supervision Administration platform, this script automatically extracts the entire capability table across all pages and exports it as a CSV file.

Use Case: Quality personnel need to quickly query "What can this lab test?" or compare capabilities across competing institutions.

### Workflow
```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CMA Capability Scope Crawler - Workflow                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 1: User navigates to institution detail page                   │  │
│  │  URL pattern: https://amr.gd.gov.cn/xksp/public/...                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 2: Script automatically injects UI panel (top-right corner)   │  │
│  │  Panel shows: Status | Progress bar | Page counter | Record count   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 3: User clicks "▶ Start"                                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 4: Script detects total pages from pagination control         │  │
│  │  Example: "共 23 页" → totalPages = 23                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 5: Extract header from first page (once, stored)              │  │
│  │  Table structure: thead → th[0], th[1], th[2] ...                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 6: Loop through each page                                     │  │
│  │                                                                      │  │
│  │  For page = 1 to totalPages:                                        │  │
│  │    ├── Wait for table to load (max 15 retries)                      │  │
│  │    ├── Extract data rows from tbody                                 │  │
│  │    ├── Append rows to data buffer                                   │  │
│  │    ├── Update UI (progress, record count, elapsed time)             │  │
│  │    ├── Detect if last page → break if yes                           │  │
│  │    └── Click "Next Page" button → wait for load                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 7: All pages complete                                        │  │
│  │  Total records collected: N                                        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 8: Generate and auto-download CSV file                       │  │
│  │  Format: UTF-8 with BOM (Excel-compatible)                         │  │
│  │  File name: {Institution Name}_CMA能力范围.csv                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Mechanisms

- Page Detection

The script automatically identifies pagination structure on the page:

|Detection Method|Selector|Fallback|
|----------------|--------|--------|
|Total pages|.gmd-pagination-item:last-child a|Scan all pagination items|
|Current page|.gmd-pagination-item.active a|Parse URL parameters|
|Next button|.gmd-pagination-next:not(.disabled) a|N/A|

- Table Extraction

The script relies on the stable DOM structure of the target page:

```javascript

// Extract table header
const header = table.querySelectorAll('thead tr th');
// → ["序号", "检测项目类别", "检测项目名称", "检测标准/方法", ...]

// Extract data rows
const rows = table.querySelectorAll('tbody tr');
// → [["1", "食品检测", "铅含量", "GB 5009.12-2017", ...], ...]
```

- Error Recovery

|Scenario|Handling|
|--------|--------|
|Table not loaded|Retry 15 times with 300ms intervals|
|Empty page|Continue, but stop after 3 consecutive empty pages|
|Duplicate data|Detect and retry page navigation|
|Network stall|Configurable delays (1200ms between pages)|

- UI Components

|Component|Description|
|Status indicator|就绪 / 采集中 / 完成 / 错误|
|Progress bar|Visual representation of crawling progress|
|Page counter|Current page / Total pages|
|Record counter|Total records collected|
|Timer|Elapsed time (MM:SS)|
|Start button|Initiates the crawling process|
|Stop button|Interrupts the process gracefully|
|Export button|Manual CSV export (auto-export on completion)|

## Tool 2: CMA Parameter Library Crawler (v7.0)

### Purpose

This script crawls the CMA parameter library for a selected domain and profession. When you open the parameter library page and filter by a specific domain (e.g., "食品检测") and profession (e.g., "理化"), this script extracts all standard parameters and exports them as a CSV file.

Use Case: Technical staff need to quickly export a complete list of standards and parameters for a specific testing domain, such as preparing for accreditation or method validation.

### Workflow

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CMA Parameter Library Crawler - Workflow                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 1: User navigates to CMA parameter library page               │  │
│  │  URL pattern: https://amr.gd.gov.cn/xksp/pub_platform/...           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 2: User selects domain and profession                         │  │
│  │  Example: 领域 = "食品检测", 专业 = "理化"                          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 3: Click "▶ CMA在库参数导出" button (top-right corner)        │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 4: Script auto-detects table and starts crawling              │  │
│  │  (Similar pagination logic as Tool 1)                               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 5: Auto-export CSV upon completion                            │  │
│  │  File name: {domain}_{profession}_CMA参数库.csv                      │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  Step 6: Auto-return to first page (ready for next domain)          │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Differences

|Aspect|Capability Scope Crawler|Parameter Library Crawler|
|------|------------------------|-------------------------|
|Entry point|Institution detail page|Parameter library page|
|URL pattern|/xksp/public/*|/xksp/pub_platform/*|
|Trigger|Click "Start" in UI panel|Click button on page|
|UI|Full panel with progress|Simple button|
|File naming|{机构}_CMA能力范围.csv|{领域}_{专业}_CMA参数库.csv|
|Post-export|None|Auto-return to first page|
|Validation|Comprehensive|Minimal (faster)|

## Common Technical Foundation

Both scripts share the same core technical design:

1. Tampermonkey Runtime

Both scripts are Tampermonkey user scripts that run in the browser. They are injected into the target page when the URL matches the @match pattern.

```javascript
// @match        https://amr.gd.gov.cn/xksp/public/*
// @match        https://amr.gd.gov.cn/xksp/pub_platform/*
```

2. DOM Parsing Strategy

Both scripts extract data by parsing the HTML DOM structure of the target page. No API calls are involved.

**Why DOM parsing?**

- No API endpoints are publicly available
- DOM structure is stable on the target website
- Client-side execution with no server dependency

3. CSV Export

Both scripts generate CSV files with the following specifications:

|Specification|Value|
|-------------|-----|
|Encoding|UTF-8 with BOM (Excel-compatible)|
|Delimiter|Comma (,)|
|Text qualifier|Double quotes (")|
|Header|Extracted from first page (once)|

4. Pagination Control

Both scripts use the same pagination detection and navigation logic:

```javascript
function getNextButton() {
    return document.querySelector(
        'li.gmd-pagination-next:not(.gmd-pagination-disabled) a'
    );
}

function clickNextButton() {
    const btn = getNextButton();
    if (btn) { btn.click(); return true; }
    return false;
}

```
5. Error Handling

|Mechanism|Implementation|
|---------|--------------|
|Table wait|Retry up to 15 times with 300ms intervals|
|Empty page detection|Stop after maxEmptyPages consecutive empty pages|
|Duplicate detection|Compare first row of current page with previous page|
|User interruption|stopRequested flag for graceful stop|

## Technical Dependencies

|Dependency|Purpose|
|----------|-------|
|Tampermonkey|Script runtime environment|
|Browser DOM API|querySelector, querySelectorAll|
|ES6 Promise/async|async/await for pagination control|
|Blob API|CSV file generation|
|URL API|File download|

## Performance Characteristics

|Metric|Value|
|------|-----|
|Page wait time|Configurable (default: 1200ms)|
|Table load retries|15 attempts (300ms each)|
|Memory usage|< 50MB (stores all data in memory)|
|Data volume|Up to 10,000 rows per export|

## Security & Privacy

- No data transmission: All data stays in the browser
- Local only: CSV files are downloaded to the user's local machine
- Domain restricted: Scripts only run on amr.gd.gov.cn domain
- Open source: All code is inspectable in the repository

本文档说明两个CMA采集脚本的技术架构和工作原理。

## 工具一：CMA能力范围爬虫 (v1.13)

### 用途

本脚本爬取特定检验检测机构的CMA资质能力范围。当您在广东省市场监督管理局公示平台打开某机构的详情页时，本脚本自动提取完整的能力表（跨多页）并导出为CSV文件。

使用场景：质量人员需要快速查询"这家实验室能测什么？"或比对同行业机构的能力差异。

### 工作流程

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CMA能力范围爬虫 - 工作流程                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤1：用户进入机构详情页                                          │  │
│  │  URL模式：https://amr.gd.gov.cn/xksp/public/...                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤2：脚本自动注入UI面板（右上角）                               │  │
│  │  面板显示：状态 | 进度条 | 页码 | 记录数 | 计时器                  │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤3：用户点击"▶ 开始采集"                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤4：脚本从分页控件检测总页数                                   │  │
│  │  示例："共 23 页" → totalPages = 23                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤5：从首页提取表头（仅一次，存储）                             │  │
│  │  表格结构：thead → th[0], th[1], th[2] ...                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤6：逐页循环采集                                              │  │
│  │                                                                      │  │
│  │  从 page = 1 到 totalPages：                                        │  │
│  │    ├── 等待表格加载（最多15次重试）                                  │  │
│  │    ├── 从 tbody 提取数据行                                          │  │
│  │    ├── 追加到数据缓冲区                                              │  │
│  │    ├── 更新UI（进度、记录数、用时）                                  │  │
│  │    ├── 检测是否为最后一页 → 是则退出                                 │  │
│  │    └── 点击"下一页"按钮 → 等待加载                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤7：所有页面采集完成                                           │  │
│  │  总记录数：N条                                                    │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤8：生成并自动下载CSV文件                                      │  │
│  │  格式：UTF-8带BOM（兼容Excel）                                     │  │
│  │  文件名：{机构名称}_CMA能力范围.csv                                 │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 关键机制

- 页码检测

脚本自动识别页面分页结构：

|检测方式|选择器|备用方案|
|--------|------|--------|
|总页数|.gmd-pagination-item:last-child a|扫描所有分页项|
|当前页|.gmd-pagination-item.active a|解析URL参数|
|下一页按钮|.gmd-pagination-next:not(.disabled) a|无|

- 表格提取

脚本依赖目标页面稳定的DOM结构：

```javascript

// 提取表头
const header = table.querySelectorAll('thead tr th');
// → ["序号", "检测项目类别", "检测项目名称", "检测标准/方法", ...]

// 提取数据行
const rows = table.querySelectorAll('tbody tr');
// → [["1", "食品检测", "铅含量", "GB 5009.12-2017", ...], ...]
```

### 错误恢复

|场景|处理方式|
|----|--------|
|表格未加载|重试15次，间隔300ms|
|空页|继续，但连续3页为空则停止|
|数据重复|检测到重复数据时重试翻页|
|网络延迟|可配置等待时间（默认1200ms）|

### UI组件

|组件|说明|
|----|----|
|状态指示器|就绪 / 采集中 / 完成 / 错误|
|进度条|翻页进度可视化|
|页码|当前页 / 总页数|
|记录数|已采集的总记录数|
|计时器|已用时间（分:秒）|
|开始按钮|启动爬取|
|停止按钮|优雅中断|
|导出按钮|手动导出CSV（完成时自动导出）|

## 工具二：CMA参数库爬虫 (v7.0)

### 用途

本脚本爬取特定领域和专业的CMA参数库。当您在参数库页面选择领域（如"食品检测"）和专业（如"理化"）后，本脚本提取全部标准参数并导出为CSV文件。

使用场景：技术人员需要快速导出特定检测领域的完整标准和参数清单，例如为评审或方法验证做准备。

### 工作流程

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CMA参数库爬虫 - 工作流程                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤1：用户进入CMA参数库页面                                      │  │
│  │  URL模式：https://amr.gd.gov.cn/xksp/pub_platform/...              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤2：用户选择领域和专业                                         │  │
│  │  示例：领域 = "食品检测"，专业 = "理化"                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤3：点击右上角"▶ CMA在库参数导出"按钮                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤4：脚本自动检测表格并开始采集                                 │  │
│  │  （翻页逻辑与工具一相同）                                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤5：完成后自动导出CSV                                          │  │
│  │  文件名：{领域}_{专业}_CMA参数库.csv                                │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │  步骤6：自动回到第一页（为下一个领域准备）                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 关键差异

|方面|能力范围爬虫|参数库爬虫|
|----|------------|----------|
|入口|机构详情页|参数库页面|
|URL模式|/xksp/public/*	|/xksp/pub_platform/*|
|触发方式|点击UI面板中的"开始"|点击页面上的按钮|
|界面|完整面板带进度|简约按钮|
|文件命名|{机构}_CMA能力范围.csv|{领域}_{专业}_CMA参数库.csv|
|导出后|无|自动回到第一页|
|校验|完整|精简（更快）|

## 通用技术基础

两个脚本共享相同的核心技术设计：

1. Tampermonkey运行时

两个脚本都是在浏览器中运行的Tampermonkey用户脚本。当URL匹配 @match 模式时，脚本被注入到目标页面。

```javascript

// @match        https://amr.gd.gov.cn/xksp/public/*
// @match        https://amr.gd.gov.cn/xksp/pub_platform/*
```

2. DOM解析策略

两个脚本都通过解析目标页面的HTML DOM结构来提取数据，不涉及任何API调用。

为什么使用DOM解析？
- 没有公开的API接口可用
- 目标网站的DOM结构稳定
- 客户端执行，无服务器依赖

3. CSV导出

两个脚本都按以下规范生成CSV文件：

|规范|值|
|----|--|
|编码|UTF-8带BOM（兼容Excel）|
|分隔符|逗号（,）|
|文本限定符|双引号（"）|
|表头|从首页提取（仅一次）|

4. 分页控制

两个脚本使用相同的分页检测和导航逻辑：

```javascript

function getNextButton() {
    return document.querySelector(
        'li.gmd-pagination-next:not(.gmd-pagination-disabled) a'
    );
}

function clickNextButton() {
    const btn = getNextButton();
    if (btn) { btn.click(); return true; }
    return false;
}
```

5. 错误处理

|机制|实现方式|
|----|--------|
|表格等待|重试最多15次，间隔300ms|
|空页检测|连续空页数达到 maxEmptyPages 后停止|
|重复检测|比较当前页第一行与上一页第一行|
|用户中断|通过 stopRequested 标志优雅停止|

## 技术依赖

|依赖|用途|
|----|----|
|Tampermonkey|脚本运行环境|
|浏览器DOM API|querySelector, querySelectorAll|
|ES6 Promise/async|async/await 分页控制|
|Blob API|CSV文件生成|
|URL API|文件下载|

## 性能指标

|指标|值|
|----|--|
|页面等待时间|可配置（默认1200ms）|
|表格加载重试|15次（每次300ms）|
|内存使用|< 50MB（所有数据存储在内存中）|
|数据量|每次导出最多10,000行|

## 安全与隐私

- 无数据传输：所有数据仅保留在浏览器中
- 仅本地存储：CSV文件仅下载到用户本地
- 域名限制：脚本仅在 amr.gd.gov.cn 域名运行
- 开源可审查：所有代码在仓库中公开可查

