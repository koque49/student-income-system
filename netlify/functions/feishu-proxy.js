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

    // 直接返回测试数据
    const testData = {
        code: 0,
        msg: 'success',
        data: {
            values: [
                ['学号', '密码', '日期', '当日预估收益', '本月累计收益'],
                ['test001', '123456', '2024-01-15', '100.00', '1500.00'],
                ['test002', '789012', '2024-01-15', '150.00', '2200.00'],
                ['test003', 'abc123', '2024-01-16', '200.00', '2800.00']
            ]
        },
        tenant_access_token: 'test_token'
    };

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify(testData)
    };
};
