/**
 * eventmanage.js
 * 负责接收日历信号并更新右侧顶栏的日期与星期显示
 */

// 1. 接收来自 calendar.js 的信号
window.addEventListener('dateUpdate', (e) => {
    const freshDate = e.detail;
    console.log('接收到最新日期:', freshDate);
    changeDateDisplay(freshDate);
});

/**
 * 更新顶栏显示函数
 * 用处：将 "2026-0-29" 拆分并填入对应的 HTML 元素中，同时计算星期
 */
function changeDateDisplay(date) {
    if (!date) return;

    // 抓取 HTML 元素
    const topbarYear = document.getElementById('topbar-year');
    const topbarMonth = document.getElementById('topbar-month');
    const topbarDay = document.getElementById('topbar-day');
    const topbarWeekday = document.getElementById('topbar-weekday'); // 确保 HTML 中有此 ID

    // 拆分字符串 "2026-0-29" -> ["2026", "0", "29"]
    const currentdates = date.split('-');
    const year = parseInt(currentdates[0]);
    const month = parseInt(currentdates[1]); // 原生月份 0-11
    const day = parseInt(currentdates[2]);

    // --- 新增：星期计算逻辑 ---
    // 星期数组映射
    const weekDays = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];
    // 创建一个临时的日期对象来获取星期索引
    const dateObj = new Date(year, month, day);
    const weekdayName = weekDays[dateObj.getDay()];

    // 安全地更新 UI
    if (topbarYear) topbarYear.innerText = year;
    if (topbarMonth) topbarMonth.innerText = month + 1; // 转换为人类习惯的 1-12月
    if (topbarDay) topbarDay.innerText = day;
    if (topbarWeekday) {
        topbarWeekday.innerText = weekdayName;
    }
}

/**
 * 初始化首屏：主动读取 calendar.js 定义的初始日期
 */
if (window.selectedDateStr) {
    changeDateDisplay(window.selectedDateStr);
}