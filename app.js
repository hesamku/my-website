// تولید رشته رندوم
function rand(n) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let s = "";
    for (let i = 0; i < n; i++) {
        s += chars[Math.floor(Math.random() * chars.length)];
    }
    return s;
}

function generate() {

    // تعداد روز وارد شده
    const d = parseInt(document.getElementById("days").value) || 1;

    // امروز
    const now = new Date();

    // افزودن روز → محاسبه تاریخ انقضا
    const exp = new Date(now.getTime() + d * 24 * 60 * 60 * 1000);
    const exps = exp.toISOString().slice(0, 10); // فقط YYYY-MM-DD

    // ساخت لایسنس
    const key = "HESAM-KU-VIP-" + rand(10);

    // خروجی keys.json
    const obj = {
        "keys": {
            [key]: {
                "expires": exps,
                "max_devices": 1,
                "devices": [],
                "status": "active"
            }
        }
    };

    // نمایش به کاربر
    document.getElementById("out").textContent = JSON.stringify(obj, null, 4);
}
};
