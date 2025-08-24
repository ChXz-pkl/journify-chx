// onboarding.js
// Deskripsi: File ini berisi semua logika untuk tur interaktif pengguna baru
// menggunakan library Shepherd.js.

/**
 * FITUR: Tur Onboarding Interaktif untuk Pengguna Baru
 * Deskripsi: Fungsi ini menginisialisasi dan memulai tur langkah-demi-langkah
 * untuk memperkenalkan fitur-fitur utama Journify kepada pengguna baru.
 * @param {object} tourInstance - Instance Shepherd.Tour yang sudah ada jika ada.
 * @returns {object} Instance Shepherd.Tour yang aktif.
 */
export function startOnboardingTour() {
    // Inisialisasi tur dengan konfigurasi default
    const tour = new Shepherd.Tour({
        useModalOverlay: true, // Memberi fokus pada elemen yang ditunjuk
        defaultStepOptions: {
            classes: 'shepherd-theme-arrows-plain-buttons',
            scrollTo: { behavior: 'smooth', block: 'center' },
            cancelIcon: {
                enabled: true,
            },
        },
    });

    // Langkah 1: Sambutan Awal
    tour.addStep({
        id: 'welcome',
        title: '👋 Selamat Datang di Journify!',
        text: 'Senang bertemu denganmu! Mari kita lihat fitur-fitur keren yang bisa membantumu memahami harimu dengan lebih baik.',
        buttons: [{
            text: 'Mulai Tur',
            action: tour.next,
        }, ],
    });

    // Langkah 2: Mencatat Mood
    tour.addStep({
        id: 'record-mood',
        title: 'Lacak Perasaanmu',
        text: 'Semuanya dimulai dari sini. Gunakan slider ini untuk mencatat bagaimana perasaanmu saat ini. Ini akan membantumu melihat pola emosional dari waktu ke waktu.',
        attachTo: {
            element: '.mood-slider-container',
            on: 'bottom',
        },
        buttons: [{
            text: 'Selanjutnya',
            action: tour.next,
        }, ],
    });

    // Langkah 3: Melacak Aktivitas
    tour.addStep({
        id: 'track-activity',
        title: 'Catat Aktivitasmu',
        text: 'Klik tab "Aktivitas" untuk mulai melacak apa yang sedang kamu kerjakan. Kamu bisa mengatur kategori dan bahkan melihat perubahan mood sebelum dan sesudahnya!',
        attachTo: {
            element: '.input-tab-btn[data-type="activity"]',
            on: 'bottom',
        },
        buttons: [{
            text: 'Selanjutnya',
            action: tour.next,
        }, ],
    });
    
    // Langkah 4: Melihat Timeline
    tour.addStep({
        id: 'view-timeline',
        title: 'Timeline Ajaibmu',
        text: 'Semua yang kamu catat—mood dan aktivitas—akan muncul di sini secara kronologis. Ini adalah pusat dari seluruh ceritamu.',
        attachTo: {
            element: '.timeline-container',
            on: 'top',
        },
        buttons: [{
            text: 'Selesai!',
            action: tour.complete,
        }, ],
    });

    // Mulai tur
    tour.start();

    return tour;
}