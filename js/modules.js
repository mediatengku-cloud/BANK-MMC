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
