// auth.js - с подключением к Supabase

// ========== НАСТРОЙКИ SUPABASE ==========
const SUPABASE_URL = 'https://zlzcvfrudtyebsdfxelp.supabase.com';  // ЗАМЕНИТЕ НА ВАШ URL
const SUPABASE_ANON_KEY = 'sb_publishable_IPfd3M8WFka9dnWS7Wu-og_8jkIUrfb';  // ЗАМЕНИТЕ НА ВАШ КЛЮЧ

// ========== НАСТРОЙКИ АДМИНОВ ==========
const ADMIN_USERNAMES = ['vynzxluf', 'vzxjall'];

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

// ========== РАБОТА С SUPABASE ==========
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
    
    const response = await fetch(url, options);
    return await response.json();
}

// ========== РАБОТА С ПОЛЬЗОВАТЕЛЯМИ ==========
async function getUsers() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return await response.json();
    } catch (e) {
        console.error('Ошибка загрузки пользователей:', e);
        return [];
    }
}

async function getUserByCookie(cookie) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&cookie=eq.${cookie}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const users = await response.json();
        return users[0] || null;
    } catch (e) {
        console.error('Ошибка поиска пользователя:', e);
        return null;
    }
}

async function getUserByUsername(username) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=*&username=eq.${username}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const users = await response.json();
        return users[0] || null;
    } catch (e) {
        console.error('Ошибка поиска пользователя:', e);
        return null;
    }
}

async function createUser(username, password, cookie, role = 'user') {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                username: username,
                password: hashPassword(password),
                cookie: cookie,
                role: role
            })
        });
        return await response.json();
    } catch (e) {
        console.error('Ошибка создания пользователя:', e);
        return null;
    }
}

// ========== РАБОТА С ЗАЯВКАМИ ==========
async function getRequests() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/requests?select=*&order=created_at.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return await response.json();
    } catch (e) {
        console.error('Ошибка загрузки заявок:', e);
        return [];
    }
}

async function createRequest(username, password) {
    try {
        // Проверяем, нет ли уже пользователя
        const existingUser = await getUserByUsername(username);
        if (existingUser) {
            return { success: false, message: 'Пользователь с таким именем уже существует!' };
        }
        
        // Проверяем, нет ли уже заявки
        const requests = await getRequests();
        if (requests.some(r => r.username === username && r.status === 'pending')) {
            return { success: false, message: 'Заявка от этого пользователя уже существует!' };
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/requests`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                password: hashPassword(password),
                status: 'pending'
            })
        });
        
        if (response.ok) {
            return { success: true, message: 'Заявка отправлена на рассмотрение!' };
        } else {
            return { success: false, message: 'Ошибка при отправке заявки!' };
        }
    } catch (e) {
        console.error('Ошибка создания заявки:', e);
        return { success: false, message: 'Ошибка подключения к серверу!' };
    }
}

async function approveRequest(requestId, adminName) {
    try {
        // Получаем заявку
        const response = await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${requestId}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const requests = await response.json();
        const request = requests[0];
        
        if (!request || request.status !== 'pending') {
            return false;
        }
        
        // Создаём пользователя
        const cookie = generateCookie();
        await createUser(request.username, request.password, cookie, 'user');
        
        // Обновляем статус заявки
        await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${requestId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'approved',
                reviewed_by: adminName,
                reviewed_at: new Date().toISOString()
            })
        });
        
        return true;
    } catch (e) {
        console.error('Ошибка одобрения заявки:', e);
        return false;
    }
}

async function denyRequest(requestId, adminName) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/requests?id=eq.${requestId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                status: 'denied',
                reviewed_by: adminName,
                reviewed_at: new Date().toISOString()
            })
        });
        return true;
    } catch (e) {
        console.error('Ошибка отклонения заявки:', e);
        return false;
    }
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

// ========== НОВОСТИ ==========
async function getNews() {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/news?select=*&order=date.desc`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return await response.json();
    } catch (e) {
        console.error('Ошибка загрузки новостей:', e);
        return [];
    }
}

async function addNews(title, content, image = '📰', pinned = false) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/news`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                title: title,
                content: content,
                image: image,
                pinned: pinned
            })
        });
        return true;
    } catch (e) {
        console.error('Ошибка добавления новости:', e);
        return false;
    }
}

async function deleteNews(newsId) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/news?id=eq.${newsId}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return true;
    } catch (e) {
        console.error('Ошибка удаления новости:', e);
        return false;
    }
}

async function updateNewsPinned(newsId, pinned) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/news?id=eq.${newsId}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ pinned: pinned })
        });
        return true;
    } catch (e) {
        console.error('Ошибка обновления новости:', e);
        return false;
    }
}

// ========== БАНЫ ==========
async function isUserBanned(username) {
    const user = await getUserByUsername(username);
    if (user && user.is_banned) {
        if (user.ban_until && new Date(user.ban_until) < new Date()) {
            // Бан истёк
            return null;
        }
        return { reason: user.ban_reason, until: user.ban_until };
    }
    return null;
}

async function banUser(username, reason, durationHours, adminName) {
    try {
        const until = durationHours ? new Date(Date.now() + durationHours * 3600000).toISOString() : null;
        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_banned: true,
                ban_reason: reason,
                ban_until: until
            })
        });
        return true;
    } catch (e) {
        console.error('Ошибка бана:', e);
        return false;
    }
}

async function unbanUser(username) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                is_banned: false,
                ban_reason: null,
                ban_until: null
            })
        });
        return true;
    } catch (e) {
        console.error('Ошибка разбана:', e);
        return false;
    }
}

// ========== УПРАВЛЕНИЕ ПОЛЬЗОВАТЕЛЯМИ ==========
async function getAllUsers() {
    return await getUsers();
}

async function deleteUser(username) {
    if (ADMIN_USERNAMES.includes(username)) {
        return false;
    }
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return true;
    } catch (e) {
        console.error('Ошибка удаления:', e);
        return false;
    }
}

async function changeUserRole(username, newRole) {
    if (ADMIN_USERNAMES.includes(username)) {
        return false;
    }
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/users?username=eq.${username}`, {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ role: newRole })
        });
        return true;
    } catch (e) {
        console.error('Ошибка изменения роли:', e);
        return false;
    }
}

// ========== СЕССИЯ ==========
let currentSessionUser = null;

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
    currentSessionUser = user;
}

function clearCurrentUser() {
    localStorage.removeItem(CURRENT_USER_KEY);
    currentSessionUser = null;
}

async function checkAuth() {
    const savedUser = getCurrentUser();
    if (savedUser && savedUser.cookie) {
        const result = await loginByCookie(savedUser.cookie);
        if (result.success) {
            return result;
        } else {
            clearCurrentUser();
            return null;
        }
    }
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

// ========== СКИНЫ ==========
async function saveSkin(username, skinDataUrl) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/skins`, {
            method: 'UPSERT',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: username,
                skin_data: skinDataUrl,
                updated_at: new Date().toISOString()
            })
        });
        return true;
    } catch (e) {
        console.error('Ошибка сохранения скина:', e);
        return false;
    }
}

async function getSkin(username) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/skins?select=skin_data&username=eq.${username}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const data = await response.json();
        return data[0]?.skin_data || null;
    } catch (e) {
        console.error('Ошибка загрузки скина:', e);
        return null;
    }
}

async function deleteSkin(username) {
    try {
        await fetch(`${SUPABASE_URL}/rest/v1/skins?username=eq.${username}`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        return true;
    } catch (e) {
        console.error('Ошибка удаления скина:', e);
        return false;
    }
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
