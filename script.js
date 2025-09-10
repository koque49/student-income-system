// 全局变量
let accessToken = '';
let currentUser = null;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializePage();
});

// 初始化页面
function initializePage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

// 获取飞书访问令牌
async function getAccessToken() {
    try {
        const response = await fetch(CORS_PROXY + CONFIG.FEISHU_API_BASE + '/auth/v3/tenant_access_token/internal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                app_id: CONFIG.FEISHU_APP_ID,
                app_secret: CONFIG.FEISHU_APP_SECRET
            })
        });
        
        const data = await response.json();
        if (data.code === 0) {
            accessToken = data.tenant_access_token;
            return true;
        } else {
            throw new Error('获取访问令牌失败');
        }
    } catch (error) {
        console.error('获取访问令牌错误:', error);
        return false;
    }
}

// 获取表格数据
async function getSheetData() {
    try {
        if (!accessToken && !(await getAccessToken())) {
            throw new Error('无法获取访问令牌');
        }
        
        const url = `${CORS_PROXY}${CONFIG.FEISHU_API_BASE}/sheets/v2/spreadsheets/${CONFIG.SPREADSHEET_TOKEN}/values/Sheet1!A:E`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        if (data.code === 0) {
            return data.data.values || [];
        } else {
            throw new Error('获取数据失败');
        }
    } catch (error) {
        console.error('获取表格数据错误:', error);
        return [];
    }
}

// 处理登录
async function handleLogin(event) {
    event.preventDefault();
    
    const studentId = document.getElementById('studentId').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');
    const loginText = document.getElementById('loginText');
    const loadingText = document.getElementById('loadingText');
    
    // 显示加载状态
    loginText.style.display = 'none';
    loadingText.style.display = 'inline';
    errorMessage.style.display = 'none';
    
    try {
        // 获取表格数据
        const sheetData = await getSheetData();
        
        if (sheetData.length === 0) {
            throw new Error('无法获取数据，请稍后重试');
        }
        
        // 验证用户信息（跳过表头）
        let userFound = false;
        for (let i = 1; i < sheetData.length; i++) {
            const row = sheetData[i];
            if (row[0] === studentId && row[1] === password) {
                userFound = true;
                currentUser = {
                    studentId: studentId,
                    allData: sheetData
                };
                break;
            }
        }
        
        if (userFound) {
            // 保存用户信息到本地存储
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('loginTime', new Date().getTime().toString());
            
            // 跳转到仪表盘
            window.location.href = 'dashboard.html';
        } else {
            throw new Error('学号或密码错误，请重试');
        }
        
    } catch (error) {
        errorMessage.textContent = error.message;
        errorMessage.style.display = 'block';
    } finally {
        // 恢复按钮状态
        loginText.style.display = 'inline';
        loadingText.style.display = 'none';
    }
}

// 格式化金额
function formatMoney(amount) {
    if (!amount || isNaN(amount)) return '¥0.00';
    return '¥' + parseFloat(amount).toFixed(2);
}

// 格式化日期
function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// 获取今天的日期字符串
function getTodayString() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
