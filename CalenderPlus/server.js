// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors()); // 允许前端跨域访问
app.use(bodyParser.json());

// 1. 读取日程
app.get('/api/events', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '[]', 'utf8'); // 如果文件不存在，初始化为空数组
    }
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) return res.status(500).send(err);
        res.send(JSON.parse(data || '[]'));
    });
});

// 2. 保存日程
app.post('/api/events', (req, res) => {
    const newEvents = req.body; // 前端传来的最新完整数组
    fs.writeFile(DATA_FILE, JSON.stringify(newEvents, null, 2), 'utf8', (err) => {
        if (err) return res.status(500).send(err);
        res.send({ status: 'success' });
    });
});

app.listen(PORT, () => {
    console.log(`后端服务已启动：http://localhost:${PORT}`);
});