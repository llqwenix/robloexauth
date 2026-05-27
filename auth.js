// auth.js

// --- НАСТРОЙКИ ---
// !!! ВАЖНО: Замените YOUR_SPREADSHEET_ID на реальный ID вашей таблицы !!!
// ID можно взять из URL вашей Google Sheets: https://docs.google.com/spreadsheets/d/ЭТОТ_АЙДИ/edit
const SPREADSHEET_ID = '1kb2B-XQ9SdjMXM_G0ORi3NEdfCg-aFoI-pVwVa2IXSI'; // СКОПИРУЙТЕ СЮДА ВАШ ID
const API_KEY = 'AIzaSyB1BBzMEXEQ-tU30RfgPB16biw08GkjXVkY'; // Создайте API ключ в Google Cloud Console (для публичного доступа)

// auth.js - общая логика для всех страниц

// Настройки
const STORAGE_KEY = 'robloex_users';
const CURRENT_USER_KEY = 'robloex_current_user';
const SKINS_STORAGE_KEY = 'robloex_skins';

// Вспомогательные функции
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

// Работа с пользователями
function getUsers() {
    const users = localStorage.getItem(STORAGE_KEY);
    return users ? JSON.parse(users) : [];
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

function registerUser(username, password) {
    const users = getUsers();
    
    if (users.find(u => u.username === username)) {
        return { success: false, message: 'Пользователь уже существует!' };
    }
    
    const cookie = generateCookie();
    const newUser = {
        username: username,
        password: hashPassword(password),
        cookie: cookie,
        role: 'user',
        created: new Date().toISOString()
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, cookie: cookie, message: 'Регистрация успешна!' };
}

function loginUser(username, password) {
    const users = getUsers();
    const passwordHash = hashPassword(password);
    const user = users.find(u => u.username === username && u.password === passwordHash);
    
    if (user) {
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    return { success: false, message: 'Неверное имя пользователя или пароль!' };
}

function loginByCookie(cookie) {
    const users = getUsers();
    const user = users.find(u => u.cookie === cookie);
    
    if (user) {
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    return { success: false };
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    return user ? JSON.parse(user) : null;
}

function saveCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
}

function logout() {
    clearCurrentUser();
    window.location.href = '/robloexauth/login.html';
}

function checkAuth() {
    const user = getCurrentUser();
    if (user && user.cookie) {
        const verified = loginByCookie(user.cookie);
        if (verified.success) {
            return verified;
        } else {
            clearCurrentUser();
            return null;
        }
    }
    return null;
}

// Работа со скинами
function saveSkin(username, skinDataUrl) {
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    skins[username] = skinDataUrl;
    localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(skins));
}

function getSkin(username) {
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    return skins[username] || null;
}

function deleteSkin(username) {
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    delete skins[username];
    localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(skins));
}

function uploadSkin(file, callback) {
    if (!file) return;
    
    if (!file.type.match('image/png')) {
        showToast('Пожалуйста, выберите PNG файл!', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            if ((img.width === 64 && img.height === 64) || (img.width === 64 && img.height === 32)) {
                callback(e.target.result);
            } else {
                showToast('Неверный размер! Поддерживаются 64x64 или 64x32 пикселей.', 'error');
            }
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Перенаправления
function redirectToLogin() {
    window.location.href = '/robloexauth/login.html';
}

function redirectToHome() {
    window.location.href = '/robloexauth/home.html';
}

function redirectToDashboard() {
    window.location.href = '/robloexauth/dashboard.html';
}
