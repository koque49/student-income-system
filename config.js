// 飞书配置信息
const CONFIG = {
    FEISHU_APP_ID: 'cli_a84a4855cb36500b',
    FEISHU_APP_SECRET: 'NJxiXZAZLLZcVJ2Mh9dzmb0W8vioZNRM',
    SPREADSHEET_TOKEN: 'Je42sildNh5sJAtktSlc0azDnsb',
    SHEET_ID: 'R6PBsw',
    TABLE_ID: 'tblDi6XlgQwpJXhk',
    
    // API端点
    FEISHU_API_BASE: 'https://open.feishu.cn/open-apis',
    
    // 数据列映射
    COLUMNS: {
        STUDENT_ID: 'A',      // 学号
        PASSWORD: 'B',        // 密码
        DATE: 'C',           // 日期
        DAILY_INCOME: 'D',   // 当日预估收益
        MONTHLY_TOTAL: 'E'   // 本月累计收益
    }
};

// CORS代理配置（解决跨域问题）
const CORS_PROXY = 'https://cors-anywhere.herokuapp.com/';
