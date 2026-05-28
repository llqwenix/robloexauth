// auth.js - с подключением к Supabase

// ========== НАСТРОЙКИ SUPABASE ==========
const SUPABASE_URL = 'https://zlzcvfrudtyebsdfxelp.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_IPfd3M8WFka9dnWS7Wu-og_8jkIUrfb';

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

// ========== ЗАПРОСЫ К SUPABASE ==========
async function supabaseRequest(endpoint, method = 'GET', body = null) {
    const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
    const headers = {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
    };
    
    const options = {
        method: method,
        headers: headers
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            console.error(`Supabase error ${response.status}:`, await response.text());
            return null;
        }
        return await response.json();
    } catch (e) {
        console.error('Fetch error:', e);
        return null;
    }
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
async function getUsers() {
    return await supabaseRequest('users?select=*') || [];
}

async function getUserByCookie(cookie) {
    const result = await supabaseRequest(`users?select=*&cookie=eq.${cookie}`);
    return result && result.length > 0 ? result[0] : null;
}

async function getUserByUsername(username) {
    const result = await supabaseRequest(`users?select=*&username=eq.${username}`);
    return result && result.length > 0 ? result[0] : null;
}

async function getRequests() {
    return await supabaseRequest('requests?select=*&order=created_at.desc') || [];
}

async function getNews() {
    return await supabaseRequest('news?select=*&order=date.desc') || [];
}

// ========== АВТОРИЗАЦИЯ ==========
async function loginUser(username, password) {
    const user = await getUserByUsername(username);
    if (user && user.password === hashPassword(password) && !user.is_banned) {
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
    }
    return { success: false, message: 'Неверное имя пользователя или пароль!' };
}

async function loginByCookie(cookie) {
    const user = await getUserByCookie(cookie);
    if (user && !user.is_banned) {
        return { success: true, username: user.username, role: user.role, cookie: user.cookie };
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
        console.log('Найден сохранённый cookie:', savedUser.cookie.substring(0, 20) + '...');
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

// ========== ЗАЯВКИ ==========
async function createRequest(username, password) {
    const existingUser = await getUserByUsername(username);
    if (existingUser) {
        return { success: false, message: 'Пользователь с таким именем уже существует!' };
    }
    
    const requests = await getRequests();
    if (requests.some(r => r.username === username && r.status === 'pending')) {
        return { success: false, message: 'Заявка от этого пользователя уже существует!' };
    }
    
    const result = await supabaseRequest('requests', 'POST', {
        username: username,
        password: hashPassword(password),
        status: 'pending'
    });
    
    if (result) {
        return { success: true, message: 'Заявка отправлена на рассмотрение!' };
    }
    return { success: false, message: 'Ошибка при отправке заявки!' };
}

async function approveRequest(requestId, adminName) {
    const request = await supabaseRequest(`requests?id=eq.${requestId}`);
    if (!request || request.length === 0 || request[0].status !== 'pending') {
        return false;
    }
    
    const req = request[0];
    const cookie = generateCookie();
    
    // Создаём пользователя
    const newUser = await supabaseRequest('users', 'POST', {
        username: req.username,
        password: req.password,
        cookie: cookie,
        role: 'user'
    });
    
    if (!newUser) return false;
    
    // Обновляем заявку
    await supabaseRequest(`requests?id=eq.${requestId}`, 'PATCH', {
        status: 'approved',
        reviewed_by: adminName,
        reviewed_at: new Date().toISOString()
    });
    
    return true;
}

async function denyRequest(requestId, adminName) {
    await supabaseRequest(`requests?id=eq.${requestId}`, 'PATCH', {
        status: 'denied',
        reviewed_by: adminName,
        reviewed_at: new Date().toISOString()
    });
    return true;
}

// ========== НОВОСТИ ==========
async function addNews(title, content, image = '📰', pinned = false) {
    return await supabaseRequest('news', 'POST', {
        title: title,
        content: content,
        image: image,
        pinned: pinned
    });
}

async function deleteNews(newsId) {
    return await supabaseRequest(`news?id=eq.${newsId}`, 'DELETE');
}

async function updateNewsPinned(newsId, pinned) {
    return await supabaseRequest(`news?id=eq.${newsId}`, 'PATCH', { pinned: pinned });
}

// ========== БАНЫ ==========
async function isUserBanned(username) {
    const user = await getUserByUsername(username);
    if (user && user.is_banned) {
        if (user.ban_until && new Date(user.ban_until) < new Date()) {
            return null;
        }
        return { reason: user.ban_reason, until: user.ban_until };
    }
    return null;
}

async function banUser(username, reason, durationHours, adminName) {
    const until = durationHours ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
    return await supabaseRequest(`users?username=eq.${username}`, 'PATCH', {
        is_banned: true,
        ban_reason: reason,
        ban_until: until
    });
}

async function unbanUser(username) {
    return await supabaseRequest(`users?username=eq.${username}`, 'PATCH', {
        is_banned: false,
        ban_reason: null,
        ban_until: null
    });
}

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========
async function getAllUsers() {
    return await getUsers();
}

async function deleteUser(username) {
    if (ADMIN_USERNAMES.includes(username)) {
        return false;
    }
    return await supabaseRequest(`users?username=eq.${username}`, 'DELETE');
}

async function changeUserRole(username, newRole) {
    if (ADMIN_USERNAMES.includes(username)) {
        return false;
    }
    return await supabaseRequest(`users?username=eq.${username}`, 'PATCH', { role: newRole });
}

// ========== СКИНЫ ==========
async function saveSkin(username, skinDataUrl) {
    return await supabaseRequest('skins', 'UPSERT', {
        username: username,
        skin_data: skinDataUrl,
        updated_at: new Date().toISOString()
    });
}

async function getSkin(username) {
    const result = await supabaseRequest(`skins?select=skin_data&username=eq.${username}`);
    return result && result.length > 0 ? result[0].skin_data : null;
}

async function deleteSkin(username) {
    return await supabaseRequest(`skins?username=eq.${username}`, 'DELETE');
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
async function debugPrintUsers() {
    const users = await getUsers();
    console.log('📋 Список пользователей:', users);
}

async function debugPrintRequests() {
    const requests = await getRequests();
    console.log('📋 Список заявок:', requests);
}

async function debugPrintNews() {
    const news = await getNews();
    console.log('📋 Список новостей:', news);
}

console.log('✅ auth.js загружен');
