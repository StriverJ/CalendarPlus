const express = require('express');
const fs = require('fs');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;
const DB_FILE = './data.json';

app.use(cors());
app.use(bodyParser.json());

// 读取数据
app.get('/api/todos', (req, res) => {
    if (!fs.existsSync(DB_FILE)) return res.json({});
    const data = fs.readFileSync(DB_FILE);
    res.json(JSON.parse(data));
});

// 保存数据
app.post('/api/todos', (req, res) => {
    fs.writeFileSync(DB_FILE, JSON.stringify(req.body, null, 2));
    res.json({ status: 'success' });
});

app.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});