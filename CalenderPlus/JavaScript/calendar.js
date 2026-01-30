const monthYearElement = document.getElementById('month-year');
const daysGrid = document.getElementById('days-grid');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const todayObj = new Date();
const todayBtn = document.getElementById('today-btn');
// 默认初始化为今天的日期字符串，例如 "2026-0-28" (注意月份从0开始)
let selectedDateStr = `${todayObj.getFullYear()}-${todayObj.getMonth()}-${todayObj.getDate()}`;
window.selectedDateStr = selectedDateStr;//初始化挂载保险
let currentDate = new Date();

// 1. 【修改】将函数赋值给 window，使其成为全局函数
window.renderCalendar = function() {
    daysGrid.innerHTML = ""; // 清空当前视图
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    monthYearElement.innerText = `${year}年 ${month + 1}月`;

    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();

    // 填充空白
    for (let i = 0; i < firstDayIndex; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('day', 'empty');
        daysGrid.appendChild(emptyDiv);
    }

    // 填充日期
    const today = new Date();
    for (let day = 1; day <= lastDay; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        
        // --- 结构优化：数字单独用 span 包裹 ---
        const numSpan = document.createElement('span');
        numSpan.innerText = day;
        numSpan.style.zIndex = "2"; // 确保数字在最上层
        dayDiv.appendChild(numSpan);
        // ------------------------------------

        const dateID = `${year}-${month}-${day}`;

        // --- 调用接口绘制圆点 ---
        if (typeof window.getDayEventColors === 'function') {
            const colors = window.getDayEventColors(dateID);
            if (colors.length > 0) {
                const dotsDiv = document.createElement('div');
                dotsDiv.className = 'dots-container';
                colors.forEach(color => {
                    const dot = document.createElement('div');
                    dot.className = 'event-dot';
                    dot.style.backgroundColor = color;
                    dotsDiv.appendChild(dot);
                });
                dayDiv.appendChild(dotsDiv);
            }
        }

        // 选中状态
        if (dateID === window.selectedDateStr) { // 建议统一使用 window.selectedDateStr
            dayDiv.classList.add('selected');
        }
        // 今天状态
        if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }

        // 点击事件
        dayDiv.addEventListener('click', () => {
            window.selectedDateStr = dateID; // 同步全局
            selectedDateStr = dateID;        // 同步局部
            window.renderCalendar();         // 重新渲染日历(为了更新选中样式)
            selectNewDate(selectedDateStr);  // 发射信号
        });

        daysGrid.appendChild(dayDiv);
    }
}

// 初始化时调用
window.renderCalendar();

// 这是一个包装函数，专门处理带动画的月份/年份切换
function changeMonth(delta) {
    const grid = document.getElementById('days-grid');
    
    // 1. 添加消失类
    grid.classList.add('fade-out');

    // 2. 等待 CSS 动画过半（约 150ms）后更新数据
    setTimeout(() => {
        currentDate.setMonth(currentDate.getMonth() + delta);
        renderCalendar(); // 重新渲染日期
        
        // 3. 移除消失类，触发淡入
        grid.classList.remove('fade-out');
    }, 150); 
}
// 滚轮事件
document.querySelector('.calendar-card').addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = event.deltaY < 0 ? -1 : 1;
    changeMonth(delta);
}, { passive: false });

// 按钮事件
prevBtn.addEventListener('click', () => changeMonth(-1));
nextBtn.addEventListener('click', () => changeMonth(1));
// 回到today按钮
todayBtn.addEventListener('click', () => {
    // 1. 获取当前真实的时间对象
    const now = new Date();
    
    // 2. 如果当前已经在“今天”所在的月份，就没必要触发动画了
    if (currentDate.getMonth() === now.getMonth() && 
        currentDate.getFullYear() === now.getFullYear()) {
        return; 
    }

    // 3. 将日历指针设为今天
    currentDate = new Date(); 
    
    // 4. 执行带动画的渲染（这里传 0 表示不需要加减月份，只需重置视图）
    changeMonth(0); 
});
//将选中日期发射给其他模块
function selectNewDate(date) {
    const event = new CustomEvent('dateUpdate', { detail: date });
    window.dispatchEvent(event);
};
/**在页面完全加载（包含 eventmanage.js）之后，补发一次初始信号**/
window.addEventListener('load', () => {
    // 确保此时变量是有值的
    if (typeof selectNewDate === 'function') {
        selectNewDate(selectedDateStr);
    }
});

// 为了确保 eventmanage.js 能读取到这个变量，建议将它挂载到 window
window.selectedDateStr = selectedDateStr;