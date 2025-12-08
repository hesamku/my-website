// -------------------------------
// تنظیمات شما
// -------------------------------
const TOKEN = "GITHUB_API_TOKEN_HERE"; // توکن GitHub با دسترسی repo
const USER = "hesamku";               // یوزرنیم GitHub
const REPO = "my-website";            // اسم مخزن
const FILE = "keys.json";              // فایل لایسنس
// -------------------------------

// خواندن فایل JSON از GitHub
async function getFile() {
    const res = await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE}`);
    return await res.json();
}

// تبدیل تاریخ به 30 روز بعد
function addDays(days) {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
}

// آپدیت فایل JSON روی GitHub
async function updateFile(newData, sha) {
    await fetch(`https://api.github.com/repos/${USER}/${REPO}/contents/${FILE}`, {
        method: "PUT",
        headers: {
            "Authorization": `token ${TOKEN}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: "License update",
            content: btoa(unescape(encodeURIComponent(JSON.stringify(newData, null, 2)))),
            sha: sha
        })
    });
}

// نمایش پیام
function show(msg) {
    document.getElementById("result").innerText = msg;
}

// ساخت لایسنس جدید
async function createLicense() {
    const key = document.getElementById("newKey").value.trim();
    if(!key) return show("❌ کلید وارد نشده");

    const file = await getFile();
    let json = JSON.parse(atob(file.content));

    // اضافه کردن لایسنس جدید
    json.keys[key] = {
        status: "active",
        expires: addDays(30)
    };

    await updateFile(json, file.sha);
    show("✅ لایسنس ساخته شد:\n\n" + JSON.stringify(json.keys[key], null, 2));
}

// تمدید لایسنس
async function extendLicense() {
    const key = document.getElementById("extendKey").value.trim();
    if(!key) return show("❌ کلید وارد نشده");

    const file = await getFile();
    let json = JSON.parse(atob(file.content));

    if(!json.keys[key]) return show("❌ لایسنس پیدا نشد");

    json.keys[key].expires = addDays(30);

    await updateFile(json, file.sha);
    show("✅ لایسنس تمدید شد:\n\n" + JSON.stringify(json.keys[key], null, 2));
}
