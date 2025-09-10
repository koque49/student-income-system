// 仪表盘页面的JavaScript代码
let incomeChart = null;

// 页面加载完成后初始化仪表盘
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// 初始化仪表盘
function initializeDashboard() {
    // 检查用户是否已登录
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        window.location.href = 'index.html';
        return;
    }
    
    currentUser = JSON.parse(userData);
    
    // 设置页面信息
    document.getElementById('studentInfo').textContent = `学员：${currentUser.studentId}`;
    
    // 绑定退出按钮
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // 加载和显示数据
    loadDashboardData();
}

// 加载仪表盘数据
async function loadDashboardData() {
    try {
        // 如果数据超过1小时，重新获取
        const loginTime = localStorage.getItem('loginTime');
        const now = new Date().getTime();
        
        if (!loginTime || (now - parseInt(loginTime)) > 3600000) { // 1小时
            const sheetData = await getSheetData();
            if (sheetData.length > 0) {
                currentUser.allData = sheetData;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                localStorage.setItem('loginTime', now.toString());
            }
        }
        
        // 处理当前用户的数据
        const userRecords = getUserRecords();
        
        // 更新统计卡片
        updateStatCards(userRecords);
        
        // 更新图表
        updateIncomeChart(userRecords);
        
        // 更新历史记录表格
        updateHistoryTable(userRecords);
        
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        showError('数据加载失败，请刷新页面重试');
    }
}

// 获取当前用户的所有记录
function getUserRecords() {
    const allData = currentUser.allData || [];
    const userRecords = [];
    
    // 从第二行开始（跳过表头）
    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        if (row[0] === currentUser.studentId) {
            userRecords.push({
                date: row[2] || '',
                dailyIncome: parseFloat(row[3]) || 0,
                monthlyTotal: parseFloat(row[4]) || 0
            });
        }
    }
    
    // 按日期排序（最新的在前）
    userRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return userRecords;
}

// 更新统计卡片
function updateStatCards(userRecords) {
    const todayString = getTodayString();
    
    // 今日收益
    const todayRecord = userRecords.find(record => record.date === todayString);
    const todayIncome = todayRecord ? todayRecord.dailyIncome : 0;
    const monthlyTotal = todayRecord ? todayRecord.monthlyTotal : 0;
    
    document.getElementById('todayIncome').textContent = formatMoney(todayIncome);
    document.getElementById('todayDate').textContent = formatDate(todayString);
    
    // 本月累计
    document.getElementById('monthIncome').textContent = formatMoney(monthlyTotal);
    
    // 近7天平均
    const last7Days = userRecords.slice(0, 7);
    const avgIncome = last7Days.length > 0 
        ? last7Days.reduce((sum, record) => sum + record.dailyIncome, 0) / last7Days.length 
        : 0;
    document.getElementById('avgIncome').textContent = formatMoney(avgIncome);
}

// 更新收益趋势图
function updateIncomeChart(userRecords) {
    const ctx = document.getElementById('incomeChart').getContext('2d');
    
    // 销毁现有图表
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // 准备图表数据（最近30天）
    const last30Days = userRecords.slice(0, 30).reverse(); // 反转以时间正序显示
    const labels = last30Days.map(record => formatDate(record.date).substring(5)); // 只显示月-日
    const dailyData = last30Days.map(record => record.dailyIncome);
    const monthlyData = last30Days.map(record => record.monthlyTotal);
    
    incomeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '当日收益',
                    data: dailyData,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                },
                {
                    label: '月累计收益',
                    data: monthlyData,
                    borderColor: '#f5576c',
                    backgroundColor: 'rgba(245, 87, 108, 0.1)',
                    borderWidth: 2,
                    fill: false,
                    tension: 0.4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top'
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return '¥' + value;
                        }
                    }
                }
            },
            elements: {
                point: {
                    radius: 4,
                    hoverRadius: 6
                }
            }
        }
    });
}

// 更新历史记录表格
function updateHistoryTable(userRecords) {
    const historyBody = document.getElementById('historyBody');
    
    if (userRecords.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="3" class="loading">暂无数据</td></tr>';
        return;
    }
    
    // 显示最近30条记录
    const recentRecords = userRecords.slice(0, 30);
    
    historyBody.innerHTML = recentRecords.map(record => `
        <tr>
            <td>${formatDate(record.date)}</td>
            <td>${formatMoney(record.dailyIncome)}</td>
            <td>${formatMoney(record.monthlyTotal)}</td>
        </tr>
    `).join('');
}

// 显示错误信息
function showError(message) {
    // 可以在这里添加更好的错误显示方式
    alert(message);
}

// 退出登录
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// 定期刷新数据（每5分钟）
setInterval(async () => {
    try {
        const sheetData = await getSheetData();
        if (sheetData.length > 0) {
            currentUser.allData = sheetData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            loadDashboardData();
        }
    } catch (error) {
        console.error('自动刷新数据失败:', error);
    }
}, 5 * 60 * 1000); // 5分钟
