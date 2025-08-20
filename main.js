// main.js

// 1. IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, doc, deleteDoc, updateDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
dayjs.extend(window.dayjs_plugin_isSameOrAfter);

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

// 4. CORE APP INITIALIZATION
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserId = user.uid;
        userDisplay.textContent = user.displayName || user.email;
        listenForEntriesForDate(currentlyDisplayedDate);
        initializeEditor();
        setupEventListeners();
        const savedTheme = localStorage.getItem('theme') || 'light';
        applyTheme(savedTheme);
    } else {
        window.location.href = 'auth.html';
    }
});

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

    // Event saat tombol "Jadikan Teks" diklik
    processTextBtn.addEventListener('click', () => {
        const userName = userDisplay.textContent;
        const reportDate = currentlyDisplayedDate.format('dddd, D MMMM YYYY');
        const entriesToReport = [...allEntries].reverse(); // Salin & balik urutan jadi kronologis

        // 2. Buat header laporan
        let reportText = `*Laporan Kegiatan Harian*\n`;
        reportText += `Nama: ${userName}\n`;
        reportText += `Tanggal: ${reportDate}\n\n`;
        reportText += `------------------------------------\n\n`;

        // 3. Loop melalui setiap entri dan format
        if (entriesToReport.length === 0) {
            reportText += "Tidak ada aktivitas yang tercatat pada hari ini.";
        } else {
            entriesToReport.forEach(entry => {
                const time = dayjs(entry.timestamp.toDate()).format('HH:mm');

                if (entry.type === 'mood') {
                    reportText += `[${time}] Mood: ${entry.content} ${getMoodEmoji(entry.content)}\n`;
                }
                else if (entry.type === 'activity') {
                    reportText += `[${time}] Aktivitas: ${entry.content}\n`;
                    if (entry.extra.status === 'completed') {
                        const startTime = dayjs(entry.timestamp.toDate()).format('HH:mm');
                        const endTime = dayjs(entry.extra.endTime.toDate()).format('HH:mm');
                        reportText += `   - Durasi: ${entry.extra.duration} menit (dari ${startTime} s/d ${endTime})\n`;
                        reportText += `   - Kategori: ${entry.extra.category}\n`;
                    }
                    if (entry.extra.relatedIdeas && entry.extra.relatedIdeas.length > 0) {
                        reportText += `   - Ide terkait:\n`;
                        entry.extra.relatedIdeas.forEach(idea => {
                            reportText += `     • ${idea.title}\n`;
                        });
                    }
                }
                reportText += `\n`; // Beri spasi antar entri
            });
        }

        // 4. Tampilkan hasilnya
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

async function handleStopActivity(activity) {
    if (!activity) return;

    const { value: moodEndValue } = await Swal.fire({
        title: 'Bagaimana moodmu sekarang?', icon: 'question', input: 'select',
        inputOptions: { '-2': 'Sangat Sedih 😢', '-1': 'Sedih 🙁', '0': 'Netral 😐', '1': 'Senang 🙂', '2': 'Sangat Senang 😊' },
        inputPlaceholder: 'Pilih mood', showCancelButton: true
    });

    if (moodEndValue) {
        const moodEndText = getMoodText(moodEndValue);
        const durationInMinutes = Math.floor((new Date() - activity.timestamp.toDate()) / (1000 * 60));

        await updateDoc(doc(db, "entries", activity.id), {
            'extra.status': 'completed',
            'extra.duration': durationInMinutes,
            'extra.moodAtEnd': moodEndText,
            'extra.endTime': new Date(),
            'extra.relatedIdeas': ideasDuringActivity
        });

        activeActivityEntry = null;
        Swal.fire('Selesai!', 'Aktivitasmu berhasil dicatat.', 'success');
    }
}

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

function renderTimeline() {
    if (activityTimerInterval) clearInterval(activityTimerInterval);
    activeActivityEntry = null;

    timelineList.innerHTML = '';
    const searchQuery = timelineSearchInput.value.toLowerCase();
    const timelineEntries = allEntries.filter(e => e.type !== 'idea');
    const filteredEntries = timelineEntries.filter(entry => {
        const content = (entry.content || '').toLowerCase();
        const category = (entry.extra.category || '').toLowerCase();
        const tags = (entry.extra.tags || []).join(' ').toLowerCase();
        return content.includes(searchQuery) || category.includes(searchQuery) || tags.includes(searchQuery);
    });

    if (filteredEntries.length === 0) {
        timelineList.innerHTML = '<p class="empty-state">Tidak ada entri untuk hari ini.</p>';
        return;
    }

    const entriesByHour = filteredEntries.reduce((acc, entry) => {
        const hour = dayjs(entry.timestamp.toDate()).format('HH');
        if (!acc[hour]) acc[hour] = [];
        acc[hour].push(entry);
        return acc;
    }, {});

    const sortedHours = Object.keys(entriesByHour).sort().reverse();
    sortedHours.forEach(hour => {
        const entriesInHour = entriesByHour[hour];
        const hourGroup = document.createElement('div');
        hourGroup.className = 'hourly-group';

        const activitiesCount = entriesInHour.filter(e => e.type === 'activity').length;
        const moodsCount = entriesInHour.filter(e => e.type === 'mood').length;
        let summaryText = [];
        if (activitiesCount > 0) summaryText.push(`${activitiesCount} Aktivitas`);
        if (moodsCount > 0) summaryText.push(`${moodsCount} Mood`);

        let entriesHTML = entriesInHour.map(entry => {
            let actionsHTML = '';
            if (entry.type === 'activity' && entry.extra.status === 'running') {
                activeActivityEntry = entry;
                startActivityTimer(entry.id, entry.timestamp.toDate());
                actionsHTML = `
                    <div class="running-activity-controls">
                        <p id="timer-${entry.id}">Menghitung...</p>
                        <button class="quick-add-idea-btn-timeline btn-secondary" data-id="${entry.id}">Tambah Ide</button>
                        <button class="stop-activity-btn-timeline btn-danger" data-id="${entry.id}">Selesai</button>
                    </div>`;
            } else {
                actionsHTML = `
                    <div class="entry-actions">
                        <button class="edit-btn" data-id="${entry.id}">✏️</button>
                        <button class="delete-btn" data-id="${entry.id}">🗑️</button>
                    </div>`;
            }
            return `
                <div class="timeline-item" data-time="${dayjs(entry.timestamp.toDate()).format('HH:mm')}">
                    <div class="content-card">
                        ${actionsHTML}
                        <h3>${formatEntryTitle(entry)}</h3>
                        <div class="details">${formatEntryDetails(entry)}</div>
                    </div>
                </div>`;
        }).join('');

        hourGroup.innerHTML = `
            <button class="hourly-header">
                <span class="hour-label">${hour}:00</span>
                <span class="hour-summary">${summaryText.join(', ')}</span>
                <span class="toggle-icon">▼</span>
            </button>
            <div class="hourly-content">${entriesHTML}</div>`;
        timelineList.appendChild(hourGroup);
    });
}

function renderIdeaBoard() {
    ['pending', 'in-progress', 'done'].forEach(status => {
        document.getElementById(`idea-col-${status}`).innerHTML = '';
    });

    const ideas = allEntries.filter(e => e.type === 'idea');
    ideas.forEach(idea => {
        let detailsContent = [];
        if (idea.extra.moodAtCreation) {
            detailsContent.push(`Mood: ${getMoodEmoji(idea.extra.moodAtCreation)}`);
        }
        if (idea.extra.deadline) {
            detailsContent.push(`Deadline: ${dayjs(idea.extra.deadline).format('D MMM')}`);
        }

        const ideaCardHTML = `
            <div class="idea-card" data-id="${idea.id}">
                <h4 class="idea-card-title">${idea.content}</h4>
                ${detailsContent.length > 0 ? `<p class="idea-card-details">${detailsContent.join('<br>')}</p>` : ''}
            </div>`;

        const status = idea.extra.status || 'pending';
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
                    await updateDoc(doc(db, "entries", ideaId), { 'extra.status': newStatus });
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
        collection(db, "entries"),
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
    try {
        await addDoc(collection(db, "entries"), {
            userId: currentUserId,
            timestamp: serverTimestamp(),
            type, content, extra
        });
    } catch (error) {
        console.error("Error adding entry: ", error);
        Swal.fire('Error', 'Gagal menyimpan catatan.', 'error');
    }
}

function handleDeleteEntry(id) {
    Swal.fire({
        title: 'Hapus Catatan?', text: "Tindakan ini tidak bisa dibatalkan!",
        icon: 'warning', showCancelButton: true,
        confirmButtonColor: '#d33', confirmButtonText: 'Ya, hapus!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            await deleteDoc(doc(db, "entries", id));
            Swal.fire('Terhapus!', 'Catatan Anda telah dihapus.', 'success');
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
        await updateDoc(doc(db, "entries", id), { content: newContent });
        Swal.fire('Diperbarui!', 'Catatan Anda telah diperbarui.', 'success');
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
    const activities = allEntries.filter(e => e.type === 'activity' && e.extra.status === 'completed');
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

// main.js - Bagian 10

// main.js - Bagian 10

// GANTI LAGI FUNGSI drawMoodChart YANG LAMA DENGAN VERSI FINAL INI:
function drawMoodChart() {
    if (moodChartInstance) moodChartInstance.destroy();

    const moodEntries = allEntries.filter(e => e.type === 'mood' && e.timestamp);
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

    const activities = allEntries.filter(e => e.type === 'activity');
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

    let chartTitle = '';
    let startDate;

    if (currentDurationChartPeriod === 'week') {
        chartTitle = 'Waktu per Kategori (7 Hari Terakhir)';
        startDate = dayjs().subtract(6, 'days').startOf('day');
    } else { // month
        chartTitle = 'Waktu per Kategori (30 Hari Terakhir)';
        startDate = dayjs().subtract(29, 'days').startOf('day');
    }

    // 1. Filter aktivitas yang selesai dalam rentang waktu yang dipilih
    const filteredActivities = allEntries.filter(e =>
        e.type === 'activity' &&
        e.extra.status === 'completed' &&
        e.timestamp &&
        dayjs(e.timestamp.toDate()).isAfter(startDate)
    );

    if (filteredActivities.length === 0) return; // Jangan gambar jika kosong

    // 2. Hitung total durasi untuk setiap kategori
    const durationByCategory = filteredActivities.reduce((acc, entry) => {
        const category = entry.extra.category || 'Lainnya';
        const duration = entry.extra.duration || 0;
        acc[category] = (acc[category] || 0) + duration;
        return acc;
    }, {});

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