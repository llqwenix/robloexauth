// auth.js

// --- НАСТРОЙКИ ---
// !!! ВАЖНО: Замените YOUR_SPREADSHEET_ID на реальный ID вашей таблицы !!!
// ID можно взять из URL вашей Google Sheets: https://docs.google.com/spreadsheets/d/ЭТОТ_АЙДИ/edit
const SPREADSHEET_ID = '1kb2B-XQ9SdjMXM_G0ORi3NEdfCg-aFoI-pVwVa2IXSI'; // СКОПИРУЙТЕ СЮДА ВАШ ID
const API_KEY = 'AIzaSyB1BBzMEXEQ-tU30RfgPB16biw08GkjXVkY'; // Создайте API ключ в Google Cloud Console (для публичного доступа)

// Имя листа с пользователями
const SHEET_NAME = 'users'; // Или 'Users', как вы назвали лист

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
function showToast(message, isError = false) {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast ${isError ? 'error' : 'success'}`;
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 3000);
    } else {
        alert(message);
    }
}

function getHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0;
    }
    return btoa(hash.toString() + str).slice(0, 64);
}

function generateCookie() {
    return [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');
}

// --- РАБОТА С GOOGLE SHEETS (через публичный API) ---
async function fetchSheetData(range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!${range}?key=${API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки данных');
        const data = await response.json();
        return data.values || [];
    } catch (error) {
        console.error('Ошибка при запросе к Google Sheets:', error);
        showToast('Ошибка подключения к серверу', true);
        return null;
    }
}

async function appendToSheet(values) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${SHEET_NAME}!A:E:append?valueInputOption=USER_ENTERED`;
    const body = { values: [values] };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) throw new Error('Ошибка добавления данных');
        return true;
    } catch (error) {
        console.error('Ошибка при записи в Google Sheets:', error);
        return false;
    }
}

// --- ФУНКЦИИ АВТОРИЗАЦИИ ---
async function registerUser(username, password) {
    const usersData = await fetchSheetData('A:C');
    if (!usersData) return { success: false, message: 'Ошибка сервера' };
    
    const exists = usersData.slice(1).some(row => row[0] === username);
    if (exists) return { success: false, message: 'Пользователь уже существует!' };
    
    const cookie = generateCookie();
    const passwordHash = getHash(password);
    const now = new Date().toISOString();
    
    const success = await appendToSheet([username, passwordHash, cookie, 'user', now]);
    if (success) {
        return { success: true, cookie: cookie };
    } else {
        return { success: false, message: 'Ошибка сохранения данных' };
    }
}

async function loginUser(username, password) {
    const usersData = await fetchSheetData('A:E');
    if (!usersData) return { success: false, message: 'Ошибка сервера' };
    
    const passwordHash = getHash(password);
    const userRow = usersData.slice(1).find(row => row[0] === username && row[1] === passwordHash);
    
    if (userRow) {
        return { success: true, username: userRow[0], role: userRow[3], cookie: userRow[2] };
    } else {
        return { success: false, message: 'Неверное имя пользователя или пароль!' };
    }
}

async function getUserData(cookie) {
    const usersData = await fetchSheetData('A:E');
    if (!usersData) return null;
    const userRow = usersData.slice(1).find(row => row[2] === cookie);
    if (userRow) {
        return { username: userRow[0], role: userRow[3], cookie: userRow[2] };
    }
    return null;
}

// --- ФУНКЦИИ ДЛЯ СКИНОВ ---
function saveSkinToLocalStorage(username, skinDataUrl) {
    localStorage.setItem(`skin_${username}`, skinDataUrl);
}

function getSkinFromLocalStorage(username) {
    return localStorage.getItem(`skin_${username}`);
}

function applySkinPreview(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const previewImg = document.getElementById('skinPreview');
        if (previewImg) {
            previewImg.src = e.target.result;
            previewImg.style.display = 'block';
        }
        // Сохраняем в localStorage
        const currentUser = JSON.parse(localStorage.getItem('currentUser'));
        if (currentUser && currentUser.username) {
            saveSkinToLocalStorage(currentUser.username, e.target.result);
            showToast('Скин загружен! Он появится в лаунчере после перезапуска.');
        }
    };
    reader.readAsDataURL(file);
}

// --- УПРАВЛЕНИЕ СЕССИЕЙ ---
function saveSession(user) {
    localStorage.setItem('currentUser', JSON.stringify(user));
}

function clearSession() {
    localStorage.removeItem('currentUser');
}

function getCurrentUser() {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
        try {
            return JSON.parse(userJson);
        } catch(e) { return null; }
    }
    return null;
}

async function checkAuth() {
    const user = getCurrentUser();
    if (user && user.cookie) {
        const userData = await getUserData(user.cookie);
        if (userData) {
            return userData;
        } else {
            clearSession();
            return null;
        }
    }
    return null;
}

function redirectToLogin() {
    window.location.href = '/robloexauth/login.html';
}

function redirectToHome() {
    window.location.href = '/robloexauth/home.html';
}
