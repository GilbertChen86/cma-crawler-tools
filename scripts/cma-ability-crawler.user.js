// ==UserScript==
// @name         广东省市场监管局许可（CMA）公示能力范围表自动导出CSV
// @namespace    http://tampermonkey.net/
// @version      1.13
// @description  自动翻页抓取CMA能力资质表并导出为CSV文件
// @author       ChenLonghuo
// @match        https://amr.gd.gov.cn/xksp/public/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // ==================== 配置 ====================
    const CONFIG = {
        delayBetweenPages: 1200,    // 翻页间隔（毫秒）
        delayAfterClick: 1500,      // 点击后等待（毫秒）
        maxEmptyPages: 3,           // 最大连续空页数
        logLevel: 'info'            // 日志级别: debug, info, warn, error
    };

    // ==================== 日志系统 ====================
    const Logger = {
        debug: (...args) => CONFIG.logLevel === 'debug' && console.log('🔍', ...args),
        info: (...args) => console.log('📘', ...args),
        warn: (...args) => console.warn('⚠️', ...args),
        error: (...args) => console.error('❌', ...args),
        success: (...args) => console.log('✅', ...args)
    };

    // ==================== UI 控制面板 ====================
    class CrawlerUI {
        constructor() {
            this.panel = null;
            this.statusEl = null;
            this.progressEl = null;
            this.dataCountEl = null;
            this.currentPageEl = null;
            this.startBtn = null;
            this.stopBtn = null;
            this.exportBtn = null;
            this.isRunning = false;
            this.createPanel();
        }

        createPanel() {
            // 如果面板已存在，移除
            const existingPanel = document.getElementById('crawlerPanel');
            if (existingPanel) {
                existingPanel.remove();
            }

            this.panel = document.createElement('div');
            this.panel.id = 'crawlerPanel';
            this.panel.style.cssText = `
                position: fixed;
                top: 16px;
                right: 16px;
                z-index: 10000;
                background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 16px;
                min-width: 260px;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
                font-size: 13px;
                color: #333;
                transition: all 0.3s ease;
            `;

            this.panel.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                    <span style="font-weight: 600; font-size: 14px; color: #0078d4;">
                        📊 数据采集工具
                    </span>
                    <span id="crawlerStatus" style="font-size: 11px; padding: 2px 8px; border-radius: 12px; background: #f0f0f0; color: #666;">
                        就绪
                    </span>
                </div>

                <div style="display: flex; gap: 6px; margin-bottom: 10px;">
                    <button id="startBtn" style="flex:1; background: #0078d4; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                        ▶ 开始采集
                    </button>
                    <button id="stopBtn" style="flex:1; background: #d32f2f; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500; opacity: 0.5; pointer-events: none;">
                        ⏹ 停止
                    </button>
                </div>

                <div style="margin-bottom: 8px;">
                    <button id="exportBtn" style="width: 100%; background: #2e7d32; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: 500;">
                        📥 导出 CSV
                    </button>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 12px; background: #f8f9fa; padding: 8px; border-radius: 4px; margin-top: 8px;">
                    <span style="color: #666;">📄 当前页:</span>
                    <span id="currentPageDisplay" style="text-align: right; font-weight: 500;">0</span>
                    
                    <span style="color: #666;">📊 总页数:</span>
                    <span id="totalPagesDisplay" style="text-align: right; font-weight: 500;">0</span>
                    
                    <span style="color: #666;">📋 数据条数:</span>
                    <span id="dataCountDisplay" style="text-align: right; font-weight: 500; color: #0078d4;">0</span>
                    
                    <span style="color: #666;">⏱ 用时:</span>
                    <span id="timeDisplay" style="text-align: right; font-weight: 500;">00:00</span>
                </div>

                <div style="margin-top: 8px; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
                    <div id="progressBar" style="height: 100%; width: 0%; background: linear-gradient(90deg, #0078d4, #00b4d8); transition: width 0.3s ease; border-radius: 2px;"></div>
                </div>
            `;

            document.body.appendChild(this.panel);

            // 获取元素引用
            this.statusEl = document.getElementById('crawlerStatus');
            this.progressBar = document.getElementById('progressBar');
            this.currentPageEl = document.getElementById('currentPageDisplay');
            this.totalPagesEl = document.getElementById('totalPagesDisplay');
            this.dataCountEl = document.getElementById('dataCountDisplay');
            this.timeEl = document.getElementById('timeDisplay');
            this.startBtn = document.getElementById('startBtn');
            this.stopBtn = document.getElementById('stopBtn');
            this.exportBtn = document.getElementById('exportBtn');

            // 绑定事件
            this.startBtn.addEventListener('click', () => this.onStart());
            this.stopBtn.addEventListener('click', () => this.onStop());
            this.exportBtn.addEventListener('click', () => this.onExport());

            Logger.info('UI 控制面板已创建');
        }

        setStatus(text, type = 'info') {
            const colors = {
                info: '#f0f0f0',
                running: '#0078d4',
                success: '#2e7d32',
                error: '#d32f2f',
                warning: '#ed6c02'
            };
            this.statusEl.textContent = text;
            this.statusEl.style.background = colors[type] || colors.info;
            this.statusEl.style.color = ['info', 'f0f0f0'].includes(type) ? '#666' : '#fff';
        }

        setProgress(current, total) {
            const percentage = total > 0 ? (current / total * 100) : 0;
            this.progressBar.style.width = `${Math.min(percentage, 100)}%`;
            this.currentPageEl.textContent = current;
            this.totalPagesEl.textContent = total;
        }

        setDataCount(count) {
            this.dataCountEl.textContent = count;
        }

        setTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            this.timeEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        }

        setRunning(isRunning) {
            this.isRunning = isRunning;
            this.startBtn.style.opacity = isRunning ? '0.5' : '1';
            this.startBtn.style.pointerEvents = isRunning ? 'none' : 'auto';
            this.stopBtn.style.opacity = isRunning ? '1' : '0.5';
            this.stopBtn.style.pointerEvents = isRunning ? 'auto' : 'none';
            this.exportBtn.style.opacity = isRunning ? '0.5' : '1';
            this.exportBtn.style.pointerEvents = isRunning ? 'none' : 'auto';
        }

        onStart() {
            if (this.isRunning) return;
            if (typeof window.startCrawling === 'function') {
                window.startCrawling();
            } else {
                Logger.error('采集函数未定义');
                this.setStatus('错误', 'error');
            }
        }

        onStop() {
            if (!this.isRunning) return;
            if (typeof window.stopCrawling === 'function') {
                window.stopCrawling();
            }
        }

        onExport() {
            if (this.isRunning) {
                alert('⏳ 请等待采集完成后再导出');
                return;
            }
            if (typeof window.exportData === 'function') {
                window.exportData();
            } else {
                Logger.error('导出函数未定义');
                this.setStatus('错误', 'error');
            }
        }

        show() {
            if (this.panel) {
                this.panel.style.display = 'block';
            }
        }

        hide() {
            if (this.panel) {
                this.panel.style.display = 'none';
            }
        }

        destroy() {
            if (this.panel) {
                this.panel.remove();
                this.panel = null;
            }
        }
    }

    // ==================== 核心爬取逻辑 ====================
    class Crawler {
        constructor(ui) {
            this.ui = ui;
            this.isRunning = false;
            this.shouldStop = false;
            this.allData = [];
            this.header = [];
            this.currentPage = 0;
            this.totalPages = 0;
            this.startTime = 0;
            this.fileName = '';
        }

        // 获取表格
        getTable() {
            return document.querySelector('body > div.main > section > main > div > div > div:nth-child(3) > div > div.ys-table-ell > div.ys-table-ell.gmd-table-wrapper table');
        }

        // 获取表头
        getHeader(table) {
            const ths = table.querySelectorAll('thead th');
            return Array.from(ths).map(th => th.innerText.trim().replace(/\s+/g, ' '));
        }

        // 获取数据行
        getRows(table) {
            const trs = table.querySelectorAll('tbody tr');
            return Array.from(trs).map(tr => {
                return Array.from(tr.querySelectorAll('td')).map(td => td.innerText.trim().replace(/\s+/g, ' '));
            });
        }

        // 获取下一页按钮
        getNextBtn() {
            return document.querySelector('body > div.main > section > main > div > div > div:nth-child(3) > div > div.card_footer > ul > li.gmd-pagination-next > a');
        }

        // 检查是否可以点击下一页
        canClickNext(btn) {
            return btn && !btn.parentElement.classList.contains('gmd-pagination-disabled');
        }

        // 获取总页数
        getTotalPages() {
            try {
                // 方法1: 从分页器中获取最后一页
                const lastPageElement = document.querySelector('body > div.main > section > main > div > div > div:nth-child(3) > div > div.card_footer > ul > li.gmd-pagination-item.gmd-pagination-item-41 > a');
                if (lastPageElement) {
                    const pageNum = parseInt(lastPageElement.textContent.trim());
                    if (!isNaN(pageNum) && pageNum > 0) {
                        Logger.info(`检测到总页数: ${pageNum}`);
                        return pageNum;
                    }
                }
                
                // 方法2: 查找所有分页项，取最大值
                const pageItems = document.querySelectorAll('.gmd-pagination-item a');
                let maxPage = 1;
                pageItems.forEach(el => {
                    const text = el.textContent.trim();
                    const pageNum = parseInt(text);
                    if (!isNaN(pageNum) && pageNum > maxPage) {
                        maxPage = pageNum;
                    }
                });
                
                if (maxPage > 1) {
                    Logger.info(`通过分页项检测到总页数: ${maxPage}`);
                    return maxPage;
                }
                
                return null;
            } catch (error) {
                Logger.error('获取总页数失败:', error);
                return null;
            }
        }

        // 获取当前页码
        getCurrentPage() {
            try {
                const activePage = document.querySelector('.gmd-pagination-item.active a, .gmd-pagination-item-active a');
                if (activePage) {
                    const pageNum = parseInt(activePage.textContent.trim());
                    if (!isNaN(pageNum) && pageNum > 0) {
                        return pageNum;
                    }
                }
                return null;
            } catch (error) {
                return null;
            }
        }

        // 导出CSV
        exportCSV(rows, filename) {
            const BOM = '\uFEFF';
            const csv = rows.map(r => r.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(',')).join('\r\n');
            const blob = new Blob([BOM + csv], {type: 'text/csv;charset=utf-8;'});
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = filename;
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }

        // 获取机构名称
        getInstitutionName() {
            try {
                const nameEl = document.querySelector('body > div.main > section > main > div > div > div:nth-child(1) > div.gmd-descriptions.gmd-descriptions-bordered > div > table > tbody > tr:nth-child(3) > td:nth-child(4)');
                if (nameEl) {
                    return nameEl.innerText.trim().replace(/[\\\/:*?"<>|]/g, '_');
                }
                return '未命名';
            } catch (error) {
                return '未命名';
            }
        }

        // 主采集逻辑
        async start() {
            if (this.isRunning) {
                Logger.warn('采集任务已在运行');
                return;
            }

            const table = this.getTable();
            if (!table) {
                alert('❌ 未找到表格，请检查页面是否加载完成！');
                Logger.error('未找到表格');
                return;
            }

            this.isRunning = true;
            this.shouldStop = false;
            this.allData = [];
            this.startTime = Date.now();

            // 获取机构名称
            const nameText = this.getInstitutionName();
            this.fileName = `${nameText}_CMA能力范围.csv`;

            // 获取表头
            this.header = this.getHeader(table);
            if (this.header.length) {
                this.allData.push(this.header);
            }

            // 获取总页数
            this.totalPages = this.getTotalPages() || 999;
            Logger.info(`📊 计划采集 ${this.totalPages} 页数据`);

            // 更新UI
            this.ui.setRunning(true);
            this.ui.setStatus('采集中...', 'running');
            this.ui.setProgress(0, this.totalPages);
            this.ui.setDataCount(0);

            let consecutiveEmptyPages = 0;
            let lastPageDataCount = 0;
            let lastPageKey = '';

            try {
                for (this.currentPage = 1; this.currentPage <= this.totalPages && !this.shouldStop; this.currentPage++) {
                    Logger.info(`📄 正在采集第 ${this.currentPage} 页...`);
                    this.ui.setStatus(`采集第 ${this.currentPage} 页`, 'running');
                    this.ui.setProgress(this.currentPage, this.totalPages);
                    
                    // 更新运行时间
                    const elapsed = (Date.now() - this.startTime) / 1000;
                    this.ui.setTime(elapsed);

                    await this.sleep(CONFIG.delayBetweenPages);

                    const currentTable = this.getTable();
                    if (!currentTable) {
                        Logger.warn(`⚠️ 第 ${this.currentPage} 页未找到表格`);
                        consecutiveEmptyPages++;
                        if (consecutiveEmptyPages >= CONFIG.maxEmptyPages) {
                            Logger.warn(`连续 ${CONFIG.maxEmptyPages} 页无数据，停止采集`);
                            break;
                        }
                        continue;
                    }

                    const rows = this.getRows(currentTable);
                    
                    if (rows.length === 0) {
                        consecutiveEmptyPages++;
                        Logger.warn(`⚠️ 第 ${this.currentPage} 页无数据 (连续空页: ${consecutiveEmptyPages})`);
                        if (consecutiveEmptyPages >= CONFIG.maxEmptyPages) {
                            Logger.warn(`连续 ${CONFIG.maxEmptyPages} 页无数据，停止采集`);
                            break;
                        }
                        continue;
                    }

                    consecutiveEmptyPages = 0;
                    Logger.success(`第 ${this.currentPage} 页采集到 ${rows.length} 条数据`);

                    // 检测翻页是否卡住（数据重复）
                    const currentKey = rows[0]?.join('|') || '';
                    if (this.currentPage > 1 && currentKey === lastPageKey && rows.length === lastPageDataCount) {
                        Logger.warn('⚠️ 检测到与上一页相同的数据，可能翻页失败');
                        const nextBtn = this.getNextBtn();
                        if (this.canClickNext(nextBtn)) {
                            Logger.info('🔄 尝试重新翻页...');
                            nextBtn.click();
                            await this.sleep(CONFIG.delayAfterClick);
                            // 重新尝试这一页
                            this.currentPage--;
                            continue;
                        } else {
                            Logger.info('🛑 无法继续翻页，停止采集');
                            break;
                        }
                    }

                    lastPageKey = currentKey;
                    lastPageDataCount = rows.length;

                    // 添加数据
                    rows.forEach(r => this.allData.push(r));
                    this.ui.setDataCount(this.allData.length - 1);

                    // 检查当前页码
                    const currentPageNum = this.getCurrentPage();
                    if (currentPageNum && currentPageNum !== this.currentPage) {
                        Logger.info(`📍 检测到当前实际页码: ${currentPageNum}，更新页码`);
                        this.currentPage = currentPageNum;
                    }

                    // 检查是否到达最后一页
                    const nextBtn = this.getNextBtn();
                    if (!this.canClickNext(nextBtn)) {
                        Logger.success('🛑 已到达最后一页，停止采集');
                        break;
                    }

                    // 点击下一页
                    Logger.info(`🔄 翻到第 ${this.currentPage + 1} 页...`);
                    nextBtn.click();
                    await this.sleep(CONFIG.delayAfterClick);
                }

                // 采集完成
                const totalRecords = this.allData.length - 1;
                const elapsed = (Date.now() - this.startTime) / 1000;
                const message = `✅ 采集完成！共 ${this.currentPage - 1} 页，${totalRecords} 条记录，用时 ${Math.round(elapsed)} 秒`;
                Logger.success(message);
                this.ui.setStatus('采集完成 ✅', 'success');
                this.ui.setDataCount(totalRecords);
                this.ui.setTime(elapsed);
                this.ui.setProgress(this.currentPage - 1, this.totalPages);

                // 自动导出
                this.exportCSV(this.allData, this.fileName);
                alert(`✅ 导出完成！\n\n📊 记录数: ${totalRecords} 条\n📄 页数: ${this.currentPage - 1} 页\n⏱ 用时: ${Math.round(elapsed)} 秒\n📁 文件名: ${this.fileName}`);

            } catch (error) {
                Logger.error('采集过程出错:', error);
                this.ui.setStatus('出错 ❌', 'error');
                alert('❌ 采集出错: ' + error.message);
            } finally {
                this.isRunning = false;
                this.ui.setRunning(false);
            }
        }

        // 停止采集
        stop() {
            if (this.isRunning) {
                this.shouldStop = true;
                this.ui.setStatus('停止中...', 'warning');
                Logger.info('⏹ 用户请求停止采集');
            }
        }

        // 导出数据
        exportData() {
            if (this.allData.length <= 1) {
                alert('⚠️ 没有数据可导出，请先采集数据');
                return;
            }
            
            const totalRecords = this.allData.length - 1;
            this.exportCSV(this.allData, this.fileName);
            this.ui.setStatus(`已导出 ${totalRecords} 条`, 'success');
            Logger.success(`✅ 已导出 ${totalRecords} 条数据`);
        }

        sleep(ms) {
            return new Promise(res => setTimeout(res, ms));
        }
    }

    // ==================== 初始化 ====================
    let ui = null;
    let crawler = null;

    function init() {
        Logger.info('🚀 脚本初始化...');
        
        // 创建UI
        ui = new CrawlerUI();
        
        // 创建爬虫实例
        crawler = new Crawler(ui);
        
        // 暴露全局函数供UI调用
        window.startCrawling = () => crawler.start();
        window.stopCrawling = () => crawler.stop();
        window.exportData = () => crawler.exportData();

        // 监听页面变化
        let lastUrl = location.href;
        const observer = new MutationObserver(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                Logger.info('🔄 检测到URL变化');
                // 重置状态
                if (crawler) {
                    crawler.isRunning = false;
                    crawler.shouldStop = true;
                }
                if (ui) {
                    ui.setRunning(false);
                    ui.setStatus('就绪', 'info');
                    ui.setProgress(0, 0);
                    ui.setDataCount(0);
                    ui.setTime(0);
                }
            }
        });
        observer.observe(document, { subtree: true, childList: true });

        Logger.success('✅ 脚本初始化完成');
    }

    // 等待页面加载
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(init, 2000);
        });
    } else {
        setTimeout(init, 2000);
    }

})();
