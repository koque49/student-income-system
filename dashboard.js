// 仪表盘页面的JavaScript代码
let incomeChart = null;

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
        
        // 加载和显示数据
        loadDashboardData();
        
    } catch (error) {
        console.error('初始化仪表盘失败:', error);
        alert('数据加载失败，请重新登录');
        window.location.href = 'index.html';
    }
}

// 加载仪表盘数据
async function loadDashboardData() {
    console.log('开始加载仪表盘数据...');
    
    try {
        // 检查是否有缓存数据
        if (!currentUser.allData || currentUser.allData.length === 0) {
            console.log('没有缓存数据，重新获取...');
            
            // 重新获取数据
            const sheetData = await getSheetData();
            if (sheetData && sheetData.length > 0) {
                currentUser.allData = sheetData;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                console.log('数据重新获取成功:', sheetData);
            } else {
                throw new Error('无法获取表格数据');
            }
        }
        
        // 处理当前用户的数据
        const userRecords = getUserRecords();
        console.log('用户记录:', userRecords);
        
        if (userRecords.length === 0) {
            console.log('没有找到用户记录，显示默认数据');
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

// 获取当前用户的所有记录
function getUserRecords() {
    console.log('获取用户记录...');
    
    const allData = currentUser.allData || [];
    const userRecords = [];
    
    console.log('所有数据:', allData);
    console.log('当前用户学号:', currentUser.studentId);
    
    // 从第二行开始（跳过表头）
    for (let i = 1; i < allData.length; i++) {
        const row = allData[i];
        console.log(`检查第${i}行:`, row);
        
        if (row && row[0] && row[0].toString().trim() === currentUser.studentId.toString().trim()) {
            const record = {
                date: row[2] || getTodayString(),
                dailyIncome: parseFloat(row[3]) || 0,
                monthlyTotal: parseFloat(row[4]) || 0
            };
            userRecords.push(record);
            console.log('添加记录:', record);
        }
    }
    
    // 如果没有找到记录，添加一个默认记录
    if (userRecords.length === 0) {
        console.log('没有找到匹配记录，添加默认数据');
        userRecords.push({
            date: getTodayString(),
            dailyIncome: 0,
            monthlyTotal: 0
        });
    }
    
    // 按日期排序（最新的在前）
    userRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    return userRecords;
}

// 更新统计卡片
function updateStatCards(userRecords) {
    console.log('更新统计卡片:', userRecords);
    
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
    console.log('更新收益图表:', userRecords);
    
    const ctx = document.getElementById('incomeChart');
    if (!ctx) {
        console.error('找不到图表元素');
        return;
    }
    
    // 销毁现有图表
    if (incomeChart) {
        incomeChart.destroy();
    }
    
    // 准备图表数据（最近30天）
    const last30Days = userRecords.slice(0, 30).reverse(); // 反转以时间正序显示
    const labels = last30Days.map(record => formatDate(record.date).substring(5)); // 只显示月-日
    const dailyData = last30Days.map(record => record.dailyIncome);
    const monthlyData = last30Days.map(record => record.monthlyTotal);
    
    try {
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
        console.log('图表创建成功');
    } catch (error) {
        console.error('图表创建失败:', error);
    }
}

// 更新历史记录表格
function updateHistoryTable(userRecords) {
    console.log('更新历史记录表格:', userRecords);
    
    const historyBody = document.getElementById('historyBody');
    if (!historyBody) {
        console.error('找不到历史记录表格元素');
        return;
    }
    
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

// 显示无数据消息
function showNoDataMessage() {
    document.getElementById('todayIncome').textContent = '¥0.00';
    document.getElementById('monthIncome').textContent = '¥0.00';
    document.getElementById('avgIncome').textContent = '¥0.00';
    
    const historyBody = document.getElementById('historyBody');
    historyBody.innerHTML = '<tr><td colspan="3" class="loading">暂无收益记录</td></tr>';
}

// 显示错误信息
function showError(message) {
    console.error('显示错误:', message);
    alert(message + '\n\n请尝试：\n1. 刷新页面\n2. 重新登录');
}

// 退出登录
function logout() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTime');
    window.location.href = 'index.html';
}

// 获取访问令牌的函数（从script.js复制）
async function getAccessToken() {
    try {
        const response = await fetch('/.netlify/functions/feishu-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getToken'
            })
        });
        
        const data = await response.json();
        if (data.code === 0) {
            accessToken = data.tenant_access_token;
            return true;
        } else {
            throw new Error('获取访问令牌失败: ' + (data.msg || '未知错误'));
        }
    } catch (error) {
        console.error('获取访问令牌错误:', error);
        return false;
    }
}

// 获取表格数据的函数（从script.js复制）
async function getSheetData() {
    try {
        if (!accessToken && !(await getAccessToken())) {
            throw new Error('无法获取访问令牌');
        }
        
        const response = await fetch('/.netlify/functions/feishu-proxy', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'getData',
                token: accessToken
            })
        });
        
        const data = await response.json();
        if (data.code === 0) {
            return data.data.values || [];
        } else {
            throw new Error('获取数据失败: ' + (data.msg || '未知错误'));
        }
    } catch (error) {
        console.error('获取表格数据错误:', error);
        return [];
    }
}

// 工具函数（从script.js复制）
function formatMoney(amount) {
    if (!amount || isNaN(amount)) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
