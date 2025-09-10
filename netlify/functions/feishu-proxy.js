const https = require('https');

exports.handler = async (event, context) => {
    console.log('=== 云函数开始 ===');

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
        let body = JSON.parse(event.body || '{}');
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
            if (!token) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: '缺少访问令牌' })
                };
            }
            
            const sheetData = await getSheetData(token);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(sheetData)
            };
        }

    } catch (error) {
        console.error('云函数错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};

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

function getSheetData(token) {
    return new Promise((resolve, reject) => {
        console.log('获取表格数据...');

        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/sheets/v4/spreadsheets/Je42sildNh5sJAtktSlc0azDnsb/values/R6PBsw!A1:E1000',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            console.log('API响应状态:', res.statusCode);
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('API响应结果:', result);
                    
                    if (result.code === 0 && result.data && result.data.values) {
                        console.log('数据获取成功，行数:', result.data.values.length);
                        resolve({
                            code: 0,
                            data: { values: result.data.values }
                        });
                    } else {
                        console.log('API返回错误:', result);
                        resolve(result);
                    }
                } catch (e) {
                    console.error('解析响应失败:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('请求错误:', error);
            reject(error);
        });

        req.end();
    });
}
