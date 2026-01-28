const monthYearElement = document.getElementById('month-year');
const daysGrid = document.getElementById('days-grid');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const todayObj = new Date();
const todayBtn = document.getElementById('today-btn');
// 默认初始化为今天的日期字符串，例如 "2026-0-28" (注意月份从0开始)
let selectedDateStr = `${todayObj.getFullYear()}-${todayObj.getMonth()}-${todayObj.getDate()}`;

let currentDate = new Date();

function renderCalendar() {
    daysGrid.innerHTML = ""; // 清空当前视图
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // 设置头部标题
    monthYearElement.innerText = `${year}年 ${month + 1}月`;

    // 获取本月第一天是周几 (0是周日)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // 获取本月最后一天
    const lastDay = new Date(year, month + 1, 0).getDate();

    // 填充月初的空白
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
        dayDiv.innerText = day;

        //构建当前日期唯一标识字符串
        const dateID = `${year}-${month}-${day}`;

        // 选中日期的处理
        if (dateID === selectedDateStr) {
            dayDiv.classList.add('selected');
        }
        // 标记今天
        if (day === today.getDate() && 
            month === today.getMonth() && 
            year === today.getFullYear()) {
            dayDiv.classList.add('today');
        }
        // 点击选择日期
        dayDiv.addEventListener('click', () => {
            selectedDateStr = dateID;
            renderCalendar();
        });
        daysGrid.appendChild(dayDiv);
    }
}

// 初始化
renderCalendar();

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
