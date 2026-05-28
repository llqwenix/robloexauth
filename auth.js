// auth.js - с Google Sheets API

// ========== НАСТРОЙКИ GOOGLE SHEETS (ВАШИ ДАННЫЕ) ==========
const SPREADSHEET_ID = '17dPJNS4c_eZZwWMHLrvvBwiv5N8cvQsl1yp9tl4eZ2c';
const API_KEY = 'AIzaSyB1BBzMEXEQ-tU30RfgPB16biw08GkjXVk';

// ========== НАСТРОЙКИ АДМИНОВ ==========
const ADMIN_USERNAMES = ['vynzxluf', 'vzxjall'];

// ========== КЛЮЧИ ДЛЯ ХРАНЕНИЯ ==========
const CURRENT_USER_KEY = 'robloex_current_user';

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.style.display = 'block';
        setTimeout(() => {
            toast.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}

function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return btoa(hash.toString() + password).slice(0, 64);
}

function generateCookie() {
    return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// ========== ЗАПРОСЫ К GOOGLE SHEETS ==========
async function getSheetData(sheetName = 'Лист1', range = 'A:H') {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${sheetName}!${range}?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.values && data.values.length > 1) {
            const headers = data.values[0];
            const rows = data.values.slice(1);
            return rows.map(row => {
                const obj = {};
                headers.forEach((header, i) => {
                    obj[header] = row[i] || '';
                });
                return obj;
            });
        }
        return [];
    } catch (e) {
        console.error('Ошибка загрузки:', e);
        return [];
    }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
async function getUsers() {
    return await getSheetData('Лист1', 'A:H');
}

async function getUserByUsername(username) {
    const users = await getUsers();
    return users.find(u => u.username === username);
}

async function getUserByCookie(cookie) {
    const users = await getUsers();
    return users.find(u => u.cookie === cookie);
}

// ========== АВТОРИЗАЦИЯ ==========
async function loginUser(username, password) {
    const user = await getUserByUsername(username);
    if (user && user.password === hashPassword(password) && user.is_banned !== 'TRUE') {
        return { success: true, username: user.username, role: user.role || 'user', cookie: user.cookie };
    }
    return { success: false, message: 'Неверное имя пользователя или пароль!' };
}

async function loginByCookie(cookie) {
    const user = await getUserByCookie(cookie);
    if (user && user.is_banned !== 'TRUE') {
        return { success: true, username: user.username, role: user.role || 'user', cookie: user.cookie };
    }
    return { success: false };
}

// ========== УПРАВЛЕНИЕ СЕССИЕЙ ==========
function getCurrentUser() {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function saveCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

async function checkAuth() {
    console.log('🔍 Проверка авторизации...');
    const savedUser = getCurrentUser();
    if (savedUser && savedUser.cookie) {
        const result = await loginByCookie(savedUser.cookie);
        if (result.success) {
            console.log('✅ Авторизация успешна для:', result.username);
            return result;
        } else {
            console.log('❌ Cookie недействителен');
            clearCurrentUser();
            return null;
        }
    }
    console.log('❌ Нет сохранённого пользователя');
    return null;
}

function logout() {
    clearCurrentUser();
    window.location.href = '/robloexauth/login.html';
}

function isAdmin() {
    const user = getCurrentUser();
    return user && ADMIN_USERNAMES.includes(user.username);
}

// ========== НОВОСТИ ==========
async function getNews() {
    try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/News!A:E?key=${API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.values && data.values.length > 1) {
            return data.values.slice(1).map(row => ({
                id: row[0],
                title: row[1],
                content: row[2],
                date: row[3],
                pinned: row[4] === 'TRUE'
            }));
        }
        return [];
    } catch (e) {
        console.error('Ошибка загрузки новостей:', e);
        return [];
    }
}

// ========== ПЕРЕНАПРАВЛЕНИЯ ==========
function redirectToLogin() {
    window.location.href = '/robloexauth/login.html';
}

function redirectToHome() {
    window.location.href = '/robloexauth/home.html';
}

function redirectToDashboard() {
    window.location.href = '/robloexauth/dashboard.html';
}

function redirectToAdmin() {
    window.location.href = '/robloexauth/admin.html';
}

console.log('✅ auth.js загружен');
console.log('📊 ID таблицы:', SPREADSHEET_ID);
