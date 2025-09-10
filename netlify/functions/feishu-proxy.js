const https = require('https');

exports.handler = async (event, context) => {
    console.log('云函数调用:', event.httpMethod);

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

        if (action === 'getToken') {
            const tokenData = await getAccessToken();
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(tokenData)
            };
        }

        if (action === 'getData') {
            const { token } = body;
            // 使用多维表格API
            const sheetData = await getBitableData(token);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(sheetData)
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action' })
        };

    } catch (error) {
        console.error('云函数错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

// 获取飞书访问令牌
function getAccessToken() {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            app_id: 'cli_a84a4855cb36500b',
            app_secret: 'NJxiXZAZLLZcVJ2Mh9dzmb0W8vioZNRM'
        });

        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/auth/v3/tenant_access_token/internal',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
}

// 使用多维表格API获取数据
function getBitableData(token) {
    return new Promise((resolve, reject) => {
        // 使用多维表格的记录列表API
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/bitable/v1/apps/Je42sildNh5sJAtktSlc0azDnsb/tables/tblDi6XlgQwpJXhk/records',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('多维表格响应:', result);
                    
                    if (result.code === 0 && result.data && result.data.items) {
                        // 转换为前端期望的格式
                        const values = [
                            ['学号', '密码', '日期', '当日预估收益', '本月累计收益'] // 表头
                        ];
                        
                        result.data.items.forEach(item => {
                            const fields = item.fields;
                            values.push([
                                fields['学号'] || '',
                                fields['密码'] || '',
                                fields['日期'] || '',
                                fields['当日预估收益'] || '0',
                                fields['本月累计收益'] || '0'
                            ]);
                        });
                        
                        resolve({
                            code: 0,
                            data: { values: values }
                        });
                    } else {
                        resolve(result);
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}
