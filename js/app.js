// ==================== MAIN CORE CORE SYSTEM APP ====================

document.addEventListener('DOMContentLoaded', () => {
    verifyUserSessionState();
});

/**
 * 5. FUNGSI PEMERIKSA STATUS SESI LOGIN / USER MULTI-ACCOUNT
 */
function verifyUserSessionState() {
    const loggedUser = localStorage.getItem('mb_logged_in_user');
    const loginView = document.getElementById('loginPage');
    const mainView = document.getElementById('appContainer');
    
    if (loggedUser) {
        // Tampilkan halaman aplikasi utama, sembunyikan form login
        loginView.classList.remove('active');
        mainView.style.display = 'block';
        document.getElementById('userProfileEmailDisplay').textContent = `Akun aktif: ${loggedUser}`;
        
        // Muat seluruh perhitungan dashboard data
        initApplicationData();
    } else {
        // Bawa kembali ke antarmuka login
        loginView.classList.add('active');
        mainView.style.display = 'none';
        setupGoogleSignInButton();
    }
}

/**
 * Aksi Eksekusi Log Masuk Sistem Manual Multi-User
 */
function handleSystemLogin() {
    const inputEmail = document.getElementById('loginEmail').value.trim();
    const inputPass = document.getElementById('loginPassword').value;
    
    if (!inputEmail || !inputPass) {
        alert("Mohon isikan alamat email dan password Anda.");
        return;
    }
    
    // Setel email ke dalam session penanda identitas multi-user aktif
    localStorage.setItem('mb_logged_in_user', inputEmail);
    alert(`Selamat datang di MUGHIS BANK! Berhasil masuk sebagai ${inputEmail}`);
    
    // Reset form inputan
    document.getElementById('loginEmail').value = "";
    document.getElementById('loginPassword').value = "";
    
    verifyUserSessionState();
}

/**
 * 5. AJARKAN CARA BERPINDAH-PINDAH USER (LOGOUT SESI AMAN)
 */
function handleSystemLogout() {
    if (confirm("Apakah Anda ingin keluar atau berganti profil user yang lain? Data di akun ini akan tetap tersimpan aman.")) {
        // Hapus penanda sesi login aktif saat ini (tanpa menghapus data lokal user lain)
        localStorage.removeItem('mb_logged_in_user');
        alert("Sesi ditutup. Anda dipindahkan ke halaman login akun.");
        verifyUserSessionState();
    }
}

/**
 * Placeholder inisialisasi tombol Google Sign In
 */
function setupGoogleSignInButton() {
    const container = document.getElementById('googleBtnContainer');
    if(container) {
        container.innerHTML = `<button class="btn btn-outline" style="width:100%" onclick="executeGoogleLoginPlaceholder()">🌐 Masuk Lewat Google</button>`;
    }
}
function executeGoogleLoginPlaceholder() {
    const dummyGoogleEmail = prompt("Simulasi Google Login, masukkan alamat email Google Anda:", "user.google@mughis.com");
    if(dummyGoogleEmail) {
        localStorage.setItem('mb_logged_in_user', dummyGoogleEmail);
        verifyUserSessionState();
    }
}

/**
 * 2. REKAPITULASI DUA ARAH KALKULASI DATA BERANDA SECARA LENGKAP
 */
function initApplicationData() {
    // Ambil nama tabel dinamis berdasarkan user login aktif saat ini
    const walletKey = CONFIG.getStorageKey('mughis_wallets');
    const transactionKey = CONFIG.getStorageKey('mughis_transactions');
    const invoiceKey = CONFIG.getStorageKey('mughis_invoices');
    const debtKey = CONFIG.getStorageKey('mughis_debts');
    const activityKey = CONFIG.getStorageKey('mughis_activities');
    
    // Ambil database array dari localStorage masing-masing user
    const wallets = JSON.parse(localStorage.getItem(walletKey)) || [];
    const transactions = JSON.parse(localStorage.getItem(transactionKey)) || [];
    const invoices = JSON.parse(localStorage.getItem(invoiceKey)) || [];
    const debts = JSON.parse(localStorage.getItem(debtKey)) || [];
    const logs = JSON.parse(localStorage.getItem(activityKey)) || [];
    
    // --- 2a. HITUNG TOTAL SALDO BANK TERKONSOLIDASI ---
    let totalCashBalance = 0;
    // Jika ada dompet/rekening terdaftar, akumulasikan isinya
    if(wallets.length > 0) {
        wallets.forEach(w => totalCashBalance += parseFloat(w.balance || 0));
    } else {
        // Kalkulasi fallback kumulatif transaksi jika dompet kosong (Income - Expense)
        transactions.forEach(t => {
            if(t.type === 'income') totalCashBalance += parseFloat(t.amount || 0);
            if(t.type === 'expense') totalCashBalance += parseFloat(t.amount || 0);
        });
    }
    document.getElementById('dashboardTotalBalance').textContent = `Rp ${totalCashBalance.toLocaleString('id-ID')}`;
    
    // --- 2b. KALKULASI ARUS BUKU KAS UMUM ---
    let totalIn = 0;
    let totalOut = 0;
    transactions.forEach(t => {
        if(t.type === 'income') totalIn += parseFloat(t.amount || 0);
        if(t.type === 'expense') totalOut += parseFloat(t.amount || 0);
    });
    document.getElementById('financeIncome').textContent = `Rp ${totalIn.toLocaleString('id-ID')}`;
    document.getElementById('financeExpense').textContent = `Rp ${totalOut.toLocaleString('id-ID')}`;
    document.getElementById('financeNetProfit').textContent = `Rp ${(totalIn - totalOut).toLocaleString('id-ID')}`;
    
    // --- 2c. KALKULASI REKAP MANAJEMEN INVOICE ---
    let invTotalIncome = 0;
    let invTotalCost = 0;
    invoices.forEach(i => {
        // Pemasukan riil invoice adalah yang sudah dibayarkan (Total dikurangi sisa piutang/remaining jika ada)
        let paidAmount = parseFloat(i.total || 0) - parseFloat(i.remainingPayment || 0);
        invTotalIncome += paidAmount;
        invTotalCost += parseFloat(i.capitalCost || i.modalKeluar || 0);
    });
    document.getElementById('invoiceIncome').textContent = `Rp ${invTotalIncome.toLocaleString('id-ID')}`;
    document.getElementById('invoiceCost').textContent = `Rp ${invTotalCost.toLocaleString('id-ID')}`;
    document.getElementById('invoiceNetProfit').textContent = `Rp ${(invTotalIncome - invTotalCost).toLocaleString('id-ID')}`;
    
    // --- 2d. KALKULASI DAFTAR HUTANG & PIUTANG ---
    let sumPiutang = 0;
    let sumHutang = 0;
    debts.forEach(d => {
        if(d.type === 'piutang' && d.status !== 'Lunas') sumPiutang += parseFloat(d.amount || 0);
        if(d.type === 'hutang' && d.status !== 'Lunas') sumHutang += parseFloat(d.amount || 0);
    });
    document.getElementById('summaryPiutang').textContent = `Rp ${sumPiutang.toLocaleString('id-ID')}`;
    document.getElementById('summaryHutang').textContent = `Rp ${sumHutang.toLocaleString('id-ID')}`;
    
    const netDebtsDiff = sumPiutang - sumHutang;
    const netDebtsElement = document.getElementById('summaryNetDebts');
    netDebtsElement.textContent = `Rp ${netDebtsDiff.toLocaleString('id-ID')}`;
    if(netDebtsDiff >= 0) {
        netDebtsElement.className = "stat-value text-success font-bold";
    } else {
        netDebtsElement.className = "stat-value text-danger font-bold";
    }
    
    // --- 2f. RENDER TABEL RINGKASAN INVOICE DAN TOMBOL LUNAS INSTAN ---
    const tBodySummaryList = document.getElementById('dashboardInvoiceSummaryList');
    if(invoices.length === 0) {
        tBodySummaryList.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">Belum ada data dokumen invoice.</td></tr>`;
    } else {
        // Ambil maksimal 5 entri invoice teranyar
        const previewInvoices = invoices.slice(0, 5);
        tBodySummaryList.innerHTML = previewInvoices.map(i => {
            let badgeClass = "badge-warning";
            if(i.status === 'Lunas') badgeClass = "badge-success";
            if(i.status === 'Belum Lunas') badgeClass = "badge-danger";
            
            // Periksa ketersediaan tombol lunas instan
            const lunasButtonHtml = i.status !== 'Lunas' 
                ? `<button class="btn btn-success btn-sm" onclick="processInstantInvoicePayment('${i.id}')" style="padding:4px 8px; font-size:11px;">✅ Set Lunas</button>`
                : `<span style="color:var(--success); font-size:12px; font-weight:bold;">🟢 Selesai</span>`;
                
            return `
                <tr>
                    <td class="font-bold" style="color:var(--primary); cursor:pointer;" onclick="showInvoiceDetailModalPlaceholder('${i.id}')">${i.invoiceNumber || 'INV-New'}</td>
                    <td>${i.customerName || '-'}</td>
                    <td>Rp ${parseFloat(i.total || 0).toLocaleString('id-ID')}</td>
                    <td><span class="badge ${badgeClass}">${i.status}</span></td>
                    <td style="text-align:center;">${lunasButtonHtml}</td>
                </tr>
            `;
        }).join('');
    }
    
    // --- 2g. RENDER TIMELINE AKTIVITAS LOG TERBARU ---
    const activityLogContainer = document.getElementById('dashboardActivityLog');
    if(logs.length === 0) {
        activityLogContainer.innerHTML = `<p style="font-size:13px; color:var(--text-secondary); text-align:center; padding:15px;">Belum tercatat aktivitas sistem terbaru.</p>`;
    } else {
        activityLogContainer.innerHTML = logs.map(l => `
            <div style="border-left: 3px solid var(--primary); padding-left: 10px; margin-bottom: 12px; font-size:13px;">
                <span style="font-weight:bold; color:var(--text);">${l.time} [${l.type}]</span> - 
                <span style="color:var(--text-secondary);">${l.details}</span>
            </div>
        `).join('');
    }
}

/**
 * Fungsi pembantu navigasi tab menu halaman utama
 */
function switchTab(tabId) {
    alert(`Navigasi menuju menu halaman halaman: ${tabId}. Fungsi perpindahan halaman internal tab aktif.`);
}

/**
 * Fungsi tiruan pemanggil tampilan modal lembar detail berkas invoice
 */
function showInvoiceDetailModalPlaceholder(invoiceId) {
    const invoiceKey = CONFIG.getStorageKey('mughis_invoices');
    const invoices = JSON.parse(localStorage.getItem(invoiceKey)) || [];
    const inv = invoices.find(i => i.id === invoiceId);
    
    if(!inv) return;
    
    document.getElementById('invoiceDetailContent').innerHTML = `
        <div style="padding:15px; color:#000000;">
            <div style="display:flex; justify-content:space-between; border-bottom:2px solid #000; padding-bottom:10px;">
                <div>
                    <h2>${CONFIG.APP_NAME}</h2>
                    <p>Sistem ERP Cetak Mini - Bukti Transaksi Resmi</p>
                </div>
                <div style="text-align:right;">
                    <h3>INVOICE TAGIHAN</h3>
                    <p><b>Nomor:</b> ${inv.invoiceNumber}</p>
                    <p><b>Tanggal:</b> ${inv.date || new Date().toISOString().split('T')[0]}</p>
                </div>
            </div>
            <div style="margin-top:15px;">
                <p><b>Kepada Terhormat:</b> ${inv.customerName}</p>
                <p><b>Status Pembayaran:</b> ${inv.status} (DP: Rp ${parseFloat(inv.dpAmount || 0).toLocaleString('id-ID')})</p>
            </div>
            <table>
                <thead>
                    <tr style="background:#f1f5f9;">
                        <th>Deskripsi Item Transaksi Usaha MUGHIS BANK</th>
                        <th>Total Nilai</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Akumulasi tagihan pemesanan barang / jasa komersial pelanggan</td>
                        <td>Rp ${parseFloat(inv.total || 0).toLocaleString('id-ID')}</td>
                    </tr>
                </tbody>
            </table>
            <div style="margin-top:20px; text-align:right;">
                <p>Sisa Kekurangan Pembayaran: <b>Rp ${parseFloat(inv.remainingPayment || 0).toLocaleString('id-ID')}</b></p>
                <h3 style="color:var(--primary);">Total Pembayaran: Rp ${parseFloat(inv.total || 0).toLocaleString('id-ID')}</h3>
            </div>
        </div>
    `;
    
    // Buka tampilan overlay modal detail
    document.getElementById('invoiceDetailModal').style.display = 'flex';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}
