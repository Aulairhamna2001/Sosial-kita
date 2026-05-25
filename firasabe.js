// ============================================
// KONFIGURASI FIREBASE
// GANTI SEMUA VALUE DI BAWAH DENGAN DATA FIREBASE KAMU
// Cara mendapatkannya: Firebase Console → Project Settings → Your apps → Web app
// ============================================

const firebaseConfig = {
   # Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Inisialisasi di folder proyek
firebase init hosting
# Pilih proyek sosialkita-app
# Public directory: . (titik)
# Single-page app: Yes
# Overwrite index.html: No

# Deploy
firebase deploy// Inisialisasi Firebase
firebase.initializeApp(firebaseConfig);

// Siapkan layanan yang dibutuhkan
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Aktifkan persistence agar sesi login tetap tersimpan
// LOCAL = data tersimpan meskipun browser ditutup
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
    .then(() => {
        console.log("Persistence diaktifkan");
    })
    .catch((err) => {
        console.error("Gagal mengaktifkan persistence:", err);
    });

// Setting timestamp Firestore
db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
});

// Enable offline persistence untuk Firestore
db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code === 'failed-precondition') {
            console.warn("Persistence gagal: multiple tab terbuka");
        } else if (err.code === 'unimplemented') {
            console.warn("Browser tidak mendukung persistence");
        }
    });
   
