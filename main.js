// main.js
// --- START: Pendaftaran Service Worker untuk PWA ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(registration => {
                console.log('ServiceWorker berhasil didaftarkan: ', registration.scope);
            })
            .catch(error => {
                console.log('Pendaftaran ServiceWorker gagal: ', error);
            });
    });
}
// 1. IMPORTS
import db from './db.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { startOnboardingTour } from './onboarding.js'; // <-- IMPOR FUNGSI TUR BARU
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, getDoc, setDoc, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
if (window.dayjs_plugin_isSameOrAfter) {
  dayjs.extend(window.dayjs_plugin_isSameOrAfter);
}
if (window.dayjs_plugin_weekOfYear) {
  dayjs.extend(window.dayjs_plugin_weekOfYear);
}
if (window.dayjs_plugin_isSameOrBefore) {
  dayjs.extend(window.dayjs_plugin_isSameOrBefore);
}

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
const firestore = getFirestore(app);

// 3. DOM ELEMENTS & GLOBAL VARS
let currentUserId = null;
let activeActivityEntry = null;
let activityTimerInterval = null;
let unsubscribeEntriesListener = null;
let allEntries = [];
let userHasSetMood = false;
let ideasDuringActivity = [];
let currentlyDisplayedDate = dayjs();
let activityChartInstance, moodChartInstance, summaryChartInstance, durationChartInstance;
let currentMoodChartPeriod = 'day';
let currentDurationChartPeriod = 'week';
let allIdeas = [];
let unsubscribeIdeasListener = null;
let allTimelineEntries = [];
let unsubscribeAllEntriesListener = null;
// Element Selectors
const timelineList = document.getElementById('timeline-list');
const timelineSearchInput = document.getElementById('timeline-search');
const inputTabs = document.querySelectorAll('.input-tab-btn');
const inputFormsContainer = document.querySelector('.input-forms-container');
const logoutBtn = document.getElementById('logout-btn');
const userDisplay = document.getElementById('user-display');
const themeToggleBtn = document.getElementById('theme-toggle');
const moodSlider = document.getElementById('mood-slider');
const recordMoodBtn = document.getElementById('record-mood-btn');
const activityNameInput = document.getElementById('activity-name');
const activityCategorySelect = document.getElementById('activity-category');
const startActivityBtn = document.getElementById('start-activity-btn');
const ideaTitleInput = document.getElementById('idea-title');
const ideaDeadlineInput = document.getElementById('idea-deadline');
const recordIdeaBtn = document.getElementById('record-idea-btn');
const showIdeaBoardBtn = document.getElementById('show-idea-board-btn');
const ideaBoardContainer = document.getElementById('idea-board-container');
const backToTimelineBtn = document.getElementById('back-to-timeline-btn');
const summaryCard = document.querySelector('.summary-card');
const timelineContainer = document.querySelector('.timeline-container');
const ideaDetailsModal = document.getElementById('idea-details-modal');
const closeIdeaModalBtn = document.getElementById('close-idea-modal');
const ideaModalTitle = document.getElementById('idea-modal-title');
const ideaModalDetails = document.getElementById('idea-modal-details');
const moodChangeContent = document.getElementById('mood-change-content');
const topActivityContent = document.getElementById('top-activity-content');
const ideaMoodContent = document.getElementById('idea-mood-content');
const activityChartCanvas = document.getElementById('activity-chart');
const moodChartCanvas = document.getElementById('mood-chart');
const detailsContent = document.getElementById('detailsContent');
// --- FUNGSI BARU UNTUK SINKRONISASI ---
/**
 * FITUR: Sinkronisasi Data Offline ke Firestore
 * Deskripsi: Membaca semua operasi yang tersimpan di IndexedDB,
 * mengirimkannya ke Firestore, lalu menghapusnya dari IndexedDB.
 */
async function syncPendingOperations() {
    const pending = await db.pendingOperations.orderBy('timestamp').toArray();
    if (pending.length === 0) {
        console.log("Tidak ada operasi offline yang perlu disinkronkan.");
        return;
    }

    console.log(`Memulai sinkronisasi untuk ${pending.length} operasi...`);
    for (const op of pending) {
        try {
            if (op.action === 'add') {
                await addDoc(collection(firestore, "entries"), op.payload);
            } else if (op.action === 'update') {
                await updateDoc(doc(firestore, "entries", op.docId), op.payload);
            } else if (op.action === 'delete') {
                await deleteDoc(doc(firestore, "entries", op.docId));
            }
            await db.pendingOperations.delete(op.id);
            console.log(`Operasi #${op.id} (${op.action}) berhasil disinkronkan.`);
        } catch (error) {
            console.error(`Gagal sinkronisasi operasi #${op.id}:`, error);
        }
    }
}

// 4. CORE APP INITIALIZATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        userDisplay.textContent = user.displayName || user.email;
        listenForEntriesForDate(currentlyDisplayedDate);
        checkAndStartOnboarding(user.uid);
        checkAndGenerateWeeklyReport(user.uid, user.displayName, user.email);
        listenForAllTimelineEntries(); // <-- Listener baru untuk data grafik
        listenForAllIdeas();
        syncPendingOperations();
        initializeEditor();
        displayGreeting();
        setupEventListeners();
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    } else {
        window.location.href = 'auth.html';
    }
});
window.addEventListener('online', syncPendingOperations);

// main.js

// ... (kode lainnya tetap sama)

// main.js

// ... (kode lainnya tetap sama)

// main.js

// ... (kode lainnya tetap sama)

/**
 * FITUR: Laporan Mingguan Otomatis (VERSI FINAL - MENGGUNAKAN NOMOR MINGGU)
 * Deskripsi: Mencegah pengiriman berulang dengan menyimpan dan membandingkan
 * nomor minggu dan tahun, metode yang lebih kuat dari timestamp.
 * @param {string} userId - UID pengguna
 * @param {string} userName - Nama tampilan pengguna
 * @param {string} userEmail - Email pengguna
 */
async function checkAndGenerateWeeklyReport(userId, userName, userEmail) {
    emailjs.init({ publicKey: "JVX0laVNU6aCMLCIV" });

    const userDocRef = doc(firestore, "users", userId);
    try {
        const userDoc = await getDoc(userDocRef);

        const mingguIni = dayjs().week();
        const tahunIni = dayjs().year();

        let harusKirimLaporan = true;

        if (userDoc.exists()) {
            const userData = userDoc.data();
            const mingguLaporanTersimpan = userData.mingguLaporan;
            const tahunLaporanTersimpan = userData.tahunLaporan;

            if (mingguLaporanTersimpan === mingguIni && tahunLaporanTersimpan === tahunIni) {
                harusKirimLaporan = false;
            }
        }

        if (harusKirimLaporan) {
            console.log(`Laporan untuk minggu #${mingguIni} (${tahunIni}) sedang dibuat untuk pengguna:`, userId);

            const oneWeekAgo = dayjs().subtract(7, 'days').toDate();

            // --- BAGIAN YANG HILANG & PERLU DIPERBAIKI ADA DI SINI ---
            const entriesQuery = query(
                collection(firestore, "entries"),
                where("userId", "==", userId),
                where("timestamp", ">=", oneWeekAgo),
                orderBy("timestamp", "desc")
            );
            // --- AKHIR PERBAIKAN ---

            const querySnapshot = await getDocs(entriesQuery);
            const entries = querySnapshot.docs.map(doc => doc.data());

            if (entries.length === 0) {
                console.log("Tidak ada entri baru untuk dilaporkan minggu ini.");
                return;
            }

            // ... (Kode analisis data dan pembuatan reportHTML tetap sama persis) ...
            const totalActivities = entries.filter(e => e.type === 'activity').length;
            const moodEntries = entries.filter(e => e.type === 'mood').map(e => e.content);
            const mostCommonMood = moodEntries.reduce((acc, mood) => { acc[mood] = (acc[mood] || 0) + 1; return acc; }, {});
            const topMood = Object.keys(mostCommonMood).sort((a, b) => mostCommonMood[b] - mostCommonMood[a])[0] || "Tidak Tercatat";
            let reportHTML = `<ul><li><strong>Total Aktivitas:</strong> ${totalActivities}</li><li><strong>Mood Teratas:</strong> ${topMood}</li></ul>`;

            const templateParams = {
                nama_pengguna: userName || userEmail.split('@')[0],
                email_penerima: userEmail,
                isi_laporan: reportHTML
            };

            await emailjs.send('service_vfx42l9', 'template_6k8o5vg', templateParams);
            console.log("Email laporan berhasil dikirim!");

            const dataUntukDisimpan = {
                mingguLaporan: mingguIni,
                tahunLaporan: tahunIni
            };

            if (userDoc.exists()) {
                await updateDoc(userDocRef, dataUntukDisimpan);
                console.log(`Timestamp laporan diperbarui ke minggu #${mingguIni}.`);
            } else {
                const profilBaru = {
                    ...dataUntukDisimpan,
                    displayName: userName || userEmail.split('@')[0],
                    email: userEmail,
                    createdAt: serverTimestamp(),
                    isNewUser: false,
                };
                await setDoc(userDocRef, profilBaru);
                console.log(`Profil baru dibuat dan timestamp laporan disimpan ke minggu #${mingguIni}.`);
            }
        } else {
            console.log(`Laporan untuk minggu #${mingguIni} (${tahunIni}) sudah pernah dikirim.`);
        }
    } catch (error) {
        console.error("Gagal membuat atau mengirim laporan mingguan:", error);
    }
}

// ... (sisa kode lainnya)
function initializeEditor() {
    tinymce.init({
        selector: '#idea-notes',
        plugins: 'lists link image table code help wordcount',
        toolbar: 'undo redo | blocks | bold italic | alignleft aligncenter alignright | bullist numlist outdent indent',
        menubar: false, height: 180,
        skin: (document.body.classList.contains('dark-mode') ? 'oxide-dark' : 'oxide'),
        content_css: (document.body.classList.contains('dark-mode') ? 'dark' : 'default')
    });
}

/**
 * FITUR: Pengecekan dan Pemicu Onboarding
 * Deskripsi: Mengambil data pengguna dari Firestore, memeriksa flag `isNewUser`.
 * Jika true, memulai tur dan memperbarui flag setelah selesai.
 * @param {string} userId - UID pengguna yang sedang login.
 */
async function checkAndStartOnboarding(userId) {
    try {
        const userDocRef = doc(firestore, "users", userId);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists() && userDoc.data().isNewUser) {
            console.log("Pengguna baru terdeteksi, memulai tur onboarding...");
            const tour = startOnboardingTour();

            // Listener untuk saat tur selesai atau dibatalkan
            const onTourEnd = () => {
                console.log("Tur selesai, memperbarui status pengguna.");
                updateDoc(userDocRef, { isNewUser: false });
            };

            tour.on('complete', onTourEnd);
            tour.on('cancel', onTourEnd);

        }
    } catch (error) {
        console.error("Gagal memeriksa status onboarding:", error);
    }
}

// 5. EVENT LISTENERS SETUP
function setupEventListeners() {
    // User & General
    logoutBtn.addEventListener('click', () => signOut(auth));
    themeToggleBtn.addEventListener('click', handleThemeToggle);
    inputTabs.forEach(tab => tab.addEventListener('click', handleTabSwitch));

    // Form Submissions
    recordMoodBtn.addEventListener('click', handleRecordMood);
    startActivityBtn.addEventListener('click', handleStartActivity);
    recordIdeaBtn.addEventListener('click', handleRecordIdea);

    // Mood Slider Interaction
    moodSlider.addEventListener('input', () => { userHasSetMood = true; });

    // Timeline & Papan Ide
    timelineSearchInput.addEventListener('input', renderTimeline);
    timelineList.addEventListener('click', handleTimelineClicks);
    document.getElementById('prev-day-btn').addEventListener('click', () => {
        currentlyDisplayedDate = currentlyDisplayedDate.subtract(1, 'day');
        listenForEntriesForDate(currentlyDisplayedDate);
    });
    document.getElementById('next-day-btn').addEventListener('click', () => {
        currentlyDisplayedDate = currentlyDisplayedDate.add(1, 'day');
        listenForEntriesForDate(currentlyDisplayedDate);
    });

    // 👇👇👇 TAMBAHKAN BLOK BARU INI 👇👇👇
    // --- Logika untuk Utilitas Teks ---
    const processTextBtn = document.getElementById('process-text-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const textInput = document.getElementById('text-utility-input');
    const textOutput = document.getElementById('text-utility-output');
    const generateReportBtn = document.getElementById('process-text-btn');
    const copyReportBtn = document.getElementById('copy-text-btn');
    const reportOutput = document.getElementById('text-utility-output');



    // --- Logika untuk Utilitas Teks ---
    // (Cari baris di bawah ini dan ganti seluruh bloknya)
    processTextBtn.addEventListener('click', () => {
        const userName = userDisplay.textContent;
        const reportDate = currentlyDisplayedDate.format('dddd, D MMMM YYYY');

        const entriesToReport = [...allEntries].sort((a, b) => a.timestamp.toDate() - b.timestamp.toDate());

        let reportText = `*Laporan Harian Journify*\n`;
        reportText += `---------------------------\n`;
        reportText += `Nama: ${userName}\n`;
        reportText += `Tanggal: ${reportDate}\n\n`;

        if (entriesToReport.length === 0) {
            reportText += "Tidak ada catatan untuk hari ini.";
        } else {
            entriesToReport.forEach(entry => {
                const time = dayjs(entry.timestamp.toDate()).format('HH:mm');

                if (entry.type === 'mood') {
                    reportText += `[${time}] - 😊 *Mood Dicatat*\n`;
                    reportText += `   - Perasaan: ${getMoodEmoji(entry.content)} ${entry.content}\n\n`;
                }
                else if (entry.type === 'activity') {
                    const status = entry.extra.status === 'completed' ? 'Selesai' : 'Berjalan';
                    reportText += `[${time}] - 🏃 *Aktivitas: ${entry.content}* (${status})\n`;
                    reportText += `   - Kategori: ${entry.extra.category}\n`;

                    // --- TAMBAHAN: Menyertakan Mood Mulai & Akhir ---
                    if (entry.extra.moodAtStart) {
                        reportText += `   - Mood Mulai: ${getMoodEmoji(entry.extra.moodAtStart)} ${entry.extra.moodAtStart}\n`;
                    }
                    if (entry.extra.status === 'completed') {
                        const startTime = dayjs(entry.timestamp.toDate()).format('HH:mm');
                        const endTime = dayjs(entry.extra.endTime.toDate()).format('HH:mm');
                        reportText += `   - Durasi: ${entry.extra.duration} menit (dari ${startTime} s/d ${endTime})\n`;

                        if (entry.extra.moodAtEnd) {
                            reportText += `   - Mood Akhir: ${getMoodEmoji(entry.extra.moodAtEnd)} ${entry.extra.moodAtEnd}\n`;
                        }
                    }

                    if (entry.extra.tags && entry.extra.tags.length > 0) {
                        reportText += `   - Tag: #${entry.extra.tags.join(', #')}\n`;
                    }

                    // --- TAMBAHAN: Menyertakan Ide Terkait ---
                    if (entry.extra.relatedIdeas && entry.extra.relatedIdeas.length > 0) {
                        reportText += `   - Ide Terkait:\n`;
                        entry.extra.relatedIdeas.forEach(idea => {
                            reportText += `      - ${idea.title}\n`;
                        });
                    }

                    reportText += `\n`; // Baris baru setelah setiap entri
                }
                else if (entry.type === 'idea') {
                    reportText += `[${time}] - 💡 *Ide Dicatat: ${entry.content}*\n`;
                    if (entry.extra.deadline) {
                        reportText += `   - Deadline: ${dayjs(entry.extra.deadline).format('D MMM YYYY')}\n`;
                    }
                    if (entry.extra.tags && entry.extra.tags.length > 0) {
                        reportText += `   - Tag: #${entry.extra.tags.join(', #')}\n`;
                    }
                    reportText += `\n`;
                }
            });
        }

        textOutput.value = reportText;
    });



    // Event saat tombol "Salin Teks" diklik
    copyTextBtn.addEventListener('click', () => {
        if (textOutput.value) {
            navigator.clipboard.writeText(textOutput.value)
                .then(() => {
                    Swal.fire({
                        toast: true,
                        position: 'top-end',
                        icon: 'success',
                        title: 'Teks berhasil disalin!',
                        showConfirmButton: false,
                        timer: 1500
                    });
                })
                .catch(err => {
                    console.error('Gagal menyalin teks: ', err);
                });
        }
    });
    // --- Akhir Logika Utilitas Teks ---

    showIdeaBoardBtn.addEventListener('click', () => {
        document.querySelectorAll('#main-column .card').forEach(c => c.classList.add('hidden'));
        ideaBoardContainer.classList.remove('hidden');
    });
    backToTimelineBtn.addEventListener('click', () => {
        document.querySelectorAll('#main-column .card').forEach(c => c.classList.remove('hidden'));
        ideaBoardContainer.classList.add('hidden');
    });
    ideaBoardContainer.addEventListener('click', handleIdeaBoardClicks);
    closeIdeaModalBtn.addEventListener('click', () => ideaDetailsModal.classList.add('hidden'));

    // Chart Filters
    document.getElementById('mood-chart-controls').addEventListener('click', (e) => handleChartFilterClick(e, 'mood'));
    document.getElementById('duration-chart-controls').addEventListener('click', (e) => handleChartFilterClick(e, 'duration'));

    initializeSortable();
}

// 6. EVENT HANDLER FUNCTIONS
function handleLogout() { signOut(auth); }

function handleThemeToggle() {
    const newTheme = document.body.classList.contains('dark-mode') ? 'light' : 'dark';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
}

function handleTabSwitch(e) {
    const type = e.target.dataset.type;
    inputTabs.forEach(t => t.classList.remove('active'));
    e.target.classList.add('active');
    document.querySelectorAll('.input-form').forEach(f => f.classList.add('hidden'));
    document.getElementById(`${type}-form`).classList.remove('hidden');
}

function handleRecordMood() {
    const moodText = getMoodText(moodSlider.value);
    addEntry('mood', moodText, {});
    Swal.fire('Berhasil!', 'Mood berhasil dicatat.', 'success');
    userHasSetMood = false;
    moodSlider.value = 0;
}

async function handleStartActivity() {
    const activityName = activityNameInput.value.trim();
    if (!activityName) return Swal.fire('Error', 'Nama aktivitas wajib diisi.', 'error');
    if (activeActivityEntry) return Swal.fire('Error', 'Selesaikan aktivitas yang berjalan.', 'error');

    const category = activityCategorySelect.value;
    const tags = document.getElementById('activity-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const moodText = userHasSetMood ? getMoodText(moodSlider.value) : null;

    await addEntry('activity', activityName, {
        category, status: 'running', moodAtStart: moodText,
        duration: 0, tags
    });

    ideasDuringActivity = [];
    userHasSetMood = false;
    moodSlider.value = 0;
    activityNameInput.value = '';
    document.getElementById('activity-tags').value = '';
}

// ... (kode lainnya tetap sama)

// GANTI FUNGSI handleStopActivity YANG LAMA DENGAN VERSI BARU INI
async function handleStopActivity(activity) {
    if (!activity) return;

    // Menanyakan mood akhir kepada pengguna (logika ini tidak berubah)
    const { value: moodEndValue } = await Swal.fire({
        title: 'Bagaimana moodmu sekarang?',
        icon: 'question',
        input: 'select',
        inputOptions: {
            '-2': 'Sangat Sedih 😢',
            '-1': 'Sedih 🙁',
            '0': 'Netral 😐',
            '1': 'Senang 🙂',
            '2': 'Sangat Senang 😊'
        },
        inputPlaceholder: 'Pilih mood',
        showCancelButton: true
    });

    if (moodEndValue) {
        // --- PERUBAHAN DI SINI ---

        // 1. Siapkan semua data yang akan di-update dalam satu objek (payload)
        const moodEndText = getMoodText(moodEndValue);
        const durationInMinutes = Math.floor((new Date() - activity.timestamp.toDate()) / (1000 * 60));

        const payload = {
            'extra.status': 'completed',
            'extra.duration': durationInMinutes,
            'extra.moodAtEnd': moodEndText,
            'extra.endTime': new Date(),
            'extra.relatedIdeas': ideasDuringActivity
        };
        
        // 2. Cek status koneksi
        if (navigator.onLine) {
            try {
                // Jika online, langsung update ke Firestore
                await updateDoc(doc(firestore, "entries", activity.id), payload);
                console.log("Online: Aktivitas diselesaikan dan diupdate di Firestore.");
            } catch (error) {
                // Jika gagal (misal: aturan keamanan), simpan ke offline
                console.error("Gagal update aktivitas di Firestore, menyimpan ke lokal:", error);
                await db.pendingOperations.add({ action: 'update', docId: activity.id, payload, timestamp: new Date() });
            }
        } else {
            // Jika offline, simpan "perintah update" ke IndexedDB
            await db.pendingOperations.add({ action: 'update', docId: activity.id, payload, timestamp: new Date() });
            console.log("Offline: Perintah menyelesaikan aktivitas disimpan secara lokal.");
        }

        // 3. Update UI dan beri feedback ke pengguna (ini berjalan di kedua kasus)
        activeActivityEntry = null;
        ideasDuringActivity = [];
        Swal.fire('Selesai!', 'Aktivitasmu berhasil dicatat dan akan disinkronkan.', 'success');

        // --- AKHIR PERUBAHAN ---
    }
}

// =======================
// Mood & Activity Offline
// =======================

// Tambah Mood
async function addMood(value) {
  const mood = { value, timestamp: Date.now() };

  // simpan untuk sync
  await db.pendingOperations.add({
    type: 'addMood',
    payload: mood,
    timestamp: mood.timestamp
  });

  // simpan ke cache lokal
  await db.moods.add(mood);

  // render langsung ke UI
  renderMood(mood);
}

// Tambah Activity
async function addActivity(text) {
  const activity = { text, timestamp: Date.now() };

  await db.pendingOperations.add({
    type: 'addActivity',
    payload: activity,
    timestamp: activity.timestamp
  });

  await db.activities.add(activity);

  renderActivity(activity);
}

// Render Mood ke timeline
function renderMood(mood) {
  const list = document.getElementById('moodList');
  if (!list) return;

  const li = document.createElement('li');
  li.textContent = `${new Date(mood.timestamp).toLocaleString()} - Mood: ${mood.value}`;
  list.appendChild(li);
}

// Render Activity ke timeline
function renderActivity(activity) {
  const list = document.getElementById('activityList');
  if (!list) return;

  const li = document.createElement('li');
  li.textContent = `${new Date(activity.timestamp).toLocaleString()} - Activity: ${activity.text}`;
  list.appendChild(li);
}

// Load data dari IndexedDB (offline cache)
async function loadOfflineData() {
  const moods = await db.moods.toArray();
  moods.forEach(renderMood);

  const activities = await db.activities.toArray();
  activities.forEach(renderActivity);
}

// Listener untuk form input
document.addEventListener('DOMContentLoaded', () => {
  // restore data lama
  loadOfflineData();

  // mood form
  const moodForm = document.getElementById('moodForm');
  if (moodForm) {
    moodForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('moodInput');
      const value = input.value.trim();
      if (!value) return;
      await addMood(value);
      input.value = '';
    });
  }

  // activity form
  const activityForm = document.getElementById('activityForm');
  if (activityForm) {
    activityForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = document.getElementById('activityInput');
      const text = input.value.trim();
      if (!text) return;
      await addActivity(text);
      input.value = '';
    });
  }
});



async function handleRecordIdea() {
    const ideaTitle = ideaTitleInput.value.trim();
    if (!ideaTitle) return Swal.fire('Error', 'Judul ide wajib diisi.', 'error');

    const ideaNotes = tinymce.get('idea-notes').getContent();
    const ideaDeadline = ideaDeadlineInput.value;
    const ideaTags = document.getElementById('idea-tags').value.split(',').map(tag => tag.trim()).filter(Boolean);
    const moodAtCreation = userHasSetMood ? getMoodText(moodSlider.value) : null;

    await addEntry('idea', ideaTitle, {
        moodAtCreation, notes: ideaNotes, deadline: ideaDeadline || null,
        tags: ideaTags, status: 'pending'
    });

    Swal.fire({ icon: 'success', title: 'Ide berhasil dicatat!', showConfirmButton: false, timer: 1500 });

    userHasSetMood = false; moodSlider.value = 0; ideaTitleInput.value = '';
    tinymce.get('idea-notes').setContent(''); ideaDeadlineInput.value = '';
    document.getElementById('idea-tags').value = '';
    document.querySelector('.input-tab-btn[data-type="mood"]').click();

    showIdeaBoardBtn.click();
}

async function handleQuickAddIdea(activity) {
    if (!activity) return;

    const { value: ideaTitle } = await Swal.fire({
        title: 'Ide baru apa yang muncul?', input: 'text',
        inputPlaceholder: 'Judul ide...', showCancelButton: true,
        confirmButtonText: 'Simpan Sementara'
    });

    if (ideaTitle) {
        ideasDuringActivity.push({
            title: ideaTitle,
            moodAtCreation: userHasSetMood ? getMoodText(moodSlider.value) : null
        });
        Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Ide disimpan sementara!', showConfirmButton: false, timer: 1500 });
    }
}

function handleTimelineClicks(e) {
    const stopBtn = e.target.closest('.stop-activity-btn-timeline');
    const quickAddBtn = e.target.closest('.quick-add-idea-btn-timeline');
    const accordionHeader = e.target.closest('.hourly-header');
    const editBtn = e.target.closest('.edit-btn');
    const deleteBtn = e.target.closest('.delete-btn');

    if (accordionHeader) accordionHeader.parentElement.classList.toggle('active');
    if (stopBtn) handleStopActivity(activeActivityEntry);
    if (quickAddBtn) handleQuickAddIdea(activeActivityEntry);
    if (editBtn) handleEditEntry(editBtn.dataset.id);
    if (deleteBtn) handleDeleteEntry(deleteBtn.dataset.id);
}

function handleIdeaBoardClicks(e) {
    const card = e.target.closest('.idea-card');
    if (!card) return;

    const ideaId = card.dataset.id;
    const ideaData = allEntries.find(entry => entry.id === ideaId);

    if (ideaData) {
        ideaModalTitle.textContent = ideaData.content;
        let detailsHTML = `<span class="detail-label">Catatan:</span><div>${ideaData.extra.notes || 'Tidak ada catatan.'}</div>`;
        if (ideaData.extra.moodAtCreation) {
            detailsHTML += `<span class="detail-label">Mood saat dibuat:</span><p>${getMoodEmoji(ideaData.extra.moodAtCreation)} ${ideaData.extra.moodAtCreation}</p>`;
        } else {
            detailsHTML += `<span class="detail-label">Mood saat dibuat:</span><p>Tidak diatur</p>`;
        }
        if (ideaData.extra.deadline) {
            detailsHTML += `<span class="detail-label">Deadline:</span><p>${dayjs(ideaData.extra.deadline).format('D MMMM YYYY')}</p>`;
        }
        if (ideaData.extra.tags && ideaData.extra.tags.length > 0) {
            detailsHTML += `<span class="detail-label">Tags:</span><div>${ideaData.extra.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' ')}</div>`;
        }
        ideaModalDetails.innerHTML = detailsHTML;
        ideaDetailsModal.classList.remove('hidden');
    }
}

function handleChartFilterClick(e, chartType) {
    if (!e.target.classList.contains('chart-period-btn')) return;
    const period = e.target.dataset.period;
    const controls = e.target.parentElement;
    controls.querySelector('.active').classList.remove('active');
    e.target.classList.add('active');

    if (chartType === 'mood') {
        currentMoodChartPeriod = period;
        drawMoodChart();
    } else if (chartType === 'duration') {
        currentDurationChartPeriod = period;
        drawDurationCategoryChart();
    }
}

// 7. UI & RENDERING FUNCTIONS
function applyTheme(theme) {
    document.body.classList.toggle('dark-mode', theme === 'dark');
    themeToggleBtn.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (tinymce.get('idea-notes')) {
        tinymce.remove('#idea-notes');
        initializeEditor();
    }
}
function listenForAllIdeas() {
    if (unsubscribeIdeasListener) unsubscribeIdeasListener();

    const q = query(
        collection(firestore, "entries"),
        where("userId", "==", currentUserId),
        where("type", "==", "idea"),
        orderBy("timestamp", "desc")
    );

    unsubscribeIdeasListener = onSnapshot(q, (snapshot) => {
        allIdeas = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Panggil render Papan Ide setiap kali ada perubahan data ide
        renderIdeaBoard();
    });
}



function renderIdeaBoard() {
    ['pending', 'in-progress', 'done'].forEach(status => {
        document.getElementById(`idea-col-${status}`).innerHTML = '';
    });

    // Menggunakan variabel allIdeas
    allIdeas.forEach(idea => {
        let status = idea.extra.status || 'pending';
        const deadline = idea.extra.deadline ? dayjs(idea.extra.deadline) : null;

        // Logika: Jika deadline sudah lewat dan statusnya belum 'done',
        // maka otomatis dianggap 'pending'.
        if (deadline && deadline.isBefore(dayjs(), 'day') && status !== 'done') {
            status = 'pending';
        }

        const ideaCardHTML = `
            <div class="idea-card" data-id="${idea.id}">
                <h4 class="idea-card-title">${idea.content}</h4>
                ${detailsContent.length > 0 ? `<p class="idea-card-details">${detailsContent.join('<br>')}</p>` : ''}
            </div>`;

        document.getElementById(`idea-col-${status}`).innerHTML += ideaCardHTML;
    });
}

function initializeSortable() {
    document.querySelectorAll('.idea-card-container').forEach(column => {
        new Sortable(column, {
            group: 'ideas', animation: 150,
            onEnd: async (evt) => {
                const ideaId = evt.item.dataset.id;
                const newStatus = evt.to.dataset.status;
                try {
                    await updateDoc(doc(firestore, "entries", ideaId), { 'extra.status': newStatus });
                } catch (error) {
                    console.error("Gagal update status ide:", error);
                }
            }
        });
    });
}

// 8. FIRESTORE & DATA FUNCTIONS
function listenForEntriesForDate(date) {
    const timelineDateDisplay = document.getElementById('timeline-date-display');
    const nextDayBtn = document.getElementById('next-day-btn');
    timelineDateDisplay.textContent = date.format('D MMMM YYYY');

    if (date.isSameOrAfter(dayjs(), 'day')) {
        nextDayBtn.disabled = true;
    } else {
        nextDayBtn.disabled = false;
    }

    if (unsubscribeEntriesListener) unsubscribeEntriesListener();

    const startOfDay = date.startOf('day').toDate();
    const endOfDay = date.endOf('day').toDate();
    const q = query(
        collection(firestore, "entries"),
        where("userId", "==", currentUserId),
        orderBy("timestamp", "desc"),
        where("timestamp", ">=", startOfDay),
        where("timestamp", "<=", endOfDay)
    );

    unsubscribeEntriesListener = onSnapshot(q, (snapshot) => {
        allEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (!ideaBoardContainer.classList.contains('hidden')) {
            renderIdeaBoard();
        } else {
            renderTimeline();
        }
        updateSummaryCard();
        updateInsights();
    }, (error) => {
        console.error("Firestore listener error:", error);
        // Handle error, maybe show a message to the user
    });
}

async function addEntry(type, content, extra = {}) {
    const payload = {
        userId: currentUserId,
        timestamp: new Date(), // Gunakan JS Date untuk offline, Firestore akan konversi
        type, content, extra
    };

    if (navigator.onLine) {
        try {
            // Jika online, langsung ke Firestore
            payload.timestamp = serverTimestamp(); // Ganti dengan serverTimestamp
            await addDoc(collection(firestore, "entries"), payload);
        } catch (error) {
            console.error("Error adding entry to Firestore: ", error);
            // Jika gagal (misal: aturan keamanan), simpan ke offline
            await db.pendingOperations.add({ action: 'add', payload, timestamp: new Date() });
        }
    } else {
        // Jika offline, simpan ke IndexedDB
        await db.pendingOperations.add({ action: 'add', payload, timestamp: new Date() });
        console.log("Offline: Entri disimpan secara lokal.");
        Swal.fire('Offline', 'Catatanmu disimpan lokal & akan disinkronkan nanti.', 'info');
    }
}

function handleDeleteEntry(id) {
    Swal.fire({
        title: 'Hapus Catatan?', text: "Tindakan ini tidak bisa dibatalkan!",
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', confirmButtonText: 'Ya, hapus!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            if (navigator.onLine) {
                try {
                    await deleteDoc(doc(firestore, "entries", id));
                    Swal.fire('Terhapus!', 'Catatan Anda telah dihapus.', 'success');
                } catch (error) {
                    await db.pendingOperations.add({ action: 'delete', docId: id, timestamp: new Date() });
                }
            } else {
                await db.pendingOperations.add({ action: 'delete', docId: id, timestamp: new Date() });
                console.log("Offline: Perintah hapus disimpan secara lokal.");
                Swal.fire('Offline', 'Perintah hapus disimpan & akan disinkronkan nanti.', 'info');
            }
        }
    });
}

async function handleEditEntry(id) {
    const entry = allEntries.find(e => e.id === id);
    if (!entry) return;

    const { value: newContent } = await Swal.fire({
        title: `Edit: ${entry.content}`, input: 'text',
        inputValue: entry.content, showCancelButton: true,
        confirmButtonText: 'Simpan'
    });

    if (newContent) {
        const payload = { content: newContent };
        if (navigator.onLine) {
            try {
                await updateDoc(doc(firestore, "entries", id), payload);
                Swal.fire('Diperbarui!', 'Catatan Anda telah diperbarui.', 'success');
            } catch (error) {
                await db.pendingOperations.add({ action: 'update', docId: id, payload, timestamp: new Date() });
            }
        } else {
            await db.pendingOperations.add({ action: 'update', docId: id, payload, timestamp: new Date() });
            console.log("Offline: Perintah edit disimpan secara lokal.");
            Swal.fire('Offline', 'Perubahan disimpan & akan disinkronkan nanti.', 'info');
        }
    }
}

// 9. HELPER FUNCTIONS
function getMoodEmoji(mood) {
    if (!mood) return '';
    const emojis = { 'Sangat Sedih': '😢', 'Sedih': '🙁', 'Netral': '😐', 'Senang': '🙂', 'Sangat Senang': '😊' };
    return emojis[mood] || '';
}

function getMoodText(value) {
    const map = { '-2': 'Sangat Sedih', '-1': 'Sedih', '0': 'Netral', '1': 'Senang', '2': 'Sangat Senang' };
    return map[value] || 'Netral';
}

function formatEntryTitle(entry) {
    const typeMap = { 'mood': 'Mood', 'activity': 'Aktivitas' };
    const emoji = entry.type === 'mood' ? getMoodEmoji(entry.content) : '';
    return `${emoji} ${typeMap[entry.type]} → ${entry.content}`;
}

function formatEntryDetails(entry) {
    let details = [];
    const { extra } = entry;
    if (entry.type === 'activity') {
        if (extra.status === 'completed') {
            details.push(`Selesai dalam: ${extra.duration} menit`);
        }
        if (extra.moodAtStart) details.push(`Mood Mulai: ${getMoodEmoji(extra.moodAtStart)} ${extra.moodAtStart}`);
        if (extra.moodAtEnd) details.push(`Mood Akhir: ${getMoodEmoji(extra.moodAtEnd)} ${extra.moodAtEnd}`);
        if (extra.category) details.push(`Kategori: ${extra.category}`);

        if (extra.relatedIdeas && extra.relatedIdeas.length > 0) {
            let ideasHTML = '<div class="related-ideas"><b>Ide terkait:</b><ul>';
            extra.relatedIdeas.forEach(idea => { ideasHTML += `<li>${idea.title}</li>`; });
            ideasHTML += '</ul></div>';
            details.push(ideasHTML);
        }

        if (extra.status === 'completed' && extra.endTime) {
            const startTime = dayjs(entry.timestamp.toDate()).format('HH:mm');
            const endTime = dayjs(extra.endTime.toDate()).format('HH:mm');
            details.push(`<div class="time-row"><span class="time-label">Mulai: <b>${startTime}</b></span><span class="time-label">Selesai: <b>${endTime}</b></span></div>`);
        }
    }
    if (extra.tags && extra.tags.length > 0) {
        details.push(extra.tags.map(tag => `<span class="tag">#${tag}</span>`).join(' '));
    }
    return details.join('<br>');
}

function startActivityTimer(entryId, startTime) {
    const timerElement = document.getElementById(`timer-${entryId}`);
    if (!timerElement) return;
    activityTimerInterval = setInterval(() => {
        const duration = Math.floor((new Date() - startTime) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        timerElement.textContent = `Durasi: ${minutes}m ${seconds}s`;
    }, 1000);
}

// 10. INSIGHTS & CHARTS
function updateInsights() {
    const activities = allTimelineEntries.filter(e => e.type === 'activity' && e.extra.status === 'completed');
    const ideas = allEntries.filter(e => e.type === 'idea');

    // Insight 1: Mood change
    const moodValueMap = { 'Sangat Sedih': -2, 'Sedih': -1, 'Netral': 0, 'Senang': 1, 'Sangat Senang': 2 };
    // Insight 1: Mood change
    // 👇👇👇 BARIS INI YANG SEBELUMNYA HILANG & PERLU ADA KEMBALI 👇👇👇
    const moodChanges = activities.reduce((acc, entry) => {
        const category = entry.extra.category;
        const start = moodValueMap[entry.extra.moodAtStart];
        const end = moodValueMap[entry.extra.moodAtEnd];
        if (start !== undefined && end !== undefined) {
            if (!acc[category]) acc[category] = { total: 0, count: 0 };
            acc[category].total += (end - start);
            acc[category].count++;
        }
        return acc;
    }, {});

    const moodChangeEntries = Object.entries(moodChanges).map(([cat, data]) => {
        const avg = data.count > 0 ? data.total / data.count : 0;
        let indicator = '<span class="mood-neutral">▬</span>'; // Netral
        if (avg > 0.1) indicator = '<span class="mood-up">▲</span>'; // Naik
        if (avg < -0.1) indicator = '<span class="mood-down">▼</span>'; // Turun

        return `<li>${indicator} Aktivitas "<b>${cat}</b>" cenderung ${avg > 0.1 ? 'meningkatkan' : avg < -0.1 ? 'menurunkan' : 'tidak mengubah'} mood.</li>`;
    });

    if (moodChangeEntries.length > 0) {
        moodChangeContent.innerHTML = `<ul class="mood-change-list">${moodChangeEntries.join('')}</ul>`;
    } else {
        moodChangeContent.textContent = 'Data tidak cukup untuk dianalisis.';
    }

    // --- AKHIR BLOK PERBAIKAN ---

    // Insight 2: Top activity
    const activityCounts = activities.reduce((acc, entry) => {
        acc[entry.content] = (acc[entry.content] || 0) + 1;
        return acc;
    }, {});
    const topActivity = Object.entries(activityCounts).sort((a, b) => b[1] - a[1])[0];
    topActivityContent.textContent = topActivity ? `"${topActivity[0]}" (${topActivity[1]} kali)` : 'Belum ada aktivitas.';

    // Insight 3: Idea mood
    const ideaMoods = ideas.reduce((acc, entry) => {
        const mood = entry.extra.moodAtCreation;
        if (mood) acc[mood] = (acc[mood] || 0) + 1;
        return acc;
    }, {});
    const topIdeaMood = Object.entries(ideaMoods).sort((a, b) => b[1] - a[1])[0];
    ideaMoodContent.innerHTML = topIdeaMood ? `Paling produktif saat mood <b>${topIdeaMood[0]}</b>.` : 'Belum ada ide.';

    drawMoodChart();
    drawActivityChart();
}
function listenForAllTimelineEntries() {
    if (unsubscribeAllEntriesListener) unsubscribeAllEntriesListener();
    const q = query(
        collection(firestore, "entries"),
        where("userId", "==", currentUserId),
        where("type", "in", ["mood", "activity"])
    );
    unsubscribeAllEntriesListener = onSnapshot(q, (snapshot) => {
        allTimelineEntries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Perbarui semua wawasan/grafik setiap ada data baru
        updateInsights();
    });
}

function updateSummaryCard() {
    if (summaryChartInstance) summaryChartInstance.destroy();

    const summaryTimeEl = document.getElementById('summary-time');
    const summaryTasksEl = document.getElementById('summary-tasks');
    const summaryChartCanvas = document.getElementById('summary-chart');

    const todayStart = dayjs().startOf('day');
    const todayEnd = dayjs().endOf('day');

    const todaysActivities = allEntries.filter(e =>
        e.type === 'activity' &&
        e.extra.status === 'completed' &&
        e.timestamp &&
        dayjs(e.timestamp.toDate()).isAfter(todayStart) &&
        dayjs(e.timestamp.toDate()).isBefore(todayEnd)
    );

    // Hitung total durasi
    const totalMinutes = todaysActivities.reduce((sum, entry) => sum + (entry.extra.duration || 0), 0);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    summaryTimeEl.textContent = `${hours} jam ${minutes} menit`;

    // Hitung total task
    summaryTasksEl.textContent = todaysActivities.length;

    // Siapkan data untuk donut chart
    const durationByCategory = todaysActivities.reduce((acc, entry) => {
        const category = entry.extra.category || 'Lainnya';
        acc[category] = (acc[category] || 0) + (entry.extra.duration || 0);
        return acc;
    }, {});

    const labels = Object.keys(durationByCategory);
    const data = Object.values(durationByCategory);

    if (todaysActivities.length > 0) {
        summaryChartInstance = new Chart(summaryChartCanvas, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Durasi per Kategori (menit)',
                    data: data,
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.7)',
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 206, 86, 0.7)',
                        'rgba(75, 192, 192, 0.7)',
                        'rgba(153, 102, 255, 0.7)'
                    ],
                    borderColor: 'var(--bg-secondary)',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false, // <-- TAMBAHKAN INI
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: 12
                        }
                    }
                }
            }
        });
    }
}


// GANTI LAGI FUNGSI drawMoodChart YANG LAMA DENGAN VERSI FINAL INI:
function drawMoodChart() {
    if (moodChartInstance) moodChartInstance.destroy();

    const moodEntries = allTimelineEntries.filter(e => e.type === 'mood' && e.timestamp);
    if (moodEntries.length < 1) {
        // Jika tidak ada data, gambar chart kosong dengan pesan
        moodChartInstance = new Chart(moodChartCanvas, {
            type: 'line',
            data: { labels: [], datasets: [] },
            options: {
                plugins: {
                    title: { display: true, text: 'Data mood tidak cukup untuk ditampilkan' }
                }
            }
        });
        return;
    }

    const moodValueMap = { 'Sangat Sedih': -2, 'Sedih': -1, 'Netral': 0, 'Senang': 1, 'Sangat Senang': 2 };
    let dataByPeriod = {};
    let chartTitle = '';

    // Logika filter berdasarkan periode yang dipilih (tetap sama)
    switch (currentMoodChartPeriod) {
        case 'day':
            chartTitle = `Mood Hari Ini (${dayjs().format('D MMM YYYY')})`;
            const todayStart = dayjs().startOf('day');
            dataByPeriod = moodEntries
                .filter(e => dayjs(e.timestamp.toDate()).isAfter(todayStart))
                .reduce((acc, entry) => {
                    const hour = dayjs(entry.timestamp.toDate()).format('HH:00');
                    if (!acc[hour]) acc[hour] = { total: 0, count: 0 };
                    acc[hour].total += moodValueMap[entry.content] || 0;
                    acc[hour].count++;
                    return acc;
                }, {});
            break;
        case 'week':
            chartTitle = 'Mood 7 Hari Terakhir';
            const weekStart = dayjs().subtract(6, 'days').startOf('day');
            dataByPeriod = moodEntries
                .filter(e => dayjs(e.timestamp.toDate()).isAfter(weekStart))
                .reduce((acc, entry) => {
                    const day = dayjs(entry.timestamp.toDate()).format('ddd, D MMM');
                    if (!acc[day]) acc[day] = { total: 0, count: 0 };
                    acc[day].total += moodValueMap[entry.content] || 0;
                    acc[day].count++;
                    return acc;
                }, {});
            break;
        case 'month':
            chartTitle = 'Mood 30 Hari Terakhir';
            const monthStart = dayjs().subtract(29, 'days').startOf('day');
            dataByPeriod = moodEntries
                .filter(e => dayjs(e.timestamp.toDate()).isAfter(monthStart))
                .reduce((acc, entry) => {
                    const day = dayjs(entry.timestamp.toDate()).format('D MMM');
                    if (!acc[day]) acc[day] = { total: 0, count: 0 };
                    acc[day].total += moodValueMap[entry.content] || 0;
                    acc[day].count++;
                    return acc;
                }, {});
            break;
    }

    // ---- PERBAIKAN LOGIKA SORTING DI SINI ----
    let sortedKeys = Object.keys(dataByPeriod);

    if (currentMoodChartPeriod === 'day') {
        // Untuk jam (format HH:00), sorting string biasa sudah cukup dan akurat.
        // Contoh: '09:00' akan selalu sebelum '10:00'.
        sortedKeys.sort();
    } else {
        // Untuk mingguan/bulanan, kita perlu sorting berdasarkan tanggal asli menggunakan dayjs.
        const format = (currentMoodChartPeriod === 'week') ? 'ddd, D MMM' : 'D MMM';
        sortedKeys.sort((a, b) => dayjs(a, format).unix() - dayjs(b, format).unix());
    }
    // ---- AKHIR PERBAIKAN ----

    const labels = sortedKeys;
    const data = sortedKeys.map(key => dataByPeriod[key].total / dataByPeriod[key].count);

    // Buat chart baru dengan data yang sudah diolah dan diurutkan
    moodChartInstance = new Chart(moodChartCanvas, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Rata-rata Mood',
                data: data,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3,
                fill: true,
            }]
        },
        options: {
            responsive: true, // Pastikan ini juga ada
            maintainAspectRatio: false, // <-- TAMBAHKAN INI
            plugins: {
                title: { display: true, text: chartTitle }
            },
            scales: {
                y: {
                    min: -2, max: 2,
                    ticks: {
                        callback: (value) => {
                            const map = { '-2': '😢', '-1': '🙁', '0': '😐', '1': '🙂', '2': '😊' };
                            return map[value] || '';
                        }
                    }
                }
            }
        }
    });
}
// ...DENGAN VERSI BARU INI:
// main.js - Bagian 10

// GANTI LAGI FUNGSI drawActivityChart DENGAN VERSI FINAL INI
function drawActivityChart() {
    if (activityChartInstance) activityChartInstance.destroy();

    const activities = allTimelineEntries.filter(e => e.type === 'activity');
    if (activities.length === 0) return;

    // ---- PALET WARNA UNTUK KATEGORI ----
    const CATEGORY_COLORS = {
        'Pekerjaan': { background: 'rgba(54, 162, 235, 0.6)', border: 'rgb(54, 162, 235)' },
        'Belajar': { background: 'rgba(75, 192, 192, 0.6)', border: 'rgb(75, 192, 192)' },
        'Pribadi': { background: 'rgba(255, 99, 132, 0.6)', border: 'rgb(255, 99, 132)' }, 'Istirahat': { background: 'rgba(153, 102, 255, 0.6)', border: 'rgb(153, 102, 255)' },
        'Lainnya': { background: 'rgba(201, 203, 207, 0.6)', border: 'rgb(201, 203, 207)' }
    };
    // ------------------------------------

    const categoryCounts = activities.reduce((acc, entry) => {
        const category = entry.extra.category || 'Lainnya';
        acc[category] = (acc[category] || 0) + 1;
        return acc;
    }, {});

    const labels = Object.keys(categoryCounts);
    const data = Object.values(categoryCounts);

    // ---- BUAT ARRAY WARNA DINAMIS BERDASARKAN LABEL ----
    const backgroundColors = labels.map(label => CATEGORY_COLORS[label]?.background || CATEGORY_COLORS['Lainnya'].background);
    const borderColors = labels.map(label => CATEGORY_COLORS[label]?.border || CATEGORY_COLORS['Lainnya'].border);
    // ----------------------------------------------------

    activityChartInstance = new Chart(activityChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Aktivitas per Kategori',
                data: data,
                // Gunakan array warna yang sudah kita buat
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true, // Pastikan ini juga ada
            maintainAspectRatio: false, // <-- TAMBAHKAN INI
            indexAxis: 'y',
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}


// 👇👇👇 TAMBAHKAN FUNGSI BARU INI SEPENUHNYA 👇👇👇
function drawDurationCategoryChart() {
    if (durationChartInstance) durationChartInstance.destroy();

    const CATEGORY_COLORS = {
        'Pekerjaan': { background: 'rgba(54, 162, 235, 0.8)' },
        'Belajar': { background: 'rgba(75, 192, 192, 0.8)' },
        'Pribadi': { background: 'rgba(255, 206, 86, 0.8)' },
        'Istirahat': { background: 'rgba(153, 102, 255, 0.8)' },
        'Lainnya': { background: 'rgba(201, 203, 207, 0.8)' }
    };
    // LANGKAH 2: MENENTUKAN JANGKA WAKTU
    let chartTitle = '';
    let startDate;

    if (currentDurationChartPeriod === 'week') {
        chartTitle = 'Waktu per Kategori (7 Hari Terakhir)';
        startDate = dayjs().subtract(6, 'days').startOf('day');
    } else { // month
        chartTitle = 'Waktu per Kategori (30 Hari Terakhir)';
        startDate = dayjs().subtract(29, 'days').startOf('day');
    }

    // LANGKAH 3: MENGUMPULKAN & MENYARING DATA
    const filteredActivities = allEntries.filter(e =>
        e.type === 'activity' &&
        e.extra.status === 'completed' &&
        e.timestamp &&
        dayjs(e.timestamp.toDate()).isAfter(startDate)
    );

    if (filteredActivities.length === 0) return;

    // LANGKAH 4: MENGHITUNG TOTAL WAKTU PER KATEGORI
    const durationByCategory = filteredActivities.reduce((acc, entry) => {
        const category = entry.extra.category || 'Lainnya';
        const duration = entry.extra.duration || 0;
        acc[category] = (acc[category] || 0) + duration;
        return acc;
    }, {});

    // LANGKAH 5: MENYIAPKAN DATA UNTUK DIGAMBAR
    const labels = Object.keys(durationByCategory);
    const data = Object.values(durationByCategory);
    const backgroundColors = labels.map(label => CATEGORY_COLORS[label]?.background || CATEGORY_COLORS['Lainnya'].background);

    // 3. Buat chart donut
    durationChartInstance = new Chart(document.getElementById('duration-category-chart'), {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Durasi (menit)',
                data: data,
                backgroundColor: backgroundColors,
                borderColor: 'var(--bg-secondary)',
                borderWidth: 3
            }]
        },
        options: {
            responsive: true, // Pastikan ini juga ada
            maintainAspectRatio: true, // <-- Ubah kembali ke true
            aspectRatio: 1,
            plugins: {
                title: { display: true, text: chartTitle },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            let label = context.label || '';
                            let value = context.raw || 0;
                            const hours = Math.floor(value / 60);
                            const minutes = value % 60;
                            return `${label}: ${hours} jam ${minutes} menit`;
                        }
                    }
                }
            }
        }
    });
    // main.js - Bagian 9
    function startActivityTimer(entryId, startTime) {
        const timerElement = document.getElementById(`timer-${entryId}`);
        if (!timerElement) return;

        activityTimerInterval = setInterval(() => {
            const duration = Math.floor((new Date() - startTime) / 1000);
            const minutes = Math.floor(duration / 60);
            const seconds = duration % 60;
            timerElement.textContent = `Durasi: ${minutes}m ${seconds}s`;
        }, 1000);
    }
}

// 7. UI & RENDERING FUNCTIONS

/**
 * FITUR BARU: Journify Assistant - Sapaan Proaktif
 * Deskripsi: Menampilkan pesan sambutan yang relevan dengan waktu (pagi/malam)
 * untuk membuat pengalaman pengguna lebih personal dan interaktif.
 */
function displayGreeting() {
    const currentHour = dayjs().hour();
    const userName = auth.currentUser.displayName || auth.currentUser.email.split('@')[0];
    let greetingTitle = '';
    let greetingText = '';

    if (currentHour >= 5 && currentHour < 12) {
        greetingTitle = `Selamat Pagi, ${userName}! ☀️`;
        greetingText = 'Bagaimana mood-mu untuk memulai hari ini? Mari kita buat hari ini produktif!';
    } else if (currentHour >= 18 && currentHour < 22) {
        greetingTitle = `Selamat Malam, ${userName}! 🌙`;
        greetingText = 'Sebelum istirahat, luangkan waktu sejenak untuk merefleksikan harimu. Aktivitas apa yang paling berkesan?';
    }

    if (greetingTitle) {
        Swal.fire({
            title: greetingTitle,
            text: greetingText,
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000, // Pesan akan hilang setelah 5 detik
            timerProgressBar: true
        });
    }
}


/**
 * FITUR: Merender Timeline Pengguna
 * Deskripsi: Menampilkan semua entri (mood, aktivitas) untuk tanggal yang dipilih.
 * Termasuk logika untuk filter pencarian dan menampilkan "empty state" yang lebih baik.
 */
function renderTimeline() {
    if (activityTimerInterval) clearInterval(activityTimerInterval);
    activeActivityEntry = null;
    timelineList.innerHTML = '';

    const searchQuery = timelineSearchInput.value.toLowerCase();
    const timelineEntries = allEntries.filter(e => e.type !== 'idea');

    const filteredEntries = timelineEntries.filter(entry => {
        const contentMatch = entry.content.toLowerCase().includes(searchQuery);
        const tagsMatch = entry.extra.tags?.some(tag => tag.toLowerCase().includes(searchQuery));
        return contentMatch || tagsMatch;
    });

    if (filteredEntries.length === 0) {
        if (searchQuery) {
            timelineList.innerHTML = `<p class="empty-state">Tidak ada entri yang cocok dengan pencarian "${searchQuery}".</p>`;
        } else {
            timelineList.innerHTML = `
                <div class="empty-state">
                    <h3>Timeline-mu masih kosong untuk hari ini.</h3>
                    <p>Bagaimana perasaanmu saat ini? Atau, aktivitas apa yang sedang kamu mulai? <br>Catat momen pertamamu!</p>
                </div>
            `;
        }
        return;
    }

    // --- BAGIAN YANG HILANG ADA DI SINI ---

    // 1. Kelompokkan entri berdasarkan jam
    const groupedByHour = filteredEntries.reduce((acc, entry) => {
        const hour = dayjs(entry.timestamp.toDate()).format('HH:00');
        if (!acc[hour]) {
            acc[hour] = [];
        }
        acc[hour].push(entry);
        return acc;
    }, {});

    // 2. Loop melalui setiap grup jam dan buat HTML
    for (const hour in groupedByHour) {
        const entriesInHour = groupedByHour[hour];
        let entriesHTML = '';

        entriesInHour.forEach(entry => {
            const time = dayjs(entry.timestamp.toDate()).format('HH:mm');
            let actionsHTML = `
                <div class="entry-actions">
                    <button class="edit-btn" data-id="${entry.id}" title="Edit">✏️</button>
                    <button class="delete-btn" data-id="${entry.id}" title="Hapus">🗑️</button>
                </div>`;

            let activityControls = '';
            if (entry.type === 'activity' && entry.extra.status === 'running') {
                activeActivityEntry = entry;
                activityControls = `
                    <div class="active-activity-actions">
                        <button class="stop-activity-btn-timeline" data-id="${entry.id}">Selesaikan Aktivitas</button>
                        <button class="quick-add-idea-btn-timeline btn-secondary" data-id="${entry.id}">+ Ide Cepat</button>
                        <span id="timer-${entry.id}"></span>
                    </div>`;
                startActivityTimer(entry.id, entry.timestamp.toDate());
            }

            entriesHTML += `
                <div class="timeline-item" data-time="${time}">
                    <div class="content-card">
                        ${actionsHTML}
                        <h3>${formatEntryTitle(entry)}</h3>
                        <div class="details">${formatEntryDetails(entry)}</div>
                        ${activityControls}
                    </div>
                </div>
            `;
        });

        const hourGroupHTML = `
            <div class="hourly-group">
                <button class="hourly-header">
                    <span class="hour-label">${hour}</span>
                    <span class="hour-summary">${entriesInHour.length} entri</span>
                    <span class="toggle-icon">▼</span>
                </button>
                <div class="hourly-content">
                    ${entriesHTML}
                </div>
            </div>
        `;
        timelineList.innerHTML += hourGroupHTML;
    }
    // --- AKHIR DARI BAGIAN YANG HILANG ---

}
