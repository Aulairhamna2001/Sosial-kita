// ============================================
// SOSIALKITA - APLIKASI UTAMA
// ============================================

// ----- State Aplikasi -----
const state = {
    user: null,
    userData: null,
    posts: [],
    lastPostDoc: null,
    hasMorePosts: true,
    loadingPosts: false,
    darkMode: localStorage.getItem('darkMode') === 'true',
    chatOpen: false,
    currentChatId: null,
    currentChatUser: null,
    chatListener: null,
    viewedProfileUser: null,
    postImageFile: null,
    postImageUrl: null,
    editAvatarFile: null,
    listeners: []
};

// ----- Referensi DOM -----
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ----- Inisialisasi -----
document.addEventListener('DOMContentLoaded', () => {
    // Terapkan dark mode jika sebelumnya aktif
    if (state.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        $('#darkModeToggle i').className = 'fa-solid fa-sun';
    }

    // Cek sesi login yang tersimpan
    auth.onAuthStateChanged(async (user) => {
        hideLoading();
        if (user) {
            state.user = user;
            await loadUserData(user.uid);
            showApp();
            initApp();
        } else {
            state.user = null;
            state.userData = null;
            showAuth();
        }
    });

    // Event listener umum
    setupAuthListeners();
    setupNavbarListeners();
    setupModalListeners();
    setupChatListeners();
    setupPostListeners();
    setupProfileListeners();
});

// ============================================
// LOADING & TOAST
// ============================================

function hideLoading() {
    const ls = $('#loadingScreen');
    if (ls) {
        ls.classList.add('fade-out');
        setTimeout(() => ls.classList.add('hidden'), 500);
    }
}

function showToast(message, type = 'info') {
    const container = $('#toastContainer');
    const icons = {
        success: 'fa-circle-check',
        error: 'fa-circle-xmark',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

function showBtnLoader(btn, show) {
    const text = btn.querySelector('.btn-text');
    const loader = btn.querySelector('.btn-loader');
    if (text) text.classList.toggle('hidden', show);
    if (loader) loader.classList.toggle('hidden', !show);
    btn.disabled = show;
}

// ============================================
// NAVIGASI HALAMAN
// ============================================

function showAuth() {
    $('#authPage').classList.remove('hidden');
    $('#appPage').classList.add('hidden');
}

function showApp() {
    $('#authPage').classList.add('hidden');
    $('#appPage').classList.remove('hidden');
    $('#appPage').classList.add('page-transition');
    updateNavbarInfo();
}

function switchTab(tabName) {
    // Sembunyikan semua tab
    $$('.tab-content').forEach(t => t.classList.add('hidden'));
    $$('.nav-item').forEach(n => n.classList.remove('active'));
    $$('.sidebar-link').forEach(n => n.classList.remove('active'));

    // Tampilkan tab yang dipilih
    const tab = $(`#tab-${tabName}`);
    if (tab) tab.classList.remove('hidden');

    // Aktifkan nav item
    $$(`.nav-item[data-tab="${tabName}"]`).forEach(n => n.classList.add('active'));
    $$(`.sidebar-link[data-tab="${tabName}"]`).forEach(n => n.classList.add('active'));

    // Load data spesifik tab
    if (tabName === 'home') loadPosts();
    if (tabName === 'friends') loadFriends();
}

// ============================================
// AUTHENTIKASI
// ============================================

function setupAuthListeners() {
    // Toggle form login/register
    $('#showRegister').addEventListener('click', (e) => {
        e.preventDefault();
        $('#loginForm').classList.add('hidden');
        $('#registerForm').classList.remove('hidden');
    });
    $('#showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        $('#registerForm').classList.add('hidden');
        $('#loginForm').classList.remove('hidden');
    });

    // Toggle password visibility
    $$('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const input = $(`#${btn.dataset.target}`);
            const icon = btn.querySelector('i');
            if (input.type === 'password') {
                input.type = 'text';
                icon.className = 'fa-solid fa-eye-slash';
            } else {
                input.type = 'password';
                icon.className = 'fa-solid fa-eye';
            }
        });
    });

    // Password strength indicator
    $('#regPassword').addEventListener('input', (e) => {
        const val = e.target.value;
        const bar = $('#strengthBar');
        bar.className = 'strength-bar';
        if (val.length === 0) return;
        if (val.length < 6) bar.classList.add('weak');
        else if (val.length < 10) bar.classList.add('medium');
        else bar.classList.add('strong');
    });

    // Login
    $('#loginBtn').addEventListener('click', handleLogin);
    $('#loginPassword').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    // Register
    $('#registerBtn').addEventListener('click', handleRegister);
    $('#regConfirm').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleRegister();
    });

    // Logout
    $('#logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        cleanupListeners();
        auth.signOut();
        showToast('Berhasil keluar', 'success');
    });
}

function clearFormErrors() {
    $$('.form-error').forEach(e => e.textContent = '');
    $$('.input-wrapper input').forEach(i => i.classList.remove('error'));
}

function setFormError(inputId, errorId, message) {
    const input = $(`#${inputId}`);
    const error = $(`#${errorId}`);
    if (input) input.classList.add('error');
    if (error) error.textContent = message;
}

async function handleLogin() {
    clearFormErrors();
    const email = $('#loginEmail').value.trim();
    const password = $('#loginPassword').value;
    let valid = true;

    if (!email) {
        setFormError('loginEmail', 'loginEmailError', 'Email wajib diisi');
        valid = false;
    } else if (!isValidEmail(email)) {
        setFormError('loginEmail', 'loginEmailError', 'Format email tidak valid');
        valid = false;
    }
    if (!password) {
        setFormError('loginPassword', 'loginPasswordError', 'Password wajib diisi');
        valid = false;
    }
    if (!valid) return;

    const btn = $('#loginBtn');
    showBtnLoader(btn, true);

    try {
        await auth.signInWithEmailAndPassword(email, password);
        showToast('Selamat datang kembali!', 'success');
        // Reset form
        $('#loginEmail').value = '';
        $('#loginPassword').value = '';
    } catch (err) {
        const messages = {
            'auth/user-not-found': 'Akun tidak ditemukan',
            'auth/wrong-password': 'Password salah',
            'auth/invalid-email': 'Format email tidak valid',
            'auth/invalid-credential': 'Email atau password salah',
            'auth/too-many-requests': 'Terlalu banyak percobaan. Coba lagi nanti'
        };
        showToast(messages[err.code] || 'Gagal masuk. Coba lagi.', 'error');
    } finally {
        showBtnLoader(btn, false);
    }
}

async function handleRegister() {
    clearFormErrors();
    const name = $('#regName').value.trim();
    const email = $('#regEmail').value.trim();
    const password = $('#regPassword').value;
    const confirm = $('#regConfirm').value;
    let valid = true;

    if (!name || name.length < 3) {
        setFormError('regName', 'regNameError', 'Nama minimal 3 karakter');
        valid = false;
    }
    if (!email) {
        setFormError('regEmail', 'regEmailError', 'Email wajib diisi');
        valid = false;
    } else if (!isValidEmail(email)) {
        setFormError('regEmail', 'regEmailError', 'Format email tidak valid');
        valid = false;
    }
    if (!password) {
        setFormError('regPassword', 'regPasswordError', 'Password wajib diisi');
        valid = false;
    } else if (password.length < 6) {
        setFormError('regPassword', 'regPasswordError', 'Password minimal 6 karakter');
        valid = false;
    }
    if (password !== confirm) {
        setFormError('regConfirm', 'regConfirmError', 'Password tidak cocok');
        valid = false;
    }
    if (!valid) return;

    const btn = $('#registerBtn');
    showBtnLoader(btn, true);

    try {
        // Buat akun auth
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        // Set nama tampilan
        await cred.user.updateProfile({ displayName: name });

        // Buat dokumen user di Firestore
        await db.collection('users').doc(cred.user.uid).set({
            displayName: name,
            email: email,
            photoURL: '',
            bio: '',
            coverPhoto: '',
            followers: [],
            following: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            online: true
        });

        showToast('Akun berhasil dibuat!', 'success');
        // Reset form
        $('#regName').value = '';
        $('#regEmail').value = '';
        $('#regPassword').value = '';
        $('#regConfirm').value = '';
        $('#strengthBar').className = 'strength-bar';
    } catch (err) {
        const messages = {
            'auth/email-already-in-use': 'Email sudah terdaftar',
            'auth/weak-password': 'Password terlalu lemah',
            'auth/invalid-email': 'Format email tidak valid'
        };
        showToast(messages[err.code] || 'Gagal mendaftar. Coba lagi.', 'error');
    } finally {
        showBtnLoader(btn, false);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ============================================
// USER DATA
// ============================================

async function loadUserData(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            state.userData = { id: doc.id, ...doc.data() };
            // Update status online
            db.collection('users').doc(uid).update({ online: true });
        } else {
            // Buat dokumen user jika belum ada
            const userData = {
                displayName: state.user.displayName || 'Pengguna',
                email: state.user.email,
                photoURL: state.user.photoURL || '',
                bio: '',
                coverPhoto: '',
                followers: [],
                following: [],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                online: true
            };
            await db.collection('users').doc(uid).set(userData);
            state.userData = { id: uid, ...userData };
        }
    } catch (err) {
        console.error('Gagal memuat data user:', err);
    }
}

function updateNavbarInfo() {
    if (!state.userData) return;
    const d = state.userData;
    const avatar = d.photoURL || generateAvatar(d.displayName);
    const name = d.displayName || 'User';

    $('#navAvatar').src = avatar;
    $('#navName').textContent = name;
    $('#sidebarAvatar').src = avatar;
    $('#sidebarName').textContent = name;
    $('#sidebarBio').textContent = d.bio || 'Belum ada bio';
    $('#createPostAvatar').src = avatar;
    $('#createPostName').textContent = name;
    $('#modalAvatar').src = avatar;
    $('#modalUserName').textContent = name;
    $('#editAvatar').src = avatar;
}

function generateAvatar(name) {
    const colors = ['#E41E3F','#F77F00','#FCBF49','#2A9D8F','#264653','#6A4C93','#1982C4','#8AC926'];
    const color = colors[name.charCodeAt(0) % colors.length];
    const initial = (name || 'U').charAt(0).toUpperCase();
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 100, 100);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 48px Plus Jakarta Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, 50, 52);
    return canvas.toDataURL();
}

function getUserAvatar(user) {
    if (!user) return generateAvatar('?');
    return user.photoURL || generateAvatar(user.displayName || '?');
}

// ============================================
// INISIALISASI APP
// ============================================

function initApp() {
    loadPosts();
    loadContacts();
    listenNotifications();
    setupInfiniteScroll();
}

function cleanupListeners() {
    state.listeners.forEach(unsub => unsub());
    state.listeners = [];
    if (state.chatListener) {
        state.chatListener();
        state.chatListener = null;
    }
    // Set offline saat logout
    if (state.user) {
        db.collection('users').doc(state.user.uid).update({ online: false }).catch(() => {});
    }
}

// ============================================
// NAVBAR LISTENERS
// ============================================

function setupNavbarListeners() {
    // Tab navigation
    $$('.nav-item[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
        });
    });
    $$('.sidebar-link[data-tab]').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(item.dataset.tab);
            // Tutup mobile menu jika terbuka
            if (window.innerWidth <= 900) {
                $('#sidebarLeft').style.display = '';
            }
        });
    });

    // Dark mode toggle
    $('#darkModeToggle').addEventListener('click', () => {
        state.darkMode = !state.darkMode;
        document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
        $('#darkModeToggle i').className = state.darkMode ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
        localStorage.setItem('darkMode', state.darkMode);
    });

    // Dropdown toggle
    $('#notifBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        $('#notifMenu').classList.toggle('hidden');
        $('#userMenu').classList.add('hidden');
    });
    $('#userBtn').addEventListener('click', (e) => {
        e.stopPropagation();
        $('#userMenu').classList.toggle('hidden');
        $('#notifMenu').classList.add('hidden');
    });

    // Tutup dropdown saat klik di luar
    document.addEventListener('click', () => {
        $('#notifMenu').classList.add('hidden');
        $('#userMenu').classList.add('hidden');
        $('#searchResults').classList.add('hidden');
    });
    $$('.dropdown').forEach(d => {
        d.addEventListener('click', (e) => e.stopPropagation());
    });

    // Mark all notifications read
    $('#markAllRead').addEventListener('click', markAllNotificationsRead);

    // Search
    $('#searchInput').addEventListener('input', debounce(handleSearch, 300));
    $('#searchInput').addEventListener('focus', () => {
        if ($('#searchInput').value.trim()) {
            $('#searchResults').classList.remove('hidden');
        }
    });

    // Sidebar shortcuts
    $('#sidebarChatBtn').addEventListener('click', (e) => {
        e.preventDefault();
        toggleChatSidebar();
    });
    $('#sidebarNotifBtn').addEventListener('click', (e) => {
        e.preventDefault();
        $('#notifMenu').classList.toggle('hidden');
    });

    // Mobile menu
    $('#mobileMenuToggle').addEventListener('click', () => {
        const sidebar = $('#sidebarLeft');
        if (sidebar.style.display === 'flex') {
            sidebar.style.display = '';
        } else {
            sidebar.style.display = 'flex';
            sidebar.style.position = 'fixed';
            sidebar.style.top = 'var(--navbar-h)';
            sidebar.style.left = '0';
            sidebar.style.bottom = '0';
            sidebar.style.zIndex = '900';
            sidebar.style.background = 'var(--bg-card)';
            sidebar.style.padding = '16px';
            sidebar.style.boxShadow = 'var(--shadow-xl)';
            sidebar.style.overflowY = 'auto';
        }
    });

    // Edit profile dari user menu
    $('#editProfileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        $('#userMenu').classList.add('hidden');
        openEditProfile();
    });

    // View profile dari user menu
    $('#viewProfileBtn').addEventListener('click', (e) => {
        e.preventDefault();
        $('#userMenu').classList.add('hidden');
        viewProfile(state.user.uid);
    });
}

// ============================================
// SEARCH
// ============================================

async function handleSearch() {
    const query = $('#searchInput').value.trim().toLowerCase();
    if (query.length < 2) {
        $('#searchResults').classList.add('hidden');
        return;
    }

    try {
        const snapshot = await db.collection('users')
            .orderBy('displayName')
            .startAt(query)
            .endAt(query + '\uf8ff')
            .limit(8)
            .get();

        const results = snapshot.docs.filter(doc => doc.id !== state.user.uid);

        if (results.length === 0) {
            $('#searchResults').innerHTML = '<p class="empty-state-sm">Tidak ditemukan</p>';
        } else {
            $('#searchResults').innerHTML = results.map(doc => {
                const u = doc.data();
                return `
                    <div class="search-result-item" data-uid="${doc.id}">
                        <img src="${getUserAvatar(u)}" alt="${u.displayName}">
                        <div>
                            <div class="result-name">${u.displayName}</div>
                            <div class="result-email">${u.email}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Klik hasil pencarian
            $$('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    viewProfile(item.dataset.uid);
                    $('#searchInput').value = '';
                    $('#searchResults').classList.add('hidden');
                });
            });
        }
        $('#searchResults').classList.remove('hidden');
    } catch (err) {
        console.error('Gagal mencari:', err);
    }
}

// ============================================
// POSTINGAN
// ============================================

function setupPostListeners() {
    // Trigger buat post
    $('#createPostTrigger').addEventListener('click', () => {
        state.postImageFile = null;
        state.postImageUrl = null;
        $('#postContentInput').value = '';
        $('#imagePreviewArea').classList.add('hidden');
        $('#createPostModal').classList.remove('hidden');
        setTimeout(() => $('#postContentInput').focus(), 100);
    });

    // Add image dari create post card
    $('#addImageBtn').addEventListener('click', () => {
        state.postImageFile = null;
        state.postImageUrl = null;
        $('#postContentInput').value = '';
        $('#imagePreviewArea').classList.add('hidden');
        $('#createPostModal').classList.remove('hidden');
        setTimeout(() => $('#postImageInput').click(), 100);
    });

    // Add image dari modal
    $('#modalAddImageBtn').addEventListener('click', () => $('#postImageInput').click());

    // File input change
    $('#postImageInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran file maksimal 5MB', 'error');
            return;
        }
        state.postImageFile = file;
        state.postImageUrl = URL.createObjectURL(file);
        $('#imagePreview').src = state.postImageUrl;
        $('#imagePreviewArea').classList.remove('hidden');
    });

    // Remove image preview
    $('#removeImageBtn').addEventListener('click', () => {
        state.postImageFile = null;
        state.postImageUrl = null;
        $('#imagePreviewArea').classList.add('hidden');
        $('#postImageInput').value = '';
    });

    // Submit post
    $('#submitPostBtn').addEventListener('click', handleSubmitPost);
}

async function handleSubmitPost() {
    const content = $('#postContentInput').value.trim();
    if (!content && !state.postImageFile) {
        showToast('Postingan tidak boleh kosong', 'warning');
        return;
    }

    const btn = $('#submitPostBtn');
    showBtnLoader(btn, true);

    try {
        let imageUrl = '';

        // Upload gambar jika ada
        if (state.postImageFile) {
            const ref = storage.ref(`posts/${state.user.uid}/${Date.now()}_${state.postImageFile.name}`);
            const snapshot = await ref.put(state.postImageFile);
            imageUrl = await snapshot.ref.getDownloadURL();
        }

        // Simpan postingan ke Firestore
        await db.collection('posts').add({
            userId: state.user.uid,
            content: content,
            imageUrl: imageUrl,
            likes: [],
            comments: [],
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        showToast('Postingan berhasil dibuat!', 'success');
        $('#createPostModal').classList.add('hidden');
        $('#postContentInput').value = '';
        $('#imagePreviewArea').classList.add('hidden');
        state.postImageFile = null;
        state.postImageUrl = null;
        $('#postImageInput').value = '';
    } catch (err) {
        console.error('Gagal membuat postingan:', err);
        showToast('Gagal membuat postingan', 'error');
    } finally {
        showBtnLoader(btn, false);
    }
}

async function loadPosts() {
    if (state.loadingPosts) return;
    state.loadingPosts = true;
    state.posts = [];
    state.lastPostDoc = null;
    state.hasMorePosts = true;
    $('#postsContainer').innerHTML = renderSkeletonPosts(3);
    $('#feedEnd').classList.add('hidden');

    try {
        let query = db.collection('posts')
            .orderBy('createdAt', 'desc')
            .limit(5);

        const snapshot = await query.get();

        if (snapshot.empty) {
            $('#postsContainer').innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <h3>Belum Ada Postingan</h3>
                    <p>Jadilah yang pertama membuat postingan!</p>
                </div>
            `;
            state.hasMorePosts = false;
            state.loadingPosts = false;
            return;
        }

        state.lastPostDoc = snapshot.docs[snapshot.docs.length - 1];
        const posts = await Promise.all(snapshot.docs.map(doc => enrichPost(doc)));
        state.posts = posts;
        $('#postsContainer').innerHTML = posts.map(renderPost).join('');
        setupPostInteractions();
    } catch (err) {
        console.error('Gagal memuat postingan:', err);
        showToast('Gagal memuat postingan', 'error');
    } finally {
        state.loadingPosts = false;
    }
}

async function loadMorePosts() {
    if (state.loadingPosts || !state.hasMorePosts || !state.lastPostDoc) return;
    state.loadingPosts = true;
    $('#feedLoader').classList.remove('hidden');

    try {
        const snapshot = await db.collection('posts')
            .orderBy('createdAt', 'desc')
            .startAfter(state.lastPostDoc)
            .limit(5)
            .get();

        if (snapshot.empty) {
            state.hasMorePosts = false;
            $('#feedEnd').classList.remove('hidden');
        } else {
            state.lastPostDoc = snapshot.docs[snapshot.docs.length - 1];
            const newPosts = await Promise.all(snapshot.docs.map(doc => enrichPost(doc)));
            state.posts.push(...newPosts);
            newPosts.forEach(post => {
                $('#postsContainer').insertAdjacentHTML('beforeend', renderPost(post));
            });
            setupPostInteractions();
        }
    } catch (err) {
        console.error('Gagal memuat lebih banyak postingan:', err);
    } finally {
        state.loadingPosts = false;
        $('#feedLoader').classList.add('hidden');
    }
}

async function enrichPost(doc) {
    const data = doc.data();
    let user = null;
    try {
        const userDoc = await db.collection('users').doc(data.userId).get();
        if (userDoc.exists) user = { id: userDoc.id, ...userDoc.data() };
    } catch (e) { /* user mungkin sudah dihapus */ }

    return {
        id: doc.id,
        ...data,
        user: user,
        isLiked: data.likes && data.likes.includes(state.user.uid),
        likeCount: data.likes ? data.likes.length : 0,
        commentCount: data.comments ? data.comments.length : 0
    };
}

function renderPost(post) {
    const avatar = post.user ? getUserAvatar(post.user) : generateAvatar('?');
    const name = post.user ? post.user.displayName : 'Pengguna';
    const time = post.createdAt ? timeAgo(post.createdAt.toDate()) : 'Baru saja';
    const isOwner = post.userId === state.user.uid;
    const showComments = (post.comments || []).slice(0, 2);
    const hiddenComments = (post.comments || []).slice(2);

    return `
        <article class="post-card" data-post-id="${post.id}">
            <div class="post-header">
                <img class="post-avatar" src="${avatar}" alt="${name}" data-uid="${post.userId}">
                <div class="post-header-info">
                    <a class="post-author" href="#" data-uid="${post.userId}">${name}</a>
                    <span class="post-time"><i class="fa-solid fa-earth-americas"></i> ${time}</span>
                </div>
                ${isOwner ? `
                    <button class="post-more-btn post-delete" data-post-id="${post.id}" title="Hapus">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                ` : ''}
            </div>
            ${post.content ? `<div class="post-content">${escapeHtml(post.content)}</div>` : ''}
            ${post.imageUrl ? `<img class="post-image" src="${post.imageUrl}" alt="Gambar postingan" data-full="${post.imageUrl}" loading="lazy">` : ''}
            <div class="post-stats">
                <span class="post-stats-left">
                    <i class="fa-solid fa-thumbs-up"></i> ${post.likeCount}
                </span>
                <span>${post.commentCount} komentar</span>
            </div>
            <div class="post-actions">
                <button class="post-action-btn like-btn ${post.isLiked ? 'liked' : ''}" data-post-id="${post.id}">
                    <i class="fa-${post.isLiked ? 'solid' : 'regular'} fa-thumbs-up"></i>
                    <span>Suka</span>
                </button>
                <button class="post-action-btn comment-toggle-btn" data-post-id="${post.id}">
                    <i class="fa-regular fa-comment"></i>
                    <span>Komentar</span>
                </button>
                <button class="post-action-btn share-btn" data-post-id="${post.id}">
                    <i class="fa-solid fa-share"></i>
                    <span>Bagikan</span>
                </button>
            </div>
            <div class="comments-section hidden" id="comments-${post.id}">
                ${hiddenComments.length > 0 ? `
                    <div class="view-more-comments" data-post-id="${post.id}" data-show-all="false">
                        Lihat semua ${post.commentCount} komentar
                    </div>
                ` : ''}
                ${showComments.map(c => renderComment(c)).join('')}
                <div class="hidden all-comments" id="all-comments-${post.id}">
                    ${hiddenComments.map(c => renderComment(c)).join('')}
                </div>
                <div class="comment-input-wrapper">
                    <img src="${getUserAvatar(state.userData)}" alt="Kamu">
                    <input type="text" class="comment-input" data-post-id="${post.id}" placeholder="Tulis komentar...">
                </div>
            </div>
        </article>
    `;
}

function renderComment(comment) {
    return `
        <div class="comment-item">
            <img class="comment-avatar" src="${generateAvatar(comment.userName || '?')}" alt="">
            <div class="comment-bubble">
                <span class="comment-name">${escapeHtml(comment.userName || 'Anonim')}</span>
                <div class="comment-text">${escapeHtml(comment.text)}</div>
            </div>
        </div>
    `;
}

function renderSkeletonPosts(count) {
    let html = '';
    for (let i = 0; i < count; i++) {
        html += `
            <div class="skeleton-post">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
                    <div class="skeleton skeleton-circle"></div>
                    <div style="flex:1">
                        <div class="skeleton skeleton-line" style="width:40%"></div>
                        <div class="skeleton skeleton-line" style="width:25%;height:10px"></div>
                    </div>
                </div>
                <div class="skeleton skeleton-line"></div>
                <div class="skeleton skeleton-line" style="width:80%"></div>
                <div class="skeleton skeleton-image"></div>
            </div>
        `;
    }
    return html;
}

function setupPostInteractions() {
    // Like buttons
    $$('.like-btn').forEach(btn => {
        btn.addEventListener('click', () => handleLike(btn.dataset.postId, btn));
    });

    // Comment toggle
    $$('.comment-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const section = $(`#comments-${btn.dataset.postId}`);
            section.classList.toggle('hidden');
            if (!section.classList.contains('hidden')) {
                section.querySelector('.comment-input').focus();
            }
        });
    });

    // View more comments
    $$('.view-more-comments').forEach(btn => {
        btn.addEventListener('click', () => {
            const postId = btn.dataset.postId;
            const allComments = $(`#all-comments-${postId}`);
            if (btn.dataset.showAll === 'false') {
                allComments.classList.remove('hidden');
                btn.textContent = 'Tutup komentar';
                btn.dataset.showAll = 'true';
            } else {
                allComments.classList.add('hidden');
                btn.textContent = `Lihat semua ${btn.closest('.comments-section').querySelectorAll('.comment-item').length} komentar`;
                btn.dataset.showAll = 'false';
            }
        });
    });

    // Comment submit
    $$('.comment-input').forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && input.value.trim()) {
                handleComment(input.dataset.postId, input.value.trim(), input);
            }
        });
    });

    // Delete post
    $$('.post-delete').forEach(btn => {
        btn.addEventListener('click', () => handleDeletePost(btn.dataset.postId));
    });

    // View post image full size
    $$('.post-image').forEach(img => {
        img.addEventListener('click', () => {
            $('#imageViewerImg').src = img.dataset.full;
            $('#imageViewerModal').classList.remove('hidden');
        });
    });

    // Click avatar/author to view profile
    $$('.post-avatar, .post-author').forEach(el => {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (el.dataset.uid) viewProfile(el.dataset.uid);
        });
    });

    // Share button
    $$('.share-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            showToast('Link postingan disalin ke clipboard!', 'success');
        });
    });
}

async function handleLike(postId, btn) {
    if (!state.user) return;
    const postRef = db.collection('posts').doc(postId);

    try {
        const doc = await postRef.get();
        if (!doc.exists) return;
        const data = doc.data();
        const likes = data.likes || [];
        const isLiked = likes.includes(state.user.uid);

        if (isLiked) {
            await postRef.update({ likes: firebase.firestore.FieldValue.arrayRemove(state.user.uid) });
            btn.classList.remove('liked');
            btn.querySelector('i').className = 'fa-regular fa-thumbs-up';
            // Update count di UI
            const stats = btn.closest('.post-card').querySelector('.post-stats-left');
            stats.innerHTML = `<i class="fa-solid fa-thumbs-up"></i> ${likes.length - 1}`;
        } else {
            await postRef.update({ likes: firebase.firestore.FieldValue.arrayUnion(state.user.uid) });
            btn.classList.add('liked');
            btn.querySelector('i').className = 'fa-solid fa-thumbs-up';
            const stats = btn.closest('.post-card').querySelector('.post-stats-left');
            stats.innerHTML = `<i class="fa-solid fa-thumbs-up"></i> ${likes.length + 1}`;

            // Buat notifikasi like
            if (data.userId !== state.user.uid) {
                createNotification(data.userId, 'like', postId);
            }
        }
    } catch (err) {
        console.error('Gagal like:', err);
    }
}

async function handleComment(postId, text, input) {
    if (!state.user) return;
    const comment = {
        userId: state.user.uid,
        userName: state.userData.displayName,
        text: text,
        createdAt: new Date().toISOString()
    };

    try {
        await db.collection('posts').doc(postId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(comment)
        });

        // Tambahkan komentar ke UI langsung
        const section = $(`#comments-${postId}`);
        const inputWrapper = section.querySelector('.comment-input-wrapper');
        const commentEl = document.createElement('div');
        commentEl.innerHTML = renderComment(comment);
        inputWrapper.before(commentEl.firstElementChild);

        input.value = '';

        // Update comment count
        const postCard = input.closest('.post-card');
        const countSpan = postCard.querySelector('.post-stats span:last-child');
        const currentCount = parseInt(countSpan.textContent) || 0;
        countSpan.textContent = `${currentCount + 1} komentar`;

        // Notifikasi
        const doc = await db.collection('posts').doc(postId).get();
        if (doc.exists && doc.data().userId !== state.user.uid) {
            createNotification(doc.data().userId, 'comment', postId);
        }
    } catch (err) {
        console.error('Gagal komentar:', err);
        showToast('Gagal mengirim komentar', 'error');
    }
}

async function handleDeletePost(postId) {
    if (!confirm('Hapus postingan ini?')) return;
    try {
        await db.collection('posts').doc(postId).delete();
        const card = document.querySelector(`.post-card[data-post-id="${postId}"]`);
        if (card) {
            card.style.transition = '0.3s ease';
            card.style.opacity = '0';
            card.style.transform = 'scale(0.95)';
            setTimeout(() => card.remove(), 300);
        }
        showToast('Postingan dihapus', 'success');
    } catch (err) {
        showToast('Gagal menghapus postingan', 'error');
    }
}

// ============================================
// INFINITE SCROLL
// ============================================

function setupInfiniteScroll() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && state.hasMorePosts && !state.loadingPosts) {
                loadMorePosts();
            }
        });
    }, { rootMargin: '200px' });

    const feedLoader = $('#feedLoader');
    if (feedLoader) observer.observe(feedLoader);
}

// ============================================
// PROFILE
// ============================================

function setupProfileListeners() {
    // Edit profile modal
    $('#editAvatarBtn').addEventListener('click', () => $('#avatarInput').click());
    $('#avatarInput').addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran file maksimal 5MB', 'error');
            return;
        }
        state.editAvatarFile = file;
        $('#editAvatar').src = URL.createObjectURL(file);
    });

    // Save profile
    $('#saveProfileBtn').addEventListener('click', handleSaveProfile);

    // Change avatar from profile page
    $('#changeAvatarBtn').addEventListener('click', () => {
        if (state.viewedProfileUser === state.user.uid) {
            openEditProfile();
        }
    });

    // Follow button
    $('#followProfileBtn').addEventListener('click', handleFollow);
}

function openEditProfile() {
    if (!state.userData) return;
    $('#editName').value = state.userData.displayName || '';
    $('#editBio').value = state.userData.bio || '';
    $('#editAvatar').src = getUserAvatar(state.userData);
    state.editAvatarFile = null;
    $('#editProfileModal').classList.remove('hidden');
}

async function handleSaveProfile() {
    const name = $('#editName').value.trim();
    const bio = $('#editBio').value.trim();

    if (!name) {
        showToast('Nama tidak boleh kosong', 'warning');
        return;
    }

    const btn = $('#saveProfileBtn');
    showBtnLoader(btn, true);

    try {
        let photoURL = state.userData.photoURL || '';

        // Upload avatar baru jika ada
        if (state.editAvatarFile) {
            const ref = storage.ref(`avatars/${state.user.uid}/${Date.now()}_${state.editAvatarFile.name}`);
            const snapshot = await ref.put(state.editAvatarFile);
            photoURL = await snapshot.ref.getDownloadURL();
        }

        // Update auth profile
        await state.user.updateProfile({ displayName: name, photoURL: photoURL });

        // Update Firestore
        await db.collection('users').doc(state.user.uid).update({
            displayName: name,
            bio: bio,
            photoURL: photoURL
        });

        // Update state
        state.userData.displayName = name;
        state.userData.bio = bio;
        state.userData.photoURL = photoURL;

        updateNavbarInfo();
        $('#editProfileModal').classList.add('hidden');
        showToast('Profil berhasil diperbarui!', 'success');
    } catch (err) {
        console.error('Gagal update profil:', err);
        showToast('Gagal memperbarui profil', 'error');
    } finally {
        showBtnLoader(btn, false);
    }
}

async function viewProfile(uid) {
    switchTab('profile');
    state.viewedProfileUser = uid;

    const isOwn = uid === state.user.uid;
    $('#followProfileBtn').classList.toggle('hidden', isOwn);
    $('#changeAvatarBtn').classList.toggle('hidden', !isOwn);
    $('#changeCoverBtn').classList.toggle('hidden', !isOwn);

    try {
        const doc = await db.collection('users').doc(uid).get();
        if (!doc.exists) {
            showToast('User tidak ditemukan', 'error');
            return;
        }
        const user = { id: doc.id, ...doc.data() };

        $('#profileAvatar').src = getUserAvatar(user);
        $('#profileName').textContent = user.displayName;
        $('#profileBio').textContent = user.bio || 'Belum ada bio';
        $('#profileFollowerCount').textContent = (user.followers || []).length;
        $('#profileFollowingCount').textContent = (user.following || []).length;

        // Cek status follow
        if (!isOwn) {
            const isFollowing = (user.followers || []).includes(state.user.uid);
            const followBtn = $('#followProfileBtn');
            followBtn.textContent = isFollowing ? 'Berhenti Ikuti' : 'Ikuti';
            followBtn.className = isFollowing ? 'btn btn-outline btn-sm' : 'btn btn-primary btn-sm';
        }

        // Load postingan user
        const postsSnapshot = await db.collection('posts')
            .where('userId', '==', uid)
            .orderBy('createdAt', 'desc')
            .limit(10)
            .get();

        const posts = await Promise.all(postsSnapshot.docs.map(d => enrichPost(d)));
        $('#profilePostCount').textContent = postsSnapshot.size;

        if (posts.length === 0) {
            $('#profilePosts').innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-pen-to-square"></i>
                    <h3>Belum Ada Postingan</h3>
                </div>
            `;
        } else {
            $('#profilePosts').innerHTML = posts.map(renderPost).join('');
            setupPostInteractions();
        }
    } catch (err) {
        console.error('Gagal memuat profil:', err);
        showToast('Gagal memuat profil', 'error');
    }
}

async function handleFollow() {
    if (!state.viewedProfileUser || state.viewedProfileUser === state.user.uid) return;
    const targetUid = state.viewedProfileUser;
    const myUid = state.user.uid;
    const btn = $('#followProfileBtn');
    const isFollowing = btn.textContent.trim() === 'Berhenti Ikuti';

    try {
        const targetRef = db.collection('users').doc(targetUid);
        const myRef = db.collection('users').doc(myUid);

        if (isFollowing) {
            // Unfollow
            await targetRef.update({ followers: firebase.firestore.FieldValue.arrayRemove(myUid) });
            await myRef.update({ following: firebase.firestore.FieldValue.arrayRemove(targetUid) });
            btn.textContent = 'Ikuti';
            btn.className = 'btn btn-primary btn-sm';
            showToast('Berhenti mengikuti', 'info');
        } else {
            // Follow
            await targetRef.update({ followers: firebase.firestore.FieldValue.arrayUnion(myUid) });
            await myRef.update({ following: firebase.firestore.FieldValue.arrayUnion(targetUid) });
            btn.textContent = 'Berhenti Ikuti';
            btn.className = 'btn btn-outline btn-sm';
            showToast('Berhasil mengikuti!', 'success');
            createNotification(targetUid, 'follow');
        }

        // Update follower count di UI
        const doc = await targetRef.get();
        if (doc.exists) {
            $('#profileFollowerCount').textContent = (doc.data().followers || []).length;
        }
    } catch (err) {
        console.error('Gagal follow:', err);
        showToast('Gagal mengikuti', 'error');
    }
}

// ============================================
// FRIENDS / FOLLOW SYSTEM
// ============================================

async function loadFriends() {
    // Load following list
    const following = state.userData.following || [];
    const friendsContainer = $('#friendsList');

    if (following.length === 0) {
        friendsContainer.innerHTML = '<p class="empty-state-sm">Belum mengikuti siapa pun</p>';
        return;
    }

    friendsContainer.innerHTML = '<div class="feed-loader"><i class="fa-solid fa-spinner fa-spin"></i> Memuat...</div>';

    try {
        const users = [];
        for (const uid of following.slice(0, 20)) {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) users.push({ id: doc.id, ...doc.data() });
        }

        friendsContainer.innerHTML = users.map(u => `
            <div class="friend-card" style="cursor:pointer" data-uid="${u.id}">
                <img src="${getUserAvatar(u)}" alt="${u.displayName}">
                <h4>${u.displayName}</h4>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation();viewProfile('${u.id}')">Lihat</button>
            </div>
        `).join('');

        friendsContainer.querySelectorAll('.friend-card').forEach(card => {
            card.addEventListener('click', () => viewProfile(card.dataset.uid));
        });
    } catch (err) {
        console.error('Gagal memuat teman:', err);
        friendsContainer.innerHTML = '<p class="empty-state-sm">Gagal memuat</p>';
    }
}

// Friend search
let friendSearchTimeout;
 $('#friendSearchInput').addEventListener('input', (e) => {
    clearTimeout(friendSearchTimeout);
    friendSearchTimeout = setTimeout(async () => {
        const query = e.target.value.trim().toLowerCase();
        const container = $('#friendSearchResults');
        if (query.length < 2) {
            container.innerHTML = '';
            return;
        }
        try {
            const snapshot = await db.collection('users')
                .orderBy('displayName')
                .startAt(query)
                .endAt(query + '\uf8ff')
                .limit(8)
                .get();

            const results = snapshot.docs.filter(d => d.id !== state.user.uid).map(d => {
                const u = d.data();
                const isFollowing = (state.userData.following || []).includes(d.id);
                return `
                    <div class="friend-card">
                        <img src="${getUserAvatar(u)}" alt="${u.displayName}">
                        <h4>${u.displayName}</h4>
                        <button class="btn ${isFollowing ? 'btn-outline' : 'btn-primary'} btn-sm" 
                                onclick="quickFollow('${d.id}', this)">
                            ${isFollowing ? 'Mengikuti' : 'Ikuti'}
                        </button>
                    </div>
                `;
            }).join('');
            container.innerHTML = results || '<p class="empty-state-sm">Tidak ditemukan</p>';
        } catch (err) {
            container.innerHTML = '<p class="empty-state-sm">Gagal mencari</p>';
        }
    }, 300);
});

// Quick follow dari halaman teman
window.quickFollow = async function(uid, btn) {
    const isFollowing = btn.textContent.trim() === 'Mengikuti';
    try {
        if (isFollowing) {
            await db.collection('users').doc(uid).update({ followers: firebase.firestore.FieldValue.arrayRemove(state.user.uid) });
            await db.collection('users').doc(state.user.uid).update({ following: firebase.firestore.FieldValue.arrayRemove(uid) });
            btn.textContent = 'Ikuti';
            btn.className = 'btn btn-primary btn-sm';
        } else {
            await db.collection('users').doc(uid).update({ followers: firebase.firestore.FieldValue.arrayUnion(state.user.uid) });
            await db.collection('users').doc(state.user.uid).update({ following: firebase.firestore.FieldValue.arrayUnion(uid) });
            btn.textContent = 'Mengikuti';
            btn.className = 'btn btn-outline btn-sm';
            createNotification(uid, 'follow');
        }
    } catch (err) {
        showToast('Gagal mengikuti', 'error');
    }
};

// ============================================
// CHAT
// ============================================

function setupChatListeners() {
    $('#chatToggle').addEventListener('click', toggleChatSidebar);
    $('#chatClose').addEventListener('click', () => {
        $('#chatSidebar').classList.add('hidden');
        state.chatOpen = false;
    });
    $('#chatWindowClose').addEventListener('click', closeChatWindow);

    $('#chatSendBtn').addEventListener('click', sendChatMessage);
    $('#chatMessageInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    // Chat image
    $('#chatAttachBtn').addEventListener('click', () => $('#chatImageInput').click());
    $('#chatImageInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) {
            showToast('Ukuran file maksimal 5MB', 'error');
            return;
        }
        if (!state.currentChatId) {
            showToast('Pilih percakapan terlebih dahulu', 'warning');
            return;
        }
        try {
            const ref = storage.ref(`chats/${state.currentChatId}/${Date.now()}_${file.name}`);
            const snapshot = await ref.put(file);
            const url = await snapshot.ref.getDownloadURL();
            await db.collection('chats').doc(state.currentChatId)
                .collection('messages').add({
                    senderId: state.user.uid,
                    imageUrl: url,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            // Update last message
            await db.collection('chats').doc(state.currentChatId).update({
                lastMessage: '📷 Foto',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        } catch (err) {
            showToast('Gagal mengirim gambar', 'error');
        }
        e.target.value = '';
    });
}

function toggleChatSidebar() {
    const sidebar = $('#chatSidebar');
    if (sidebar.classList.contains('hidden')) {
        sidebar.classList.remove('hidden');
        state.chatOpen = true;
        loadChatList();
    } else {
        sidebar.classList.add('hidden');
        state.chatOpen = false;
    }
}

async function loadChatList() {
    if (!state.user) return;
    const container = $('#chatList');

    try {
        // Ambil semua chat yang melibatkan user ini
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', state.user.uid)
            .orderBy('lastMessageAt', 'desc')
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<p class="empty-state-sm">Belum ada percakapan</p>';
            return;
        }

        container.innerHTML = '';
        for (const doc of snapshot.docs) {
            const chat = doc.data();
            const otherUid = chat.participants.find(p => p !== state.user.uid);
            let otherUser = null;
            try {
                const userDoc = await db.collection('users').doc(otherUid).get();
                if (userDoc.exists) otherUser = { id: userDoc.id, ...userDoc.data() };
            } catch (e) {}

            if (!otherUser) continue;

            const item = document.createElement('div');
            item.className = 'chat-list-item';
            item.dataset.chatId = doc.id;
            item.dataset.otherUid = otherUid;
            item.innerHTML = `
                <div class="contact-avatar-wrap">
                    <img src="${getUserAvatar(otherUser)}" alt="${otherUser.displayName}">
                    <span class="online-dot ${otherUser.online ? '' : 'offline'}"></span>
                </div>
                <div class="chat-item-info">
                    <div class="chat-item-name">${otherUser.displayName}</div>
                    <div class="chat-item-last">${chat.lastMessage || 'Mulai percakapan'}</div>
                </div>
            `;
            item.addEventListener('click', () => openChatWindow(doc.id, otherUser));
            container.appendChild(item);
        }
    } catch (err) {
        console.error('Gagal memuat chat:', err);
        container.innerHTML = '<p class="empty-state-sm">Gagal memuat</p>';
    }
}

async function openChatWindow(chatId, otherUser) {
    state.currentChatId = chatId;
    state.currentChatUser = otherUser;

    $('#chatWindowAvatar').src = getUserAvatar(otherUser);
    $('#chatWindowName').textContent = otherUser.displayName;
    $('#chatWindowStatus').textContent = otherUser.online ? 'Online' : 'Offline';
    $('#chatWindowStatus').className = `online-dot ${otherUser.online ? '' : 'offline'}`;
    $('#chatWindow').classList.remove('hidden');
    $('#chatMessages').innerHTML = '<div class="feed-loader"><i class="fa-solid fa-spinner fa-spin"></i> Memuat pesan...</div>';

    // Highlight active chat
    $$('.chat-list-item').forEach(i => i.classList.remove('active'));
    const activeItem = document.querySelector(`.chat-list-item[data-chat-id="${chatId}"]`);
    if (activeItem) activeItem.classList.add('active');

    // Detach listener sebelumnya
    if (state.chatListener) state.chatListener();

    // Listen pesan secara realtime
    state.chatListener = db.collection('chats').doc(chatId)
        .collection('messages')
        .orderBy('createdAt', 'asc')
        .onSnapshot((snapshot) => {
            const container = $('#chatMessages');
            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = '<p class="empty-state-sm" style="padding:20px">Belum ada pesan</p>';
                return;
            }
            snapshot.forEach(doc => {
                const msg = doc.data();
                const isSent = msg.senderId === state.user.uid;
                const time = msg.createdAt ? formatTime(msg.createdAt.toDate()) : '';
                const div = document.createElement('div');
                div.className = `chat-msg ${isSent ? 'sent' : 'received'}`;
                if (msg.imageUrl) {
                    div.innerHTML = `<img src="${msg.imageUrl}" alt="Gambar"><div class="msg-time">${time}</div>`;
                } else {
                    div.innerHTML = `${escapeHtml(msg.text || '')}<div class="msg-time">${time}</div>`;
                }
                container.appendChild(div);
            });
            // Scroll ke bawah
            container.scrollTop = container.scrollHeight;
        }, (err) => {
            console.error('Chat listener error:', err);
        });
}

function closeChatWindow() {
    $('#chatWindow').classList.add('hidden');
    if (state.chatListener) {
        state.chatListener();
        state.chatListener = null;
    }
    state.currentChatId = null;
    state.currentChatUser = null;
}

async function sendChatMessage() {
    const input = $('#chatMessageInput');
    const text = input.value.trim();
    if (!text || !state.currentChatId) return;

    try {
        await db.collection('chats').doc(state.currentChatId)
            .collection('messages').add({
                senderId: state.user.uid,
                text: text,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

        // Update last message di chat doc
        await db.collection('chats').doc(state.currentChatId).update({
            lastMessage: text.substring(0, 50),
            lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        input.value = '';
        input.focus();
    } catch (err) {
        console.error('Gagal kirim pesan:', err);
        showToast('Gagal mengirim pesan', 'error');
    }
}

// Mulai chat dari kontak atau profil
async function startChat(otherUid) {
    if (!state.user || otherUid === state.user.uid) return;

    // Cek apakah chat sudah ada
    try {
        const snapshot = await db.collection('chats')
            .where('participants', 'array-contains', state.user.uid)
            .get();

        let existingChatId = null;
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.participants.includes(otherUid)) {
                existingChatId = doc.id;
            }
        });

        let chatId;
        if (existingChatId) {
            chatId = existingChatId;
        } else {
            // Buat chat baru
            const chatRef = await db.collection('chats').add({
                participants: [state.user.uid, otherUid],
                lastMessage: '',
                lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            chatId = chatRef.id;
        }

        // Buka chat window
        const otherDoc = await db.collection('users').doc(otherUid).get();
        const otherUser = otherDoc.exists ? { id: otherDoc.id, ...otherDoc.data() } : null;
        if (otherUser) {
            // Pastikan chat sidebar terbuka
            if ($('#chatSidebar').classList.contains('hidden')) {
                toggleChatSidebar();
            }
            openChatWindow(chatId, otherUser);
        }
    } catch (err) {
        console.error('Gagal memulai chat:', err);
        showToast('Gagal memulai percakapan', 'error');
    }
}

// ============================================
// CONTACTS
// ============================================

async function loadContacts() {
    if (!state.userData) return;
    const following = state.userData.following || [];
    const container = $('#contactsList');

    if (following.length === 0) {
        container.innerHTML = '<p class="empty-state-sm">Belum ada kontak</p>';
        return;
    }

    try {
        const users = [];
        // Ambil maksimal 15 kontak
        for (const uid of following.slice(0, 15)) {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) users.push({ id: doc.id, ...doc.data() });
        }

        container.innerHTML = users.map(u => `
            <div class="contact-item" data-uid="${u.id}">
                <div class="contact-avatar-wrap">
                    <img src="${getUserAvatar(u)}" alt="${u.displayName}">
                    <span class="online-dot ${u.online ? '' : 'offline'}"></span>
                </div>
                <span>${u.displayName}</span>
            </div>
        `).join('');

        container.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => startChat(item.dataset.uid));
        });
    } catch (err) {
        console.error('Gagal memuat kontak:', err);
    }
}

// ============================================
// NOTIFIKASI
// ============================================

function createNotification(toUserId, type, postId = null) {
    if (toUserId === state.user.uid) return;
    db.collection('notifications').add({
        toUserId: toUserId,
        fromUserId: state.user.uid,
        fromUserName: state.userData.displayName,
        type: type,
        postId: postId,
        read: false,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.error('Gagal buat notifikasi:', err));
}

function listenNotifications() {
    if (!state.user) return;

    const unsub = db.collection('notifications')
        .where('toUserId', '==', state.user.uid)
        .orderBy('createdAt', 'desc')
        .limit(20)
        .onSnapshot((snapshot) => {
            const notifs = [];
            snapshot.forEach(doc => notifs.push({ id: doc.id, ...doc.data() }));

            // Hitung unread
            const unreadCount = notifs.filter(n => !n.read).length;
            const badge = $('#notifBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            // Render notif list
            const container = $('#notifList');
            if (notifs.length === 0) {
                container.innerHTML = '<p class="empty-state-sm">Belum ada notifikasi</p>';
                return;
            }

            container.innerHTML = notifs.map(n => {
                let text = '';
                if (n.type === 'like') text = `<strong>${n.fromUserName}</strong> menyukai postinganmu`;
                else if (n.type === 'comment') text = `<strong>${n.fromUserName}</strong> mengomentari postinganmu`;
                else if (n.type === 'follow') text = `<strong>${n.fromUserName}</strong> mulai mengikutimu`;

                const time = n.createdAt ? timeAgo(n.createdAt.toDate()) : 'Baru saja';

                return `
                    <div class="notif-item ${n.read ? '' : 'unread'}" data-notif-id="${n.id}" ${n.postId ? `data-post-id="${n.postId}"` : ''}>
                        <img src="${generateAvatar(n.fromUserName || '?')}" alt="">
                        <div>
                            <div class="notif-text">${text}</div>
                            <div class="notif-time">${time}</div>
                        </div>
                    </div>
                `;
            }).join('');

            // Klik notifikasi
            container.querySelectorAll('.notif-item').forEach(item => {
                item.addEventListener('click', () => {
                    // Tandai dibaca
                    db.collection('notifications').doc(item.dataset.notifId).update({ read: true });
                    item.classList.remove('unread');

                    // Navigasi
                    if (item.dataset.postId) {
                        switchTab('home');
                    } else if (n => n.type === 'follow') {
                        // Tidak ada aksi spesifik
                    }
                    $('#notifMenu').classList.add('hidden');
                });
            });
        }, (err) => console.error('Notif listener error:', err));

    state.listeners.push(unsub);
}

function markAllNotificationsRead() {
    if (!state.user) return;
    db.collection('notifications')
        .where('toUserId', '==', state.user.uid)
        .where('read', '==', false)
        .get()
        .then(snapshot => {
            const batch = db.batch();
            snapshot.forEach(doc => batch.update(doc.ref, { read: true }));
            return batch.commit();
        })
        .then(() => {
            showToast('Semua notifikasi ditandai dibaca', 'success');
        })
        .catch(err => console.error('Gagal mark all read:', err));
}

// ============================================
// MODAL LISTENERS
// ============================================

function setupModalListeners() {
    // Close buttons
    $$('.modal-close').forEach(btn => {
        btn.addEventListener('click', () => {
            const modalId = btn.dataset.close;
            if (modalId) $(`#${modalId}`).classList.add('hidden');
        });
    });

    // Close on overlay click
    $$('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.classList.add('hidden');
        });
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            $$('.modal-overlay:not(.hidden)').forEach(m => m.classList.add('hidden'));
            closeChatWindow();
        }
    });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Baru saja';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} menit lalu`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} jam lalu`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} hari lalu`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks} minggu lalu`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(date) {
    return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(fn, delay) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

// ----- Set offline saat menutup tab -----
window.addEventListener('beforeunload', () => {
    if (state.user) {
        // Gunakan sendBeacon untuk keandalan saat page unload
        const data = JSON.stringify({ online: false });
        navigator.sendBeacon(
            `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents/users/${state.user.uid}?updateMask.fieldPaths=online`,
            new Blob([data], { type: 'application/json' })
        );
        // Fallback: juga coba update langsung
        db.collection('users').doc(state.user.uid).update({ online: false });
    }
});
