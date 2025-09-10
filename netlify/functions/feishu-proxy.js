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
            
            // 先尝试获取工作表列表
            try {
                const sheetsInfo = await getSheetsList(token);
                console.log('工作表信息:', sheetsInfo);
                
                // 然后获取数据
                const sheetData = await getSheetData(token);
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify(sheetData)
                };
            } catch (error) {
                console.error('获取数据失败:', error);
                return {
                    statusCode: 500,
                    headers,
                    body: JSON.stringify({ 
                        error: '获取数据失败', 
                        details: error.message
                    })
                };
            }
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
                    resolve(JSON.parse(data));
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

// 获取工作表列表
function getSheetsList(token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'open.feishu.cn',
            port: 443,
            path: '/open-apis/sheets/v4/spreadsheets/Je42sildNh5sJAtktSlc0azDnsb/sheets',
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('获取工作表列表...');

        const req = https.request(options, (res) => {
            let data = '';
            console.log('工作表列表API响应状态:', res.statusCode);
            
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    console.log('工作表列表结果:', result);
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

// 获取表格数据 - 尝试多种方式
function getSheetData(token) {
    return new Promise((resolve, reject) => {
        // 尝试几种不同的API路径
        const apiPaths = [
            '/open-apis/sheets/v4/spreadsheets/Je42sildNh5sJAtktSlc0azDnsb/values/A1:E1000',
            '/open-apis/sheets/v4/spreadsheets/Je42sildNh5sJAtktSlc0azDnsb/values/Sheet1!A1:E1000',
            '/open-apis/sheets/v4/spreadsheets/Je42sildNh5sJAtktSlc0azDnsb/values/R6PBsw!A1:E1000'
        ];

        let currentPathIndex = 0;

        function tryNextPath() {
            if (currentPathIndex >= apiPaths.length) {
                reject(new Error('所有API路径都失败了'));
                return;
            }

            const currentPath = apiPaths[currentPathIndex];
            console.log(`尝试API路径 ${currentPathIndex + 1}:`, currentPath);

            const options = {
                hostname: 'open.feishu.cn',
                port: 443,
                path: currentPath,
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            };

            const req = https.request(options, (res) => {
                let data = '';
                console.log(`路径 ${currentPathIndex + 1} 响应状态:`, res.statusCode);
                
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(data);
                        console.log(`路径 ${currentPathIndex + 1} 结果:`, result);
                        
                        if (result.code === 0 && result.data && result.data.values) {
                            console.log('成功获取数据！');
                            resolve({
                                code: 0,
                                data: { values: result.data.values }
                            });
                        } else {
                            console.log(`路径 ${currentPathIndex + 1} 失败，尝试下一个...`);
                            currentPathIndex++;
                            tryNextPath();
                        }
                    } catch (e) {
                        console.error(`路径 ${currentPathIndex + 1} 解析失败:`, e);
                        currentPathIndex++;
                        tryNextPath();
                    }
                });
            });

            req.on('error', (error) => {
                console.error(`路径 ${currentPathIndex + 1} 网络错误:`, error);
                currentPathIndex++;
                tryNextPath();
            });

            req.end();
        }

        tryNextPath();
    });
}
