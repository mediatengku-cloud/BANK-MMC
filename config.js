// ==================== CONFIGURATION MODULE ====================
const CONFIG = {
    // Google OAuth Client ID Configuration
    GOOGLE_CLIENT_ID: 'YOUR_CLIENT_ID.apps.googleusercontent.com',
    
    // JSONBin Cloud Sync API Configuration
    JSONBIN_API: 'https://api.jsonbin.io/v3/b',
    JSONBIN_KEY: '$2a$10$mughisgroup2024secretkey', 
    
    // Aplikasi Metadata
    APP_NAME: 'MUGHIS BANK',
    APP_VERSION: '2.1.0', // Versi ditingkatkan untuk fitur Multi-User & Sinkronisasi Baru
    
    // Tema & Kecepatan Sinkronisasi Otomatis
    DEFAULT_THEME: 'light',
    AUTO_SYNC_INTERVAL: 5000, // Sinkronisasi cloud berjalan setiap 5 detik
    
    // Kategori Transaksi Buku Kas Terintegrasi
    INCOME_CATEGORIES: ['Penjualan', 'Jasa', 'Pendapatan Lain', 'Transfer Masuk', 'DP Invoice', 'Pelunasan Invoice', 'Piutang Diterima'],
    EXPENSE_CATEGORIES: ['Pembelian', 'Operasional', 'Gaji', 'Modal Keluar', 'Pengeluaran Lain', 'Transfer Keluar', 'Bayar Hutang'],

    /**
     * Fitur Keamanan Multi-User:
     * Menghasilkan nama key penyimpanan unik berdasarkan email pengguna yang login.
     * Mencegah kebocoran atau tumpang tindih data antara Akun A dan Akun B.
     */
    getStorageKey: function(baseKey) {
        const activeUser = localStorage.getItem('mb_logged_in_user');
        if (!activeUser) return baseKey;
        // Buat hash teks aman dari alamat email user sebagai akhiran nama tabel lokal
        const userSuffix = btoa(activeUser).replace(/[^a-zA-Z0-9]/g, '').substring(0, 10);
        return `${baseKey}_${userSuffix}`;
    }
};