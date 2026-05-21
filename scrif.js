// ==================== FIREBASE CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyCrQZ_Z9MQ5y1HUPqc1aUi7l_FOuOoy5cA",
    authDomain: "shadowassassin-6173b.firebaseapp.com",
    databaseURL: "https://shadowassassin-6173b-default-rtdb.firebaseio.com",
    projectId: "shadowassassin-6173b",
    storageBucket: "shadowassassin-6173b.firebasestorage.app",
    messagingSenderId: "146724077874",
    appId: "1:146724077874:web:a1b2580e27c9aeed6c572b"
};

// Inisialisasi Firebase
if (typeof firebase !== 'undefined' && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();

// ==================== GLOBAL VARIABLES ====================
let allDeposits = {};
let allPurchases = {};
let allVIPs = {};
let allUsers = {};
let allBanned = {};
let allSessions = {};
let allSaldo = {};
let allChats = {};
let publicMessages = {};
let allDiscounts = {};
let allPremiumVideos = [];
let allFreeUpdates = {};

let currentDepositFilter = 'all';
let currentVIPFilter = 'all';
let currentDepositHistoryFilter = 'all';
let currentVIPHistoryFilter = 'all';
let currentChatUser = '';
let chatListener = null;
let maintenanceEnd = null;
let maintenanceTimerInterval = null;

// Chart instance
let mainChart = null;

// Chart data arrays untuk real-time update
let chartDepositData = [];
let chartRevenueData = [];
let chartRegisterData = [];
let chartVIPData = [];
let chartLabels = [];

// Audio control
let videoElement = null;
let isAudioMuted = true;

// ==================== 3D PARTICLES ====================
const canvas = document.getElementById('particlesCanvas');
let ctx = canvas?.getContext('2d');
let particles = [];

function initParticles() {
    if (!canvas || !ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    for (let i = 0; i < 150; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            speedX: (Math.random() - 0.5) * 1.2,
            speedY: (Math.random() - 0.5) * 1.2,
            color: `hsl(${Math.random() * 60 + 340}, 100%, 60%)`
        });
    }
    animateParticles();
}

function animateParticles() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
    });
    requestAnimationFrame(animateParticles);
}

window.addEventListener('resize', () => {
    if (canvas) { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
});

// ==================== AUDIO CONTROL ====================
function initAudioControl() {
    videoElement = document.getElementById('bgVideo');
    if (videoElement) {
        videoElement.muted = true;
        isAudioMuted = true;
        const audioIcon = document.getElementById('audioIcon');
        if (audioIcon) audioIcon.className = 'fas fa-volume-mute';
    }
}

function toggleAudio() {
    if (!videoElement) return;
    videoElement.muted = !videoElement.muted;
    isAudioMuted = videoElement.muted;
    const audioIcon = document.getElementById('audioIcon');
    if (audioIcon) {
        audioIcon.className = isAudioMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    }
    showToast(isAudioMuted ? '🔇 Sound OFF' : '🔊 Sound ON');
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
    if (!text) return '';
    return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatRupiah(num) {
    if (!num) return '0';
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.innerHTML = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

function showLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('active');
}

function hideLoading() {
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('active');
}

function copyUID(uid) {
    navigator.clipboard.writeText(uid);
    showToast('UID Copied!');
}

function showDebug(msg) {
    const debugEl = document.getElementById('debugOutput');
    if (debugEl) {
        debugEl.innerHTML = `[${new Date().toLocaleTimeString()}] ${msg}<br>` + debugEl.innerHTML;
        if (debugEl.children.length > 15) debugEl.removeChild(debugEl.lastChild);
    }
    console.log('[DEBUG]', msg);
}

function showConfirm(title, message, callback) {
    const confirmTitle = document.getElementById('confirmTitle');
    const confirmMessage = document.getElementById('confirmMessage');
    const confirmModal = document.getElementById('confirmModal');
    const confirmYesBtn = document.getElementById('confirmYesBtn');
    if (confirmTitle) confirmTitle.innerHTML = title;
    if (confirmMessage) confirmMessage.innerHTML = message;
    if (confirmModal) confirmModal.classList.add('active');
    if (confirmYesBtn) {
        confirmYesBtn.onclick = function() { closeConfirm(); callback(); };
    }
}

function closeConfirm() {
    const confirmModal = document.getElementById('confirmModal');
    if (confirmModal) confirmModal.classList.remove('active');
}

function forceRefresh() { showDebug('🔄 Force refresh...'); loadAllData(); }
function checkFirebase() { showDebug('🔍 Checking Firebase connection...'); db.ref('.info/connected').once('value').then(snap => { showDebug(snap.val() ? '✅ Firebase Connected!' : '❌ Firebase Disconnected!'); }); }

// ==================== CHART INIT & REAL-TIME UPDATE ====================
function initChart() {
    const ctx = document.getElementById('mainChart')?.getContext('2d');
    if (!ctx) return;
    
    // Initialize with 30 days of data
    for (let i = 29; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        chartLabels.push(date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }));
        chartDepositData.push(0);
        chartRevenueData.push(0);
        chartRegisterData.push(0);
        chartVIPData.push(0);
    }
    
    mainChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Deposit (Rp)',
                    data: chartDepositData,
                    borderColor: '#00ff88',
                    backgroundColor: 'rgba(0, 255, 136, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#00ff88',
                    pointBorderColor: '#000',
                    pointRadius: 4,
                    pointHoverRadius: 7
                },
                {
                    label: 'Revenue (Rp)',
                    data: chartRevenueData,
                    borderColor: '#ff3333',
                    backgroundColor: 'rgba(255, 51, 51, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ff3333',
                    pointBorderColor: '#000',
                    pointRadius: 4,
                    pointHoverRadius: 7
                },
                {
                    label: 'Registrations',
                    data: chartRegisterData,
                    borderColor: '#9d00ff',
                    backgroundColor: 'rgba(157, 0, 255, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#9d00ff',
                    pointBorderColor: '#000',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    yAxisID: 'y1'
                },
                {
                    label: 'VIP Purchases',
                    data: chartVIPData,
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ffd700',
                    pointBorderColor: '#000',
                    pointRadius: 4,
                    pointHoverRadius: 7,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { position: 'top', labels: { color: '#fff', font: { family: 'Orbitron', size: 10 } } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: 'rgba(0,0,0,0.8)', titleColor: '#ffd700', bodyColor: '#fff' }
            },
            scales: {
                y: { 
                    position: 'left',
                    title: { display: true, text: 'Rupiah (Rp)', color: '#fff' },
                    grid: { color: 'rgba(255,255,255,0.1)' }, 
                    ticks: { color: '#fff', callback: (v) => 'Rp ' + formatRupiah(v) }
                },
                y1: {
                    position: 'right',
                    title: { display: true, text: 'Count', color: '#ffd700' },
                    grid: { drawOnChartArea: false },
                    ticks: { color: '#ffd700' }
                },
                x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#fff', rotate: 45, maxRotation: 45, minRotation: 45 } }
            }
        }
    });
}

function updateChartData() {
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
    
    // Check if today's label exists, if not shift data
    if (!chartLabels.includes(today)) {
        chartLabels.shift();
        chartLabels.push(today);
        chartDepositData.shift();
        chartDepositData.push(0);
        chartRevenueData.shift();
        chartRevenueData.push(0);
        chartRegisterData.shift();
        chartRegisterData.push(0);
        chartVIPData.shift();
        chartVIPData.push(0);
    }
    
    const todayIndex = chartLabels.indexOf(today);
    if (todayIndex === -1) return;
    
    // Calculate today's data
    let todayDeposit = 0;
    let todayRevenue = 0;
    let todayRegister = 0;
    let todayVIP = 0;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Count registrations today
    Object.keys(allUsers).forEach(uid => {
        const user = allUsers[uid];
        if (user && user.registeredAt) {
            const regDate = new Date(user.registeredAt);
            if (regDate >= todayStart) todayRegister++;
        }
    });
    
    // Count deposits and revenue today
    Object.keys(allDeposits).forEach(uid => {
        Object.keys(allDeposits[uid]).forEach(id => {
            const d = allDeposits[uid][id];
            if (d.timestamp && new Date(d.timestamp) >= todayStart) {
                if (d.status === 'approved') todayDeposit += d.jumlah || 0;
            }
        });
    });
    
    // Count VIP purchases and revenue today
    Object.keys(allPurchases).forEach(uid => {
        Object.keys(allPurchases[uid]).forEach(id => {
            const p = allPurchases[uid][id];
            if (p.timestamp && new Date(p.timestamp) >= todayStart && p.status === 'approved') {
                todayVIP++;
                todayRevenue += p.finalPrice || p.price || 0;
            }
        });
    });
    
    // Update chart data
    chartDepositData[todayIndex] = todayDeposit;
    chartRevenueData[todayIndex] = todayRevenue;
    chartRegisterData[todayIndex] = todayRegister;
    chartVIPData[todayIndex] = todayVIP;
    
    // Update chart
    if (mainChart) {
        mainChart.update();
    }
}

// Real-time chart update setiap 2 detik (seperti yang diminta)
setInterval(() => {
    if (mainChart) {
        updateChartData();
        showDebug('📊 Chart data updated real-time');
    }
}, 300000);

// ==================== LOAD ALL DATA ====================
function loadAllData() {
    showLoading();
    showDebug('Loading all data from Firebase...');

    Promise.all([
        db.ref('deposits').once('value'),
        db.ref('purchases').once('value'),
        db.ref('vip_members').once('value'),
        db.ref('users').once('value'),
        db.ref('banned_users').once('value'),
        db.ref('sessions').once('value'),
        db.ref('saldo').once('value'),
        db.ref('discounts').once('value'),
        db.ref('chats').once('value'),
        db.ref('all_comments').once('value'),
        db.ref('premium_videos_uploadcare').once('value'),
        db.ref('free_updates').once('value')
    ]).then(([deposits, purchases, vips, users, banned, sessions, saldo, discounts, chats, comments, videos, freeUpdates]) => {
        allDeposits = deposits.val() || {};
        allPurchases = purchases.val() || {};
        allVIPs = vips.val() || {};
        allUsers = users.val() || {};
        allBanned = banned.val() || {};
        allSessions = sessions.val() || {};
        allSaldo = saldo.val() || {};
        allDiscounts = discounts.val() || {};
        allChats = chats.val() || {};
        publicMessages = comments.val() || {};
        
        // Fix: Handle videos data properly (it could be object, not array)
        const videosData = videos.val() || {};
        allPremiumVideos = [];
        Object.keys(videosData).forEach(key => {
            allPremiumVideos.push({ id: key, ...videosData[key] });
        });
        
        allFreeUpdates = freeUpdates.val() || {};

        showDebug(`✅ Data loaded: Users: ${Object.keys(allUsers).length}, Deposits: ${Object.keys(allDeposits).length}, VIP: ${Object.keys(allPurchases).length}, Videos: ${allPremiumVideos.length}`);
        
        updateDebugStats();
        updateDashboard();
        updateChartData();
        loadDepositOrders();
        loadVIPOrders();
        loadCustomers();
        loadVIPMembers();
        loadDepositHistory();
        loadVIPHistory();
        loadLeaderboard();
        loadDiscounts();
        loadUserFiles();
        loadFileUpdates();
        loadPublicChat();
        loadFreeUpdateStats();
        displayPremiumVideos();
        
        hideLoading();
    }).catch(error => {
        showDebug('❌ ERROR: ' + error.message);
        console.error(error);
        hideLoading();
        showToast('Error loading data: ' + error.message);
    });
}

function updateDebugStats() {
    let totalDeposits = 0, pendingDeposits = 0, totalVIP = 0, pendingVIP = 0;
    Object.keys(allDeposits).forEach(uid => { Object.keys(allDeposits[uid]).forEach(id => { totalDeposits++; if (allDeposits[uid][id].status === 'pending') pendingDeposits++; }); });
    Object.keys(allPurchases).forEach(uid => { Object.keys(allPurchases[uid]).forEach(id => { totalVIP++; if (allPurchases[uid][id].status === 'pending') pendingVIP++; }); });
    
    const debugTotalDeposits = document.getElementById('debugTotalDeposits');
    const debugPendingDeposits = document.getElementById('debugPendingDeposits');
    const debugTotalVIP = document.getElementById('debugTotalVIP');
    const debugPendingVIP = document.getElementById('debugPendingVIP');
    
    if (debugTotalDeposits) debugTotalDeposits.innerHTML = totalDeposits;
    if (debugPendingDeposits) debugPendingDeposits.innerHTML = pendingDeposits;
    if (debugTotalVIP) debugTotalVIP.innerHTML = totalVIP;
    if (debugPendingVIP) debugPendingVIP.innerHTML = pendingVIP;
}

function updateDashboard() {
    let totalDeposit = 0, pendingDeposit = 0, totalVIP = 0, pendingVIP = 0, revenue = 0, totalUsers = Object.keys(allUsers).length, onlineUsers = 0, totalSaldo = 0;
    Object.keys(allSessions).forEach(uid => { const session = allSessions[uid]; if (session && session.timestamp && (Date.now() - session.timestamp < 300000)) onlineUsers++; });
    Object.keys(allSaldo).forEach(uid => { totalSaldo += allSaldo[uid].amount || 0; });
    Object.keys(allDeposits).forEach(uid => { Object.keys(allDeposits[uid]).forEach(id => { totalDeposit++; if (allDeposits[uid][id].status === 'pending') pendingDeposit++; }); });
    Object.keys(allPurchases).forEach(uid => { Object.keys(allPurchases[uid]).forEach(id => { totalVIP++; const p = allPurchases[uid][id]; if (p.status === 'pending') pendingVIP++; else if (p.status === 'approved') revenue += p.finalPrice || p.price || 0; }); });
    
    document.getElementById('totalDeposit') && (document.getElementById('totalDeposit').innerHTML = totalDeposit);
    document.getElementById('pendingDeposit') && (document.getElementById('pendingDeposit').innerHTML = pendingDeposit + ' Pending');
    document.getElementById('totalVIP') && (document.getElementById('totalVIP').innerHTML = totalVIP);
    document.getElementById('pendingVIP') && (document.getElementById('pendingVIP').innerHTML = pendingVIP + ' Pending');
    document.getElementById('totalUsers') && (document.getElementById('totalUsers').innerHTML = totalUsers);
    document.getElementById('activeUsers') && (document.getElementById('activeUsers').innerHTML = onlineUsers + ' Online');
    document.getElementById('totalRevenue') && (document.getElementById('totalRevenue').innerHTML = 'Rp ' + formatRupiah(revenue));
    document.getElementById('totalSaldo') && (document.getElementById('totalSaldo').innerHTML = 'Rp ' + formatRupiah(totalSaldo));
    
    let recent = [];
    Object.keys(allDeposits).forEach(uid => { Object.keys(allDeposits[uid]).forEach(id => { recent.push({ type: 'deposit', uid, id, ...allDeposits[uid][id] }); }); });
    Object.keys(allPurchases).forEach(uid => { Object.keys(allPurchases[uid]).forEach(id => { recent.push({ type: 'vip', uid, id, ...allPurchases[uid][id] }); }); });
    recent.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    recent = recent.slice(0, 10);
    let html = '';
    recent.forEach(item => {
        const amount = item.jumlah || item.finalPrice || item.price || 0;
        html += `<div class="deposit-item"><div class="deposit-header"><span class="deposit-uid" onclick="copyUID('${item.uid}')">${item.uid}</span><span class="deposit-status status-${item.status}">${item.status}</span></div><div style="display: flex; gap: 15px; color: #aaa; font-size: 12px; flex-wrap: wrap;"><span><i class="fas fa-${item.type === 'deposit' ? 'coins' : 'crown'}"></i> ${item.type}</span><span><i class="fas fa-money-bill"></i> Rp ${formatRupiah(amount)}</span><span><i class="fas fa-clock"></i> ${item.timestamp ? new Date(item.timestamp).toLocaleString() : '-'}</span></div></div>`;
    });
    document.getElementById('recentOrders') && (document.getElementById('recentOrders').innerHTML = html || '<div class="no-data">No recent orders</div>');
}

// ==================== DEPOSIT ORDERS ====================
function loadDepositOrders() {
    let deposits = [];
    Object.keys(allDeposits).forEach(uid => { Object.keys(allDeposits[uid]).forEach(id => { deposits.push({ id, uid, ...allDeposits[uid][id] }); }); });
    deposits.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.allDepositsList = deposits;
    displayDeposits();
}

function displayDeposits() {
    let filtered = window.allDepositsList || [];
    if (currentDepositFilter !== 'all') filtered = filtered.filter(d => d.status === currentDepositFilter);
    const search = document.getElementById('depositSearch')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(d => d.uid.toLowerCase().includes(search));
    let html = '';
    filtered.forEach(d => {
        html += `<div class="deposit-item ${d.status}"><div class="deposit-header"><span class="deposit-uid" onclick="copyUID('${d.uid}')">${d.uid}</span><span class="deposit-amount">Rp ${formatRupiah(d.jumlah)}</span><span class="deposit-status status-${d.status}">${d.status}</span></div><div class="deposit-details"><div><span style="color:#aaa;">Nama Pengirim:</span> ${d.namaPengirim || '-'}</div><div><span style="color:#aaa;">No E-Wallet:</span> ${d.noEwallet || '-'}</div><div><span style="color:#aaa;">Metode:</span> ${d.metodePembayaran || '-'}</div><div><span style="color:#aaa;">Tanggal:</span> ${d.timestamp ? new Date(d.timestamp).toLocaleString() : '-'}</div></div><div class="action-buttons">${d.status === 'pending' ? `<button class="btn-neon green" onclick="approveDeposit('${d.uid}', '${d.id}', ${d.jumlah})">Approve</button><button class="btn-neon red" onclick="rejectDeposit('${d.uid}', '${d.id}')">Reject</button>` : ''}<button class="btn-neon" onclick="deleteDeposit('${d.uid}', '${d.id}')">Delete</button></div></div>`;
    });
    document.getElementById('depositList') && (document.getElementById('depositList').innerHTML = html || '<div class="no-data">No deposits found</div>');
}

function filterDeposit(filter) {
    currentDepositFilter = filter;
    const tabs = document.querySelectorAll('#deposit_orders .filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    displayDeposits();
}

function approveDeposit(uid, id, amount) {
    showConfirm('Approve Deposit', `Approve deposit Rp ${formatRupiah(amount)} for ${uid}?`, () => {
        showLoading();
        db.ref(`deposits/${uid}/${id}`).update({ status: 'approved', approved_at: Date.now() })
            .then(() => db.ref(`saldo/${uid}`).once('value'))
            .then(snap => { const current = snap.val()?.amount || 0; return db.ref(`saldo/${uid}`).set({ amount: current + amount, last_updated: Date.now() }); })
            .then(() => db.ref(`chats/${uid}`).push({ sender: 'system', text: `✅ *DEPOSIT APPROVED!*\n\nAmount: Rp ${formatRupiah(amount)}\nSaldo has been added.`, timestamp: Date.now() }))
            .then(() => { hideLoading(); showToast('Deposit approved!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function rejectDeposit(uid, id) {
    showConfirm('Reject Deposit', `Reject deposit for ${uid}?`, () => {
        showLoading();
        db.ref(`deposits/${uid}/${id}`).update({ status: 'rejected', rejected_at: Date.now() })
            .then(() => db.ref(`chats/${uid}`).push({ sender: 'system', text: `❌ *DEPOSIT REJECTED*\n\nPlease contact admin for more info.`, timestamp: Date.now() }))
            .then(() => { hideLoading(); showToast('Deposit rejected!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function deleteDeposit(uid, id) {
    showConfirm('Delete Deposit', `Permanently delete deposit for ${uid}?`, () => {
        showLoading();
        db.ref(`deposits/${uid}/${id}`).remove()
            .then(() => { hideLoading(); showToast('Deposit deleted!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== DEPOSIT HISTORY ====================
function loadDepositHistory() {
    let deposits = [];
    Object.keys(allDeposits).forEach(uid => { Object.keys(allDeposits[uid]).forEach(id => { deposits.push({ id, uid, ...allDeposits[uid][id] }); }); });
    deposits.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.allDepositHistory = deposits;
    displayDepositHistory();
}

function displayDepositHistory() {
    let filtered = window.allDepositHistory || [];
    if (currentDepositHistoryFilter !== 'all') filtered = filtered.filter(d => d.status === currentDepositHistoryFilter);
    const search = document.getElementById('depositHistorySearch')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(d => d.uid.toLowerCase().includes(search));
    let totalApproved = 0;
    filtered.forEach(d => { if (d.status === 'approved') totalApproved += d.jumlah || 0; });
    document.getElementById('totalApproved') && (document.getElementById('totalApproved').innerHTML = 'Rp ' + formatRupiah(totalApproved));
    let html = '';
    filtered.forEach(d => {
        html += `<div class="deposit-item ${d.status}" style="margin-bottom: 10px;"><div class="deposit-header"><span class="deposit-uid" onclick="copyUID('${d.uid}')">${d.uid}</span><span class="deposit-status status-${d.status}">${d.status}</span></div><div style="display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; font-size: 12px;"><div><span style="color:#aaa;">Amount:</span> Rp ${formatRupiah(d.jumlah)}</div><div><span style="color:#aaa;">Method:</span> ${d.metodePembayaran || '-'}</div><div><span style="color:#aaa;">Date:</span> ${d.timestamp ? new Date(d.timestamp).toLocaleDateString() : '-'}</div></div></div>`;
    });
    document.getElementById('depositHistoryList') && (document.getElementById('depositHistoryList').innerHTML = html || '<div class="no-data">No deposit history</div>');
}

function filterDepositHistory(filter) {
    currentDepositHistoryFilter = filter;
    const tabs = document.querySelectorAll('#deposit_history .filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    displayDepositHistory();
}

// ==================== VIP ORDERS ====================
function loadVIPOrders() {
    let vips = [];
    Object.keys(allPurchases).forEach(uid => { Object.keys(allPurchases[uid]).forEach(id => { vips.push({ id, uid, ...allPurchases[uid][id] }); }); });
    vips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.allVIPList = vips;
    displayVIPOrders();
}

function displayVIPOrders() {
    let filtered = window.allVIPList || [];
    if (currentVIPFilter !== 'all') filtered = filtered.filter(v => v.status === currentVIPFilter);
    const search = document.getElementById('vipSearch')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(v => v.uid.toLowerCase().includes(search));
    let html = '';
    filtered.forEach(v => {
        const price = v.finalPrice || v.price || 0;
        let packageLabel = price === 35000 ? '4X UPDATE' : price === 50000 ? '7X UPDATE' : price === 80000 ? '15X UPDATE' : price === 150000 ? '2 BULAN' : price === 250000 ? '4 BULAN' : 'PERMANENT';
        html += `<div class="vip-item ${v.status}"><div class="vip-header"><span class="vip-uid" onclick="copyUID('${v.uid}')">${v.uid}</span><span class="vip-package">${packageLabel}</span><span class="vip-price">Rp ${formatRupiah(price)}</span><span class="deposit-status status-${v.status}">${v.status}</span></div><div class="action-buttons">${v.status === 'pending' ? `<button class="btn-neon green" onclick="approveVIP('${v.uid}', '${v.id}', ${price}, '${packageLabel}')">Approve</button><button class="btn-neon red" onclick="rejectVIP('${v.uid}', '${v.id}', ${price})">Reject</button>` : ''}<button class="btn-neon" onclick="deleteVIP('${v.uid}', '${v.id}')">Delete</button></div></div>`;
    });
    document.getElementById('vipList') && (document.getElementById('vipList').innerHTML = html || '<div class="no-data">No VIP orders</div>');
}

function filterVIP(filter) {
    currentVIPFilter = filter;
    const tabs = document.querySelectorAll('#vip_orders .filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    displayVIPOrders();
}

function approveVIP(uid, id, price, packageLabel) {
    showConfirm('Approve VIP', `Approve VIP package for ${uid}?`, () => {
        showLoading();
        let vipData = { package: packageLabel, price, status: 'active', isPermanent: price === 350000, updateType: price <= 80000 ? 'quota' : 'unlimited', updateQuota: price === 35000 ? 4 : price === 50000 ? 7 : price === 80000 ? 15 : 0, updatesUsed: 0, packageMonths: price === 150000 ? 2 : price === 250000 ? 4 : 0, purchaseDate: new Date().toISOString() };
        if (price === 150000 || price === 250000) { const expiryDate = new Date(); expiryDate.setMonth(expiryDate.getMonth() + (price === 150000 ? 2 : 4)); vipData.expiryDate = expiryDate.toISOString(); }
        else if (price === 350000) { vipData.expiryDate = new Date(2099, 11, 31).toISOString(); }
        db.ref(`purchases/${uid}/${id}`).update({ status: 'approved', approved_at: Date.now() })
            .then(() => db.ref(`vip_members/${uid}`).set(vipData))
            .then(() => db.ref(`chats/${uid}`).push({ sender: 'system', text: `✅ *VIP APPROVED!*\n\nPackage: ${packageLabel}\nPrice: Rp ${formatRupiah(price)}`, timestamp: Date.now() }))
            .then(() => { hideLoading(); showToast('VIP approved!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function rejectVIP(uid, id, price) {
    showConfirm('Reject VIP', `Reject VIP for ${uid}? (Saldo will be returned)`, () => {
        showLoading();
        db.ref(`purchases/${uid}/${id}`).update({ status: 'rejected', rejected_at: Date.now() })
            .then(() => db.ref(`saldo/${uid}`).once('value'))
            .then(snap => { const current = snap.val()?.amount || 0; return db.ref(`saldo/${uid}`).set({ amount: current + price, last_updated: Date.now() }); })
            .then(() => db.ref(`chats/${uid}`).push({ sender: 'system', text: `❌ *VIP REJECTED*\n\nSaldo Rp ${formatRupiah(price)} has been returned.`, timestamp: Date.now() }))
            .then(() => { hideLoading(); showToast('VIP rejected!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function deleteVIP(uid, id) {
    showConfirm('Delete VIP', `Delete VIP order for ${uid}?`, () => {
        showLoading();
        db.ref(`purchases/${uid}/${id}`).remove()
            .then(() => { hideLoading(); showToast('VIP deleted!'); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== VIP HISTORY ====================
function loadVIPHistory() {
    let vips = [];
    Object.keys(allPurchases).forEach(uid => { Object.keys(allPurchases[uid]).forEach(id => { vips.push({ id, uid, ...allPurchases[uid][id] }); }); });
    vips.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    window.allVIPHistory = vips;
    displayVIPHistory();
}

function displayVIPHistory() {
    let filtered = window.allVIPHistory || [];
    if (currentVIPHistoryFilter !== 'all') filtered = filtered.filter(v => v.status === currentVIPHistoryFilter);
    const search = document.getElementById('vipHistorySearch')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(v => v.uid.toLowerCase().includes(search));
    let totalRevenue = 0;
    filtered.forEach(v => { if (v.status === 'approved') totalRevenue += v.finalPrice || v.price || 0; });
    document.getElementById('totalVIPRevenue') && (document.getElementById('totalVIPRevenue').innerHTML = 'Rp ' + formatRupiah(totalRevenue));
    let html = '';
    filtered.forEach(v => {
        const price = v.finalPrice || v.price || 0;
        html += `<div class="vip-item ${v.status}" style="margin-bottom: 10px;"><div class="vip-header"><span class="vip-uid" onclick="copyUID('${v.uid}')">${v.uid}</span><span class="deposit-status status-${v.status}">${v.status}</span></div><div style="display: grid; grid-template-columns: repeat(2,1fr); gap: 8px; font-size: 12px;"><div><span style="color:#aaa;">Price:</span> Rp ${formatRupiah(price)}</div><div><span style="color:#aaa;">Date:</span> ${v.timestamp ? new Date(v.timestamp).toLocaleDateString() : '-'}</div></div></div>`;
    });
    document.getElementById('vipHistoryList') && (document.getElementById('vipHistoryList').innerHTML = html || '<div class="no-data">No VIP history</div>');
}

function filterVIPHistory(filter) {
    currentVIPHistoryFilter = filter;
    const tabs = document.querySelectorAll('#vip_history .filter-tab');
    tabs.forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    displayVIPHistory();
}

// ==================== CUSTOMERS ====================
function loadCustomers() {
    const allUids = new Set([...Object.keys(allUsers), ...Object.keys(allDeposits), ...Object.keys(allPurchases)]);
    let customers = [];
    allUids.forEach(uid => {
        const user = allUsers[uid] || {};
        const banned = !!allBanned[uid];
        const isVip = !!(allVIPs[uid] && allVIPs[uid].status === 'active');
        const hasSession = !!(allSessions[uid] && allSessions[uid].sessionId);
        const saldo = allSaldo[uid]?.amount || 0;
        customers.push({ uid, status: banned ? 'banned' : (hasSession ? 'online' : 'offline'), banned, isVip, hasSession, saldo, registered: user.registeredAt || user.createdAt || '-', lastLogin: user.lastLogin || user.lastSeen || '-', pin: user.pin || '-' });
    });
    customers.sort((a, b) => (b.lastLogin !== '-' ? new Date(b.lastLogin) : 0) - (a.lastLogin !== '-' ? new Date(a.lastLogin) : 0));
    window.allCustomers = customers;
    displayCustomers();
}

function displayCustomers() {
    let filtered = window.allCustomers || [];
    const search = document.getElementById('customerSearch')?.value.toLowerCase() || '';
    if (search) filtered = filtered.filter(c => c.uid.toLowerCase().includes(search));
    let html = '';
    filtered.forEach(c => {
        const statusClass = c.banned ? 'banned' : (c.hasSession ? 'online' : 'offline');
        const statusText = c.banned ? 'BANNED' : (c.hasSession ? 'Online' : 'Offline');
        html += `<div class="customer-item"><div class="customer-header"><span class="customer-uid" onclick="copyUID('${c.uid}')">${c.uid}</span><div class="customer-badges"><span class="badge ${statusClass}">${statusText}</span>${c.isVip ? '<span class="badge vip">VIP</span>' : ''}</div></div><div class="customer-details"><div><span>Saldo:</span> <strong style="color:#00ff88;">Rp ${formatRupiah(c.saldo)}</strong></div><div><span>PIN:</span> <strong>${c.pin}</strong></div><div><span>Registered:</span> <strong>${c.registered !== '-' ? new Date(c.registered).toLocaleDateString() : '-'}</strong></div><div><span>Last Login:</span> <strong>${c.lastLogin !== '-' ? new Date(c.lastLogin).toLocaleString() : '-'}</strong></div></div><div class="action-buttons"><button class="btn-neon small" onclick="openSaldoModal('${c.uid}')">Add Saldo</button>${c.banned ? `<button class="btn-neon green small" onclick="unbanUser('${c.uid}')">Unban</button>` : `<button class="btn-neon red small" onclick="banUser('${c.uid}')">Ban</button>`}<button class="btn-neon small" onclick="forceLogout('${c.uid}')">Logout</button><button class="btn-neon red small" onclick="deleteCustomer('${c.uid}')">Delete</button></div></div>`;
    });
    document.getElementById('customerList') && (document.getElementById('customerList').innerHTML = html || '<div class="no-data">No customers found</div>');
}

function banUser(uid) {
    showConfirm('Ban User', `Ban user ${uid}?`, () => {
        showLoading();
        db.ref(`banned_users/${uid}`).set({ status: 'banned', reason: 'Violation', bannedAt: Date.now(), bannedBy: 'admin' })
            .then(() => db.ref(`users/${uid}/status`).set('banned'))
            .then(() => { hideLoading(); showToast(`User ${uid} banned!`); loadCustomers(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function unbanUser(uid) {
    showConfirm('Unban User', `Unban user ${uid}?`, () => {
        showLoading();
        db.ref(`banned_users/${uid}`).remove()
            .then(() => db.ref(`users/${uid}/status`).set('active'))
            .then(() => { hideLoading(); showToast(`User ${uid} unbanned!`); loadCustomers(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function forceLogout(uid) {
    showConfirm('Force Logout', `Force logout user ${uid}?`, () => {
        showLoading();
        db.ref(`sessions/${uid}`).remove()
            .then(() => db.ref(`users/${uid}/status`).set('offline'))
            .then(() => { hideLoading(); showToast(`User ${uid} logged out!`); loadCustomers(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function deleteCustomer(uid) {
    showConfirm('Delete Customer', `⚠️ PERMANENTLY DELETE ALL DATA for ${uid}?`, () => {
        showLoading();
        Promise.all([db.ref(`users/${uid}`).remove(), db.ref(`deposits/${uid}`).remove(), db.ref(`purchases/${uid}`).remove(), db.ref(`vip_members/${uid}`).remove(), db.ref(`banned_users/${uid}`).remove(), db.ref(`sessions/${uid}`).remove(), db.ref(`saldo/${uid}`).remove(), db.ref(`chats/${uid}`).remove()])
            .then(() => { hideLoading(); showToast(`User ${uid} deleted!`); loadAllData(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function openSaldoModal(uid) {
    const amount = prompt(`Enter amount to add to ${uid}:`, '10000');
    if (!amount || isNaN(amount) || parseInt(amount) <= 0) { showToast('Invalid amount!'); return; }
    showLoading();
    db.ref(`saldo/${uid}`).once('value').then(snap => {
        const current = snap.val()?.amount || 0;
        return db.ref(`saldo/${uid}`).set({ amount: current + parseInt(amount), last_updated: Date.now() });
    }).then(() => { hideLoading(); showToast(`Added Rp ${formatRupiah(amount)} to ${uid}`); loadCustomers(); }).catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

// ==================== VIP MEMBERS ====================
function loadVIPMembers() {
    let members = [];
    Object.keys(allVIPs).forEach(uid => { if (allVIPs[uid].status === 'active') members.push({ uid, ...allVIPs[uid] }); });
    members.sort((a, b) => (b.purchaseDate || 0) - (a.purchaseDate || 0));
    window.allVIPMembers = members;
    displayVIPMembers();
}

function displayVIPMembers() {
    let filtered = window.allVIPMembers || [];
    let html = '';
    filtered.forEach(m => {
        const isPermanent = m.isPermanent || m.price === 350000;
        const used = m.updatesUsed || 0;
        const total = m.updateQuota || 0;
        const progress = total > 0 ? (used / total) * 100 : 0;
        let statusText = 'Active';
        if (m.updateType === 'quota') { const remaining = total - used; if (used >= total) statusText = 'Habis'; else if (remaining <= 2) statusText = `Sisa ${remaining}`; }
        else if (m.expiryDate && !isPermanent) { const daysLeft = Math.ceil((new Date(m.expiryDate) - new Date()) / (1000*60*60*24)); if (daysLeft <= 0) statusText = 'Expired'; else if (daysLeft <= 7) statusText = `${daysLeft} hari`; }
        else if (isPermanent) statusText = 'PERMANENT';
        html += `<div class="vip-card ${isPermanent ? 'permanent' : ''}"><div class="vip-card-header"><span class="vip-card-uid" onclick="copyUID('${m.uid}')">${m.uid}</span>${isPermanent ? '<span class="vip-badge">PERMANENT</span>' : ''}</div><div class="vip-card-details"><div><span style="color:#aaa;">Paket:</span> ${m.package || 'VIP'}</div><div><span style="color:#aaa;">Update:</span> ${m.updateType === 'quota' ? `${used}/${total}` : '∞'}</div><div><span style="color:#aaa;">Status:</span> <span style="color:${statusText === 'PERMANENT' ? '#ffd700' : '#4caf50'}">${statusText}</span></div></div><div class="progress-bar"><div class="progress-fill" style="width: ${progress}%;"></div></div><div class="action-buttons"><button class="btn-neon red small" onclick="removeVIP('${m.uid}')">Remove VIP</button></div></div>`;
    });
    document.getElementById('vipMemberList') && (document.getElementById('vipMemberList').innerHTML = html || '<div class="no-data">No active VIP members</div>');
}

function removeVIP(uid) {
    showConfirm('Remove VIP', `Remove VIP status from ${uid}?`, () => {
        showLoading();
        db.ref(`vip_members/${uid}`).remove()
            .then(() => { hideLoading(); showToast(`VIP removed from ${uid}`); loadVIPMembers(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== FILE UPDATES ====================
function loadFileUpdates() {
    db.ref('global_updates').orderByChild('created_at').once('value', snap => {
        const updates = snap.val() || {};
        let html = '';
        const sorted = Object.keys(updates).sort((a, b) => (updates[b].created_at || 0) - (updates[a].created_at || 0));
        sorted.forEach(key => {
            const u = updates[key];
            html += `<div class="deposit-item" style="border-left-color: #ffd700;"><div class="deposit-header"><span><strong>${u.title || 'Update'}</strong> <span style="color:#ffd700;">${u.version || 'v1.0'}</span></span><button class="btn-neon red small" onclick="deleteFileUpdate('${key}')">Delete</button></div><div style="margin: 10px 0;">${u.description || ''}</div><div><a href="${u.link}" target="_blank" style="color:#00d4ff;">Download Link</a></div><div style="font-size: 11px; color:#aaa; margin-top: 10px;">Created: ${u.created_at ? new Date(u.created_at).toLocaleString() : '-'}</div></div>`;
        });
        document.getElementById('fileUpdatesList') && (document.getElementById('fileUpdatesList').innerHTML = html || '<div class="no-data">No file updates</div>');
    });
}

function openUpdateModal() { document.getElementById('updateModal') && document.getElementById('updateModal').classList.add('active'); }
function closeUpdateModal() { document.getElementById('updateModal') && document.getElementById('updateModal').classList.remove('active'); }

function createFileUpdate() {
    const title = document.getElementById('updateTitle')?.value.trim();
    const desc = document.getElementById('updateDescription')?.value.trim();
    const link = document.getElementById('updateLink')?.value.trim();
    const version = document.getElementById('updateVersion')?.value.trim();
    if (!title || !desc || !link) { showToast('Fill all fields!'); return; }
    showLoading();
    db.ref('global_updates').push({ title, description: desc, link, version, created_at: new Date().toISOString(), status: 'active', sent_by: 'admin' })
        .then(() => { hideLoading(); showToast('Update created!'); closeUpdateModal(); loadFileUpdates(); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

function deleteFileUpdate(updateId) {
    showConfirm('Delete Update', 'Delete this file update?', () => {
        showLoading();
        db.ref(`global_updates/${updateId}`).remove()
            .then(() => { hideLoading(); showToast('Update deleted!'); loadFileUpdates(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== DISCOUNTS ====================
function loadDiscounts() {
    let html = '';
    Object.keys(allDiscounts).forEach(code => {
        const d = allDiscounts[code];
        html += `<div class="discount-card"><div class="discount-header"><span class="discount-code">${code}</span><span class="discount-percent">${d.percentage}%</span></div><div class="action-buttons"><button class="btn-neon red small" onclick="deleteDiscount('${code}')">Delete</button></div></div>`;
    });
    document.getElementById('discountsList') && (document.getElementById('discountsList').innerHTML = html || '<div class="no-data">No discounts</div>');
}

function openDiscountModal() { document.getElementById('discountModal') && document.getElementById('discountModal').classList.add('active'); }
function closeDiscountModal() { document.getElementById('discountModal') && document.getElementById('discountModal').classList.remove('active'); }

function addDiscount() {
    const code = document.getElementById('discountCode')?.value.trim().toUpperCase();
    const percent = parseInt(document.getElementById('discountPercent')?.value);
    const min = parseInt(document.getElementById('discountMin')?.value) || 0;
    if (!code || !percent || percent < 1 || percent > 100) { showToast('Invalid input!'); return; }
    showLoading();
    db.ref(`discounts/${code}`).set({ code, percentage: percent, minPurchase: min, active: true, createdAt: new Date().toISOString(), createdBy: 'admin' })
        .then(() => { hideLoading(); showToast('Discount added!'); closeDiscountModal(); loadDiscounts(); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

function deleteDiscount(code) {
    showConfirm('Delete Discount', `Delete discount ${code}?`, () => {
        showLoading();
        db.ref(`discounts/${code}`).remove()
            .then(() => { hideLoading(); showToast('Discount deleted!'); loadDiscounts(); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== MAINTENANCE ====================
function checkMaintenance() {
    db.ref('maintenance').once('value').then(snap => {
        const m = snap.val();
        if (m && m.status === 'active') {
            document.getElementById('maintenancePage') && document.getElementById('maintenancePage').classList.add('active');
            document.getElementById('mainContainer') && (document.getElementById('mainContainer').style.display = 'none');
            document.getElementById('maintenanceTitle') && (document.getElementById('maintenanceTitle').innerHTML = m.title || 'MAINTENANCE MODE');
            document.getElementById('maintenanceMessage') && (document.getElementById('maintenanceMessage').innerHTML = m.message || 'System under maintenance.');
            if (m.endTime) { maintenanceEnd = new Date(m.endTime).getTime(); updateMaintenanceTimer(); if (maintenanceTimerInterval) clearInterval(maintenanceTimerInterval); maintenanceTimerInterval = setInterval(updateMaintenanceTimer, 1000); }
        } else { document.getElementById('maintenancePage') && document.getElementById('maintenancePage').classList.remove('active'); document.getElementById('mainContainer') && (document.getElementById('mainContainer').style.display = 'block'); }
    }).catch(error => console.error('Error checking maintenance:', error));
}

function updateMaintenanceTimer() {
    if (!maintenanceEnd) return;
    const diff = maintenanceEnd - Date.now();
    if (diff <= 0) { document.getElementById('maintenanceTimer') && (document.getElementById('maintenanceTimer').innerHTML = '00:00:00'); clearInterval(maintenanceTimerInterval); checkMaintenance(); return; }
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    document.getElementById('maintenanceTimer') && (document.getElementById('maintenanceTimer').innerHTML = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
}

function activateMaintenance() {
    const title = document.getElementById('maintenanceFormTitle')?.value.trim();
    const message = document.getElementById('maintenanceFormMessage')?.value.trim();
    const days = parseInt(document.getElementById('maintenanceDays')?.value) || 0;
    const hours = parseInt(document.getElementById('maintenanceHours')?.value) || 0;
    const minutes = parseInt(document.getElementById('maintenanceMinutes')?.value) || 0;
    if (!title || !message) { showToast('Fill title and message!'); return; }
    const totalMinutes = days * 1440 + hours * 60 + minutes;
    if (totalMinutes <= 0) { showToast('Duration must be > 0!'); return; }
    showLoading();
    db.ref('maintenance').set({ status: 'active', title, message, days, hours, minutes, startTime: new Date().toISOString(), endTime: new Date(Date.now() + totalMinutes * 60000).toISOString(), updatedBy: 'admin' })
        .then(() => { hideLoading(); showToast('Maintenance activated!'); checkMaintenance(); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

function deactivateMaintenance() {
    showConfirm('Deactivate Maintenance', 'Turn off maintenance mode?', () => {
        showLoading();
        db.ref('maintenance').set({ status: 'inactive', updatedAt: new Date().toISOString() })
            .then(() => { hideLoading(); showToast('Maintenance deactivated!'); document.getElementById('maintenancePage') && document.getElementById('maintenancePage').classList.remove('active'); document.getElementById('mainContainer') && (document.getElementById('mainContainer').style.display = 'block'); if (maintenanceTimerInterval) clearInterval(maintenanceTimerInterval); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

function hideMaintenance() {
    document.getElementById('maintenancePage') && document.getElementById('maintenancePage').classList.remove('active');
    document.getElementById('mainContainer') && (document.getElementById('mainContainer').style.display = 'block');
    if (maintenanceTimerInterval) clearInterval(maintenanceTimerInterval);
}

// ==================== APP UPDATE ====================
function sendAppUpdate() {
    const title = document.getElementById('appUpdateTitle')?.value.trim();
    const message = document.getElementById('appUpdateMessage')?.value.trim();
    const newVersion = document.getElementById('appUpdateNewVersion')?.value.trim();
    const oldVersion = document.getElementById('appUpdateOldVersion')?.value.trim();
    const link = document.getElementById('appUpdateLink')?.value.trim();
    if (!title || !message || !newVersion || !oldVersion || !link) { showToast('Fill all fields!'); return; }
    showLoading();
    db.ref('app_update').set({ active: true, title, message, newVersion, oldVersion, link, date: new Date().toISOString(), updatedBy: 'admin' })
        .then(() => { hideLoading(); showToast('App update sent!'); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

// ==================== NOTIFICATION ====================
function sendNotification() {
    const title = document.getElementById('notifTitle')?.value.trim();
    const message = document.getElementById('notifMessage')?.value.trim();
    if (!title || !message) { showToast('Fill all fields!'); return; }
    showLoading();
    db.ref('notifications/latest').set({ active: true, title, message, date: new Date().toISOString() })
        .then(() => { hideLoading(); showToast('Notification sent!'); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

// ==================== PRIVATE CHAT ====================
function loadChatUsers() {
    db.ref('users').once('value').then(snap => {
        const users = snap.val() || {};
        window.allChatUsersList = Object.keys(users);
    });
}

function openUserSelectionModal() {
    if (!window.allChatUsersList || window.allChatUsersList.length === 0) {
        loadChatUsers();
        setTimeout(() => openUserSelectionModal(), 1000);
        return;
    }
    const modal = document.getElementById('userSelectionModal');
    const listContainer = document.getElementById('userSelectionList');
    if (!modal || !listContainer) return;
    
    let html = '';
    window.allChatUsersList.forEach(uid => {
        const user = allUsers[uid] || {};
        const status = user.status === 'online' ? '🟢 Online' : '⚫ Offline';
        html += `<div class="user-list-item" onclick="selectChatUser('${uid}')"><div class="user-list-uid"><i class="fas fa-user"></i> ${uid}</div><div class="user-list-status">${status}</div></div>`;
    });
    listContainer.innerHTML = html || '<div class="no-data">No users found</div>';
    modal.classList.add('active');
    
    document.getElementById('userSearchInput').onkeyup = function() {
        const search = this.value.toLowerCase();
        const items = document.querySelectorAll('#userSelectionList .user-list-item');
        items.forEach(item => {
            const uid = item.querySelector('.user-list-uid')?.innerText.toLowerCase() || '';
            item.style.display = uid.includes(search) ? 'block' : 'none';
        });
    };
}

function closeUserSelectionModal() {
    document.getElementById('userSelectionModal') && document.getElementById('userSelectionModal').classList.remove('active');
}

function selectChatUser(uid) {
    closeUserSelectionModal();
    currentChatUser = uid;
    const input = document.getElementById('chatInput');
    const sendBtn = document.getElementById('chatSendBtn');
    if (input) input.disabled = false;
    if (sendBtn) sendBtn.disabled = false;
    if (chatListener) db.ref('chats/' + currentChatUser).off('value', chatListener);
    
    chatListener = db.ref('chats/' + currentChatUser).limitToLast(50).on('value', snap => {
        const messages = snap.val();
        const chatBox = document.getElementById('chatMessages');
        if (!chatBox) return;
        chatBox.innerHTML = '';
        if (messages) {
            Object.keys(messages).sort((a, b) => messages[a].timestamp - messages[b].timestamp).forEach(key => {
                const msg = messages[key];
                const div = document.createElement('div');
                div.className = `message ${msg.sender === 'customer' ? 'customer' : msg.sender === 'admin' ? 'admin' : 'system'}`;
                div.innerHTML = `<div class="message-sender">${msg.sender === 'customer' ? '👤 Customer' : msg.sender === 'admin' ? '👑 Admin' : '📢 System'}</div><div>${escapeHtml(msg.text || '')}</div><div class="message-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-'}</div>`;
                chatBox.appendChild(div);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        } else { chatBox.innerHTML = '<div class="no-data">No messages yet</div>'; }
    });
    showToast(`Chat with: ${uid}`);
}

function sendAdminMessage() {
    const input = document.getElementById('chatInput');
    const text = input?.value.trim();
    if (!text || !currentChatUser) return;
    db.ref('chats/' + currentChatUser).push({ sender: 'admin', text, timestamp: Date.now() }).then(() => { if (input) input.value = ''; });
}

// ==================== PUBLIC CHAT ====================
function loadPublicChat() {
    db.ref('all_comments').orderByChild('timestamp').limitToLast(100).on('value', snap => { publicMessages = snap.val() || {}; displayPublicChat(); });
}

function displayPublicChat() {
    const chatBox = document.getElementById('publicChatMessages');
    if (!chatBox) return;
    if (!publicMessages || Object.keys(publicMessages).length === 0) { chatBox.innerHTML = '<div class="no-data">No public messages</div>'; return; }
    let html = '';
    Object.keys(publicMessages).sort((a, b) => (publicMessages[a].timestamp || 0) - (publicMessages[b].timestamp || 0)).forEach(key => {
        const msg = publicMessages[key];
        const isAdmin = msg.uid === 'ADMIN';
        html += `<div class="message ${isAdmin ? 'admin' : 'customer'}" style="margin-bottom: 10px;"><div class="message-sender">${escapeHtml(msg.uid || 'Unknown')}</div><div>${escapeHtml(msg.text || '')}</div><div class="message-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '-'}</div></div>`;
    });
    chatBox.innerHTML = html;
    chatBox.scrollTop = chatBox.scrollHeight;
}

function sendPublicMessageAsAdmin() {
    const input = document.getElementById('publicChatInput');
    const text = input?.value.trim();
    if (!text) return;
    db.ref('all_comments').push({ uid: 'ADMIN', text, timestamp: Date.now() }).then(() => { if (input) input.value = ''; showToast('Message sent!'); });
}

// ==================== USER FILES ====================
function loadUserFiles() {
    let allFiles = [];
    db.ref('chats').once('value').then(snap => {
        const chats = snap.val() || {};
        Object.keys(chats).forEach(uid => {
            Object.keys(chats[uid]).forEach(msgId => {
                const msg = chats[uid][msgId];
                if (msg.fileData || msg.file) {
                    const fileData = msg.fileData || msg.file;
                    allFiles.push({ uid, url: fileData.url || fileData.cdnUrl, name: fileData.name || 'file', timestamp: msg.timestamp });
                }
            });
        });
        displayUserFiles(allFiles);
    });
}

function displayUserFiles(files) {
    let html = '';
    files.slice(0, 50).forEach(f => {
        html += `<div class="gallery-item"><div class="gallery-preview"><img src="${f.url}" onerror="this.src='https://placehold.co/200x150?text=File'" style="width:100%;height:100%;object-fit:cover;"></div><div class="gallery-info"><div class="gallery-uid" onclick="copyUID('${f.uid}')">${f.uid}</div><div class="gallery-filename">${f.name || 'file'}</div></div><button class="gallery-btn view" onclick="window.open('${f.url}')">View</button></div>`;
    });
    document.getElementById('fileGallery') && (document.getElementById('fileGallery').innerHTML = html || '<div class="no-data">No files found</div>');
}

// ==================== LEADERBOARD ====================
function loadLeaderboard() {
    const totals = {};
    Object.keys(allDeposits).forEach(uid => {
        let total = 0;
        Object.keys(allDeposits[uid]).forEach(id => { if (allDeposits[uid][id].status === 'approved') total += allDeposits[uid][id].jumlah || 0; });
        if (total > 0) totals[uid] = total;
    });
    const sorted = Object.keys(totals).map(uid => ({ uid, total: totals[uid] })).sort((a, b) => b.total - a.total).slice(0, 20);
    let totalAll = sorted.reduce((sum, item) => sum + item.total, 0);
    let html = '';
    sorted.forEach((item, i) => {
        const rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1 + '.');
        html += `<div class="leaderboard-item"><span class="leaderboard-rank">${rankIcon}</span><span class="leaderboard-uid" onclick="copyUID('${item.uid}')">${item.uid}</span><span class="leaderboard-amount">Rp ${formatRupiah(item.total)}</span></div>`;
    });
    document.getElementById('leaderboardList') && (document.getElementById('leaderboardList').innerHTML = html || '<div class="no-data">No data</div>');
    document.getElementById('leaderboardTotal') && (document.getElementById('leaderboardTotal').innerHTML = 'Rp ' + formatRupiah(totalAll));
}

// ==================== FREE UPDATE ====================
function loadFreeUpdateStats() {
    db.ref('free_updates/views').once('value').then(snap => {
        const views = snap.val() || {};
        const users = Object.keys(views).length;
        let totalViews = 0;
        Object.keys(views).forEach(uid => { totalViews += Object.keys(views[uid] || {}).length; });
        document.getElementById('freeStatsUsers') && (document.getElementById('freeStatsUsers').innerHTML = users);
        document.getElementById('freeStatsViews') && (document.getElementById('freeStatsViews').innerHTML = totalViews);
        document.getElementById('freeStatsAvg') && (document.getElementById('freeStatsAvg').innerHTML = users ? (totalViews / users).toFixed(1) : '0');
    });
}

function sendFreeUpdateToAll() {
    const title = document.getElementById('freeTitle')?.value.trim();
    const version = document.getElementById('freeVersion')?.value.trim();
    const desc = document.getElementById('freeDescription')?.value.trim();
    const link = document.getElementById('freeLink')?.value.trim();
    if (!title || !version || !link) { showToast('Fill required fields!'); return; }
    showLoading();
    const updateData = { title, version, description: desc, link, timestamp: Date.now(), active: true };
    db.ref('free_updates/latest').set(updateData).then(() => db.ref('free_updates/all').push(updateData))
        .then(() => { hideLoading(); showToast('Free update sent to all users!'); })
        .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
}

function deactivateFreeUpdate() {
    showConfirm('Deactivate Free Update', 'Deactivate current free update?', () => {
        showLoading();
        db.ref('free_updates/latest').update({ active: false, deactivatedAt: Date.now() })
            .then(() => { hideLoading(); showToast('Free update deactivated!'); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== PREMIUM VIDEOS ====================
function loadPremiumVideos() {
    db.ref('premium_videos_uploadcare').on('value', snap => {
        const videos = snap.val() || {};
        allPremiumVideos = [];
        Object.keys(videos).forEach(key => { allPremiumVideos.push({ id: key, ...videos[key] }); });
        displayPremiumVideos();
    });
}

function displayPremiumVideos() {
    let html = '';
    allPremiumVideos.forEach(v => {
        html += `<div class="video-card"><div class="video-preview"><video src="${v.videoUrl}" muted loop onmouseenter="this.play()" onmouseleave="this.pause();this.currentTime=0;"></video></div><div class="video-info"><div class="video-displayname">${v.displayName || v.fileName}</div><div class="video-filename">${v.fileName}</div></div><div class="video-actions"><button class="video-btn play" onclick="window.open('${v.videoUrl}')">Play</button><button class="video-btn delete" onclick="deleteVideo('${v.id}')">Delete</button></div></div>`;
    });
    document.getElementById('premiumVideoList') && (document.getElementById('premiumVideoList').innerHTML = html || '<div class="no-data">No videos</div>');
}

function deleteVideo(videoId) {
    showConfirm('Delete Video', 'Delete this video?', () => {
        showLoading();
        db.ref(`premium_videos_uploadcare/${videoId}`).remove()
            .then(() => { hideLoading(); showToast('Video deleted!'); })
            .catch(e => { hideLoading(); showToast('Error: ' + e.message); });
    });
}

// ==================== TAB NAVIGATION ====================
function openTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    
    if (tabId === 'dashboard') updateDashboard();
    else if (tabId === 'deposit_orders') loadDepositOrders();
    else if (tabId === 'vip_orders') loadVIPOrders();
    else if (tabId === 'deposit_history') loadDepositHistory();
    else if (tabId === 'vip_history') loadVIPHistory();
    else if (tabId === 'customers') loadCustomers();
    else if (tabId === 'vip_list') loadVIPMembers();
    else if (tabId === 'updates') loadFileUpdates();
    else if (tabId === 'discounts') loadDiscounts();
    else if (tabId === 'chat') loadChatUsers();
    else if (tabId === 'public_chat') loadPublicChat();
    else if (tabId === 'user_files') loadUserFiles();
    else if (tabId === 'leaderboard') loadLeaderboard();
    else if (tabId === 'free_update') loadFreeUpdateStats();
    else if (tabId === 'premium_videos') loadPremiumVideos();
}

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initChart();
    initAudioControl();
    loadAllData();
    checkMaintenance();
    loadChatUsers();
    
    document.getElementById('depositSearch')?.addEventListener('keyup', () => displayDeposits());
    document.getElementById('vipSearch')?.addEventListener('keyup', () => displayVIPOrders());
    document.getElementById('customerSearch')?.addEventListener('keyup', () => displayCustomers());
    document.getElementById('depositHistorySearch')?.addEventListener('keyup', () => displayDepositHistory());
    document.getElementById('vipHistorySearch')?.addEventListener('keyup', () => displayVIPHistory());
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabId = tab.getAttribute('data-tab') || tab.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
            if (tabId) openTab(tabId);
        });
    });
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.getAttribute('data-tab');
            if (tabId) openTab(tabId);
        });
    });
    
    setInterval(() => { db.ref('admin_status').set({ status: 'online', last_seen: Date.now(), name: 'Admin VIP Files' }); }, 30000);
    showDebug('🔥 VIP Files Admin Panel - ModsGame Edition Started!');
});

window.addEventListener('beforeunload', () => {
    if (maintenanceTimerInterval) clearInterval(maintenanceTimerInterval);
    db.ref('admin_status').update({ status: 'offline', last_seen: Date.now() });
});

// ==================== ADMIN REFERRAL LIVE MONITORING ====================

function loadAdminReferralLive() {
    database.ref('referral_logs').orderByChild('timestamp').limitToLast(100).on('value', (snapshot) => {
        const logs = snapshot.val() || {};
        const logsArray = Object.values(logs).sort((a, b) => b.timestamp - a.timestamp);
        displayAdminReferralLogs(logsArray);
        updateReferralStats(logsArray);
    });
}

function displayAdminReferralLogs(logs) {
    const container = document.getElementById('adminReferralContainer');
    if (!container) return;
    
    let html = '<div class="referral-logs-table"><table><thead><tr><th>Time</th><th>Referrer UID</th><th>New User UID</th><th>IP Address</th><th>Status</th><th>Bonus Given</th></tr></thead><tbody>';
    
    logs.slice(0, 50).forEach(log => {
        const statusClass = log.is_success ? 'status-success' : 'status-failed';
        const statusText = log.status === 'success' ? '✓ Success' : (log.status === 'self_referral' ? 'Self Referral' : (log.status === 'same_ip' ? 'Same IP' : (log.status === 'ip_already_used' ? 'IP Already Used' : (log.status === 'daily_limit_reached' ? 'Daily Limit' : 'Invalid'))));
        html += `<tr class="${log.is_success ? 'success-row' : 'failed-row'}"><td>${log.date || '-'}</td><td class="log-uid" onclick="copyUID('${log.referrer_uid}')">${escapeHtml(log.referrer_uid || '-')}</td><td class="log-uid" onclick="copyUID('${log.new_uid}')">${escapeHtml(log.new_uid || '-')}</td><td>${escapeHtml(log.ip_address || '-')}</td><td class="${statusClass}">${statusText}</td><td>${log.is_success ? 'Rp 2,000' : '-'}</td></tr>`;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function updateReferralStats(logs) {
    let totalBonusPaid = 0, successCount = 0, failedCount = 0;
    logs.forEach(log => { if (log.is_success) { successCount++; totalBonusPaid += 2000; } else { failedCount++; } });
    
    const statsHtml = `<div class="referral-stats-grid"><div class="stat-card"><div class="stat-value">${successCount}</div><div class="stat-label">Success Referrals</div></div><div class="stat-card"><div class="stat-value">${failedCount}</div><div class="stat-label">Failed Attempts</div></div><div class="stat-card"><div class="stat-value">Rp ${formatRupiah(totalBonusPaid)}</div><div class="stat-label">Total Bonus Paid</div></div></div>`;
    const statsContainer = document.getElementById('referralLiveStats');
    if (statsContainer) statsContainer.innerHTML = statsHtml;
}

// ==================== ADMIN DAILY LOGIN SETTING ====================

function loadDailyLoginSetting() {
    database.ref('daily_login_config').once('value', (snapshot) => {
        const config = snapshot.val();
        if (config) {
            if (document.getElementById('dailyRewards')) document.getElementById('dailyRewards').value = config.rewards.join(',');
            if (document.getElementById('streakRewards')) document.getElementById('streakRewards').value = JSON.stringify(config.streak_rewards || {});
            if (document.getElementById('dailyEnabled')) document.getElementById('dailyEnabled').checked = config.enabled !== false;
        }
    });
}

function saveDailyLoginSetting() {
    const rewardsStr = document.getElementById('dailyRewards')?.value;
    const streakRewardsStr = document.getElementById('streakRewards')?.value;
    const enabled = document.getElementById('dailyEnabled')?.checked;
    
    let rewards = [1000, 1000, 2000, 2000, 3000, 3000, 5000];
    let streakRewards = { 7: 10000, 14: 20000, 30: 50000 };
    
    if (rewardsStr) rewards = rewardsStr.split(',').map(v => parseInt(v.trim()));
    if (streakRewardsStr) { try { streakRewards = JSON.parse(streakRewardsStr); } catch(e) {} }
    
    database.ref('daily_login_config').set({ rewards: rewards, streak_rewards: streakRewards, enabled: enabled, updated_by: 'admin', updated_at: Date.now() }).then(() => { showToast('Daily login settings saved!'); }).catch(e => { showToast('Error: ' + e.message); });
}

// ==================== ADMIN LOGIN ACTIVITY ====================

function loadLoginLogs(filters = {}) {
    database.ref('login_logs').orderByChild('timestamp').limitToLast(200).on('value', (snapshot) => {
        const logs = snapshot.val() || {};
        let logsArray = Object.values(logs).sort((a, b) => b.timestamp - a.timestamp);
        if (filters.uid) logsArray = logsArray.filter(log => log.uid && log.uid.toLowerCase().includes(filters.uid.toLowerCase()));
        if (filters.date) logsArray = logsArray.filter(log => log.date && log.date.includes(filters.date));
        displayLoginLogs(logsArray);
    });
}

function displayLoginLogs(logs) {
    const container = document.getElementById('loginLogsContainer');
    if (!container) return;
    if (logs.length === 0) { container.innerHTML = '<div class="no-data">No login records found</div>'; return; }
    
    let html = '<div class="login-logs-table"><table><thead><tr><th>UID</th><th>IP Address</th><th>Location</th><th>Device/OS</th><th>Browser</th><th>Time</th><th>Status</th></tr></thead><tbody>';
    logs.forEach(log => {
        const statusClass = log.status === 'success' ? 'status-success' : 'status-failed';
        html += `<tr><td class="log-uid" onclick="copyUID('${log.uid}')">${escapeHtml(log.uid || '-')}</td><td>${escapeHtml(log.ip || '-')}</td><td>${escapeHtml(log.location || '-')}</td><td>${escapeHtml(log.device || '-')} / ${escapeHtml(log.os || '-')}</td><td>${escapeHtml(log.browser || '-')}</td><td>${log.date || '-'}</td><td class="${statusClass}">${log.status || '-'}</td></tr>`;
    });
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

function filterLoginLogs() {
    const uid = document.getElementById('loginLogUidFilter')?.value;
    const date = document.getElementById('loginLogDateFilter')?.value;
    loadLoginLogs({ uid, date });
}

// ==================== ADMIN TAB OPENER ====================

function openAdminTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (event && event.currentTarget) event.currentTarget.classList.add('active');
    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');
    if (tabId === 'referral_live') loadAdminReferralLive();
    else if (tabId === 'daily_setting') loadDailyLoginSetting();
    else if (tabId === 'login_activity') loadLoginLogs();
}