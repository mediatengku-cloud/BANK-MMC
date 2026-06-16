// ==================== INVOICE MODULE (UPDATED - FIX DP/LUNAS SYNC) ====================

function saveInvoice() {
    const id = document.getElementById('invoiceId').value;
    const type = document.getElementById('invoiceType').value;
    const customerId = document.getElementById('invoiceCustomer').value;
    const customerName = document.getElementById('invoiceCustomerName').value;
    const customerPhone = document.getElementById('invoiceCustomerPhone').value;
    const customerAddress = document.getElementById('invoiceCustomerAddress').value;
    const total = parseFloat(document.getElementById('invoiceTotal').value) || 0;
    const dp = parseFloat(document.getElementById('invoiceDP').value) || 0;
    const status = document.getElementById('invoiceStatus').value;
    const walletId = document.getElementById('invoiceWallet').value;
    
    if (!customerName || total <= 0) {
        alert('⚠️ Nama pelanggan dan total invoice wajib diisi!');
        return;
    }
    if ((status === 'Lunas' || status === 'DP') && !walletId) {
        alert('⚠️ Pilih dompet penerima untuk DP/Lunas!');
        return;
    }
    
    const invoices = loadData(DB.invoices);
    const transactions = loadData(DB.transactions);
    const now = Date.now();
    
    let invoiceData = {
        type, customerId, customerName, customerPhone, customerAddress,
        total, dp, remaining: total - dp, status, walletId,
        items: JSON.parse(JSON.stringify(invoiceItems)),
        note: document.getElementById('invoiceNote').value,
        date: new Date().toISOString().split('T'),
        createdAt: now
    };
    
    if (type === 'print') {
        invoiceData.specs = {
            bookSize: document.getElementById('printBookSize').value,
            binding: document.getElementById('printBinding').value,
            finalSize: document.getElementById('printFinalSize').value,
            paperType: document.getElementById('printPaperType').value,
            coverType: document.getElementById('printCoverType').value,
            laminating: document.getElementById('printLaminating').value,
            wrapping: document.getElementById('printWrapping').value
        };
    } else if (type === 'laptop') {
        invoiceData.specs = {
            laptopName: document.getElementById('laptopName').value,
            processor: document.getElementById('laptopProcessor').value,
            ram: document.getElementById('laptopRam').value,
            storage: document.getElementById('laptopStorage').value,
            screen: document.getElementById('laptopScreen').value,
            condition: document.getElementById('laptopCondition').value,
            warranty: document.getElementById('laptopWarranty').value
        };
    } else if (type === 'umum') {
        invoiceData.specs = {
            umumType: document.getElementById('umumType').value,
            umumDesc: document.getElementById('umumDesc').value
        };
    }
    
    let inv;
    if (id) {
        // EDIT MODE - HAPUS TRANSAKSI LAMA TERLEBIH DAHULU
        const idx = invoices.findIndex(i => i.id === id);
        if (idx >= 0) {
            const oldInvoice = invoices[idx];
            const oldTransIds = oldInvoice.transactionIds || [];
            
            // HAPUS TRANSAKSI LAMA
            const filteredTrans = transactions.filter(t => !oldTransIds.includes(t.id));
            
            // UPDATE INVOICE
            invoices[idx] = { 
                ...oldInvoice, 
                ...invoiceData, 
                id: oldInvoice.id, 
                number: oldInvoice.number, 
                transactionIds: [] 
            };
            
            saveData(DB.transactions, filteredTrans);
            inv = invoices[idx];
        }
    } else {
        // CREATE MODE
        invoiceData.id = generateId();
        invoiceData.number = generateInvoiceNumber();
        invoiceData.transactionIds = [];
        invoices.push(invoiceData);
        inv = invoiceData;
    }
    
    inv.transactionIds = inv.transactionIds || [];
    const newTransIds = [];
    
    // BUAT TRANSAKSI BARU BERDASARKAN STATUS
    if (status === 'DP' || status === 'Lunas') {
        if (dp > 0) {
            const dpTrans = {
                id: generateId(),
                type: 'income',
                date: inv.date,
                category: 'DP Invoice',
                description: `DP Invoice ${inv.number} - ${customerName}`,
                amount: dp,
                walletId: walletId,
                invoiceId: inv.id,
                createdAt: now
            };
            transactions.push(dpTrans);
            newTransIds.push(dpTrans.id);
        }
        
        if (status === 'Lunas' && inv.remaining > 0) {
            const pelunasanTrans = {
                id: generateId(),
                type: 'income',
                date: inv.date,
                category: 'Pelunasan Invoice',
                description: `Pelunasan Invoice ${inv.number} - ${customerName}`,
                amount: inv.remaining,
                walletId: walletId,
                invoiceId: inv.id,
                createdAt: now + 1
            };
            transactions.push(pelunasanTrans);
            newTransIds.push(pelunasanTrans.id);
        }
    }
    
    inv.transactionIds = newTransIds;
    
    saveData(DB.invoices, invoices);
    saveData(DB.transactions, transactions);
    addActivity(id ? `✏️ Mengupdate invoice ${inv.number}` : `📄 Membuat invoice baru ${inv.number}`);
    closeModal('invoiceModal');
    recalculateAll();
    renderAll();
}

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
