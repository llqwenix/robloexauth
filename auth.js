// auth.js - общая логика для всех страниц

// ========== НАСТРОЙКИ ==========
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
        console.error('Ошибка парсинга users:', e);
        return [];
    }
}

function saveUsers(users) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    console.log('💾 Пользователи сохранены:', users.length);
}

// ========== РАБОТА С ЗАЯВКАМИ ==========
function getRequests() {
    const requests = localStorage.getItem(REQUESTS_KEY);
    if (!requests) return [];
    try {
        const parsed = JSON.parse(requests);
        return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
        console.error('Ошибка парсинга requests:', e);
        return [];
    }
}

function saveRequests(requests) {
    localStorage.setItem(REQUESTS_KEY, JSON.stringify(requests));
    console.log('💾 Заявки сохранены:', requests.length);
}

function createRequest(username, password) {
    console.log('📝 Создание заявки для:', username);
    
    const requests = getRequests();
    
    // Проверяем, нет ли уже заявки от этого пользователя
    if (requests.some(r => r.username === username)) {
        return { success: false, message: 'Заявка от этого пользователя уже существует!' };
    }
    
    // Проверяем, не зарегистрирован ли уже пользователь
    const users = getUsers();
    if (users.some(u => u.username === username)) {
        return { success: false, message: 'Пользователь с таким именем уже зарегистрирован!' };
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
    console.log('✅ Заявка создана:', newRequest);
    
    return { success: true, message: 'Заявка отправлена на рассмотрение!' };
}

function approveRequest(requestId, adminName) {
    console.log('✅ Одобрение заявки:', requestId, 'администратором:', adminName);
    
    const requests = getRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        console.log('❌ Заявка не найдена');
        return false;
    }
    
    const request = requests[requestIndex];
    if (request.status !== 'pending') {
        console.log('❌ Заявка уже обработана, статус:', request.status);
        return false;
    }
    
    // Создаём пользователя
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
    console.log('✅ Пользователь создан:', newUser);
    
    // Обновляем статус заявки
    request.status = 'approved';
    request.reviewedBy = adminName;
    request.reviewedAt = new Date().toISOString();
    requests[requestIndex] = request;
    saveRequests(requests);
    
    console.log('✅ Заявка одобрена');
    return true;
}

function denyRequest(requestId, adminName) {
    console.log('❌ Отклонение заявки:', requestId, 'администратором:', adminName);
    
    const requests = getRequests();
    const requestIndex = requests.findIndex(r => r.id === requestId);
    
    if (requestIndex === -1) {
        console.log('❌ Заявка не найдена');
        return false;
    }
    
    requests[requestIndex].status = 'denied';
    requests[requestIndex].reviewedBy = adminName;
    requests[requestIndex].reviewedAt = new Date().toISOString();
    saveRequests(requests);
    
    console.log('✅ Заявка отклонена');
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
    const now = new Date();
    const activeBan = bans.find(b => b.username === username && (!b.until || new Date(b.until) > now));
    return activeBan || null;
}

function banUser(username, reason, durationHours, adminName) {
    console.log('🚫 Бан пользователя:', username, 'причина:', reason);
    
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
    console.log('✅ Пользователь забанен');
    
    // Если пользователь сейчас залогинен, разлогиниваем его
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.username === username) {
        clearCurrentUser();
        console.log('👤 Пользователь разлогинен');
    }
    
    return true;
}

function unbanUser(username) {
    console.log('🔓 Разбан пользователя:', username);
    
    const bans = getBans();
    const filteredBans = bans.filter(b => b.username !== username);
    saveBans(filteredBans);
    
    console.log('✅ Пользователь разбанен');
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
    console.log('📰 Добавление новости:', title);
    
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
    
    console.log('✅ Новость добавлена');
    return newNews;
}

function deleteNews(newsId) {
    console.log('🗑 Удаление новости:', newsId);
    
    const news = getNews();
    const filtered = news.filter(n => n.id !== newsId);
    saveNews(filtered);
    
    console.log('✅ Новость удалена');
    return true;
}

function updateNewsPinned(newsId, isPinned) {
    console.log('📌 Изменение закрепления новости:', newsId, isPinned);
    
    const news = getNews();
    const newsItem = news.find(n => n.id === newsId);
    if (newsItem) {
        newsItem.pinned = isPinned;
        saveNews(news);
        console.log('✅ Статус закрепления изменён');
    }
}

// ========== АВТОРИЗАЦИЯ ПОЛЬЗОВАТЕЛЕЙ ==========
function registerUser(username, password) {
    console.log('📝 Регистрация пользователя:', username);
    
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
    
    // Проверка на бан
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
    
    console.log('✅ Пользователь зарегистрирован:', newUser);
    return { success: true, cookie: cookie, message: 'Регистрация успешна!' };
}

function loginUser(username, password) {
    console.log('🔐 Попытка входа по паролю:', username);
    
    // Проверка на бан
    const ban = isUserBanned(username);
    if (ban) {
        const untilText = ban.until ? ` до ${new Date(ban.until).toLocaleString()}` : ' навсегда';
        return { success: false, message: `Ваш аккаунт забанен${untilText}. Причина: ${ban.reason}` };
    }
    
    const users = getUsers();
    const passwordHash = hashPassword(password);
    const user = users.find(u => u.username === username && u.password === passwordHash);
    
    if (user) {
        console.log('✅ Вход успешен для:', username);
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    
    console.log('❌ Неверный пароль для:', username);
    return { success: false, message: 'Неверное имя пользователя или пароль!' };
}

function loginByCookie(cookie) {
    console.log('🔐 Попытка входа по Cookie:', cookie);
    
    const users = getUsers();
    console.log('📋 Всего пользователей:', users.length);
    
    const user = users.find(u => u.cookie === cookie);
    
    if (user) {
        console.log('✅ Пользователь найден:', user.username);
        
        const ban = isUserBanned(user.username);
        if (ban) {
            console.log('❌ Пользователь забанен');
            return { success: false, message: `Аккаунт забанен` };
        }
        
        console.log('✅ Вход по Cookie успешен');
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    
    console.log('❌ Пользователь с таким Cookie не найден');
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
    console.log('💾 Текущий пользователь сохранён:', user.username);
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    console.log('👤 Текущий пользователь очищен');
}

function logout() {
    console.log('🚪 Выход из аккаунта');
    clearCurrentUser();
    window.location.href = '/robloexauth/login.html';
}

function checkAuth() {
    console.log('🔍 Проверка авторизации...');
    
    const user = getCurrentUser();
    if (user && user.cookie) {
        console.log('Найден сохранённый пользователь:', user.username);
        
        const verified = loginByCookie(user.cookie);
        if (verified.success) {
            console.log('✅ Авторизация подтверждена');
            return verified;
        } else {
            console.log('❌ Cookie недействителен, очищаем');
            clearCurrentUser();
            return null;
        }
    }
    
    console.log('❌ Пользователь не авторизован');
    return null;
}

// ========== АДМИН-ФУНКЦИИ ==========
function isAdmin() {
    const user = getCurrentUser();
    const isAdminUser = user && ADMIN_USERNAMES.includes(user.username);
    console.log('👑 Проверка прав администратора:', isAdminUser);
    return isAdminUser;
}

function getAllUsers() {
    return getUsers();
}

function deleteUser(username) {
    console.log('🗑 Удаление пользователя:', username);
    
    if (ADMIN_USERNAMES.includes(username)) {
        console.log('❌ Нельзя удалить системного администратора');
        return false;
    }
    
    let users = getUsers();
    users = users.filter(u => u.username !== username);
    saveUsers(users);
    deleteSkin(username);
    
    console.log('✅ Пользователь удалён');
    return true;
}

function changeUserRole(username, newRole) {
    console.log('🔄 Изменение роли пользователя:', username, 'на', newRole);
    
    const users = getUsers();
    const user = users.find(u => u.username === username);
    
    if (user && !ADMIN_USERNAMES.includes(username)) {
        user.role = newRole;
        saveUsers(users);
        console.log('✅ Роль изменена');
        return true;
    }
    
    console.log('❌ Нельзя изменить роль системного администратора');
    return false;
}

// ========== РАБОТА СО СКИНАМИ ==========
function saveSkin(username, skinDataUrl) {
    console.log('🎨 Сохранение скина для:', username);
    
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    skins[username] = skinDataUrl;
    localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(skins));
    
    console.log('✅ Скин сохранён');
}

function getSkin(username) {
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    return skins[username] || null;
}

function deleteSkin(username) {
    console.log('🗑 Удаление скина для:', username);
    
    const skins = JSON.parse(localStorage.getItem(SKINS_STORAGE_KEY) || '{}');
    delete skins[username];
    localStorage.setItem(SKINS_STORAGE_KEY, JSON.stringify(skins));
    
    console.log('✅ Скин удалён');
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

// ========== ОТЛАДОЧНЫЕ ФУНКЦИИ ==========
function debugPrintUsers() {
    const users = getUsers();
    console.log('📋 Список пользователей:');
    users.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.username} (${u.role}) - Cookie: ${u.cookie ? u.cookie.substring(0, 20) + '...' : 'Нет'}`);
    });
}

function debugPrintRequests() {
    const requests = getRequests();
    console.log('📋 Список заявок:');
    requests.forEach((r, i) => {
        console.log(`  ${i + 1}. ${r.username} - статус: ${r.status}`);
    });
}

function debugPrintBans() {
    const bans = getBans();
    console.log('📋 Список банов:');
    bans.forEach((b, i) => {
        console.log(`  ${i + 1}. ${b.username} - до: ${b.until || 'навсегда'} - причина: ${b.reason}`);
    });
}

function debugPrintNews() {
    const news = getNews();
    console.log('📋 Список новостей:');
    news.forEach((n, i) => {
        console.log(`  ${i + 1}. ${n.title} - закреплена: ${n.pinned}`);
    });
}

function debugClearAllData() {
    if (confirm('⚠️ Это удалит ВСЕХ пользователей, заявки, баны и новости! Продолжить?')) {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(REQUESTS_KEY);
        localStorage.removeItem(BANS_KEY);
        localStorage.removeItem(NEWS_KEY);
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(SKINS_STORAGE_KEY);
        console.log('✅ Все данные очищены');
        showToast('Все данные очищены! Перезагрузите страницу.', 'success');
        setTimeout(() => window.location.reload(), 1500);
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

// ========== ИНИЦИАЛИЗАЦИЯ ДЛЯ ОТЛАДКИ ==========
console.log('📦 auth.js загружен');
console.log('👥 Список администраторов:', ADMIN_USERNAMES);
