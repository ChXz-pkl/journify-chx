// auth.js
// Deskripsi: File ini menangani semua logika autentikasi pengguna,
// termasuk pendaftaran, login, dan pengalihan halaman.

// 1. IMPORTS DARI FIREBASE SDK
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. KONFIGURASI & INISIALISASI FIREBASE
// NOTE: Ganti dengan konfigurasi Firebase proyek Anda.
const firebaseConfig = {
    apiKey: "AIzaSyAd-Ln8l9WyOqaGEwipvXSFkimjFR6RjI8",
    authDomain: "journify-chx.firebaseapp.com",
    projectId: "journify-chx",
    storageBucket: "journify-chx.firebasestorage.app",
    messagingSenderId: "527828409650",
    appId: "1:527828409650:web:1a1e659850f4c4a412cb2b",
    measurementId: "G-9EB83J1XN7"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 3. SELEKSI ELEMEN DOM
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const authSwitcher = document.getElementById('auth-switcher');
const authSwitcherLogin = document.getElementById('auth-switcher-login');

// 4. LOGIKA UTAMA
/**
 * FITUR: Pengecekan Status Autentikasi
 * Deskripsi: Listener ini memantau status login pengguna. Jika pengguna terdeteksi
 * sudah login, ia akan otomatis dialihkan ke halaman dashboard.
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'dashboard.html';
    }
});

/**
 * FITUR: Penanganan Login Pengguna
 * Deskripsi: Menerima input email dan password dari form login, lalu mencoba
 * untuk masuk menggunakan Firebase Auth.
 */
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // Navigasi akan ditangani oleh onAuthStateChanged
    } catch (error) {
        loginError.textContent = "Email atau password salah. Silakan coba lagi.";
    }
});

/**
 * FITUR: Penanganan Registrasi Pengguna Baru
 * Deskripsi: Mendaftarkan pengguna baru dan membuat dokumen profil
 * untuk mereka di Firestore.
 */
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // --- BAGIAN KRUSIAL ADA DI SINI ---
        // Pastikan kode ini berjalan tanpa error
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            displayName: user.email.split('@')[0],
            email: user.email,
            createdAt: serverTimestamp(),
            isNewUser: true // Ini yang memicu onboarding
        });
        // Navigasi akan ditangani oleh onAuthStateChanged
    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            registerError.textContent = "Email ini sudah terdaftar. Silakan login.";
        } else {
            registerError.textContent = "Gagal mendaftar. Pastikan password minimal 6 karakter.";
        }
    }
});

/**
 * FITUR: Pengalih Form
 * Deskripsi: Mengatur logika untuk menampilkan form login atau register
 * berdasarkan interaksi pengguna.
 */
showRegisterLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    authSwitcher.classList.add('hidden');
    authSwitcherLogin.classList.remove('hidden');
});

showLoginLink.addEventListener('click', (e) => {
    e.preventDefault();
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    authSwitcher.classList.remove('hidden');
    authSwitcherLogin.classList.add('hidden');
});