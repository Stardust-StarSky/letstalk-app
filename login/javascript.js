(function() {
    const WORKER_URL = 'https://admin.mynexus.dpdns.org';

    const loginPage = document.getElementById('loginPage');
    const usernameInput = document.getElementById('usernameInput');
    const passwordInput = document.getElementById('passwordInput');
    const loginBtn = document.getElementById('loginBtn');
    const loginError = document.getElementById('loginError');
    const kvError = document.getElementById('kvError');
    const accountInfo = document.getElementById('accountInfo');

    function debugLog(msg) { console.log('[Login]', msg); }

    async function apiCall(endpoint, method = 'GET', data = null) {
        const url = `${WORKER_URL}${endpoint}${method === 'GET' ? '?_t=' + Date.now() : ''}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' },
        };
        const token = localStorage.getItem('token');
        if (token) options.headers['Authorization'] = `Bearer ${token}`;
        if (data) options.body = JSON.stringify(data);
        const resp = await fetch(url, options);
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || '请求失败');
        return result;
    }

    function showError(msg) {
        loginError.textContent = msg;
        loginError.classList.remove('hidden');
        kvError.classList.add('hidden');
    }
    function hideError() {
        loginError.classList.add('hidden');
        kvError.classList.add('hidden');
    }

    async function loadAccountInfo() {
        accountInfo.textContent = '加载中...';
        try {
            const result = await apiCall('/accounts/info');
            if (result.success) {
                accountInfo.textContent = '欢迎使用 Nexus';
                loginBtn.disabled = false;
                hideError();
            } else {
                accountInfo.textContent = '⚠️ 加载失败，请刷新';
                loginBtn.disabled = true;
            }
        } catch (e) {
            if (e.message.includes('limit') || e.message.includes('exceeded')) {
                kvError.classList.remove('hidden');
                loginBtn.disabled = true;
                const tomorrow = new Date();
                tomorrow.setDate(tomorrow.getDate() + 1);
                const dateStr = tomorrow.getFullYear() + '年' + (tomorrow.getMonth() + 1) + '月' + tomorrow.getDate() + '日';
                kvError.textContent = '⚠️ 服务器存储已达上限，请 ' + dateStr + ' 后重试。';
                accountInfo.textContent = '⚠️ 存储已满，今日无法使用';
            } else {
                accountInfo.textContent = '⚠️ 网络错误，请刷新重试';
                loginBtn.disabled = false;
            }
        }
    }

    async function login() {
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        if (!username || !password) {
            showError('请输入账号和密码');
            return;
        }
        loginBtn.disabled = true;
        loginBtn.textContent = '登录中...';
        try {
            const result = await apiCall('/auth/login', 'POST', { username, password });
            if (result.success) {
                localStorage.setItem('token', result.token);
                hideError();
                window.location.href = '/chat';
                return;
            }
            showError(result.error || '登录失败');
        } catch (e) {
            showError('网络错误: ' + e.message);
        }
        loginBtn.disabled = false;
        loginBtn.textContent = '登 录';
    }

    // 事件绑定
    loginBtn.addEventListener('click', (e) => { e.preventDefault(); login(); });
    passwordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
    usernameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });

    // 初始化
    loginPage.style.backgroundImage = 'url("../background.png")';
    loginPage.style.backgroundSize = 'cover';
    loginPage.style.backgroundPosition = 'center';
    loginPage.style.backgroundColor = '#282a37';

    // 检查已登录状态
    const token = localStorage.getItem('token');
    if (token) {
        fetch(`${WORKER_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => {
            if (res.ok) {
                window.location.href = '/chat';
            } else {
                localStorage.removeItem('token');
                loadAccountInfo(); // 继续加载登录页
            }
        })
        .catch(() => {
            // 网络问题，仍显示登录页，但保留 token
            loadAccountInfo();
        });
    } else {
        loadAccountInfo();
    }
})();