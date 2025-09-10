const https = require('https');

exports.handler = async (event, context) => {
    console.log('云函数被调用，方法:', event.httpMethod);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: ''
        };
    }

    try {
        let body;
        try {
            body = JSON.parse(event.body || '{}');
        } catch (e) {
            console.error('解析请求体失败:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '请求格式错误' })
            };
        }

        const { action } = body;
        console.log('请求动作:', action);

        if (action === 'getToken') {
            // 获取访问令牌
            console.log('开始获取访问令牌...');
            const tokenData = await getAccessToken();
            console.log('令牌获取结果:', tokenData);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(tokenData)
            };
        }

        if (action === 'getData') {
            // 获取电子表格数据
            console.log('开始获取电子表格数据...');
            const { token } = body;
            if (!token) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: '缺少访问令牌' })
                };
            }
            const sheetData = await getSheetData(token);
            console.log('电子表格数据获取结果:', sheetData);
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(sheetData)
            };
        }

        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid action: ' + action })
        };

    } catch (error) {
        console.error('云函数执行错误:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: error.message,
                stack: error.stack
            })
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

        console.log('发送令牌请求...');

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
            console.log('令牌响应状态:', res.statusCode);
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('令牌响应数据:', result);
                    resolve(result);
                } catch (e) {
                    console.error('解析令牌响应失败:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('令牌请求错误:', error);
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 使用电子表格API获取数据
function getSheetData(token) {
    return new Promise((resolve, reject) => {
        console.log('发送电子表格请求...');

        // 使用电子表格API
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
            console.log('电子表格响应状态:', res.statusCode);
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('电子表格响应数据:', result);
                    
                    if (result.code === 0 && result.data && result.data.values) {
                        resolve({
                            code: 0,
                            data: { values: result.data.values }
                        });
                    } else {
                        resolve(result);
                    }
                } catch (e) {
                    console.error('解析电子表格响应失败:', e);
                    reject(e);
                }
            });
        });

        req.on('error', (error) => {
            console.error('电子表格请求错误:', error);
            reject(error);
        });

        req.end();
    });
}
