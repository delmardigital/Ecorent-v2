import { GoogleGenAI } from "@google/genai";

// --- Configuración Inicial ---
const DEFAULT_CATALOG = {
    categories: [
        { id: 'AUTOS', name: 'Autos', module: 'vehicle' },
        { id: 'SCOOTER', name: 'Scooter - Motorbikes', module: 'vehicle' },
        { id: 'BIKE_NORMAL', name: 'Normal Bikes', module: 'bike' },
        { id: 'BIKE_EB_CITY', name: 'E-Bike City', module: 'bike' },
        { id: 'BIKE_EMTB', name: 'E-MTB', module: 'bike' },
        { id: 'BIKE_EFAT', name: 'E-FatBIKE', module: 'bike' },
        { id: 'TOURS', name: 'Excursions', module: 'tour' },
        { id: 'PADDLE', name: 'Paddle Surf', module: 'tour' },
        { id: 'BOAT', name: 'Boat Rental', module: 'tour' }
    ],
    products: [
        { id: '1', name: 'Citroen C3 / Peugeot 208', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '2', name: 'NEW Toyota Aygo X BASIC', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '3', name: 'Toyota Aygo BASIC', cat: 'AUTOS', price: 45, module: 'vehicle' },
        { id: '4', name: 'TOYOTA AYGO OPEN', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '5', name: 'Piaggio Liberty 125cc', cat: 'SCOOTER', price: 35, module: 'vehicle' },
        { id: '6', name: 'PIAGGIO MEDLEY 125CC', cat: 'SCOOTER', price: 40, module: 'vehicle' },
        { id: '7', name: 'City Bike', cat: 'BIKE_NORMAL', price: 6, module: 'bike' },
        { id: '8', name: 'E-Bike City Bike', cat: 'BIKE_EB_CITY', price: 15, module: 'bike' },
        { id: '9', name: 'E-CITY BIKE Nuevo Modelo', cat: 'BIKE_EB_CITY', price: 20, module: 'bike' },
        { id: '10', name: 'E-Mountain Bike EMB', cat: 'BIKE_EMTB', price: 20, module: 'bike' },
        { id: '11', name: 'Discovery Tour 2 HOURS', cat: 'TOURS', price: 65, module: 'tour' },
        { id: '12', name: 'Tour Catamaran Palma', cat: 'TOURS', price: 35, module: 'tour' },
        { id: '13', name: 'Paddle Surf SUP', cat: 'PADDLE', price: 12, module: 'tour' },
        { id: '14', name: 'Boat Rental B450 Theia', cat: 'BOAT', price: 200, module: 'tour' }
    ]
};

const COMPANY_INFO = {
    name: "EcoRent Mobility Solutions",
    owner: "Sasha Kalko",
    address: "Calle Costa Brava 1, 07610 Palma",
    email: "info@ecorentmobility.com",
    web: "www.ecorentmobility.com"
};

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxZyzj2hH6sTlkxWbXe2TLepR8fH0rI1wNxAhgPprzTMGMkxT-EYtL2FH3aGOge3FOw/exec";

// --- Tipos e Interfaces ---
interface Settings { gasUrl: string; }
type ModuleType = 'vehicle' | 'bike' | 'tour';

interface Contract {
    id: string;
    contractNumber: string;
    createdAt: string; 
    createdFull: string; 
    updatedAt?: string;
    timestamp: number;
    module: ModuleType;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dni?: string;
    country?: string;
    type: string;
    product: string;
    start_date: string;
    start_time: string;
    end_date: string;
    end_time: string;
    duration: number;
    quantity: number;
    price_unit: number;
    total: number;
    notes: string;
    synced?: boolean; 
    deleted?: boolean; 
}

declare global {
    interface Window {
        navigate: (view: string) => void;
        toggleSettings: () => void;
        saveSettings: () => void;
        recalculateTotals: () => void;
        handleFormSubmit: (e: Event, module: ModuleType) => Promise<void>;
        showInvoice: (contract: Contract) => void;
        downloadPDF: (id: string) => void;
        shareWhatsApp: (id: string) => void;
        viewInvoice: (id: string) => void;
        deleteContract: (id: string, btn?: HTMLElement) => void;
        editContract: (id: string) => void;
        autofillCurrentForm: () => void;
        fillWithExampleData: () => void;
        toggleTheme: () => void;
        updateProductList: (module: ModuleType, catId: string) => void;
        syncAllToCloud: () => Promise<void>;
        contactIT: () => void;
        updateCatalogPrice: (id: string, newPrice: string) => void;
        toggleCatalogEdit: () => void;
    }
    var lucide: any;
    var QRCode: any;
    var html2pdf: any;
}

// --- Global State ---
const savedSettings = localStorage.getItem('ecorent_settings');
const savedCatalog = localStorage.getItem('ecorent_catalog');

let state = {
    currentView: 'dashboard',
    editingId: null as string | null,
    catalog: (savedCatalog ? JSON.parse(savedCatalog) : DEFAULT_CATALOG),
    catalogEditMode: false,
    contracts: JSON.parse(localStorage.getItem('ecorent_contracts') || '[]') as Contract[],
    settings: (savedSettings ? JSON.parse(savedSettings) : { gasUrl: DEFAULT_GAS_URL }) as Settings,
    lastId: parseInt(localStorage.getItem('ecorent_last_id') || '0'),
    lastClient: JSON.parse(localStorage.getItem('ecorent_last_client') || 'null'),
    theme: localStorage.getItem('ecorent_theme') || 'light'
};

// --- Logic functions ---
window.navigate = (view: string) => {
    state.currentView = view;
    state.editingId = null;
    render();
    document.querySelectorAll('.nav-tab').forEach(el => el.classList.remove('active'));
    const tabId = `nav-${view}`;
    document.getElementById(tabId)?.classList.add('active');
};

window.toggleTheme = () => {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveState();
};

const applyTheme = () => {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (state.theme === 'dark') document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.setAttribute('data-lucide', state.theme === 'light' ? 'moon' : 'sun');
        if (window.lucide) window.lucide.createIcons();
    }
};

window.toggleSettings = () => {
    const modal = document.getElementById('settings-modal');
    modal?.classList.toggle('hidden');
    modal?.classList.toggle('flex');
    if (!modal?.classList.contains('hidden')) {
        const gasInput = document.getElementById('gas-url') as HTMLInputElement;
        if (gasInput) gasInput.value = state.settings.gasUrl;
    }
};

window.saveSettings = () => {
    const url = (document.getElementById('gas-url') as HTMLInputElement).value;
    state.settings.gasUrl = url || DEFAULT_GAS_URL;
    saveState();
    window.toggleSettings();
    render();
};

window.contactIT = () => {
    const msg = encodeURIComponent("Hola, necesito asistencia técnica con el Sistema de Gestión EcoRent.");
    window.open(`https://wa.me/34698971708?text=${msg}`, '_blank');
};

window.autofillCurrentForm = () => {
    if (!state.lastClient) {
        alert("No hay datos guardados de clientes anteriores.");
        return;
    }
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) return;
    Object.keys(state.lastClient).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (input) input.value = state.lastClient[key] || '';
    });
    window.recalculateTotals();
};

window.fillWithExampleData = () => {
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) { alert("Entra en un módulo de alquiler primero."); return; }
    const examples: Record<string, string> = {
        firstName: "Alejandro", lastName: "García", email: "ejemplo@ecorent.com", phone: "+34 600000000",
        country: "España", dni: "12345678Z", price_unit: "50", quantity: "1", duration: "2"
    };
    Object.keys(examples).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`) as HTMLInputElement;
        if (input) input.value = examples[key];
    });
    window.recalculateTotals();
};

window.toggleCatalogEdit = () => {
    state.catalogEditMode = !state.catalogEditMode;
    render();
};

window.updateCatalogPrice = (id: string, newPrice: string) => {
    const pIndex = state.catalog.products.findIndex((p: any) => p.id === id);
    if (pIndex !== -1) {
        state.catalog.products[pIndex].price = parseFloat(newPrice) || 0;
        localStorage.setItem('ecorent_catalog', JSON.stringify(state.catalog));
    }
};

const saveState = () => {
    localStorage.setItem('ecorent_contracts', JSON.stringify(state.contracts));
    localStorage.setItem('ecorent_settings', JSON.stringify(state.settings));
    localStorage.setItem('ecorent_last_id', state.lastId.toString());
    localStorage.setItem('ecorent_theme', state.theme);
    updateSyncStatus();
};

const updateSyncStatus = () => {
    const led = document.getElementById('sync-status');
    if (led) led.className = `status-led ${state.settings.gasUrl ? 'text-green-500 bg-green-500 animate-pulse' : 'text-yellow-400 bg-yellow-400'}`;
};

const syncToSheets = async (contract: Contract) => {
    if (!state.settings.gasUrl) return false;
    try {
        const cleanPhone = contract.phone.replace(/\s+/g, '');
        const payload = {
            "numeroContrato": contract.contractNumber,
            "fecha": contract.createdAt,
            "nombre": contract.firstName,
            "apellido": contract.lastName,
            "email": contract.email,
            "telefono": cleanPhone,
            "pais": contract.country || "",
            "dni": contract.dni || "",
            "modelo": contract.product + (contract.deleted ? " [BORRADO]" : ""),
            "matricula": "",
            "tipoVehiculo": contract.type,
            "fechaEntrega": contract.start_date,
            "horaEntrega": contract.start_time,
            "fechaDevolucion": contract.end_date || "",
            "horaDevolucion": contract.end_time || "",
            "numDias": contract.duration,
            "precioTotal": contract.price_unit,
            "total": contract.total,
            "seguro": "",
            "comentarios": contract.notes || ""
        };
        
        await fetch(state.settings.gasUrl, { 
            method: 'POST', 
            mode: 'no-cors', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        contract.synced = true;
        saveState();
        return true;
    } catch (e) { 
        console.error("Error en sincronización:", e);
        return false; 
    }
};

window.syncAllToCloud = async () => {
    if (!state.settings.gasUrl) { alert("Configura la URL de Apps Script."); return; }
    const btn = document.getElementById('sync-all-btn');
    if (btn) btn.innerText = "Sincronizando...";
    
    const pending = state.contracts.filter(c => !c.synced);
    if (pending.length === 0) {
        alert("Todos los registros ya están en la nube.");
        if (btn) btn.innerText = "Enviar al excel nube";
        return;
    }

    let count = 0;
    for (const c of pending) {
        const success = await syncToSheets(c);
        if (success) count++;
    }
    
    alert(`Éxito: ${count} registros actualizados.`);
    if (btn) btn.innerText = "Enviar al excel nube";
    render();
};

window.deleteContract = async (id: string, btn?: HTMLElement) => {
    const confirmDelete = confirm("⚠️ ¿ESTÁS SEGURO DE ELIMINAR ESTE CONTRATO?\n\nEsta acción se registrará en la nube como auditoría de borrado.");
    
    if (confirmDelete) {
        if (btn) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
            btn.innerHTML = '<i data-lucide="loader-2" class="w-5 h-5 animate-spin"></i>';
            if (window.lucide) window.lucide.createIcons();
        }

        const index = state.contracts.findIndex(c => c.id === id);
        if (index !== -1) {
            const contract = state.contracts[index];
            const now = new Date();
            const timeStr = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
            
            // Acción de borrado lógico
            contract.deleted = true;
            contract.notes = (contract.notes ? contract.notes + " | " : "") + `❌ ELIMINADO EL: ${timeStr}`;
            contract.synced = false; 
            
            saveState();
            
            // Intento de sincronización inmediata con la nube
            if (state.settings.gasUrl) {
                const success = await syncToSheets(contract);
                if (success) {
                    console.log("Notificación de borrado enviada a la nube.");
                }
            }
            
            // Alerta final y refresco de vista
            alert(`✅ Contrato #${contract.contractNumber} eliminado con éxito.`);
            render();
        }
    }
};

const CommonAlquilerForm = (module: ModuleType, data: Partial<Contract> = {}) => {
    const isEdit = !!data.id;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toTimeString().split(' ')[0].slice(0, 5);
    const color = module === 'vehicle' ? 'red' : (module === 'bike' ? 'green' : 'blue');
    const labelTitle = module === 'vehicle' ? 'Vehículo' : (module === 'bike' ? 'Bicicleta' : 'Tour');

    return `
        <div class="space-y-8 animate-fade-in">
            <header class="flex items-center justify-between mb-8">
                <button onclick="window.navigate('dashboard')" class="btn-icon bg-gray-100 text-gray-600"><i data-lucide="chevron-left"></i></button>
                <h2 class="text-2xl font-extrabold text-${color}-600 tracking-tight">${isEdit ? 'Modificar' : 'Nuevo'} ${labelTitle}</h2>
                <div class="bg-${color}-50 text-${color}-700 px-4 py-1.5 rounded-full text-xs font-mono font-black border border-${color}-200/50">#${data.contractNumber || (state.lastId + 1).toString().padStart(6, '0')}</div>
            </header>
            <form id="main-form" onsubmit="window.handleFormSubmit(event, '${module}')" class="space-y-8">
                ${isEdit ? `<input type="hidden" name="id" value="${data.id}">` : ''}
                <div class="card p-8 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <input type="text" name="firstName" value="${data.firstName || ''}" placeholder="Nombre" required class="input-field">
                        <input type="text" name="lastName" value="${data.lastName || ''}" placeholder="Apellido" required class="input-field">
                        <input type="email" name="email" value="${data.email || ''}" placeholder="Email" required class="input-field">
                        <input type="tel" name="phone" value="${data.phone || ''}" placeholder="Teléfono" required class="input-field">
                        <input type="text" name="country" value="${data.country || ''}" placeholder="País" class="input-field">
                        <input type="text" name="dni" value="${data.dni || ''}" placeholder="DNI / Pasaporte" required class="input-field">
                    </div>
                </div>
                
                <div class="card p-8 space-y-6">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <select name="type" class="input-field" onchange="window.updateProductList('${module}', this.value)">
                            <option value="">Seleccionar tipo...</option>
                            ${state.catalog.categories.filter((c: any) => c.module === module).map((c: any) => `<option value="${c.id}" ${data.type === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                        <select name="product" id="product-select" class="input-field" required>
                            <option value="">Seleccionar modelo...</option>
                            ${data.product ? `<option value="${data.product}" selected>${data.product}</option>` : ''}
                        </select>
                    </div>

                    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
                        <div class="flex flex-col"><label class="text-[10px] font-bold text-muted uppercase ml-1">Cantidad</label><input type="number" name="quantity" value="${data.quantity || 1}" min="1" class="input-field" onchange="window.recalculateTotals()"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold text-muted uppercase ml-1">Fecha</label><input type="date" name="start_date" value="${data.start_date || today}" class="input-field" onchange="window.recalculateTotals()"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold text-muted uppercase ml-1">Hora</label><input type="time" name="start_time" value="${data.start_time || timeNow}" class="input-field"></div>
                        <div class="flex flex-col"><label class="text-[10px] font-bold text-muted uppercase ml-1">${module === 'vehicle' ? 'Días' : 'Duración'}</label><input type="number" name="duration" value="${data.duration || 1}" class="input-field" onchange="window.recalculateTotals()"></div>
                    </div>
                </div>

                <div class="card p-8 bg-${color === 'green' ? 'primary' : color + '-600'} text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-2xl">
                    <div class="text-center md:text-left">
                        <p class="text-[10px] uppercase font-black opacity-80 tracking-widest">Total Alquiler</p>
                        <h3 class="text-4xl font-black" id="total-preview">€${(data.total || 0).toFixed(2)}</h3>
                    </div>
                    <div class="flex gap-4 w-full md:w-auto">
                        <input type="number" name="price_unit" value="${data.price_unit || ''}" placeholder="Precio Unit" class="input-field w-32 bg-white/20 border-white/20 text-white placeholder:text-white/60" onchange="window.recalculateTotals()">
                        <button type="submit" class="bg-white text-${color === 'green' ? 'primary' : color + '-600'} px-12 py-4 rounded-2xl font-black shadow-lg hover:scale-105 transition-all">${isEdit ? 'ACTUALIZAR' : 'GUARDAR'}</button>
                    </div>
                </div>
            </form>
        </div>
    `;
};

window.updateProductList = (module: ModuleType, catId: string) => {
    const select = document.getElementById('product-select') as HTMLSelectElement;
    const priceInput = document.querySelector('input[name="price_unit"]') as HTMLInputElement;
    if (!select) return;
    const filtered = state.catalog.products.filter((p: any) => p.cat === catId);
    select.innerHTML = '<option value="">Seleccionar modelo...</option>' + 
        filtered.map((p: any) => `<option value="${p.name}" data-price="${p.price}">${p.name}</option>`).join('');
    
    if (filtered.length > 0 && priceInput) {
        priceInput.value = filtered[0].price.toString();
        window.recalculateTotals();
    }
};

window.recalculateTotals = () => {
    const form = document.getElementById('main-form') as HTMLFormElement;
    if (!form) return;
    const formData = new FormData(form);
    const price = parseFloat(formData.get('price_unit') as string || '0');
    const qty = parseFloat(formData.get('quantity') as string || '1');
    const dur = parseFloat(formData.get('duration') as string || '1');
    const preview = document.getElementById('total-preview');
    if (preview) preview.innerText = `€${(price * qty * dur).toFixed(2)}`;
};

window.handleFormSubmit = async (e: Event, module: ModuleType) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
    
    // Deshabilitar botón para evitar duplicados
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.style.opacity = '0.7';
        submitBtn.innerText = 'PROCESANDO...';
    }

    const formData = new FormData(form);
    const editId = formData.get('id') as string | null;
    const now = new Date();

    const clientData = {
        firstName: formData.get('firstName') as string,
        lastName: formData.get('lastName') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        country: formData.get('country') as string,
        dni: formData.get('dni') as string
    };

    state.lastClient = clientData;
    localStorage.setItem('ecorent_last_client', JSON.stringify(clientData));
    const totalStr = document.getElementById('total-preview')?.innerText.replace('€', '') || '0';
    
    if (editId) {
        const index = state.contracts.findIndex(c => c.id === editId);
        if (index !== -1) {
            const updated: Contract = {
                ...state.contracts[index],
                ...clientData,
                updatedAt: now.toLocaleString(),
                type: formData.get('type') as string,
                product: formData.get('product') as string,
                start_date: formData.get('start_date') as string,
                start_time: formData.get('start_time') as string,
                duration: parseFloat(formData.get('duration') as string) || 1,
                quantity: parseFloat(formData.get('quantity') as string) || 1,
                price_unit: parseFloat(formData.get('price_unit') as string) || 0,
                total: parseFloat(totalStr),
                synced: false 
            };
            state.contracts[index] = updated;
            saveState();
            await syncToSheets(updated);
            window.showInvoice(updated);
        }
    } else {
        const contract: Contract = {
            id: crypto.randomUUID(),
            contractNumber: (state.lastId + 1).toString().padStart(6, '0'),
            createdAt: now.toISOString().split('T')[0],
            createdFull: `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`, 
            timestamp: now.getTime(),
            module,
            ...clientData,
            type: formData.get('type') as string,
            product: formData.get('product') as string,
            start_date: formData.get('start_date') as string,
            start_time: formData.get('start_time') as string,
            end_date: formData.get('start_date') as string, 
            end_time: '20:00',
            duration: parseFloat(formData.get('duration') as string) || 1,
            quantity: parseFloat(formData.get('quantity') as string) || 1,
            price_unit: parseFloat(formData.get('price_unit') as string) || 0,
            total: parseFloat(totalStr),
            notes: "",
            synced: false,
            deleted: false
        };
        state.lastId++;
        state.contracts.push(contract);
        saveState();
        await syncToSheets(contract);
        window.showInvoice(contract);
    }
};

window.viewInvoice = (id: string) => { const c = state.contracts.find(x => x.id === id); if (c) window.showInvoice(c); };
window.editContract = (id: string) => { state.editingId = id; render(); };

window.showInvoice = (c: Contract) => {
    const container = document.getElementById('view-container');
    const color = c.module === 'vehicle' ? 'red-600' : (c.module === 'bike' ? 'primary' : 'blue-600');
    const fullDate = c.createdFull || `${c.createdAt} 00:00:00`;
    
    container!.innerHTML = `
        <div class="space-y-8 animate-fade-in">
            <div class="flex justify-between items-center">
                <button onclick="window.navigate('history')" class="btn-icon bg-gray-100 text-gray-600"><i data-lucide="arrow-left"></i></button>
                <div class="flex gap-2">
                    <button onclick="window.downloadPDF('${c.id}')" class="bg-black text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><i data-lucide="printer" class="w-4 h-4"></i> PDF</button>
                    <button onclick="window.shareWhatsApp('${c.id}')" class="bg-green-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg"><i data-lucide="send" class="w-4 h-4"></i> WhatsApp</button>
                </div>
            </div>
            
            <div id="invoice-render-area" class="card p-12 bg-white max-w-2xl mx-auto space-y-8 border shadow-2xl relative overflow-hidden">
                ${c.deleted ? `<div class="absolute top-0 left-0 w-full bg-red-600 text-white text-center py-2 font-black uppercase text-[10px] tracking-[0.3em] z-10">REGISTRO ELIMINADO</div>` : ''}
                
                <div class="flex justify-between items-start border-b pb-8">
                    <div>
                        <h1 class="text-4xl font-black text-${color}">${COMPANY_INFO.name}</h1>
                        <p class="text-xs font-bold text-muted uppercase tracking-widest mt-1">${COMPANY_INFO.address}</p>
                    </div>
                    <div class="text-right">
                        <div class="bg-gray-50 p-4 rounded-3xl border text-center min-w-[140px]">
                            <p class="text-[10px] font-black opacity-40 uppercase mb-1">Contrato</p>
                            <h2 class="text-2xl font-black">#${c.contractNumber}</h2>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-8 py-4">
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Arrendatario</h4>
                            <p class="font-extrabold text-lg leading-tight">${c.firstName} ${c.lastName}</p>
                            <p class="text-sm opacity-60">${c.dni || 'S/N'}</p>
                        </div>
                        <div>
                            <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Contacto</h4>
                            <p class="text-sm font-bold opacity-80">${c.email}</p>
                            <p class="text-sm font-bold opacity-80">${c.phone}</p>
                        </div>
                    </div>
                    <div class="space-y-4 text-right">
                        <div>
                            <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Fecha de Registro</h4>
                            <p class="font-bold text-sm opacity-80">${fullDate}</p>
                        </div>
                        <div>
                            <h4 class="text-[10px] font-black opacity-30 uppercase tracking-widest mb-1">Servicio</h4>
                            <p class="font-extrabold text-lg text-${color}">${c.product}</p>
                            <p class="text-sm opacity-60">${c.start_date} @ ${c.start_time}</p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50/50 p-4 rounded-2xl flex justify-between items-center border border-gray-100">
                    <div>
                        <p class="text-[9px] font-black opacity-40 uppercase tracking-widest">Importe Total Pagado</p>
                        <p class="text-[8px] opacity-40 italic font-medium">Incluye I.V.A (21%) y tasas locales</p>
                    </div>
                    <h3 class="text-2xl font-black text-${color}">€${c.total.toFixed(2)}</h3>
                </div>

                <div class="flex flex-col items-center justify-center pt-8 border-t gap-4">
                    <div id="qr-invoice" class="p-4 bg-white rounded-3xl border shadow-sm"></div>
                    <div class="text-center">
                        <p class="text-[9px] font-black opacity-40 uppercase tracking-[0.4em]">Verificación Digital EcoRent</p>
                        <p class="text-[8px] opacity-30 font-medium mt-1">ID Transacción: ${c.id}</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
        const qrEl = document.getElementById('qr-invoice');
        if (qrEl) {
            qrEl.innerHTML = ''; 
            new QRCode(qrEl, { 
                text: `EcoRent|ID:${c.id}|Num:${c.contractNumber}|Total:${c.total}`, 
                width: 120, 
                height: 120,
                colorDark: "#000000",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        }
    }, 150);
};

window.downloadPDF = (id: string) => {
    const el = document.getElementById('invoice-render-area');
    const c = state.contracts.find(x => x.id === id);
    if (el && c) {
        const opt = {
            margin: 0.5,
            filename: `EcoRent_#${c.contractNumber}_${c.lastName}.pdf`,
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(el).save();
    }
};

window.shareWhatsApp = (id: string) => {
    const c = state.contracts.find(x => x.id === id);
    if (c) {
        const cleanPhone = c.phone.replace(/\D/g, '');
        const msg = `Hola ${c.firstName}, gracias por elegir EcoRent. Tu contrato #${c.contractNumber} por €${c.total.toFixed(2)} ya está registrado. Puedes verlo online con tu ID: ${c.id}`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
};

const CatalogView = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="flex justify-between items-center">
            <h2 class="text-3xl font-black tracking-tight">Catálogo Editable</h2>
            <button onclick="window.toggleCatalogEdit()" class="btn-icon bg-primary text-white p-3 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95">
                <i data-lucide="${state.catalogEditMode ? 'check-circle' : 'edit-3'}" class="w-6 h-6"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${state.catalog.categories.map((cat: any) => `
                <div class="card p-6 border-l-4 border-primary/50 overflow-hidden relative">
                    <div class="absolute -right-4 -top-4 opacity-5 pointer-events-none transform rotate-12"><i data-lucide="${cat.module === 'vehicle' ? 'car' : (cat.module === 'bike' ? 'bike' : 'map')}" class="w-24 h-24"></i></div>
                    <h3 class="font-black border-b pb-3 mb-4 text-primary flex justify-between items-center">
                        ${cat.name}
                        <span class="text-[9px] opacity-40 uppercase font-black tracking-widest bg-gray-100 px-2 py-1 rounded">${cat.module}</span>
                    </h3>
                    <div class="space-y-4 relative z-10">
                        ${state.catalog.products.filter((p: any) => p.cat === cat.id).map((p: any) => `
                            <div class="flex flex-col gap-1 border-b border-gray-50 pb-2 last:border-0">
                                <div class="flex justify-between text-sm items-center">
                                    <span class="font-bold opacity-80">${p.name}</span>
                                    ${state.catalogEditMode 
                                        ? `<div class="flex items-center gap-1 group">
                                            <span class="text-xs font-black text-primary">€</span>
                                            <input type="number" value="${p.price}" onchange="window.updateCatalogPrice('${p.id}', this.value)" class="w-16 px-2 py-1 bg-white border-2 border-primary/20 rounded-xl text-right font-black text-primary focus:border-primary outline-none transition-all">
                                          </div>`
                                        : `<span class="font-black text-primary bg-primary/5 px-2 py-1 rounded-lg">€${p.price}</span>`
                                    }
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;

const HistoryView = () => `
    <div class="space-y-6 animate-fade-in">
        <h2 class="text-3xl font-black tracking-tight">Registro Activo</h2>
        <div class="space-y-4">
            ${state.contracts.filter(c => !c.deleted).slice().reverse().map(c => `
                <div class="card p-6 flex justify-between items-center border-l-8 ${c.module === 'vehicle' ? 'border-red-500' : (c.module === 'bike' ? 'border-primary' : 'border-blue-500')} hover:shadow-xl transition-all">
                    <div class="flex-1">
                        <div class="flex items-center gap-2">
                            <p class="font-black text-lg">#${c.contractNumber} — ${c.firstName} ${c.lastName}</p>
                            ${c.synced ? `<i data-lucide="check-circle-2" class="w-4 h-4 text-green-500" title="Sincronizado"></i>` : `<i data-lucide="clock" class="w-4 h-4 text-yellow-500" title="Pendiente"></i>`}
                        </div>
                        <p class="text-[11px] opacity-50 uppercase font-black tracking-widest mt-1">${c.createdFull || c.createdAt} • ${c.product}</p>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="window.viewInvoice('${c.id}')" class="p-3 text-green-600 bg-green-50 rounded-2xl hover:bg-green-100 transition-colors" title="Ver Detalle"><i data-lucide="eye" class="w-5 h-5"></i></button>
                        <button onclick="window.editContract('${c.id}')" class="p-3 text-blue-500 bg-blue-50 rounded-2xl hover:bg-blue-100 transition-colors" title="Modificar"><i data-lucide="edit-3" class="w-5 h-5"></i></button>
                        <button onclick="window.deleteContract('${c.id}', this)" class="p-3 text-red-400 bg-red-50 rounded-2xl hover:bg-red-100 transition-colors" title="Eliminar"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                    </div>
                </div>
            `).join('')}
            ${state.contracts.filter(c => !c.deleted).length === 0 ? '<div class="card p-24 text-center text-muted italic font-bold">No hay alquileres activos actualmente.</div>' : ''}
        </div>
    </div>
`;

const ExportView = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
                <h2 class="text-3xl font-black tracking-tight">Exportación Nube</h2>
                <p class="text-xs text-muted font-black uppercase tracking-widest mt-1">${state.contracts.filter(c => !c.synced).length} pendientes de subir</p>
            </div>
            <button onclick="window.syncAllToCloud()" id="sync-all-btn" class="bg-primary text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3"><i data-lucide="cloud-upload" class="w-6 h-6"></i> Enviar al excel nube</button>
        </div>
        <div class="card overflow-hidden border">
            <div class="overflow-x-auto">
                <table class="w-full text-xs text-left border-collapse">
                    <thead class="bg-gray-50/50 border-b font-black uppercase text-muted tracking-tighter">
                        <tr><th class="p-5">Nº Contrato</th><th class="p-5">Registro</th><th class="p-5">Cliente</th><th class="p-5">Estado</th><th class="p-5 text-center">Gestión</th></tr>
                    </thead>
                    <tbody class="divide-y">
                        ${state.contracts.slice().reverse().map(c => `
                            <tr class="hover:bg-gray-50/30 transition-colors ${c.deleted ? 'opacity-40 grayscale bg-red-50/20' : ''}">
                                <td class="p-5 font-black text-primary">#${c.contractNumber}</td>
                                <td class="p-5 font-bold">${c.createdFull || c.createdAt}</td>
                                <td class="p-5 font-bold">${c.firstName} ${c.lastName}</td>
                                <td class="p-5">
                                    <div class="flex flex-col gap-1.5">
                                        ${c.synced 
                                            ? `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[9px] font-black border border-green-200 inline-block w-fit uppercase">Vincualdo</span>`
                                            : `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-[9px] font-black border border-yellow-200 inline-block w-fit uppercase">Local</span>`
                                        }
                                        ${c.deleted ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[9px] font-black border border-red-200 inline-block w-fit uppercase">Borrado</span>` : ''}
                                    </div>
                                </td>
                                <td class="p-5">
                                    <div class="flex justify-center gap-3">
                                        <button onclick="window.viewInvoice('${c.id}')" class="p-2.5 text-green-500 bg-green-50 rounded-xl hover:scale-110" title="Ver"><i data-lucide="eye" class="w-4 h-4"></i></button>
                                        ${!c.deleted ? `<button onclick="window.editContract('${c.id}')" class="p-2.5 text-blue-500 bg-blue-50 rounded-xl hover:scale-110" title="Editar"><i data-lucide="edit-3" class="w-4 h-4"></i></button>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ${state.contracts.length === 0 ? '<div class="p-20 text-center text-muted italic font-bold uppercase tracking-widest opacity-30">Cero Datos.</div>' : ''}
        </div>
    </div>
`;

const Dashboard = () => `
    <div class="space-y-12 animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-end gap-6">
            <div class="w-full md:w-auto">
                <h1 class="text-4xl font-extrabold tracking-tighter leading-none">Gestión<br><span class="text-primary">EcoRent</span></h1>
                <p class="text-muted font-bold uppercase tracking-[0.2em] mt-2 text-xs">Operaciones Sasha Kalko</p>
            </div>
            <div class="card p-8 border-l-[12px] border-primary w-full md:w-64 shadow-2xl bg-primary text-white flex flex-col justify-center">
                <p class="text-[10px] font-black opacity-70 uppercase tracking-[0.3em] mb-2">Caja Total (Bruto)</p>
                <p class="text-3xl font-black tabular-nums">€${state.contracts.filter(c => !c.deleted).reduce((a, b) => a + b.total, 0).toFixed(2)}</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <button onclick="window.navigate('vehicles')" class="card p-12 group hover:bg-red-600 hover:text-white transition-all duration-500 flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
                <div class="absolute inset-0 bg-red-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div class="bg-red-50 p-8 rounded-[2.5rem] text-red-600 group-hover:bg-white/20 group-hover:text-white transition-all duration-500 transform group-hover:scale-110 shadow-inner"><i data-lucide="car" class="w-12 h-12"></i></div>
                <span class="font-black text-2xl tracking-tight uppercase">Autos / Scoots</span>
            </button>
            <button onclick="window.navigate('bikes')" class="card p-12 group hover:bg-primary hover:text-white transition-all duration-500 flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
                <div class="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div class="bg-green-50 p-8 rounded-[2.5rem] text-primary group-hover:bg-white/20 group-hover:text-white transition-all duration-500 transform group-hover:scale-110 shadow-inner"><i data-lucide="bike" class="w-12 h-12"></i></div>
                <span class="font-black text-2xl tracking-tight uppercase">Bicicletas</span>
            </button>
            <button onclick="window.navigate('tours')" class="card p-12 group hover:bg-blue-600 hover:text-white transition-all duration-500 flex flex-col items-center gap-6 shadow-xl relative overflow-hidden">
                <div class="absolute inset-0 bg-blue-500 opacity-0 group-hover:opacity-10 transition-opacity"></div>
                <div class="bg-blue-50 p-8 rounded-[2.5rem] text-blue-600 group-hover:bg-white/20 group-hover:text-white transition-all duration-500 transform group-hover:scale-110 shadow-inner"><i data-lucide="map-pin" class="w-12 h-12"></i></div>
                <span class="font-black text-2xl tracking-tight uppercase">Tours / Boat</span>
            </button>
        </div>
    </div>
`;

function render() {
    const container = document.getElementById('view-container');
    if (!container) return;
    if (state.editingId) {
        const c = state.contracts.find(x => x.id === state.editingId);
        if (c) { container.innerHTML = CommonAlquilerForm(c.module, c); if (window.lucide) window.lucide.createIcons(); return; }
    }
    switch (state.currentView) {
        case 'dashboard': container.innerHTML = Dashboard(); break;
        case 'vehicles': container.innerHTML = CommonAlquilerForm('vehicle'); break;
        case 'bikes': container.innerHTML = CommonAlquilerForm('bike'); break;
        case 'tours': container.innerHTML = CommonAlquilerForm('tour'); break;
        case 'catalog': container.innerHTML = CatalogView(); break;
        case 'export': container.innerHTML = ExportView(); break;
        case 'history': container.innerHTML = HistoryView(); break;
        default: container.innerHTML = Dashboard();
    }
    if (window.lucide) window.lucide.createIcons();
    updateSyncStatus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.addEventListener('DOMContentLoaded', () => { 
    applyTheme(); 
    render(); 
    if (window.lucide) window.lucide.createIcons();
});