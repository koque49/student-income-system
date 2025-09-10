const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    console.log('=== Excel数据读取API ===');

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        const { action } = body;

        console.log('请求操作:', action);

        if (action === 'getData') {
            const dataResult = await getExcelData();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(dataResult)
            };
        }

        if (action === 'getProcessInfo') {
            const processInfo = await getProcessInfo();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(processInfo)
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '无效的操作类型' })
        };

    } catch (error) {
        console.error('数据读取失败:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: '服务器错误', 
                details: error.message,
                fallbackData: getFallbackData()
            })
        };
    }
};

// 读取Excel处理后的数据
async function getExcelData() {
    try {
        console.log('读取Excel处理后的数据...');
        
        const dataPath = path.join(process.cwd(), 'data', 'income-data.json');
        
        if (fs.existsSync(dataPath)) {
            const jsonContent = fs.readFileSync(dataPath, 'utf8');
            const data = JSON.parse(jsonContent);
            
            console.log('Excel数据读取成功，行数:', Array.isArray(data) ? data.length : 0);
            
            return {
                code: 0,
                data: { values: Array.isArray(data) ? data : [] },
                message: '数据读取成功',
                source: 'excel',
                timestamp: new Date().toISOString()
            };
        } else {
            console.log('未找到Excel数据文件，返回示例数据');
            return {
                code: 0,
                data: { values: getFallbackData() },
                message: '使用示例数据（请上传Excel文件）',
                source: 'fallback',
                timestamp: new Date().toISOString()
            };
        }
        
    } catch (error) {
        console.error('读取Excel数据失败:', error);
        throw error;
    }
}

// 获取处理状态信息
async function getProcessInfo() {
    try {
        console.log('获取Excel处理状态...');
        
        const reportPath = path.join(process.cwd(), 'data', 'process-report.json');
        
        if (fs.existsSync(reportPath)) {
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            
            return {
                code: 0,
                data: report,
                message: '处理状态获取成功'
            };
        } else {
            return {
                code: 0,
                data: {
                    processTime: '未知',
                    sourceFile: '无',
                    rowCount: 0,
                    status: 'no_data',
                    lastUpdate: '无数据'
                },
                message: '未找到处理报告'
            };
        }
        
    } catch (error) {
        console.error('获取处理状态失败:', error);
        throw error;
    }
}

// 获取示例数据
function getFallbackData() {
    const today = new Date();
    const data = [
        ['学号', '密码', '日期', '当日预估收益', '本月累计收益']
    ];
    
    // 生成一些示例数据
    const students = [
        { id: '1001', password: '123456' },
        { id: '1002', password: '654321' },
        { id: '1003', password: '111111' }
    ];
    
    students.forEach(student => {
        let monthTotal = 0;
        
        // 最近10天的数据
        for (let i = 9; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dailyIncome = 80 + Math.random() * 60; // 80-140
            monthTotal += dailyIncome;
            
            data.push([
                student.id,
                student.password,
                date.toISOString().split('T')[0],
                dailyIncome.toFixed(2),
                monthTotal.toFixed(2)
            ]);
        }
    });
    
    return data;
}
