exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 生成最近15天的测试数据
    const generateTestData = () => {
        const data = [
            ['学号', '密码', '日期', '当日预估收益', '本月累计收益']
        ];
        
        const today = new Date();
        let monthlyTotal = 0;
        
        // 为test001生成15天的数据（从今天开始倒推）
        for (let i = 0; i < 15; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dailyIncome = Math.round((80 + Math.random() * 40) * 100) / 100; // 80-120元随机
            monthlyTotal += dailyIncome;
            
            const dateStr = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
            
            data.push([
                'test001',
                '123456',
                dateStr,
                dailyIncome.toFixed(2),
                monthlyTotal.toFixed(2)
            ]);
        }
        
        // 为test002添加一些数据
        monthlyTotal = 0;
        for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() - i);
            
            const dailyIncome = Math.round((100 + Math.random() * 50) * 100) / 100; // 100-150元随机
            monthlyTotal += dailyIncome;
            
            const dateStr = date.getFullYear() + '-' + 
                          String(date.getMonth() + 1).padStart(2, '0') + '-' + 
                          String(date.getDate()).padStart(2, '0');
            
            data.push([
                'test002',
                '789012',
                dateStr,
                dailyIncome.toFixed(2),
                monthlyTotal.toFixed(2)
            ]);
        }
        
        // 为test003添加数据
        data.push([
            'test003',
            'abc123',
            today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0'),
            '200.00',
            '2800.00'
        ]);
        
        return data;
    };

    const testData = {
        code: 0,
        msg: 'success',
        data: {
            values: generateTestData()
        },
        tenant_access_token: 'test_token'
    };

    console.log('返回测试数据，记录数:', testData.data.values.length);

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(testData)
    };
};
