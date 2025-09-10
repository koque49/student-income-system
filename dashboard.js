// Excel数据仪表盘
let incomeChart = null;
let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    console.log('初始化Excel数据仪表盘...');
    
    const userData = localStorage.getItem('currentUser');
    if (!userData) {
        console.log('未找到用户数据，跳转到登录页');
        window.location.href = 'index.html';
        return;
    }
    
    try {
        currentUser = JSON.parse(userData);
        console.log('当前用户:', currentUser);
        
        document.getElementById('studentInfo').textContent = `学员：${currentUser.studentId}`;
        
        // 绑定事件
        document.getElementById('logoutBtn').addEventListener('click', logout);
        
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', refreshData);
        }
        
        // 显示数据源状态
        showDataSourceStatus();
        
        // 加载数据
        loadDashboardData();
        
    } catch (error) {
        console.error('初始化失败:', error);
        alert('初始化失败，请重新登录');
        window.location.href = 'index.html';
    }
}

// 显示数据源状态
async function showDataSourceStatus() {
    try {
        const response = await fetch('/.netlify/functions/data-reader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getProcessInfo' })
        });
        
        const result = await response.json();
        
        if (result.code === 0 && result.data) {
            const info = result.data;
            const statusElement = document.getElementById('dataSourceStatus');
            
            if (statusElement) {
                let statusHtml = '';
                
                if (info.status === 'success') {
                    statusHtml = `
                        <small class="text-success">
                            📊 数据源: Excel文件 | 
                            📄 文件: ${info.sourceFile || '未知'} | 
                            🕒 更新: ${info.lastUpdate || '未知'} | 
                            📈 行数: ${info.rowCount || 0}
                        </small>
                    `;
                } else {
                    statusHtml = `
                        <small class="text-warning">
                            ⚠️ 请上传Excel文件到data目录 | 
                            📋 当前使用示例数据
                        </small>
                    `;
                }
                
                statusElement.innerHTML = statusHtml;
            }
        }
    } catch (error) {
        console.log('获取数据源状态失败:', error);
        const statusElement = document.getElementById('dataSourceStatus');
        if (statusElement) {
            statusElement.innerHTML = '<small class="text-muted">📊 数据源状态检查中...</small>';
        }
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    console.log('开始加载Excel数据...');
    
    try {
        showLoadingState();
        
        // 获取Excel数据
        const excelData = await getExcelData();
        console.log('Excel数据获取成功:', excelData);
        
        if (excelData && Array.isArray(excelData) && excelData.length > 0) {
            currentUser.allData = excelData;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            console.log('数据保存成功，数据行数:', excelData.length);
        } else {
            throw new Error('Excel数据格式错误或为空');
        }
        
        // 处理当前用户的数据
        const userRecords = getUserRecords();
        console.log('用户记录:', userRecords);
        
        if (userRecords.length === 0) {
            console.log('没有找到用户记录');
            showNoDataMessage();
            return;
        }
        
        // 更新界面
        updateStatCards(userRecords);
        updateIncomeChart(userRecords);
        updateHistoryTable(userRecords);
        
        console.log('仪表盘数据加载完成');
        
    } catch (error) {
        console.error('加载Excel数据失败:', error);
        showError('数据加载失败: ' + error.message);
    }
}

// 获取Excel数据
async function getExcelData() {
    try {
        console.log('正在获取Excel处理后的数据...');
        
        const response = await fetch('/.netlify/functions/data-reader', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'getData' })
        });
        
        const data = await response.json();
        console.log('Excel数据API返回:', data);
        
        if (data.code === 0 && data.data && data.data.values) {
            console.log('Excel数据获取成功，来源:', data.source);
            return data.data.values;
        } else {
            console.error('Excel数据API返回错误:', data);
            throw new Error('获取Excel数据失败: ' + (data.error || '未知错误'));
        }
    } catch (error) {
        console.error('获取Excel数据错误:', error);
        throw error;
    }
}

// 获取当前用户的记录
function getUserRecords() {
    console.log('提取用户记录...');
    
    const allData = currentUser.allData || [];
    const userRecords = [];
    
    console.log('Excel总数据行数:', allData.length);
    console.log('当前用户学号:', currentUser.studentId);
    
    if (!Array.isArray(allData) || allData.length === 0) {
        console.log('Excel数据为空或格式错误');
        return [];
    }
    
    // 从第二行开始（跳过表头）
    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        
        if (row && Array.isArray(row) && row.length >= 5 && row[0]) {
            const studentId = String(row[0]).trim();
            const currentStudentId = String(currentUser.studentId).trim();
            
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
    
    // 按日期排序（最新在前）
    userRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('用户记录提取完成，总数:', userRecords.length);
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
        historyBody.innerHTML = '<tr><td colspan="3" class="text-center">📊 正在读取Excel数据...</td></tr>';
    }
}

// 更新统计卡片
function updateStatCards(userRecords) {
    console.log('更新统计卡片:', userRecords.length, '条记录');
    
    if (userRecords.length === 0) {
        showNoDataMessage();
        return;
    }
    
    // 最新记录（今日收益）
    const latestRecord = userRecords[0];
    document.getElementById('todayIncome').textContent = formatMoney(latestRecord.dailyIncome);
    document.getElementById('todayDate').textContent = formatDisplayDate(latestRecord.date);
    
    // 本月累计
    document.getElementById('monthIncome').textContent = formatMoney(latestRecord.monthlyTotal);
    
    // 近7天平均
    const last7Days = userRecords.slice(0, Math.min(7, userRecords.length));
    const avgIncome = last7Days.length > 0 
        ? last7Days.reduce((sum, record) => sum + record.dailyIncome, 0) / last7Days.length 
        : 0;
    document.getElementById('avgIncome').textContent = formatMoney(avgIncome);
    
    console.log('统计卡片更新完成');
}

// 更新收益图表
function updateIncomeChart(userRecords) {
    console.log('更新Excel数据图表...');
    
    const ctx = document.getElementById('incomeChart');
    if (!ctx) return;
    
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // 最近15天数据，时间正序
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
                        labels: { padding: 20, font: { size: 12, weight: 'bold' } }
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
                            callback: function(value) { return '¥' + value; },
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
        console.log('Excel数据图表创建成功');
    } catch (error) {
        console.error('图表创建失败:', error);
    }
}

// 更新历史记录表格
function updateHistoryTable(userRecords) {
    console.log('更新历史记录表格...');
    
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) return;
    
    if (userRecords.length === 0) {
        historyBody.innerHTML = '<tr><td colspan="3" class="text-center">📊 Excel中暂无您的收益记录</td></tr>';
        return;
    }
    
    historyBody.innerHTML = userRecords.map((record, index) => `
        <tr style="animation: fadeIn 0.5s ease ${index * 0.1}s both;">
            <td>${formatDisplayDate(record.date)}</td>
            <td style="color: #28a745; font-weight: 600;">${formatMoney(record.dailyIncome)}</td>
            <td style="color: #007bff; font-weight: 600;">${formatMoney(record.monthlyTotal)}</td>
        </tr>
    `).join('');
    
    console.log('历史记录表格更新完成，显示', userRecords.length, '条记录');
}

// 显示无数据消息
function showNoDataMessage() {
    document.getElementById('todayIncome').textContent = '¥0.00';
    document.getElementById('monthIncome').textContent = '¥0.00';
    document.getElementById('avgIncome').textContent = '¥0.00';
    
    const historyBody = document.getElementById('historyBody');
    if (historyBody) {
        historyBody.innerHTML = '<tr><td colspan="3" class="text-center">📋 请在Excel文件中添加您的收益数据</td></tr>';
    }
}

// 显示错误信息
function showError(message) {
    console.error('显示错误:', message);
    alert('⚠️ ' + message);
}

// 刷新数据
async function refreshData() {
    console.log('手动刷新Excel数据...');
    
    const refreshBtn = document.getElementById('refreshBtn');
    if (!refreshBtn) return;
    
    const originalText = refreshBtn.textContent;
    
    try {
        refreshBtn.textContent = '🔄 刷新中...';
        refreshBtn.disabled = true;
        
        await loadDashboardData();
        
        console.log('Excel数据刷新成功');
        refreshBtn.textContent = '✅ 已刷新';
        setTimeout(() => {
            refreshBtn.textContent = originalText;
        }, 2000);
        
    } catch (error) {
        console.error('Excel数据刷新失败:', error);
        refreshBtn.textContent = '❌ 失败';
        setTimeout(() => {
            refreshBtn.textContent = originalText;
        }, 2000);
    } finally {
        refreshBtn.disabled = false;
    }
}

// 退出登录
function logout() {
    if (confirm('确定要退出登录吗？')) {
        localStorage.removeItem('currentUser');
        localStorage.removeItem('loginTime');
        window.location.href = 'index.html';
    }
}

// 工具函数
function formatMoney(amount) {
    if (!amount || isNaN(amount)) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
}

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    return date.toLocaleDateString('zh-CN');
}

function getTodayString() {
    return new Date().toISOString().split('T')[0];
}

// 添加动画样式
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    
    .stat-card {
        transition: transform 0.3s ease, box-shadow 0.3s ease;
    }
    
    .stat-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }
`;
document.head.appendChild(style);
