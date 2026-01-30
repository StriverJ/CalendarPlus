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
let currentFilterLevel = null; // null 表示显示全部，0-3 表示只显示对应等级

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
    
    listContainer: document.getElementById('event-list-container'),
    //操作底部区域
    completedContainer: document.getElementById('completed-list-container'),
    completedCount: document.getElementById('completed-count'),
    //折叠已完成事件
    toggleCompletedBtn: document.getElementById('btn-toggle-completed'),
    completedArrow: document.getElementById('completed-arrow'),
    completedListWrapper: document.getElementById('completed-list-container')
};

// ==========================================
// 2. 初始化与数据加载
// ==========================================

async function initEvents() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error("后端响应异常");
        
        allEvents = await response.json();
        //通知日历重绘显示圆点
        if (typeof renderCalendar === 'function') {
            renderCalendar(); 
        }
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
    // 切换日期时，重置筛选器（看个人喜好，通常重置比较合理）
    currentFilterLevel = null; 
    
    updateTopbar(dateStr);
    updateFormDefaultTime(dateStr);
    
    // 先渲染统计区（它会计算出数量）
    renderPriorityStats(dateStr);
    // 再渲染列表
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

// --- 底部已完成任务栏折叠/展开 ---
if (ui.toggleCompletedBtn) {
    ui.toggleCompletedBtn.addEventListener('click', () => {
        // 1. 切换列表的收起状态
        ui.completedListWrapper.classList.toggle('collapsed');
        
        // 2. 切换标题栏箭头的状态 (为了旋转动画)
        ui.toggleCompletedBtn.classList.toggle('collapsed-state');
        
        // 可选：保存用户的折叠偏好到 localStorage，刷新后依然记住状态
        const isCollapsed = ui.completedListWrapper.classList.contains('collapsed');
        localStorage.setItem('completed_section_collapsed', isCollapsed);
    });
}

// --- 初始化：读取用户之前的折叠偏好 (可选) ---
window.addEventListener('load', () => {
    const isCollapsed = localStorage.getItem('completed_section_collapsed') === 'true';
    if (isCollapsed) {
        ui.completedListWrapper.classList.add('collapsed');
        ui.toggleCompletedBtn.classList.add('collapsed-state');
    }
});

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
        desc: ui.formDesc.value,
        completed: false
    };

    allEvents.push(newEvent);
    await syncData();

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
 * 渲染右上角的统计区域 (卡片样式)
 */
function renderPriorityStats(dateStr) {
    const container = document.getElementById('priority-stats-container');
    if (!container) return;
    container.innerHTML = ""; // 清空

    // 1. 获取当天的所有未完成任务
    const parts = dateStr.split('-');
    const pad = (n) => n.toString().padStart(2, '0');
    const curDateStandard = `${parts[0]}-${pad(parseInt(parts[1]) + 1)}-${pad(parseInt(parts[2]))}`;
    const curDateObj = new Date(parts[0], parts[1], parts[2]);

    const todaysEvents = allEvents.filter(ev => {
        if (ev.completed) return false; 
        const evStartDateStr = ev.start.split('T')[0];
        const evEndDateStr = ev.end.split('T')[0];
        const evStartObj = new Date(evStartDateStr);

        if (ev.repeat === 'none') return curDateStandard >= evStartDateStr && curDateStandard <= evEndDateStr;
        if (ev.repeat === 'daily') return evStartDateStr <= curDateStandard;
        if (ev.repeat === 'weekly') return evStartObj.getDay() === curDateObj.getDay() && evStartDateStr <= curDateStandard;
        if (ev.repeat === 'yearly') return evStartObj.getMonth() === curDateObj.getMonth() && evStartObj.getDate() === curDateObj.getDate() && evStartDateStr <= curDateStandard;
        return false;
    });

    // 2. 统计各等级数量
    const counts = { 3: 0, 2: 0, 1: 0, 0: 0 };
    let totalCount = 0;
    
    todaysEvents.forEach(ev => {
        if (counts[ev.level] !== undefined) {
            counts[ev.level]++;
            totalCount++;
        }
    });

    // 3. 生成 "总计" 卡片
    const totalCard = document.createElement('div');
    totalCard.className = `stat-card ${currentFilterLevel === null ? 'active' : ''}`;
    // 总计卡片底部用灰色或透明
    totalCard.style.borderBottomColor = '#cbd5e0'; 
    totalCard.innerHTML = `
        <div class="stat-number">${totalCount}</div>
        <div class="stat-label">总计</div>
    `;
    totalCard.addEventListener('click', () => {
        currentFilterLevel = null; // 清除筛选
        renderPriorityStats(dateStr);
        renderEventList(dateStr);
    });
    container.appendChild(totalCard);

    // 4. 生成各等级卡片 (顺序：紧急 -> 优先 -> 一般 -> 备注)
    [3, 2, 1, 0].forEach(level => {
        const config = PRIORITY_CONFIG[level];
        // 即使数量为0也显示卡片，保持布局像参考图那样整齐（如果不想显示0，加上 if (counts[level] === 0) return;）
        
        const card = document.createElement('div');
        card.className = `stat-card ${currentFilterLevel === level ? 'active' : ''}`;
        
        // 核心：设置底部边框颜色
        card.style.borderBottomColor = config.color; 
        
        card.innerHTML = `
            <div class="stat-number" style="color: ${counts[level] > 0 ? '#2c3e50' : '#ccc'}">
                ${counts[level]}
            </div>
            <div class="stat-label">${config.label}</div>
        `;

        // 点击筛选
        card.addEventListener('click', () => {
            // 如果点击已选中的，则取消筛选（回到总计）；否则选中当前
            if (currentFilterLevel === level) {
                currentFilterLevel = null;
            } else {
                currentFilterLevel = level;
            }
            renderPriorityStats(dateStr); 
            renderEventList(dateStr);
        });

        container.appendChild(card);
    });
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

// 通用的数据同步函数
async function syncData() {
    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(allEvents)
        });

        // 刷新所有受数据影响的视图
        if (window.selectedDateStr) {
            // 1. 刷新右侧日程列表
            renderEventList(window.selectedDateStr);
            
            // 2. 【新增】刷新右上角紧急状态统计
            // 确保函数存在才调用，防止报错
            if (typeof renderPriorityStats === 'function') {
                renderPriorityStats(window.selectedDateStr);
            }
        }

        // 3. 刷新左侧日历 (为了更新下方小圆点)
        if (typeof window.renderCalendar === 'function') {
            window.renderCalendar();
        }

    } catch (error) {
        console.error("同步失败", error);
        alert("操作失败，无法连接服务器");
    }
}

// 【新增】👇 切换完成状态
async function toggleComplete(eventId) {
    const event = allEvents.find(e => e.id === eventId);
    if (event) {
        event.completed = !event.completed; // true 变 false，false 变 true
        await syncData(); // 保存并刷新
    }
}

// 【新增】👇 删除任务
async function deleteEvent(eventId) {
    if (confirm("确定要删除这个任务吗？")) {
        allEvents = allEvents.filter(e => e.id !== eventId); // 过滤掉要删的那个
        await syncData(); // 保存并刷新
    }
}

/**
 * 渲染日程列表 (含跨日与排序逻辑)
 */
function renderEventList(dateStr) {
    if (!ui.listContainer || !ui.completedContainer) return;
    
    // 清空两个容器
    ui.listContainer.innerHTML = "";
    ui.completedContainer.innerHTML = "";

    const parts = dateStr.split('-');
    const pad = (n) => n.toString().padStart(2, '0');
    const curDateStandard = `${parts[0]}-${pad(parseInt(parts[1]) + 1)}-${pad(parseInt(parts[2]))}`;
    const curDateObj = new Date(parts[0], parts[1], parts[2]);

    // 1. 筛选当天的所有任务
    const todaysEvents = allEvents.filter(ev => {
    const evStartDateStr = ev.start.split('T')[0];
    const evEndDateStr = ev.end.split('T')[0];
    const evStartObj = new Date(evStartDateStr);

    // 如果任务没有 completed 字段（旧数据），补上 false
    if (ev.completed === undefined) ev.completed = false;

    if (ev.repeat === 'none') {
        return curDateStandard >= evStartDateStr && curDateStandard <= evEndDateStr;
    }
    if (ev.repeat === 'daily') return evStartDateStr <= curDateStandard;
    if (ev.repeat === 'weekly') return evStartObj.getDay() === curDateObj.getDay() && evStartDateStr <= curDateStandard;
    if (ev.repeat === 'yearly') return evStartObj.getMonth() === curDateObj.getMonth() && evStartObj.getDate() === curDateObj.getDate() && evStartDateStr <= curDateStandard;
        return false;
    });

    // 1.5 【新增】应用筛选器
    let filteredEvents = todaysEvents;
    if (currentFilterLevel !== null) {
        filteredEvents = todaysEvents.filter(ev => ev.level === currentFilterLevel);
    }

    // 2. 分流：未完成 vs 已完成
    const activeEvents = filteredEvents.filter(e => !e.completed);
    const completedEvents = todaysEvents.filter(e => e.completed);

    // 更新计数
    if (ui.completedCount) ui.completedCount.innerText = `(${completedEvents.length})`;

    // 3. 排序 (未完成的按优先级/时间排)
    activeEvents.sort((a, b) => (b.level - a.level) || a.start.localeCompare(b.start));
    
    // 渲染待办任务
    renderListToContainer(activeEvents, ui.listContainer, false);
    
    // 渲染已完成任务
    renderListToContainer(completedEvents, ui.completedContainer, true);
}

// 【新增】通用的渲染辅助函数
function renderListToContainer(events, container, isCompletedList) {
    if (events.length === 0) {
        if (!isCompletedList) {
            container.innerHTML = `<div style="color:#ccc; text-align:center; margin-top:40px;">-- 今日暂无安排 --</div>`;
        }
        return;
    }

    events.forEach(ev => {
        const config = PRIORITY_CONFIG[ev.level];
        const startTime = ev.start.split('T')[1];
        const endTime = ev.end.split('T')[1];
        const isMultiDay = ev.start.split('T')[0] !== ev.end.split('T')[0];

        const card = document.createElement('div');
        card.className = `event-card ${isCompletedList ? 'completed' : ''}`;
        card.style.borderLeftColor = isCompletedList ? '#ccc' : config.color;

        // 构建 HTML
        card.innerHTML = `
            <div class="event-summary">
                <div style="margin-right: 10px;">
                    <div class="btn-check ${ev.completed ? 'checked' : ''}" title="${ev.completed ? '标记为未完成' : '完成任务'}">
                        ${ev.completed ? '✔' : ''}
                    </div>
                </div>

                <div style="flex:1">
                    <div class="event-time">
                        ${startTime} - ${endTime}
                        ${ev.repeat !== 'none' ? '<span class="tag-badge">循环</span>' : ''}
                        ${isMultiDay ? '<span class="tag-badge" style="background:#fff3cd; color:#856404">跨日</span>' : ''}
                    </div>
                    <div class="event-title-display">${ev.title}</div>
                </div>

                <div class="action-btn-group">
                    ${isCompletedList 
                        ? `<button class="btn-delete" title="删除">删除</button>` 
                        : `<div style="font-size:0.8rem; color:${config.color}; border:1px solid ${config.color}; padding:2px 8px; border-radius:12px;">${config.label}</div>`
                    }
                </div>
            </div>
            
            <div class="event-details">
                <p><strong>备注：</strong>${ev.desc || "无"}</p>
            </div>
        `;

        // 绑定事件：勾选
        const checkBtn = card.querySelector('.btn-check');
        checkBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 防止触发卡片展开
            toggleComplete(ev.id);
        });

        // 绑定事件：删除 (仅在已完成列表中存在)
        const deleteBtn = card.querySelector('.btn-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                deleteEvent(ev.id);
            });
        }

        // 绑定事件：卡片点击展开详情
        card.addEventListener('click', () => {
            const detailDiv = card.querySelector('.event-details');
            if (detailDiv.style.display === 'block') {
                detailDiv.style.display = 'none';
            } else {
                detailDiv.style.display = 'block';
            }
        });

        container.appendChild(card);
    });
}

// ==========================================
// 供 calendar.js 调用的全局接口
// ==========================================

/**
 * 获取指定日期下所有日程的颜色数组
 * @param {string} dateStr - 格式 "2026-0-29" (注意月份是 0-11)
 * @returns {Array} - 例如 ["#ff4d4f", "#52c41a"]
 */
window.getDayEventColors = function(dateStr) {
    if (!allEvents || allEvents.length === 0) return [];

    // 1. 解析日期
    const parts = dateStr.split('-');
    const pad = (n) => n.toString().padStart(2, '0');
    // 转换为标准比较格式 "2026-01-29"
    const targetStandard = `${parts[0]}-${pad(parseInt(parts[1]) + 1)}-${pad(parseInt(parts[2]))}`;
    const targetDateObj = new Date(parts[0], parts[1], parts[2]);

    // 2. 筛选当天的未完成任务 (已完成的通常不显示圆点，或者你可以选择显示灰色)
    const dayEvents = allEvents.filter(ev => {
        // 如果想让已完成的任务不显示圆点，加上 !ev.completed
        if (ev.completed) return false; 

        const startStr = ev.start.split('T')[0];
        const endStr = ev.end.split('T')[0];
        const startObj = new Date(startStr);

        // 复用之前的筛选逻辑
        if (ev.repeat === 'none') {
            return targetStandard >= startStr && targetStandard <= endStr;
        }
        if (ev.repeat === 'daily') return startStr <= targetStandard;
        if (ev.repeat === 'weekly') return startObj.getDay() === targetDateObj.getDay() && startStr <= targetStandard;
        if (ev.repeat === 'yearly') return startObj.getMonth() === targetDateObj.getMonth() && startObj.getDate() === targetDateObj.getDate() && startStr <= targetStandard;
        return false;
    });

    // 3. 排序：优先级高的(红色)排在前面
    dayEvents.sort((a, b) => b.level - a.level);

    // 4. 提取颜色 (最多只返回 4 个，避免圆点太多溢出格子)
    return dayEvents.slice(0, 4).map(ev => PRIORITY_CONFIG[ev.level].color);
};