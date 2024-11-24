const express = require('express');
const mysql = require('mysql2/promise');
const app = express();

// 设置 CORS 头
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*.juz1.cn");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// 解析 JSON 数据
app.use(express.json());

// sponsor 数据库连接信息
const sponsorDbConfig = {
  host: '',
  user: '',
  password: '',
  database: ''
};

// log 数据库连接信息
const logDbConfig = {
  host: '',
  user: '',
  password: '',
  database: ''
};

// 路由 /sponsor 获取赞助商信息
app.get('/sponsor', async (req, res) => {
  try {
    const connection = await mysql.createConnection(sponsorDbConfig);
    const [rows] = await connection.execute("SELECT name, amount FROM sponsors");
    res.json(rows);
    await connection.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

//主页访问
app.get('/', (req, res) => {
  // 创建一个JSON对象，包含消息和状态
  const data = {
    message: 'Welcome use JuziAPI',
    status: 'ok',
    version: '2.0.0'
  };
  // 使用res.json()发送JSON响应
  res.json(data);
});
// 记录访问日志的函数
async function logVisitor(req) {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress; // 获取 IP 地址
  const userAgent = req.headers['user-agent']; // 获取 User-Agent
  const browser = userAgent.split(' ')[0]; // 简单获取浏览器信息
  const visitTime = new Date().toISOString().slice(0, 19).replace('T', ' '); // 转换为 MySQL 支持的格式
  const visitedUrl = req.body.visitedUrl || '';

  // 处理 IPv4 映射到 IPv6 的情况
  const normalizedIp = normalizeIp(ip);

  try {
    const connection = await mysql.createConnection(logDbConfig); // 连接到 log 数据库
    await connection.execute(
      "INSERT INTO visit_logs (ip, visit_time, browser, user_agent, visited_url) VALUES (?, ?, ?, ?, ?)",
      [normalizedIp, visitTime, browser, userAgent, visitedUrl]
    );
    await connection.end();
  } catch (err) {
    console.error("Error logging visit:", err);
  }
}

// 将 IPv4 地址转换为标准化的 IPv6 地址形式
function normalizeIp(ip) {
  const ipv6Pattern = /^::ffff:/;
  return ipv6Pattern.test(ip) ? ip.replace(ipv6Pattern, '') : ip;
}

// 路由 /visit 记录访问日志
app.post('/visit', async (req, res) => {
  await logVisitor(req); // 记录访问者信息
  res.json({ message: "Visitor info logged." });
});

// 启动服务器
const port = 3010;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
