/**
 * eventmanage.js
 * 功能：日程管理核心逻辑
 * - 修复：跨日日程在每一天显示
 * - 修复：新建日程默认时间跟随选中日期
 * - 修复：列表排序（优先级高在前 -> 时间早在前）
 */

// ==========================================
// 1. 全局配置与变量
// ==========================================

const API_URL = 'http://localhost:3000/api/events';
let allEvents = [];

// 优先级配置 (3=紧急, 2=优先, 1=一般, 0=备注)
const PRIORITY_CONFIG = {
    0: { label: "备注", color: "#1890ff", var: "--color-remark" },
    1: { label: "一般", color: "#52c41a", var: "--color-normal" },
    2: { label: "优先", color: "#ffa940", var: "--color-priority" },
    3: { label: "紧急", color: "#ff4d4f", var: "--color-emergency" }
};

// UI 元素引用
const ui = {
    topbarYear: document.getElementById('topbar-year'),
    topbarMonth: document.getElementById('topbar-month'),
    topbarDay: document.getElementById('topbar-day'),
    topbarWeekday: document.getElementById('topbar-weekday'),
    
    drawer: document.getElementById('event-drawer'),
    btnShowDrawer: document.getElementById('btn-show-drawer'),
    btnCloseDrawer: document.getElementById('btn-close-drawer'),
    
    formTitle: document.getElementById('evt-title'),
    formStart: document.getElementById('evt-start'),
    formEnd: document.getElementById('evt-end'),
    formRepeat: document.getElementById('evt-repeat'),
    formPriority: document.getElementById('evt-priority'),
    formDesc: document.getElementById('evt-desc'),
    prioText: document.getElementById('priority-text'),
    btnSave: document.getElementById('btn-save-event'),
    
    listContainer: document.getElementById('event-list-container')
};

// ==========================================
// 2. 初始化与数据加载
// ==========================================

async function initEvents() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("后端响应异常");
        
        allEvents = await response.json();
        console.log("📅 数据同步成功:", allEvents.length + "条日程");

        // 如果日历已经有选中的日期，立即渲染
        if (window.selectedDateStr) {
            updateAllViews(window.selectedDateStr);
        }
    } catch (error) {
        console.error("❌ 数据加载失败:", error);
        // 出错也尝试渲染（可能只想看界面）
        if (window.selectedDateStr) renderEventList(window.selectedDateStr);
    }
}

initEvents();

// ==========================================
// 3. 事件监听 (交互逻辑)
// ==========================================

// 监听日历点击
window.addEventListener('dateUpdate', (e) => {
    const dateStr = e.detail; 
    updateAllViews(dateStr);
});

function updateAllViews(dateStr) {
    updateTopbar(dateStr);
    // 注意：这里我们更新列表，但“不”强制更新表单。
    // 表单的时间应该在用户点击“新建”那一刻才锁定，
    // 或者跟随日历变动也可以，取决于习惯。这里我们选择跟随。
    updateFormDefaultTime(dateStr); 
    renderEventList(dateStr);
}

// --- 打开抽屉 (新建日程) ---
if (ui.btnShowDrawer) {
    ui.btnShowDrawer.addEventListener('click', () => {
        // 【关键修复点 2】：打开抽屉时，强制将表单时间设为当前选中日期
        // 这样就保证了默认不是“今天”，而是“选中的那天”
        if (window.selectedDateStr) {
            updateFormDefaultTime(window.selectedDateStr);
        }
        ui.drawer.classList.add('active');
    });
}

// 关闭抽屉
if (ui.btnCloseDrawer) {
    ui.btnCloseDrawer.addEventListener('click', () => {
        ui.drawer.classList.remove('active');
    });
}

// 监听滑块拖动
if (ui.formPriority) {
    ui.formPriority.addEventListener('input', (e) => {
        const val = e.target.value;
        const config = PRIORITY_CONFIG[val];
        ui.prioText.innerText = config.label;
        ui.prioText.style.color = config.color;
        ui.formPriority.style.accentColor = config.color;
    });
}

// 监听保存
if (ui.btnSave) {
    ui.btnSave.addEventListener('click', handleSaveEvent);
}

// ==========================================
// 4. 业务逻辑函数
// ==========================================

/**
 * 保存逻辑
 */
async function handleSaveEvent() {
    const title = ui.formTitle.value.trim();
    if (!title) return alert("请输入日程名称");
    if (ui.formStart.value >= ui.formEnd.value) return alert("结束时间必须晚于开始时间");

    const newEvent = {
        id: Date.now(),
        title: title,
        start: ui.formStart.value, 
        end: ui.formEnd.value,
        repeat: ui.formRepeat.value,
        level: parseInt(ui.formPriority.value),
        desc: ui.formDesc.value
    };

    allEvents.push(newEvent);

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allEvents)
        });

        ui.drawer.classList.remove('active');
        ui.formTitle.value = '';
        ui.formDesc.value = '';

        if (window.selectedDateStr) {
            renderEventList(window.selectedDateStr);
        }

    } catch (error) {
        console.error("保存失败:", error);
        alert("保存失败，服务器未响应");
    }
}

/**
 * 更新右侧顶栏
 */
function updateTopbar(dateStr) {
    if (!dateStr) return;
    const parts = dateStr.split('-');
    const year = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const day = parseInt(parts[2]);

    const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    const dateObj = new Date(year, month, day);
    const weekdayName = weekDays[dateObj.getDay()];

    if (ui.topbarYear) ui.topbarYear.innerText = year;
    if (ui.topbarMonth) ui.topbarMonth.innerText = month + 1;
    if (ui.topbarDay) ui.topbarDay.innerText = day;
    if (ui.topbarWeekday) ui.topbarWeekday.innerText = weekdayName;
}

/**
 * 更新表单默认时间
 */
function updateFormDefaultTime(dateStr) {
    if (!ui.formStart || !ui.formEnd) return;

    const parts = dateStr.split('-');
    const pad = (n) => n.toString().padStart(2, '0');
    
    const y = parts[0];
    const m = pad(parseInt(parts[1]) + 1);
    const d = pad(parseInt(parts[2]));
    
    const baseDate = `${y}-${m}-${d}`;
    
    // 设置为选中日期的 09:00 - 11:00
    ui.formStart.value = `${baseDate}T09:00`;
    ui.formEnd.value = `${baseDate}T11:00`;
}

/**
 * 渲染日程列表 (含跨日与排序逻辑)
 */
function renderEventList(dateStr) {
    if (!ui.listContainer) return;
    ui.listContainer.innerHTML = "";

    // 1. 获取当前渲染的目标日期 (字符串形式 "2026-01-29")
    const parts = dateStr.split('-');
    const pad = (n) => n.toString().padStart(2, '0');
    const curYear = parseInt(parts[0]);
    const curMonth = parseInt(parts[1]); 
    const curDay = parseInt(parts[2]);
    
    const curDateStandard = `${curYear}-${pad(curMonth + 1)}-${pad(curDay)}`;
    const curDateObj = new Date(curYear, curMonth, curDay);

    // 2. 过滤
    const displayEvents = allEvents.filter(ev => {
        // 提取日程的日期部分 (YYYY-MM-DD)
        const evStartDateStr = ev.start.split('T')[0];
        const evEndDateStr = ev.end.split('T')[0];
        
        const evStartObj = new Date(evStartDateStr);

        // 如果是“仅一次” (非循环)
        if (ev.repeat === 'none') {
            // 【关键修复点 1】：跨日逻辑
            // 只要 当前日期 >= 开始日期 且 当前日期 <= 结束日期，就显示
            return curDateStandard >= evStartDateStr && curDateStandard <= evEndDateStr;
        }

        // 循环逻辑 (简化版，暂不处理跨日循环的复杂情况，仅处理单点循环)
        // 如果你需要“每周重复且跨越两天”的逻辑会非常复杂，这里暂且保持基础循环逻辑
        if (ev.repeat === 'daily') {
            // 只要开始时间在今天或之前
            return evStartDateStr <= curDateStandard;
        }

        if (ev.repeat === 'weekly') {
            // 星期几相同 且 开始时间在今天或之前
            return evStartObj.getDay() === curDateObj.getDay() && evStartDateStr <= curDateStandard;
        }

        if (ev.repeat === 'yearly') {
            return evStartObj.getMonth() === curDateObj.getMonth() &&
                   evStartObj.getDate() === curDateObj.getDate() &&
                   evStartDateStr <= curDateStandard;
        }

        return false;
    });

    // 3. 排序
    // 【关键修复点 3】：优先级高在前 > 时间早在前
    displayEvents.sort((a, b) => {
        // 第一优先级：等级 (level) 降序 (3 -> 0)
        if (b.level !== a.level) {
            return b.level - a.level;
        }
        // 第二优先级：开始时间 (start) 升序 (早 -> 晚)
        return a.start.localeCompare(b.start);
    });

    // 4. 渲染
    if (displayEvents.length === 0) {
        ui.listContainer.innerHTML = `
            <div style="color:#ccc; text-align:center; margin-top:40px;">
                <p>☕ 今日暂无安排</p>
            </div>
        `;
        return;
    }

    displayEvents.forEach(ev => {
        const config = PRIORITY_CONFIG[ev.level];
        // 显示时间 (从原始 ISO 字符串截取)
        const startTime = ev.start.split('T')[1];
        const endTime = ev.end.split('T')[1];
        
        // 判断是否跨日，如果是，在时间后面加个 (跨日) 标记
        const isMultiDay = ev.start.split('T')[0] !== ev.end.split('T')[0];
        const timeDisplay = `${startTime} - ${endTime}`;

        const card = document.createElement('div');
        card.className = 'event-card';
        card.style.borderLeftColor = config.color;

        card.innerHTML = `
            <div class="event-summary">
                <div>
                    <div class="event-time">
                        ${timeDisplay}
                        ${ev.repeat !== 'none' ? '<span class="tag-badge">循环</span>' : ''}
                        ${isMultiDay ? '<span class="tag-badge" style="background:#fff3cd; color:#856404">跨日</span>' : ''}
                    </div>
                    <div class="event-title-display">${ev.title}</div>
                </div>
                <div style="font-size:0.8rem; color:${config.color}; border:1px solid ${config.color}; padding:2px 8px; border-radius:12px; white-space:nowrap;">
                    ${config.label}
                </div>
            </div>
            <div class="event-details">
                <p><strong>开始：</strong>${ev.start.replace('T', ' ')}</p>
                <p><strong>结束：</strong>${ev.end.replace('T', ' ')}</p>
                <p><strong>备注：</strong>${ev.desc || "无"}</p>
            </div>
        `;

        card.addEventListener('click', () => {
            const detailDiv = card.querySelector('.event-details');
            if (detailDiv.style.display === 'block') {
                detailDiv.style.display = 'none';
                detailDiv.classList.remove('show');
            } else {
                detailDiv.style.display = 'block';
                requestAnimationFrame(() => detailDiv.classList.add('show'));
            }
        });

        ui.listContainer.appendChild(card);
    });
}