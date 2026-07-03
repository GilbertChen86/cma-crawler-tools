// ==UserScript==
// @name         CMA参数库表格抓取导出（精简版V7）
// @namespace    http://tampermonkey.net/
// @version      7.0
// @description  自动抓取广东省市场监督局CMA参数库表格并导出CSV，支持SPA，表头仅首页，导出后回第一页。已移除导出数目校验逻辑。
// @author       ChenLonghuo
// @match        https://amr.gd.gov.cn/xksp/pub_platform/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ======== 可调参数 ========
    const WAIT_TABLE_MS = 1000; // 每页加载等待（ms）
    const WAIT_CLICK_MS = 500;  // 翻页点击后等待（ms）
    const MAX_PAGE_FAIL = 3;    // 最大连续失败页数（保留以防卡死）
    // ===========================

    let running = false;
    let stopRequested = false;

    /* --------- 按钮（触发与停止） --------- */
    const btn = document.createElement("button");
    btn.textContent = "▶ CMA在库参数导出";
    Object.assign(btn.style, {
        position: "fixed",
        top: "80px",
        right: "20px",
        zIndex: 9999,
        padding: "10px 15px",
        background: "#28a745",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px"
    });
    document.body.appendChild(btn);

    const stopBtn = document.createElement("button");
    stopBtn.textContent = "⏹ 停止导出";
    Object.assign(stopBtn.style, {
        position: "fixed",
        top: "120px",
        right: "20px",
        zIndex: 9999,
        padding: "10px 15px",
        background: "#dc3545",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        cursor: "pointer",
        fontSize: "14px"
    });
    document.body.appendChild(stopBtn);

    stopBtn.addEventListener("click", () => {
        stopRequested = true;
        running = false;
        console.warn("⏹ 已手动中止导出。");
    });

    /* --------- 辅助函数 --------- */
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const getTable = () => document.querySelector("div.ys-table-ell.gmd-table-wrapper table");

    const getNextButton = () => document.querySelector("li.gmd-pagination-next:not(.gmd-pagination-disabled) a, li.gmd-pagination-next:not(.gmd-pagination-disabled) button");

    async function waitForTable() {
        for (let i = 0; i < 15; i++) {
            const table = getTable();
            if (table && table.querySelector("tbody tr")) return table;
            await sleep(300);
        }
        return null;
    }

    const tableToArray = (table, includeHeader = true) => {
        const rows = [];
        if (!table) return rows;
        if (includeHeader) {
            const ths = table.querySelectorAll("thead tr th");
            if (ths && ths.length) rows.push(Array.from(ths).map(th => th.innerText.trim().replace(/\s+/g, " ")));
        }
        const trs = table.querySelectorAll("tbody tr");
        for (const tr of trs) {
            const tds = tr.querySelectorAll("td");
            rows.push(Array.from(tds).map(td => td.innerText.trim().replace(/\s+/g, " ")));
        }
        return rows;
    };

    function downloadCSV(rows, fileName) {
        const csvContent = rows.map(r => r.map(v => `"${(v||"").replace(/"/g, '""')}"`).join(",")).join("\n");
        const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = fileName;
        link.click();
    }

    async function goToFirstPage() {
        // 点击第一页按钮，若找不到则重试几次
        for (let i = 0; i < 6; i++) {
            const first = document.querySelector("li.gmd-pagination-item.gmd-pagination-item-1 a, li.gmd-pagination-item.gmd-pagination-item-1 button");
            if (first) {
                first.click();
                await sleep(500);
                return;
            }
            await sleep(300);
        }
    }

    function getTextSafe(selector) {
        const el = document.querySelector(selector);
        return el ? el.innerText.trim().replace(/[\/\\:*?"<>|]/g, "_") : "未知";
    }

    /* --------- 主执行逻辑（无校验） --------- */
    btn.addEventListener("click", async () => {
        if (running) return alert("⚠️ 导出正在进行中，请稍候或先停止当前任务。");
        running = true;
        stopRequested = false;
        console.log("🚀 开始导出 CMA 参数库（精简版 V7）...");

        // 自动读取领域与专业类别，用于文件命名
        const domain = getTextSafe("#abilityParameterApply_domainId div div") || "领域";
        const profession = getTextSafe("#abilityParameterApply_professionId div div") || "专业";
        const fileName = `${domain}_${profession}_CMA参数库.csv`;

        let allRows = [];
        let headerCaptured = false;
        let failCount = 0;
        let page = 1;

        while (running && !stopRequested) {
            const table = await waitForTable();
            if (!table) {
                failCount++;
                if (failCount > MAX_PAGE_FAIL) {
                    alert(`❌ 连续 ${MAX_PAGE_FAIL} 页加载失败，已终止导出。`);
                    break;
                }
                await sleep(500);
                continue;
            }

            // 仅首页抓表头一次
            const pageRows = tableToArray(table, !headerCaptured);
            if (!headerCaptured && pageRows.length > 0) {
                headerCaptured = true;
            }
            // pageRows 包含表头（若 includeHeader true）
            // 我们只想把表头保留一次，后续只要 tbody 内容
            if (headerCaptured) {
                // 如果第一次，pageRows 的第一行可能是 header，第二行开始是数据；为安全，用下面方式：
                if (page === 1) {
                    // 首页：pageRows 已包含 header + tbody
                    // header = pageRows[0], data = pageRows.slice(1)
                    const data = pageRows.slice(1);
                    allRows.push(...data);
                } else {
                    // 其它页：tableToArray(includeHeader=false) 已只返回 tbody
                    allRows.push(...pageRows);
                }
            } else {
                // 安全兜底：若 headerCaptured 尚未标记（极少情况），把所有行加进去
                allRows.push(...pageRows);
            }

            console.log(`✅ 第 ${page} 页抓取完毕，累计数据行 ${allRows.length} 条。`);
            failCount = 0;

            // 检查下一页是否可点
            const nextBtn = getNextButton();
            if (!nextBtn) {
                console.log("📘 已到最后一页或未找到下一页按钮，结束抓取。");
                break;
            }

            // 翻页
            nextBtn.click();
            page++;
            await sleep(WAIT_CLICK_MS + WAIT_TABLE_MS);
        }

        // 导出（仅在抓取到数据时导出）
        if (allRows.length > 0) {
            // 获取 header（再次从当前显示的 table 取thead，若找不到则从首行猜测）
            const currentTable = getTable();
            let header = [];
            if (currentTable) {
                const ths = currentTable.querySelectorAll("thead tr th");
                if (ths && ths.length) header = Array.from(ths).map(th => th.innerText.trim().replace(/\s+/g, " "));
            }
            if (!header || header.length === 0) {
                // 兜底：尝试从已抓取数据的第一行生成列名占位
                header = Array(allRows[0].length).fill("").map((_,i) => `col${i+1}`);
            }

            const finalRows = [header, ...allRows];
            downloadCSV(finalRows, fileName);

            // 导出后回第一页以便下一个类别初始化
            await goToFirstPage();
            alert(`✅ 导出完成：${fileName}\n共 ${allRows.length} 条数据（不含表头），页面已回到第一页。`);
        } else {
            alert("⚠️ 未抓取到任何数据，未生成 CSV 文件。");
        }

        running = false;
    });

})();

