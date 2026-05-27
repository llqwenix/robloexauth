// auth.js - общая логика для всех страниц

// Настройки
const STORAGE_KEY = 'robloex_users';
const REQUESTS_KEY = 'robloex_requests';
const BANS_KEY = 'robloex_bans';
const NEWS_KEY = 'robloex_news';
const CURRENT_USER_KEY = 'robloex_current_user';
const SKINS_STORAGE_KEY = 'robloex_skins';

// ========== НАСТРОЙКИ АДМИНОВ ==========
const ADMIN_USERNAMES = ['vynzxluf', 'vzxjall']; // Список администраторов

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

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
function getUsers() {
    const users = localStorage.getItem(STORAGE_KEY);
    if (!users) return [];
    try {
        const parsed = JSON.parse(users);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ========== РАБОТА С ЗАЯВКАМИ ==========
function getRequests() {
    const requests = localStorage.getItem(REQUESTS_KEY);
    if (!requests) return [];
    try {
        const parsed = JSON.parse(requests);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        return [];
    }
}

function saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
}

function createRequest(username, password) {
    const requests = getRequests();
    
    if (requests.some(r => r.username === username)) {
        return { success: false, message: 'Заявка от этого пользователя уже существует!' };
    }
    
    const newRequest = {
        id: Date.now(),
        username: username,
        password: hashPassword(password),
        status: 'pending',
        createdAt: new Date().toISOString(),
        reviewedBy: null,
        reviewedAt: null
    };
    
    requests.push(newRequest);
    saveRequests(requests);
    return { success: true, message: 'Заявка отправлена на рассмотрение!' };
}

function approveRequest(requestId, adminName) {
    const requests = getRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) return false;
    
    const request = requests[requestIndex];
    if (request.status !== 'pending') return false;
    
    const users = getUsers();
    const cookie = generateCookie();
    
    const newUser = {
        username: request.username,
        password: request.password,
        cookie: cookie,
        role: 'user',
        created: new Date().toISOString(),
        isBanned: false,
        banUntil: null
    };
    
    users.push(newUser);
    saveUsers(users);
    
    request.status = 'approved';
    request.reviewedBy = adminName;
    request.reviewedAt = new Date().toISOString();
    requests[requestIndex] = request;
    saveRequests(requests);
    
    return true;
}

function denyRequest(requestId, adminName) {
    const requests = getRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) return false;
    
    requests[requestIndex].status = 'denied';
    requests[requestIndex].reviewedBy = adminName;
    requests[requestIndex].reviewedAt = new Date().toISOString();
    saveRequests(requests);
    
    return true;
}

// ========== РАБОТА С БАНАМИ ==========
function getBans() {
    const bans = localStorage.getItem(BANS_KEY);
    if (!bans) return [];
    try {
        return JSON.parse(bans);
    } catch (e) {
        return [];
    }
}

function saveBans(bans) {
    localStorage.setItem(BANS_KEY, JSON.stringify(bans));
}

function isUserBanned(username) {
    const bans = getBans();
    const activeBan = bans.find(b => b.username === username && (!b.until || new Date(b.until) > new Date()));
    return activeBan || null;
}

function banUser(username, reason, durationHours, adminName) {
    const bans = getBans();
    const filteredBans = bans.filter(b => b.username !== username);
    
    const until = durationHours ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
    
    filteredBans.push({
        username: username,
        reason: reason,
        until: until,
        createdBy: adminName,
        createdAt: new Date().toISOString()
    });
    
    saveBans(filteredBans);
    
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
        clearCurrentUser();
    }
    
    return true;
}

function unbanUser(username) {
    const bans = getBans();
    const filteredBans = bans.filter(b => b.username !== username);
    saveBans(filteredBans);
    return true;
}

// ========== РАБОТА С НОВОСТЯМИ ==========
function getNews() {
    const news = localStorage.getItem(NEWS_KEY);
    if (!news) {
        const defaultNews = [
            {
                id: 1,
                title: 'Добро пожаловать в Robloex Launcher!',
                content: 'Мы рады приветствовать вас в нашем лаунчере. Здесь вы найдёте лучшие версии Minecraft, поддержку модов и многое другое!',
                image: '🎉',
                date: new Date().toISOString(),
                pinned: true
            },
            {
                id: 2,
                title: 'Как начать играть?',
                content: '1. Зарегистрируйтесь и получите Cookie\n2. Скачайте лаунчер\n3. Введите Cookie в лаунчере\n4. Выберите версию и играйте!',
                image: '📖',
                date: new Date(Date.now() - 86400000).toISOString(),
                pinned: false
            }
        ];
        saveNews(defaultNews);
        return defaultNews;
    }
    try {
        return JSON.parse(news);
    } catch (e) {
        return [];
    }
}

function saveNews(news) {
    localStorage.setItem(NEWS_KEY, JSON.stringify(news));
}

function addNews(title, content, image = '📰', isPinned = false) {
    const news = getNews();
    const newNews = {
        id: Date.now(),
        title: title,
        content: content,
        image: image,
        date: new Date().toISOString(),
        pinned: isPinned
    };
    news.unshift(newNews);
    saveNews(news);
    return newNews;
}

function deleteNews(newsId) {
    const news = getNews();
    const filtered = news.filter(n => n.id !== newsId);
    saveNews(filtered);
    return true;
}

function updateNewsPinned(newsId, isPinned) {
    const news = getNews();
    const newsItem = news.find(n => n.id === newsId);
    if (newsItem) {
        newsItem.pinned = isPinned;
        saveNews(news);
    }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ (продолжение) ==========
function registerUser(username, password) {
    if (!username || username.length < 3) {
        return { success: false, message: 'Имя пользователя должно быть не менее 3 символов!' };
    }
    
    if (!password || password.length < 4) {
        return { success: false, message: 'Пароль должен быть не менее 4 символов!' };
    }
    
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(username)) {
        return { success: false, message: 'Имя пользователя может содержать только латиницу, цифры и подчёркивание!' };
    }
    
    const ban = isUserBanned(username);
    if (ban) {
        const untilText = ban.until ? ` до ${new Date(ban.until).toLocaleString()}` : ' навсегда';
        return { success: false, message: `Ваш аккаунт забанен${untilText}. Причина: ${ban.reason}` };
    }
    
    const users = getUsers();
    const userExists = users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    
    if (userExists) {
        return { success: false, message: 'Пользователь с таким именем уже существует!' };
    }
    
    const cookie = generateCookie();
    const newUser = {
        username: username,
        password: hashPassword(password),
        cookie: cookie,
        role: 'user',
        created: new Date().toISOString(),
        isBanned: false,
        banUntil: null
    };
    
    users.push(newUser);
    saveUsers(users);
    
    return { success: true, cookie: cookie, message: 'Регистрация успешна!' };
}

function loginUser(username, password) {
    const ban = isUserBanned(username);
    if (ban) {
        const untilText = ban.until ? ` до ${new Date(ban.until).toLocaleString()}` : ' навсегда';
        return { success: false, message: `Ваш аккаунт забанен${untilText}. Причина: ${ban.reason}` };
    }
    
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
        const ban = isUserBanned(user.username);
        if (ban) {
            return { success: false, message: `Аккаунт забанен` };
        }
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    return { success: false };
}

function getCurrentUser() {
    const user = localStorage.getItem(CURRENT_USER_KEY);
    if (!user) return null;
    try {
        return JSON.parse(user);
    } catch (e) {
        return null;
    }
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

// ========== АДМИН-ФУНКЦИИ ==========
function isAdmin() {
    const user = getCurrentUser();
    // Проверяем, есть ли пользователь в списке администраторов
    return user && ADMIN_USERNAMES.includes(user.username);
}

function getAllUsers() {
    return getUsers();
}

function deleteUser(username) {
    // Нельзя удалять администраторов
    if (ADMIN_USERNAMES.includes(username)) {
        return false;
    }
    let users = getUsers();
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    deleteSkin(username);
    return true;
}

function changeUserRole(username, newRole) {
    const users = getUsers();
    const user = users.find(u => u.username === username);
    // Нельзя изменять роль администраторов
    if (user && !ADMIN_USERNAMES.includes(username)) {
        user.role = newRole;
        saveUsers(users);
        return true;
    }
    return false;
}

// ========== РАБОТА СО СКИНАМИ ==========
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

// ========== ОТЛАДКА ==========
function debugPrintUsers() {
    const users = getUsers();
    console.log('📋 Список пользователей:');
    users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.username} (${u.role}) - создан: ${u.created}`);
    });
    
    const requests = getRequests();
    console.log('📋 Список заявок:');
    requests.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.username} - статус: ${r.status}`);
    });
    
    const bans = getBans();
    console.log('📋 Список банов:');
    bans.forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.username} - до: ${b.until || 'навсегда'} - причина: ${b.reason}`);
    });
}
