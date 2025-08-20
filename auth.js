// auth.js

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 2. FIREBASE CONFIG & INIT (Ganti dengan konfigurasimu!)
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

// 3. DOM ELEMENTS
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginError = document.getElementById('login-error');
const registerError = document.getElementById('register-error');
const showRegisterLink = document.getElementById('show-register-link');
const showLoginLink = document.getElementById('show-login-link');
const authSwitcher = document.getElementById('auth-switcher');
const authSwitcherLogin = document.getElementById('auth-switcher-login');

// 4. AUTH STATE CHECKER
// Jika pengguna sudah login, langsung arahkan ke dashboard.
onAuthStateChanged(auth, (user) => {
    if (user) {
        window.location.href = 'dashboard.html';
    }
});

// 5. EVENT LISTENERS
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.textContent = '';
    const email = loginForm.querySelector('#login-email').value;
    const password = loginForm.querySelector('#login-password').value;
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged akan menangani navigasi
    } catch (error) {
        loginError.textContent = "Gagal masuk: Email atau password salah.";
    }
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerError.textContent = '';
    const email = registerForm.querySelector('#register-email').value;
    const password = registerForm.querySelector('#register-password').value;
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Buat dokumen pengguna baru di Firestore
        const userDocRef = doc(db, "users", user.uid);
        await setDoc(userDocRef, {
            displayName: user.email.split('@')[0], // Nama default dari email
            email: user.email,
            createdAt: serverTimestamp()
        });
        // onAuthStateChanged akan menangani navigasi
    } catch (error) {
        registerError.textContent = "Gagal mendaftar: " + error.message;
    }
});

// Logika untuk beralih antara form login dan register
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