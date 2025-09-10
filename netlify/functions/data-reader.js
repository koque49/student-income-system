const fs = require('fs');
const path = require('path');

exports.handler = async (event, context) => {
    console.log('=== 数据读取API开始 ===');

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

        console.log('请求动作:', action);

        if (action === 'getData') {
            // 读取GitHub Actions同步的数据
            const dataResult = await getLocalData();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(dataResult)
            };
        }

        if (action === 'getSyncInfo') {
            // 获取同步状态信息
            const syncInfo = await getSyncInfo();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(syncInfo)
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '无效的操作' })
        };

    } catch (error) {
        console.error('数据读取API错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: '数据读取失败', 
                details: error.message 
            })
        };
    }
};

// 读取本地同步的数据
async function getLocalData() {
    try {
        console.log('开始读取本地数据...');
        
        // 尝试读取JSON格式数据
        const jsonPath = path.join(process.cwd(), 'data', 'income-data.json');
        const csvPath = path.join(process.cwd(), 'data', 'income-data.csv');
        
        let data = null;
        
        // 优先读取JSON文件
        if (fs.existsSync(jsonPath)) {
            console.log('读取JSON数据文件...');
            const jsonContent = fs.readFileSync(jsonPath, 'utf8');
            data = JSON.parse(jsonContent);
            console.log('JSON数据读取成功，行数:', Array.isArray(data) ? data.length : 0);
        }
        // 备选读取CSV文件
        else if (fs.existsSync(csvPath)) {
            console.log('JSON文件不存在，读取CSV数据文件...');
            const csvContent = fs.readFileSync(csvPath, 'utf8');
            
            // 简单CSV解析
            const lines = csvContent.trim().split('\n');
            data = lines.map(line => {
                // 处理CSV中的逗号和引号
                const cells = [];
                let currentCell = '';
                let inQuotes = false;
                
                for (let i = 0; i < line.length; i++) {
                    const char = line[i];
                    
                    if (char === '"') {
                        inQuotes = !inQuotes;
                    } else if (char === ',' && !inQuotes) {
                        cells.push(currentCell.trim());
                        currentCell = '';
                    } else {
                        currentCell += char;
                    }
                }
                cells.push(currentCell.trim());
                
                return cells;
            });
            
            console.log('CSV数据读取成功，行数:', data.length);
        }
        // 如果都没有，返回示例数据
        else {
            console.log('未找到数据文件，返回示例数据');
            data = [
                ['学号', '密码', '日期', '当日预估收益', '本月累计收益'],
                ['1001', '123456', '2024-01-15', '120.50', '2850.75'],
                ['1001', '123456', '2024-01-14', '95.30', '2730.25'],
                ['1002', '654321', '2024-01-15', '88.90', '2156.40']
            ];
        }
        
        return {
            code: 0,
            data: { values: data },
            message: '数据读取成功',
            timestamp: new Date().toISOString()
        };
        
    } catch (error) {
        console.error('读取本地数据失败:', error);
        throw new Error('读取本地数据失败: ' + error.message);
    }
}

// 获取同步状态信息
async function getSyncInfo() {
    try {
        console.log('获取同步状态信息...');
        
        const reportPath = path.join(process.cwd(), 'data', 'sync-report.json');
        
        if (fs.existsSync(reportPath)) {
            const reportContent = fs.readFileSync(reportPath, 'utf8');
            const report = JSON.parse(reportContent);
            
            console.log('同步报告读取成功:', report);
            
            return {
                code: 0,
                data: report,
                message: '同步状态获取成功'
            };
        } else {
            return {
                code: 0,
                data: {
                    lastSync: '未知',
                    dataRows: 0,
                    status: 'unknown',
                    source: 'local'
                },
                message: '未找到同步报告'
            };
        }
        
    } catch (error) {
        console.error('获取同步状态失败:', error);
        throw new Error('获取同步状态失败: ' + error.message);
    }
}
