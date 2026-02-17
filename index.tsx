import { GoogleGenAI } from "@google/genai";

// --- Configuration ---
const DEFAULT_CATALOG = {
    categories: [
        { id: 'AUTOS', name: 'Fleet: Automobiles', module: 'vehicle' },
        { id: 'SCOOTER', name: 'Fleet: Scooters', module: 'vehicle' },
        { id: 'BIKE_NORMAL', name: 'Bikes: Standard', module: 'bike' },
        { id: 'BIKE_EB_CITY', name: 'Bikes: E-City', module: 'bike' },
        { id: 'BIKE_EMTB', name: 'Bikes: E-MTB', module: 'bike' },
        { id: 'BIKE_EFAT', name: 'Bikes: E-Fat', module: 'bike' },
        { id: 'TOURS', name: 'Services: Tours', module: 'tour' },
        { id: 'PADDLE', name: 'Services: Water', module: 'tour' },
        { id: 'BOAT', name: 'Services: Marine', module: 'tour' }
    ],
    products: [
        { id: '1', name: 'Citroen C3 / Peugeot 208', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '2', name: 'Toyota Aygo X', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '3', name: 'Toyota Aygo Base', cat: 'AUTOS', price: 45, module: 'vehicle' },
        { id: '4', name: 'Toyota Aygo Open', cat: 'AUTOS', price: 50, module: 'vehicle' },
        { id: '5', name: 'Piaggio Liberty 125cc', cat: 'SCOOTER', price: 35, module: 'vehicle' },
        { id: '6', name: 'Piaggio Medley 125cc', cat: 'SCOOTER', price: 40, module: 'vehicle' },
        { id: '7', name: 'Standard City Bike', cat: 'BIKE_NORMAL', price: 6, module: 'bike' },
        { id: '8', name: 'E-Bike City Basic', cat: 'BIKE_EB_CITY', price: 15, module: 'bike' },
        { id: '9', name: 'E-Bike City Premium', cat: 'BIKE_EB_CITY', price: 20, module: 'bike' },
        { id: '10', name: 'E-Mountain Bike (EMTB)', cat: 'BIKE_EMTB', price: 20, module: 'bike' },
        { id: '11', name: 'Discovery Tour (2h)', cat: 'TOURS', price: 65, module: 'tour' },
        { id: '12', name: 'Catamaran Tour Palma', cat: 'TOURS', price: 35, module: 'tour' },
        { id: '13', name: 'Paddle Surf (SUP)', cat: 'PADDLE', price: 12, module: 'tour' },
        { id: '14', name: 'Boat Rental B450 Theia', cat: 'BOAT', price: 200, module: 'tour' }
    ]
};

const COMPANY_INFO = {
    name: "FastRent EMS",
    owner: "Sasha Kalko",
    address: "Costa Brava 1, Palma, ES",
    email: "ops@fastrent.io"
};

const DEFAULT_GAS_URL = "https://script.google.com/macros/s/AKfycbxZyzj2hH6sTlkxWbXe2TLepR8fH0rI1wNxAhgPprzTMGMkxT-EYtL2FH3aGOge3FOw/exec";

// --- Interfaces ---
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
        lucide: any;
        QRCode: any;
        html2pdf: any;
    }
}

// --- State Management ---
const savedSettings = localStorage.getItem('ecorent_settings_v2');
const savedCatalog = localStorage.getItem('ecorent_catalog_v2');

let state = {
    currentView: 'dashboard',
    editingId: null as string | null,
    catalog: (savedCatalog ? JSON.parse(savedCatalog) : DEFAULT_CATALOG),
    catalogEditMode: false,
    contracts: JSON.parse(localStorage.getItem('ecorent_contracts_v2') || '[]') as Contract[],
    settings: (savedSettings ? JSON.parse(savedSettings) : { gasUrl: DEFAULT_GAS_URL }) as Settings,
    lastId: parseInt(localStorage.getItem('ecorent_last_id_v2') || '1000'),
    lastClient: JSON.parse(localStorage.getItem('ecorent_last_client_v2') || 'null'),
    theme: localStorage.getItem('ecorent_theme_v2') || 'light'
};

// --- Logic Helpers ---
const getSeasonReturnTime = () => {
    const month = new Date().getMonth(); // 0-11
    // Summer: April (3) to October (9) -> 20:00
    // Winter: November (10) to March (2) -> 19:00
    return (month >= 3 && month <= 9) ? "20:00" : "19:00";
};

// --- Logic ---
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
    const msg = encodeURIComponent("Technical Assistance Request: FastRent EMS.");
    window.open(`https://wa.me/34698971708?text=${msg}`, '_blank');
};

window.autofillCurrentForm = () => {
    if (!state.lastClient) {
        alert("System Cache: No previous client data found.");
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
    if (!form) return;
    const examples: Record<string, string> = {
        firstName: "Robert", lastName: "Smith", email: "r.smith@example.com", phone: "+34 600123456",
        country: "Germany", dni: "X1234567Y", price_unit: "55", quantity: "1"
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
        localStorage.setItem('ecorent_catalog_v2', JSON.stringify(state.catalog));
    }
};

const saveState = () => {
    localStorage.setItem('ecorent_contracts_v2', JSON.stringify(state.contracts));
    localStorage.setItem('ecorent_settings_v2', JSON.stringify(state.settings));
    localStorage.setItem('ecorent_last_id_v2', state.lastId.toString());
    localStorage.setItem('ecorent_theme_v2', state.theme);
    updateSyncStatus();
};

const updateSyncStatus = () => {
    const led = document.getElementById('sync-status');
    if (led) led.className = `status-led ${state.settings.gasUrl ? 'text-emerald-500 bg-emerald-500' : 'text-slate-400 bg-slate-400'}`;
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
            "modelo": contract.product + (contract.deleted ? " [REVOKED]" : ""),
            "tipoVehiculo": contract.type,
            "fechaEntrega": contract.start_date,
            "horaEntrega": contract.start_time,
            "fechaDevolucion": contract.end_date || "",
            "horaDevolucion": contract.end_time || "",
            "numDias": contract.duration,
            "precioTotal": contract.price_unit,
            "total": contract.total,
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
        console.error("Sync Error:", e);
        return false; 
    }
};

window.syncAllToCloud = async () => {
    if (!state.settings.gasUrl) { alert("Configuration Error: Missing API Endpoint."); return; }
    const btn = document.getElementById('sync-all-btn');
    if (btn) btn.innerText = "Synchronizing...";
    
    const pending = state.contracts.filter(c => !c.synced);
    if (pending.length === 0) {
        alert("Database: All local records are current with cloud.");
        if (btn) btn.innerText = "Push to Cloud Storage";
        return;
    }

    let count = 0;
    for (const c of pending) {
        const success = await syncToSheets(c);
        if (success) count++;
    }
    
    alert(`Audit: ${count} records successfully committed to cloud.`);
    if (btn) btn.innerText = "Push to Cloud Storage";
    render();
};

window.deleteContract = async (id: string, btn?: HTMLElement) => {
    if (confirm("System Audit Warning: Are you sure you want to revoke this contract? This action will be logged.")) {
        if (btn) {
            btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin text-red-500"></i>';
            if (window.lucide) window.lucide.createIcons();
        }
        
        const index = state.contracts.findIndex(c => c.id === id);
        if (index !== -1) {
            const contract = state.contracts[index];
            const now = new Date();
            contract.deleted = true;
            contract.notes = (contract.notes ? contract.notes + " | " : "") + `REVOKED: ${now.toISOString()}`;
            contract.synced = false; 
            
            saveState();
            
            if (state.settings.gasUrl) {
                await syncToSheets(contract);
            }
            
            alert(`Revocation successful: Contract #${contract.contractNumber} has been deactivated.`);
            render();
        }
    }
};

const CommonAlquilerForm = (module: ModuleType, data: Partial<Contract> = {}) => {
    const isEdit = !!data.id;
    const today = new Date().toISOString().split('T')[0];
    const timeNow = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const labelTitle = module === 'vehicle' ? 'Vehicle Fleet' : (module === 'bike' ? 'Bike Fleet' : 'Services/Tours');
    const returnTimeDefault = module === 'vehicle' ? getSeasonReturnTime() : "20:00";

    return `
        <div class="space-y-6 animate-fade-in">
            <header class="flex items-center justify-between pb-4 border-b">
                <div class="flex items-center gap-4">
                    <button onclick="window.navigate('dashboard')" class="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"><i data-lucide="chevron-left" class="w-5 h-5 text-slate-500"></i></button>
                    <div>
                        <h2 class="text-xl font-bold text-slate-900 dark:text-white">${isEdit ? 'Update' : 'Generate'} ${labelTitle} Contract</h2>
                        <p class="text-[9px] text-slate-500 font-bold uppercase tracking-widest">System Engine V2.5 &bull; Sasha Kalko</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button type="button" onclick="window.autofillCurrentForm()" class="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center gap-2 shadow-md">
                        <i data-lucide="user-check" class="w-3.5 h-3.5"></i> AUTOFILL
                    </button>
                    <button type="button" onclick="window.fillWithExampleData()" class="bg-slate-600 hover:bg-slate-500 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold flex items-center gap-2 shadow-md">
                        <i data-lucide="database" class="w-3.5 h-3.5"></i> DEMO DATA
                    </button>
                    <div class="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-md text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400 flex items-center">#${data.contractNumber || (state.lastId + 1)}</div>
                </div>
            </header>
            
            <form id="main-form" onsubmit="window.handleFormSubmit(event, '${module}')" class="space-y-6">
                ${isEdit ? `<input type="hidden" name="id" value="${data.id}">` : ''}
                
                <div class="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="col-span-full mb-2 border-b pb-2"><h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">I. Client Identification</h4></div>
                    <input type="text" name="firstName" value="${data.firstName || ''}" placeholder="First Name" required class="input-field">
                    <input type="text" name="lastName" value="${data.lastName || ''}" placeholder="Last Name" required class="input-field">
                    <input type="email" name="email" value="${data.email || ''}" placeholder="Email Address" required class="input-field">
                    <input type="tel" name="phone" value="${data.phone || ''}" placeholder="Phone Number" required class="input-field">
                    <input type="text" name="country" value="${data.country || ''}" placeholder="Country" class="input-field">
                    <input type="text" name="dni" value="${data.dni || ''}" placeholder="Passport / DNI" required class="input-field">
                </div>
                
                <div class="card p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="col-span-full mb-2 border-b pb-2"><h4 class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">II. Lease Specifications</h4></div>
                    <select name="type" class="input-field" onchange="window.updateProductList('${module}', this.value)" required>
                        <option value="">Select Asset Category...</option>
                        ${state.catalog.categories.filter((c: any) => c.module === module).map((c: any) => `<option value="${c.id}" ${data.type === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                    <select name="product" id="product-select" class="input-field" required>
                        <option value="">Select Specific Model...</option>
                        ${data.product ? `<option value="${data.product}" selected>${data.product}</option>` : ''}
                    </select>

                    <div class="grid grid-cols-2 gap-4 col-span-full border-t pt-4 mt-2">
                         <div class="space-y-3">
                            <h5 class="text-[10px] font-black text-blue-500 uppercase flex items-center gap-1.5"><i data-lucide="log-out" class="w-3 h-3"></i> Departure Schedule (Salida)</h5>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] font-bold text-slate-400 uppercase ml-1">Date</label>
                                    <input type="date" name="start_date" value="${data.start_date || today}" class="input-field cursor-pointer font-bold border-blue-100" onchange="window.recalculateTotals()">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] font-bold text-slate-400 uppercase ml-1">Time</label>
                                    <input type="time" name="start_time" value="${data.start_time || timeNow}" class="input-field cursor-pointer font-bold border-blue-100" onchange="window.recalculateTotals()">
                                </div>
                            </div>
                         </div>
                         <div class="space-y-3">
                            <h5 class="text-[10px] font-black text-amber-500 uppercase flex items-center gap-1.5"><i data-lucide="log-in" class="w-3 h-3"></i> Return Schedule (Regreso)</h5>
                            <div class="grid grid-cols-2 gap-3">
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] font-bold text-slate-400 uppercase ml-1">Date</label>
                                    <input type="date" name="end_date" value="${data.end_date || today}" class="input-field cursor-pointer font-bold border-amber-100" onchange="window.recalculateTotals()">
                                </div>
                                <div class="flex flex-col gap-1">
                                    <label class="text-[8px] font-bold text-slate-400 uppercase ml-1">Time</label>
                                    <input type="time" name="end_time" value="${data.end_time || returnTimeDefault}" class="input-field cursor-pointer font-bold border-amber-100" onchange="window.recalculateTotals()">
                                </div>
                            </div>
                         </div>
                    </div>

                    <div class="grid grid-cols-2 gap-4 col-span-full mt-4 pt-4 border-t">
                        <div class="flex flex-col gap-1">
                            <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Asset Quantity</label>
                            <input type="number" name="quantity" value="${data.quantity || 1}" min="1" class="input-field" onchange="window.recalculateTotals()">
                        </div>
                        <div class="flex flex-col gap-1">
                            <label class="text-[9px] font-bold text-slate-400 uppercase ml-1">Calculated Duration (${module === 'vehicle' ? 'Days' : 'Units'})</label>
                            <input type="number" name="duration" value="${data.duration || 1}" min="0.5" step="0.5" class="input-field bg-slate-50 border-dashed" onchange="window.recalculateTotals()">
                        </div>
                    </div>
                </div>

                <div class="card p-6 bg-slate-900 dark:bg-slate-800 text-white flex flex-col md:flex-row justify-between items-center gap-6 shadow-xl relative overflow-hidden">
                    <div class="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><i data-lucide="shield-check" class="w-20 h-20"></i></div>
                    <div class="text-center md:text-left z-10">
                        <p class="text-[9px] uppercase font-bold opacity-60 tracking-widest mb-1">AGGREGATE CONTRACT VALUATION</p>
                        <h3 class="text-4xl font-black tabular-nums" id="total-preview">€${(data.total || 0).toFixed(2)}</h3>
                    </div>
                    <div class="flex gap-4 w-full md:w-auto z-10">
                        <div class="flex flex-col gap-1 flex-1">
                            <label class="text-[9px] font-bold opacity-60 uppercase">Price per Unit</label>
                            <input type="number" name="price_unit" value="${data.price_unit || ''}" placeholder="0.00" class="input-field bg-white/10 border-white/20 text-white placeholder:text-white/40 font-bold" onchange="window.recalculateTotals()">
                        </div>
                        <button type="submit" id="save-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-10 py-3 rounded-lg font-bold transition-all self-end shadow-lg shadow-blue-500/30 active:scale-95 flex items-center gap-2">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> ${isEdit ? 'UPDATE SYSTEM' : 'GENERATE LEASE'}
                        </button>
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
    select.innerHTML = '<option value="">Select Specific Model...</option>' + 
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
    
    // Auto-calculate duration from dates/times
    const sDate = formData.get('start_date') as string;
    const sTime = formData.get('start_time') as string;
    const eDate = formData.get('end_date') as string;
    const eTime = formData.get('end_time') as string;

    if (sDate && sTime && eDate && eTime) {
        const start = new Date(`${sDate}T${sTime}`);
        const end = new Date(`${eDate}T${eTime}`);
        const diffMs = end.getTime() - start.getTime();
        
        if (diffMs > 0) {
            // Calculate days rounding up to nearest whole day for standard rentals (24h blocks)
            const calculatedDays = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
            const durationInput = form.querySelector('input[name="duration"]') as HTMLInputElement;
            if (durationInput && !durationInput.matches(':focus')) {
                durationInput.value = calculatedDays.toString();
            }
        }
    }

    const price = parseFloat(formData.get('price_unit') as string || '0');
    const qty = parseFloat(formData.get('quantity') as string || '1');
    const dur = parseFloat(formData.get('duration') as string || '1');
    const preview = document.getElementById('total-preview');
    if (preview) preview.innerText = `€${(price * qty * dur).toFixed(2)}`;
};

window.handleFormSubmit = async (e: Event, module: ModuleType) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const btn = form.querySelector('#save-btn') as HTMLButtonElement;
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> PROCESANDO...';
        if (window.lucide) window.lucide.createIcons();
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
    localStorage.setItem('ecorent_last_client_v2', JSON.stringify(clientData));
    const totalStr = document.getElementById('total-preview')?.innerText.replace('€', '') || '0';
    
    let targetContract: Contract;

    if (editId) {
        const index = state.contracts.findIndex(c => c.id === editId);
        if (index !== -1) {
            targetContract = {
                ...state.contracts[index],
                ...clientData,
                updatedAt: now.toISOString(),
                type: formData.get('type') as string,
                product: formData.get('product') as string,
                start_date: formData.get('start_date') as string,
                start_time: formData.get('start_time') as string,
                end_date: formData.get('end_date') as string,
                end_time: formData.get('end_time') as string,
                duration: parseFloat(formData.get('duration') as string) || 1,
                quantity: parseFloat(formData.get('quantity') as string) || 1,
                price_unit: parseFloat(formData.get('price_unit') as string) || 0,
                total: parseFloat(totalStr),
                synced: false 
            };
            state.contracts[index] = targetContract;
        } else return;
    } else {
        targetContract = {
            id: crypto.randomUUID(),
            contractNumber: (state.lastId + 1).toString(),
            createdAt: now.toISOString().split('T')[0],
            createdFull: now.toISOString(), 
            timestamp: now.getTime(),
            module,
            ...clientData,
            type: formData.get('type') as string,
            product: formData.get('product') as string,
            start_date: formData.get('start_date') as string,
            start_time: formData.get('start_time') as string,
            end_date: formData.get('end_date') as string, 
            end_time: formData.get('end_time') as string,
            duration: parseFloat(formData.get('duration') as string) || 1,
            quantity: parseFloat(formData.get('quantity') as string) || 1,
            price_unit: parseFloat(formData.get('price_unit') as string) || 0,
            total: parseFloat(totalStr),
            notes: "",
            synced: false,
            deleted: false
        };
        state.lastId++;
        state.contracts.push(targetContract);
    }
    
    saveState();
    await syncToSheets(targetContract);
    window.showInvoice(targetContract);
};

window.viewInvoice = (id: string) => { 
    const c = state.contracts.find(x => x.id === id); 
    if (c) window.showInvoice(c); 
};

window.editContract = (id: string) => { 
    state.editingId = id; 
    render(); 
};

window.showInvoice = (c: Contract) => {
    const container = document.getElementById('view-container');
    if (!container) return;

    container.innerHTML = `
        <div class="space-y-6 animate-fade-in">
            <div class="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 no-print">
                <button onclick="window.navigate('history')" class="flex items-center gap-2 text-slate-500 hover:text-slate-900 dark:hover:text-white font-semibold text-sm">
                    <i data-lucide="arrow-left" class="w-4 h-4"></i> Back to Fleet Audit
                </button>
                <div class="flex gap-2">
                    <button onclick="window.downloadPDF('${c.id}')" class="flex items-center gap-2 bg-slate-900 dark:bg-slate-100 dark:text-slate-900 text-white px-5 py-2 rounded-lg font-bold text-xs transition-transform active:scale-95 shadow-lg">
                        <i data-lucide="printer" class="w-4 h-4"></i> PRINT PDF
                    </button>
                    <button onclick="window.shareWhatsApp('${c.id}')" class="flex items-center gap-2 bg-emerald-600 text-white px-5 py-2 rounded-lg font-bold text-xs transition-transform active:scale-95 shadow-lg shadow-emerald-500/20">
                        <i data-lucide="message-circle" class="w-4 h-4"></i> WHATSAPP
                    </button>
                </div>
            </div>
            
            <div id="invoice-render-area" class="card p-10 bg-white max-w-3xl mx-auto space-y-8 border shadow-2xl relative overflow-hidden">
                ${c.deleted ? `<div class="absolute top-0 left-0 w-full bg-red-600 text-white text-center py-2 font-black uppercase text-[10px] tracking-[0.3em] z-10">REVOKED CONTRACT</div>` : ''}
                
                <div class="flex justify-between items-start border-b border-slate-100 pb-8">
                    <div>
                        <h1 class="text-3xl font-black text-slate-900">${COMPANY_INFO.name}</h1>
                        <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${COMPANY_INFO.address}</p>
                        <p class="text-[9px] text-slate-300 font-mono mt-0.5">UUID: ${c.id.split('-')[0]}</p>
                    </div>
                    <div class="text-right">
                        <p class="text-[10px] font-black text-slate-400 uppercase mb-1">CONTRACT REF</p>
                        <h2 class="text-2xl font-mono font-bold text-blue-600">#${c.contractNumber}</h2>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-10 py-4">
                    <div class="space-y-4">
                        <div>
                            <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Lessee Credentials</h4>
                            <p class="font-bold text-lg text-slate-900 leading-tight">${c.firstName} ${c.lastName}</p>
                            <p class="text-xs font-semibold text-slate-500">${c.dni || 'Passport N/A'}</p>
                            <div class="mt-2 text-xs text-slate-500 space-y-0.5">
                                <p>${c.email}</p>
                                <p>${c.phone}</p>
                                <p>${c.country || ''}</p>
                            </div>
                        </div>
                    </div>
                    <div class="space-y-4 text-right">
                        <div>
                            <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Issue Metadata</h4>
                            <p class="text-xs font-semibold text-slate-600">Issued: ${c.createdAt}</p>
                            <p class="text-[9px] text-slate-400 font-mono">${c.createdFull}</p>
                        </div>
                        <div>
                            <h4 class="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Lease Asset</h4>
                            <p class="font-bold text-slate-900 uppercase tracking-tight">${c.product}</p>
                            <p class="text-[10px] text-slate-400 font-bold uppercase">Qty: ${c.quantity} | Total Duration: ${c.duration} ${c.module === 'vehicle' ? 'Days' : 'Units'}</p>
                        </div>
                    </div>
                </div>

                <!-- TIMELINE SECTION - REFINED -->
                <div class="grid grid-cols-2 gap-0 border rounded-xl overflow-hidden divide-x bg-slate-50/50 shadow-inner">
                    <div class="p-5 space-y-1.5 bg-blue-50/30">
                        <div class="flex items-center gap-2">
                            <i data-lucide="log-out" class="w-3.5 h-3.5 text-blue-500"></i>
                            <h4 class="text-[9px] font-black text-blue-600 uppercase tracking-widest">DEPARTURE / SALIDA</h4>
                        </div>
                        <p class="text-lg font-black text-slate-900">${c.start_date}</p>
                        <div class="flex items-center gap-1">
                            <span class="text-[10px] font-bold text-slate-400 uppercase">Check-out:</span>
                            <span class="text-sm font-black text-blue-700">${c.start_time}</span>
                        </div>
                    </div>
                    <div class="p-5 space-y-1.5 bg-amber-50/30 text-right">
                        <div class="flex items-center gap-2 justify-end">
                            <h4 class="text-[9px] font-black text-amber-600 uppercase tracking-widest">RETURN / REGRESO</h4>
                            <i data-lucide="log-in" class="w-3.5 h-3.5 text-amber-500"></i>
                        </div>
                        <p class="text-lg font-black text-slate-900">${c.end_date || c.start_date}</p>
                        <div class="flex items-center gap-1 justify-end">
                            <span class="text-sm font-black text-amber-700">${c.end_time || '20:00'}</span>
                            <span class="text-[10px] font-bold text-slate-400 uppercase">:Check-in</span>
                        </div>
                    </div>
                </div>

                <div class="bg-slate-900 text-white p-6 rounded-xl flex justify-between items-center shadow-xl relative overflow-hidden">
                    <div class="absolute inset-0 bg-blue-500 opacity-5 pointer-events-none"></div>
                    <div class="relative z-10">
                        <p class="text-[10px] font-black opacity-60 uppercase tracking-[0.2em]">Aggregate Total (Gross)</p>
                        <p class="text-[9px] opacity-40 italic font-medium">Includes statutory VAT (21%) & Local Taxes</p>
                    </div>
                    <h3 class="text-4xl font-black tabular-nums relative z-10">€${c.total.toFixed(2)}</h3>
                </div>

                <div class="flex flex-col items-center justify-center pt-8 border-t border-slate-100 gap-4">
                    <div id="qr-invoice" class="p-4 bg-white rounded-xl border border-slate-100 shadow-sm"></div>
                    <div class="text-center">
                        <p class="text-[8px] font-black text-slate-400 uppercase tracking-[0.4em]">EMS DIGITAL SECURITY CERTIFICATE</p>
                        <p class="text-[8px] text-slate-200 font-mono mt-1">${c.id}</p>
                    </div>
                </div>
                
                <div class="mt-8 text-[7px] text-slate-400 text-justify leading-relaxed border-t border-slate-50 pt-4">
                    By signing this digital contract, the lessee accepts the general rental conditions of FastRent EMS. The vehicle must be returned in the same conditions as delivered. Any damage not covered by insurance will be the responsibility of the lessee. Return times are strictly as specified in this document. Late returns may incur additional charges equivalent to one full day of rental.
                </div>
            </div>
        </div>
    `;
    
    if (window.lucide) window.lucide.createIcons();
    setTimeout(() => {
        const qrEl = document.getElementById('qr-invoice');
        if (qrEl) {
            qrEl.innerHTML = ''; 
            new window.QRCode(qrEl, { 
                text: `FastRent|ID:${c.id}|Num:${c.contractNumber}|Total:${c.total}|Return:${c.end_date}@${c.end_time}`, 
                width: 120, 
                height: 120,
                colorDark: "#0f172a",
                colorLight: "#ffffff",
                correctLevel: window.QRCode.CorrectLevel.H
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
            filename: `EMS_Contract_${c.contractNumber}_${c.lastName}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: { scale: 3, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };
        window.html2pdf().set(opt).from(el).save();
    }
};

window.shareWhatsApp = (id: string) => {
    const c = state.contracts.find(x => x.id === id);
    if (c) {
        const cleanPhone = c.phone.replace(/\D/g, '');
        const msg = `FastRent EMS: Lease Contract #${c.contractNumber} Issued. Total: €${c.total.toFixed(2)}. Return Schedule: ${c.end_date || c.start_date} at ${c.end_time || '20:00'}. ID: ${c.id.split('-')[0]}`;
        window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
};

const Dashboard = () => `
    <div class="space-y-10 animate-fade-in">
        <div class="flex flex-col md:flex-row justify-between items-end gap-6">
            <div>
                <h1 class="text-4xl font-black tracking-tighter text-slate-900 dark:text-white leading-none">EMS Operations Center</h1>
                <p class="text-slate-500 font-bold uppercase tracking-[0.2em] mt-3 text-[10px]">Fleet Terminal &bull; Administrator: Sasha Kalko</p>
            </div>
            <div class="card p-6 border-l-[6px] border-blue-600 w-full md:w-72 bg-slate-900 dark:bg-slate-800 text-white shadow-2xl relative overflow-hidden">
                <div class="absolute top-0 right-0 p-2 opacity-10 pointer-events-none"><i data-lucide="trending-up" class="w-16 h-16"></i></div>
                <p class="text-[9px] font-black opacity-60 uppercase tracking-[0.2em] mb-1">Aggregated Revenue Buffer</p>
                <p class="text-4xl font-black tabular-nums tracking-tighter">€${state.contracts.filter(c => !c.deleted).reduce((a, b) => a + b.total, 0).toLocaleString()}</p>
            </div>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button onclick="window.navigate('vehicles')" class="card p-10 group hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 transition-all flex flex-col items-center gap-6">
                <div class="bg-blue-50 dark:bg-blue-900/30 p-6 rounded-[2rem] text-blue-600 group-hover:scale-110 transition-transform shadow-inner"><i data-lucide="car" class="w-10 h-10"></i></div>
                <span class="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Automobile Fleet</span>
            </button>
            <button onclick="window.navigate('bikes')" class="card p-10 group hover:border-emerald-500 hover:shadow-2xl hover:shadow-emerald-500/10 transition-all flex flex-col items-center gap-6">
                <div class="bg-emerald-50 dark:bg-emerald-900/30 p-6 rounded-[2rem] text-emerald-600 group-hover:scale-110 transition-transform shadow-inner"><i data-lucide="bike" class="w-10 h-10"></i></div>
                <span class="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Inventory: Bikes</span>
            </button>
            <button onclick="window.navigate('tours')" class="card p-10 group hover:border-violet-500 hover:shadow-2xl hover:shadow-violet-500/10 transition-all flex flex-col items-center gap-6">
                <div class="bg-violet-50 dark:bg-violet-900/30 p-6 rounded-[2rem] text-violet-600 group-hover:scale-110 transition-transform shadow-inner"><i data-lucide="navigation" class="w-10 h-10"></i></div>
                <span class="font-black text-slate-900 dark:text-white uppercase tracking-widest text-xs">Services & Tours</span>
            </button>
        </div>
    </div>
`;

const CatalogView = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Inventory Ledger</h2>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pricing Configuration Console</p>
            </div>
            <button onclick="window.toggleCatalogEdit()" class="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:shadow-lg transition-all active:scale-95">
                <i data-lucide="${state.catalogEditMode ? 'save' : 'edit-3'}" class="w-6 h-6 text-blue-600"></i>
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            ${state.catalog.categories.map((cat: any) => `
                <div class="card p-6 border-l-[6px] border-slate-200 dark:border-slate-800 hover:border-blue-400 transition-colors">
                    <h3 class="font-black text-[11px] text-slate-400 uppercase tracking-[0.2em] mb-5 border-b pb-3 flex justify-between items-center">
                        ${cat.name}
                        <span class="px-2 py-0.5 bg-slate-100 dark:bg-slate-900 rounded-md text-[9px] opacity-60">${cat.module.toUpperCase()}</span>
                    </h3>
                    <div class="space-y-4">
                        ${state.catalog.products.filter((p: any) => p.cat === cat.id).map((p: any) => `
                            <div class="flex justify-between items-center text-sm">
                                <span class="font-bold text-slate-700 dark:text-slate-300">${p.name}</span>
                                ${state.catalogEditMode 
                                    ? `<div class="flex items-center gap-2">
                                        <span class="text-[10px] font-bold text-slate-400">€</span>
                                        <input type="number" value="${p.price}" onchange="window.updateCatalogPrice('${p.id}', this.value)" class="w-20 px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg font-black text-right text-blue-600">
                                      </div>`
                                    : `<span class="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg font-black text-blue-600 tabular-nums">€${p.price.toFixed(2)}</span>`
                                }
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
`;

const HistoryView = () => `
    <div class="space-y-8 animate-fade-in">
        <div>
            <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Lease Registry</h2>
            <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Audit Control & Active Operations</p>
        </div>
        <div class="space-y-4">
            ${state.contracts.filter(c => !c.deleted).slice().reverse().map(c => `
                <div class="card p-5 flex justify-between items-center group hover:border-blue-400 transition-all hover:shadow-xl hover:shadow-slate-200 dark:hover:shadow-none">
                    <div class="flex items-center gap-5">
                        <div class="w-2 h-12 rounded-full ${c.module === 'vehicle' ? 'bg-blue-500' : (c.module === 'bike' ? 'bg-emerald-500' : 'bg-violet-500')} shadow-lg shadow-current/20"></div>
                        <div>
                            <div class="flex items-center gap-2">
                                <p class="font-black text-slate-900 dark:text-white text-base">#${c.contractNumber} — ${c.firstName} ${c.lastName}</p>
                                ${c.synced ? `<i data-lucide="cloud-check" class="w-4 h-4 text-emerald-500"></i>` : `<i data-lucide="clock" class="w-4 h-4 text-amber-500"></i>`}
                            </div>
                            <p class="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">${c.createdAt} &bull; ${c.product}</p>
                        </div>
                    </div>
                    <div class="flex gap-2 transition-all">
                        <button onclick="window.viewInvoice('${c.id}')" class="p-3 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"><i data-lucide="eye" class="w-5 h-5"></i></button>
                        <button onclick="window.editContract('${c.id}')" class="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"><i data-lucide="edit" class="w-5 h-5"></i></button>
                        <button onclick="window.deleteContract('${c.id}', this)" class="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><i data-lucide="trash-2" class="w-5 h-5"></i></button>
                    </div>
                </div>
            `).join('')}
            ${state.contracts.filter(c => !c.deleted).length === 0 ? '<div class="card p-20 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-xs border-dashed">Empty Audit Buffer</div>' : ''}
        </div>
    </div>
`;

const ExportView = () => `
    <div class="space-y-8 animate-fade-in">
        <div class="flex justify-between items-center">
            <div>
                <h2 class="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">Cloud Synchronization</h2>
                <p class="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">${state.contracts.filter(c => !c.synced).length} records waiting for remote commit</p>
            </div>
            <button onclick="window.syncAllToCloud()" id="sync-all-btn" class="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-xl font-black text-xs shadow-xl shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-2">
                <i data-lucide="cloud-upload" class="w-4 h-4"></i> FORCE PUSH TO CLOUD
            </button>
        </div>
        <div class="card overflow-hidden shadow-2xl">
            <div class="overflow-x-auto">
                <table class="w-full text-[11px] text-left border-collapse">
                    <thead class="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 font-black text-slate-400 uppercase tracking-widest">
                        <tr>
                            <th class="p-5">Registry Ref</th>
                            <th class="p-5">Client Name</th>
                            <th class="p-5">Asset Class</th>
                            <th class="p-5">Aggregate Valuation</th>
                            <th class="p-5 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 dark:divide-slate-800">
                        ${state.contracts.slice().reverse().map(c => `
                            <tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors ${c.deleted ? 'opacity-40 grayscale italic bg-red-50/10' : ''}">
                                <td class="p-5 font-mono font-bold text-slate-400">#${c.contractNumber}</td>
                                <td class="p-5 font-bold text-slate-800 dark:text-slate-200">${c.firstName} ${c.lastName}</td>
                                <td class="p-5 font-semibold text-slate-600 dark:text-slate-400">${c.product}</td>
                                <td class="p-5 font-black text-slate-900 dark:text-white tabular-nums">€${c.total.toFixed(2)}</td>
                                <td class="p-5">
                                    <div class="flex items-center justify-center gap-2">
                                        ${c.synced 
                                            ? `<span class="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[8px] font-black border border-emerald-200 tracking-tighter">COMMITTED</span>`
                                            : `<span class="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[8px] font-black border border-amber-200 tracking-tighter">LOCAL_BUFFER</span>`
                                        }
                                        ${c.deleted ? `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[8px] font-black border border-red-200 tracking-tighter">REVOKED</span>` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    </div>
`;

function render() {
    const container = document.getElementById('view-container');
    if (!container) return;
    
    if (state.editingId) {
        const c = state.contracts.find(x => x.id === state.editingId);
        if (c) { 
            container.innerHTML = CommonAlquilerForm(c.module, c); 
            if (window.lucide) window.lucide.createIcons(); 
            return; 
        }
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