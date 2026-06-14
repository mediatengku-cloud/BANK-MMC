// ==================== TRANSAKSI & INVOICE MANAGEMENT MODULE ====================

/**
 * 1 & 3. FUNGSI TOMBOL PELUNASAN INSTAN INVOICE (SINKRONISASI MANTAP ANTI BERGANDA)
 * Mengubah status invoice menjadi Lunas secara langsung dan mencatat sisa dana masuk ke Kas Bank.
 */
function processInstantInvoicePayment(invoiceId) {
    if (!confirm("Apakah Anda yakin ingin menyelesaikan pembayaran untuk invoice ini secara instan?")) return;

    const invoiceKey = CONFIG.getStorageKey('mughis_invoices');
    const transactionKey = CONFIG.getStorageKey('mughis_transactions');
    
    let invoices = JSON.parse(localStorage.getItem(invoiceKey)) || [];
    let transactions = JSON.parse(localStorage.getItem(transactionKey)) || [];
    
    const idx = invoices.findIndex(i => i.id === invoiceId);
    if (idx === -1) return;
    
    let inv = invoices[idx];
    if (inv.status === 'Lunas') {
        alert("Invoice ini sudah berstatus lunas sebelumnya.");
        return;
    }
    
    let cashInflowAmount = 0;
    let descriptionText = "";
    
    if (inv.status === 'DP') {
        // Logika Sinkronisasi: Ambil selisih kekurangan pembayaran saja (Total - Nilai DP)
        cashInflowAmount = parseFloat(inv.total) - parseFloat(inv.dpAmount || 0);
        descriptionText = `Pelunasan sisa invoice No: ${inv.invoiceNumber} - Pelanggan: ${inv.customerName}`;
    } else {
        // Jika sebelumnya Belum Lunas sama sekali, masukkan angka total penuh ke dalam kas masuk
        cashInflowAmount = parseFloat(inv.total);
        descriptionText = `Pembayaran penuh invoice No: ${inv.invoiceNumber} - Pelanggan: ${inv.customerName}`;
    }
    
    // Injeksi objek pencatatan kas masuk baru
    const newPaymentTrx = {
        id: 'TRX-PAY-' + Date.now(),
        date: new Date().toISOString().split('T')[0],
        type: 'income',
        category: 'Pelunasan Invoice',
        amount: cashInflowAmount,
        description: descriptionText,
        walletId: inv.walletId || 'wb1',
        invoiceId: inv.id
    };
    
    transactions.push(newPaymentTrx);
    
    // Perbarui status utama invoice lokal
    invoices[idx].status = 'Lunas';
    invoices[idx].remainingPayment = 0;
    if(!invoices[idx].transactionIds) invoices[idx].transactionIds = [];
    invoices[idx].transactionIds.push(newPaymentTrx.id);
    
    // Simpan data ke localstorage yang terisolasi per akun
    localStorage.setItem(invoiceKey, JSON.stringify(invoices));
    localStorage.setItem(transactionKey, JSON.stringify(transactions));
    
    // Catat log aktivitas sistem
    logSystemActivity('Pelunasan Invoice', `Invoice No ${inv.invoiceNumber} berhasil dilunasi instan sebesar Rp ${cashInflowAmount.toLocaleString()}`);
    
    alert("Sinkronisasi Berhasil! Invoice dinyatakan lunas dan sisa kas masuk tercatat rapi.");
    
    // Segera picu fungsi render ulang dashboard jika tersedia
    if (typeof initApplicationData === "function") {
        initApplicationData();
    } else {
        location.reload();
    }
}

/**
 * 4. FUNGSI GENERATOR EKSPOR SLIP GAMBAR BESAR RASIO UKURAN KERTAS A4
 * Membaca pilihan layout portrait/landscape dan merelasikan isi teks panjang agar rapi tertangkap html2canvas.
 */
function generateLargeA4SlipImage() {
    const layoutSelection = document.querySelector('input[name="slipPrintLayout"]:checked').value;
    const hiddenArea = document.getElementById('slipCaptureArea');
    const invoiceSourceHtml = document.getElementById('invoiceDetailContent').innerHTML;
    
    // Duplikat template invoice ke penampung capture tersembunyi
    hiddenArea.innerHTML = invoiceSourceHtml;
    
    // Setel kelas penyesuaian dimensi CSS A4
    if (layoutSelection === 'a4-landscape') {
        hiddenArea.className = 'a4-landscape-wrapper';
    } else {
        hiddenArea.className = 'a4-portrait-wrapper';
    }
    
    alert("Sistem sedang mengompilasi lembar slip kertas A4 resolusi tinggi, mohon tunggu sebentar...");
    
    html2canvas(hiddenArea, {
        scale: 2, // Kerapatan piksel ganda (HD) agar tulisan teks kecil panjang tidak pecah/blur
        useCORS: true,
        backgroundColor: '#ffffff'
    }).then(canvas => {
        const generatedBase64Image = canvas.toDataURL("image/png");
        
        // Eksekusi trigger download berkas gambar otomatis ke perangkat pengguna
        const downloadAnchor = document.createElement('a');
        downloadAnchor.download = `SLIP_MUGHIS_BANK_A4_${Date.now()}.png`;
        downloadAnchor.href = generatedBase64Image;
        downloadAnchor.click();
        
        // Kosongkan kembali area render tersembunyi
        hiddenArea.innerHTML = "";
        hiddenArea.className = "";
    }).catch(err => {
        console.error("Gagal mencetak dokumen foto slip:", err);
        alert("Terjadi kendala saat merender format foto cetak A4.");
    });
}

/**
 * Fungsi pembantu pencatatan log aktivitas mandiri
 */
function logSystemActivity(actionType, detailMessage) {
    const activityKey = CONFIG.getStorageKey('mughis_activities');
    let logs = JSON.parse(localStorage.getItem(activityKey)) || [];
    logs.unshift({
        id: 'LOG-' + Date.now(),
        time: new Date().toLocaleTimeString('id-ID'),
        date: new Date().toISOString().split('T')[0],
        type: actionType,
        details: detailMessage
    });
    localStorage.setItem(activityKey, JSON.stringify(logs.slice(0, 30))); // Batasi maksimal 30 riwayat teratas
}