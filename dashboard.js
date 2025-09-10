// 仪表盘页面的JavaScript代码
let incomeChart = null;
let currentUser = null;

// 页面加载完成后初始化仪表盘
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

// 初始化仪表盘
function initializeDashboard() {
    console.log('初始化仪表盘...');
    
    // 检查用户是否已登录
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        console.log('未找到用户数据，跳转到登录页');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('当前用户:', currentUser);
        
        // 设置页面信息
        document.getElementById('studentInfo').textContent = `学员：${currentUser.studentId}`;
        
        // 绑定退出按钮
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        // 绑定刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshData);
        }
        
        // 显示同步状态
        showSyncStatus();
        
        // 加载和显示数据
        loadDashboardData();
        
    } catch (error) {
        console.error('初始化仪表盘失败:', error);
        alert('数据加载失败，请重新登录');
        window.location.href = 'index.html';
    }
}

// 显示数据同步状态
async function showSyncStatus() {
    try {
        const response = await fetch('/.netlify/functions/data-reader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getSyncInfo' })
        });
        
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const syncInfo = result.data;
            const statusElement = document.getElementById('syncStatus');
            
            if (statusElement) {
                statusElement.innerHTML = `
                    <small class="text-muted">
                        📊 数据同步状态: ${syncInfo.status === 'success' ? '✅ 正常' : '⚠️ 异常'} | 
                        🕒 最后更新: ${syncInfo.lastSync || '未知'} | 
                        📈 数据行数: ${syncInfo.dataRows || 0}
                    </small>
                `;
            }
        }
    } catch (error) {
        console.log('获取同步状态失败:', error);
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    console.log('开始加载仪表盘数据...');
    
    try {
        // 显示加载状态
        showLoadingState();
        
        // 从GitHub Actions同步的数据中读取
        const sheetData = await getRealTimeData();
        console.log('获取到的真实数据:', sheetData);
        
        if (sheetData && Array.isArray(sheetData) && sheetData.length > 0) {
            currentUser.allData = sheetData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('数据保存成功，数据行数:', sheetData.length);
        } else {
            throw new Error('无法获取表格数据或数据格式错误');
        }
        
        // 处理当前用户的数据
        const userRecords = getUserRecords();
        console.log('用户记录:', userRecords);
        
        if (userRecords.length === 0) {
            console.log('没有找到用户记录，显示空数据提示');
            showNoDataMessage();
            return;
        }
        
        // 更新统计卡片
        updateStatCards(userRecords);
        
        // 更新图表
        updateIncomeChart(userRecords);
        
        // 更新历史记录表格
        updateHistoryTable(userRecords);
        
        console.log('仪表盘数据加载完成');
        
    } catch (error) {
        console.error('加载仪表盘数据失败:', error);
        showError('数据加载失败: ' + error.message);
    }
}

// 获取实时数据
async function getRealTimeData() {
    try {
        console.log('正在获取GitHub同步的真实数据...');
        
        const response = await fetch('/.netlify/functions/data-reader', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getData'
            })
        });
        
        const data = await response.json();
        console.log('数据读取API返回:', data);
        
        if (data.code === 0 && data.data && data.data.values) {
            console.log('成功获取真实数据，行数:', data.data.values.length);
            return data.data.values;
        } else {
            console.error('数据读取API返回错误:', data);
            throw new Error('获取数据失败: ' + (data.error || data.message || '未知错误'));
        }
    } catch (error) {
        console.error('获取真实数据错误:', error);
        throw error;
    }
}

// 获取当前用户的所有记录
function getUserRecords() {
    console.log('获取用户记录...');
    
    const allData = currentUser.allData || [];
    const userRecords = [];
    
    console.log('所有数据行数:', allData.length);
    console.log('当前用户学号:', currentUser.studentId);
    
    if (!Array.isArray(allData) || allData.length === 0) {
        console.log('没有数据或数据格式错误');
        return [];
    }
    
    // 从第二行开始（跳过表头）
    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        
        if (row && Array.isArray(row) && row.length >= 5 && row[0]) {
            const studentId = row[0].toString().trim();
            const currentStudentId = currentUser.studentId.toString().trim();
            
            if (studentId === currentStudentId) {
                const record = {
                    date: row[2] || getTodayString(),
                    dailyIncome: parseFloat(row[3]) || 0,
                    monthlyTotal: parseFloat(row[4]) || 0
                };
                userRecords.push(record);
                console.log('找到匹配记录:', record);
            }
        }
    }
    
    // 按日期排序（最新的在前）
    userRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('最终用户记录数量:', userRecords.length);
    return userRecords;
}

// 显示加载状态
function showLoadingState() {
    const elements = ['todayIncome', 'monthIncome', 'avgIncome'];
    elements.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = '加载中...';
    });
    
    const historyBody = document.getElementById('historyBody');
    if (historyBody) {
        historyBody.innerHTML = '<tr><td colspan="3" class="loading">🔄 正在从飞书同步最新数据...</td></tr>';
    }
}

// 更新统计卡片
function updateStatCards(userRecords) {
    console.log('更新统计卡片:', userRecords.length, '条记录');
    
    if (userRecords.length === 0) {
        showNoDataMessage();
        return;
    }
    
    // 今日收益（最新记录）
    const latestRecord = userRecords[0];
    document.getElementById('todayIncome').textContent = formatMoney(latestRecord.dailyIncome);
    document.getElementById('todayDate').textContent = formatDisplayDate(latestRecord.date);
    
    // 本月累计（最新记录的累计）
    document.getElementById('monthIncome').textContent = formatMoney(latestRecord.monthlyTotal);
    
    // 近7天平均
    const last7Days = userRecords.slice(0, Math.min(7, userRecords.length));
    const avgIncome = last7Days.length > 0 
        ? last7Days.reduce((sum, record) => sum + record.dailyIncome, 0) / last7Days.length 
        : 0;
    document.getElementById('avgIncome').textContent = formatMoney(avgIncome);
    
    console.log('统计更新完成');
}

// 更新收益趋势图
function updateIncomeChart(userRecords) {
    console.log('更新收益图表...');
    
    const ctx = document.getElementById('incomeChart');
    if (!ctx) {
        console.error('找不到图表元素');
        return;
    }
    
    // 销毁现有图表
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // 准备图表数据（最近15天，时间正序）
    const chartData = userRecords.slice(0, 15).reverse();
    const labels = chartData.map(record => {
        const date = new Date(record.date);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const dailyData = chartData.map(record => record.dailyIncome);
    const monthlyData = chartData.map(record => record.monthlyTotal);
    
    try {
        incomeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: '当日收益 (¥)',
                        data: dailyData,
                        borderColor: '#667eea',
                        backgroundColor: 'rgba(102, 126, 234, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#667eea',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5
                    },
                    {
                        label: '月累计收益 (¥)',
                        data: monthlyData,
                        borderColor: '#f5576c',
                        backgroundColor: 'rgba(245, 87, 108, 0.1)',
                        borderWidth: 3,
                        fill: false,
                        tension: 0.4,
                        pointBackgroundColor: '#f5576c',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        labels: {
                            padding: 20,
                            font: { size: 12, weight: 'bold' }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#667eea',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return context.dataset.label + ': ¥' + context.parsed.y.toFixed(2);
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: {
                            callback: function(value) {
                                return '¥' + value;
                            },
                            font: { size: 11 }
                        }
                    },
                    x: {
                        grid: { color: 'rgba(0, 0, 0, 0.1)' },
                        ticks: { font: { size: 11 } }
                    }
                }
            }
        });
        console.log('图表创建成功');
    } catch (error) {
        console.error('图表创建失败:', error);
    }
}

// 更新历史记录表格
function updateHistoryTable(userRecords) {
    console.log('更新历史记录表格...');
    
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) {
        console.error('找不到历史记录表格元素');
        return;
    }
    
    if (userRecords.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="3" class="loading">📊 暂无您的收益记录</td></tr>';
        return;
    }
    
    // 显示所有记录
    historyBody.innerHTML = userRecords.map((record, index) => `
        <tr style="animation: fadeIn 0.5s ease ${index * 0.1}s both;">
            <td>${formatDisplayDate(record.date)}</td>
            <td style="color: #28a745; font-weight: 600;">${formatMoney(record.dailyIncome)}</td>
            <td style="color: #007bff; font-weight: 600;">${formatMoney(record.monthlyTotal)}</td>
        </tr>
    `).join('');
    
    console.log('历史记录更新完成，显示', userRecords.length, '条记录');
}

// 显示无数据消息
function showNoDataMessage() {
    document.getElementById('todayIncome').textContent = '¥0.00';
    document.getElementById('monthIncome').textContent = '¥0.00';
    document.getElementById('avgIncome').textContent = '¥0.00';
    
    const historyBody = document.getElementById('
