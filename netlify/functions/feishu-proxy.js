const https = require('https');

exports.handler = async (event, context) => {
    console.log('=== 云函数开始 ===');
    console.log('HTTP方法:', event.httpMethod);
    console.log('请求体:', event.body);

    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Content-Type': 'application/json'
    };

    if (event.httpMethod === 'OPTIONS') {
        console.log('OPTIONS请求，直接返回');
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
            console.log('解析后的请求体:', body);
        } catch (e) {
            console.error('解析请求体失败:', e);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: '请求格式错误', details: e.message })
            };
        }

        const { action } = body;
        console.log('请求动作:', action);

        if (action === 'getToken') {
            console.log('=== 开始获取访问令牌 ===');
            try {
                const tokenData = await getAccessToken();
                console.log('令牌获取成功:', tokenData);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(tokenData)
                };
            } catch (error) {
                console.error('获取令牌失败:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: '获取令牌失败', 
                        details: error.message,
                        stack: error.stack 
                    })
                };
            }
        }

        if (action === 'getData') {
            console.log('=== 开始获取表格数据 ===');
            const { token } = body;
            console.log('使用的令牌:', token ? token.substring(0, 20) + '...' : '无');
            
            if (!token) {
                console.error('缺少访问令牌');
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: '缺少访问令牌' })
                };
            }
            
            try {
                const sheetData = await getSheetData(token);
                console.log('表格数据获取成功');
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(sheetData)
                };
            } catch (error) {
                console.error('获取表格数据失败:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: '获取表格数据失败', 
                        details: error.message,
                        stack: error.stack 
                    })
                };
            }
        }

        console.error('无效的action:', action);
        return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: '无效的操作: ' + action })
        };

    } catch (error) {
        console.error('=== 云函数执行错误 ===', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ 
                error: '云函数执行错误',
                details: error.message,
                stack: error.stack
            })
        };
    }
};

// 获取飞书访问令牌
function getAccessToken() {
    return new Promise((resolve, reject) => {
        console.log('准备发送令牌请求...');
        
        const postData = JSON.stringify({
            app_id: 'cli_a84a4855cb36500b',
            app_secret: 'NJxiXZAZLLZcVJ2Mh9dzmb0W8vioZNRM'
        });

        console.log('请求数据:', { app_id: 'cli_a84a4855cb36500b', app_secret: '***' });

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

        console.log('请求选项:', options);

        const req = https.request(options, (res) => {
            let data = '';
            console.log('令牌API响应状态:', res.statusCode);
            console.log('响应头:', res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
                console.log('接收数据块，当前长度:', data.length);
            });
            
            res.on('end', () => {
                console.log('令牌API响应完成，数据:', data);
                try {
                    const result = JSON.parse(data);
                    console.log('解析后的令牌结果:', result);
                    resolve(result);
                } catch (e) {
                    console.error('解析令牌响应失败:', e);
                    reject(new Error('解析令牌响应失败: ' + e.message));
                }
            });
        });

        req.on('error', (error) => {
            console.error('令牌请求网络错误:', error);
            reject(error);
        });

        req.on('timeout', () => {
            console.error('令牌请求超时');
            reject(new Error('请求超时'));
        });

        console.log('发送令牌请求...');
        req.write(postData);
        req.end();
    });
}

// 获取电子表格数据
function getSheetData(token) {
    return new Promise((resolve, reject) => {
        console.log('准备发送表格数据请求...');

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

        console.log('表格请求选项:', { 
            ...options, 
            headers: { ...options.headers, Authorization: `Bearer ${token.substring(0, 20)}...` }
        });

        const req = https.request(options, (res) => {
            let data = '';
            console.log('表格API响应状态:', res.statusCode);
            console.log('表格API响应头:', res.headers);
            
            res.on('data', (chunk) => {
                data += chunk;
                console.log('接收表格数据块，当前长度:', data.length);
            });
            
            res.on('end', () => {
                console.log('表格API响应完成，数据长度:', data.length);
                console.log('前200字符:', data.substring(0, 200));
                
                try {
                    const result = JSON.parse(data);
                    console.log('解析后的表格结果:', result);
                    
                    if (result.code === 0 && result.data && result.data.values) {
                        console.log('数据行数:', result.data.values.length);
                        console.log('前3行数据:', result.data.values.slice(0, 3));
                        resolve({
                            code: 0,
                            data: { values: result.data.values }
                        });
                    } else {
                        console.log('API返回错误或无数据:', result);
                        resolve(result);
                    }
                } catch (e) {
                    console.error('解析表格响应失败:', e);
                    reject(new Error('解析表格响应失败: ' + e.message));
                }
            });
        });

        req.on('error', (error) => {
            console.error('表格请求网络错误:', error);
            reject(error);
        });

        req.on('timeout', () => {
            console.error('表格请求超时');
            reject(new Error('表格请求超时'));
        });

        console.log('发送表格请求...');
        req.end();
    });
}
