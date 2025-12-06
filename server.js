const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const KEY_FILE = path.join(__dirname, 'key.json');

// --- تنظیمات یوزر و رمز عبور ---
const JWT_SECRET = 'HESAM-KU-SECRET-KEY-2025-12'; // حتماً اینو عوض کنید!
const ADMIN_USER = { username: '1234', password: '1234' }; 
// ------------------------------

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// --- توابع کمکی ---

async function readKeys() {
    try {
        const data = await fs.readFile(KEY_FILE, 'utf-8');
        // بررسی می‌کند که آیا فایل خالی است یا ساختار درستی ندارد
        if (!data) return {};
        const content = JSON.parse(data);
        return content.keys || {};
    } catch (error) {
        // اگر خطای 'ENOENT' (فایل پیدا نشد) بود، فایل خالی می‌سازد
        if (error.code === 'ENOENT') {
            await fs.writeFile(KEY_FILE, JSON.stringify({ keys: {} }, null, 2), 'utf-8');
            return {};
        }
        console.error("Error reading or parsing keys:", error.message);
        return {};
    }
}

async function writeKeys(keys) {
    try {
        await fs.writeFile(KEY_FILE, JSON.stringify({ keys }, null, 2), 'utf-8');
    } catch (error) {
        console.error("Error writing keys:", error.message);
        throw new Error('Failed to save data.');
    }
}

function generateLicenseKey() {
    const randomPart = Math.random().toString(36).substring(2, 12).toUpperCase().padStart(10, '0');
    return `HESAM-KU-VIP-${randomPart}`;
}

function calculateExpiry(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
}

// --- Middlewares ---

function authenticateToken(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Authentication required.' });
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid or expired token.' });
        req.user = user;
        next();
    });
}

// --- Endpoints ---

// 1. لاگین
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
        const token = jwt.sign({ username: ADMIN_USER.username }, JWT_SECRET, { expiresIn: '1h' });
        return res.json({ success: true, token });
    }
    res.status(401).json({ success: false, message: 'Invalid credentials' });
});

// 2. ساخت لایسنس جدید (محافظت شده)
app.post('/api/license/create', authenticateToken, async (req, res) => {
    const days = parseInt(req.body.days, 10);
    if (isNaN(days) || days <= 0) {
        return res.status(400).json({ message: 'Invalid number of days.' });
    }

    const newKey = generateLicenseKey();
    const expiryDate = calculateExpiry(days);
    const keys = await readKeys();

    keys[newKey] = {
        expires: expiryDate,
        status: "active"
    };

    try {
        await writeKeys(keys);
        res.json({ success: true, key: newKey, expires: expiryDate });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not save license.' });
    }
});

// 3. لیست لایسنس ها (محافظت شده)
app.get('/api/license/list', authenticateToken, async (req, res) => {
    const keys = await readKeys();
    const today = new Date().toISOString().split('T')[0];
    const licenseList = Object.entries(keys).map(([key, data]) => {
        
        const expiryDate = new Date(data.expires);
        const diffTime = expiryDate.getTime() - new Date(today).getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        data.status = diffDays > 0 ? 'active' : 'expired';
        data.remainingDays = diffDays > 0 ? diffDays : 0;
        
        return { key, ...data };
    });
    res.json({ licenses: licenseList });
});

// 4. تمدید لایسنس (محافظت شده)
app.put('/api/license/renew/:key', authenticateToken, async (req, res) => {
    const { key } = req.params;
    const days = parseInt(req.body.days || 30, 10); 
    
    const keys = await readKeys();

    if (!keys[key]) {
        return res.status(404).json({ success: false, message: 'License key not found.' });
    }

    const newExpiry = calculateExpiry(days); 

    keys[key].expires = newExpiry;
    keys[key].status = 'active'; 

    try {
        await writeKeys(keys);
        res.json({ success: true, message: `License ${key} renewed for ${days} days.` });
    } catch (e) {
        res.status(500).json({ success: false, message: 'Could not renew license.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Login: ${ADMIN_USER.username} / ${ADMIN_USER.password}`);
});
