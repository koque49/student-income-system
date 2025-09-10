exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const body = JSON.parse(event.body || '{}');
        
        if (body.action === 'getData') {
            // 生成模拟的真实数据结构
            const mockData = generateRealtimeData();
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    code: 0,
                    data: { values: mockData },
                    message: '数据读取成功'
                })
            };
        }
        
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '无效请求' })
        };
        
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

function generateRealtimeData() {
    const data = [
        ['学号', '密码', '日期', '当日预估收益', '本月累计收益']
    ];
    
    // 模拟多个学员的数据（基于当前时间生成）
    const students = ['1001', '1002', '1003', '2001', '2002'];
    const today = new Date();
    
    students.forEach(studentId => {
        let monthlyTotal = 0;
        
        // 生成最近30天的数据
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dateStr = date.toISOString().split('T')[0];
            const dailyIncome = 50 + Math.random() * 100; // 50-150随机收益
            monthlyTotal += dailyIncome;
            
            data.push([
                studentId,
                studentId === '1001' ? '123456' : '654321',
                dateStr,
                dailyIncome.toFixed(2),
                monthlyTotal.toFixed(2)
            ]);
        }
    });
    
    return data;
}
