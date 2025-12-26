import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, ShoppingCart, Users, DollarSign, LogOut, RefreshCw,
  Package, FileText, Code, Printer, Search, Zap, Plus, Minus, Trash2,
  User, Wrench, CreditCard, Phone, Mail, MapPin, Calendar, Edit3, Save,
  CheckCircle, AlertCircle, Info, ChevronDown, ChevronRight, Layers, X,
  ArrowLeft, ArrowUpRight, ArrowDownLeft
} from 'lucide-react';
import QRCode from 'react-qr-code';

// --- SABİT VERİLER ---
const INITIAL_DATA = {
  salesStats: { totalRevenue: 0, dailyStoreRevenue: 0, activeQuotations: 0, confirmedOrders: 0 },
  monthlySales: [],
  customers: [],
  orders: [],
  invoices: [],
  products: [],
  tickets: [],
  categories: []
};

const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

const StatusBadge = ({ status, label, onClick }) => {
  const map = {
    draft: { color: 'bg-blue-100 text-blue-800', label: 'Teklif' },
    sale: { color: 'bg-green-100 text-green-800', label: 'Sipariş' },
    done: { color: 'bg-gray-100 text-gray-800', label: 'Kilitli' },
    cancel: { color: 'bg-red-100 text-red-800', label: 'İptal' },
    new: { color: 'bg-blue-100 text-blue-800', label: 'Yeni' },
    progress: { color: 'bg-orange-100 text-orange-800', label: 'İşlemde' },
    solved: { color: 'bg-green-100 text-green-800', label: 'Çözüldü' },
    posted: { color: 'bg-indigo-100 text-indigo-800', label: 'Onaylı' }
  };
  const conf = map[status] || { color: 'bg-gray-100 text-gray-800', label: status };
  return <span onClick={onClick} className={`px-2 py-1 rounded text-xs font-bold border ${conf.color} ${onClick ? 'cursor-pointer' : ''}`}>{label || conf.label || status}</span>;
};

const PaymentBadge = ({ state }) => {
  if (state === 'paid') return <span className="flex items-center text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1" /> Ödendi</span>;
  return <span className="flex items-center text-red-500 text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1" /> Ödenmedi</span>;
}

// --- MENÜ ELEMANLARI (EN ÜSTTE) ---
const MENU_ITEMS = [
  { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales'] },
  { id: 'quick_offer', name: 'Hızlı Teklif', icon: Zap, roles: ['admin', 'sales'] },
  { id: 'helpdesk', name: 'Teknik Servis', icon: Wrench, roles: ['admin', 'sales'] },
  { id: 'sales', name: 'Satışlar', icon: ShoppingCart, roles: ['admin'] },
  { id: 'customers', name: 'Kontaklar', icon: Users, roles: ['admin'] },
  { id: 'accounting', name: 'Muhasebe', icon: DollarSign, roles: ['admin'] },
  { id: 'code', name: 'Entegrasyon', icon: Code, roles: ['admin'] }
];

// Kategori Ağacı
const CategoryTree = ({ categories, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const renderNode = (nodes) => nodes.map(node => (
    <div key={node.id} className="ml-2 select-none">
      <div className={`flex items-center py-2 cursor-pointer rounded-md px-2 transition-colors ${selectedId === node.id ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
        {node.children && node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); toggle(node.id); }} className="mr-1 text-slate-400 hover:text-slate-600 p-1">
            {expanded[node.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        )}
        <span onClick={() => onSelect(node.id)} className="text-sm w-full truncate">{node.name}</span>
      </div>
      {expanded[node.id] && node.children && <div className="border-l border-slate-200 ml-2 pl-1">{renderNode(node.children)}</div>}
    </div>
  ));
  return <div className="overflow-y-auto max-h-[calc(100vh-250px)] pr-2">{renderNode(categories)}</div>;
};

// Yatay Ürün Kartı - Dokunmatik Optimize
const ProductCard = ({ product, onAdd, onInfo }) => (
  <div onClick={() => onAdd(product)} className="bg-white border-2 border-slate-200 rounded-lg p-4 flex gap-4 hover:shadow-lg hover:border-indigo-300 transition-all relative group min-h-[120px] cursor-pointer active:scale-95 active:shadow-xl transition-transform duration-150 touch-manipulation">
    <div className="w-28 h-full flex-shrink-0 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden border border-slate-100">
      {product.image_128 ? <img src={`data:image/png;base64,${product.image_128}`} className="object-contain w-full h-full" /> : <Package className="text-slate-300 w-10 h-10" />}
    </div>
    <div className="flex-1 flex flex-col justify-between py-1">
      <div>
        <h4 className="text-slate-800 font-medium text-base leading-snug line-clamp-2 pr-8">{product.name}</h4>
        <p className="text-sm text-slate-400 mt-1 font-mono">{product.default_code}</p>
      </div>
      <div className="flex justify-between items-end mt-2">
        <span className="text-indigo-600 font-bold text-lg">{formatCurrency(product.list_price)}</span>
        <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full"><Plus className="w-5 h-5" /></div>
      </div>
    </div>
    <button onClick={(e) => { e.stopPropagation(); onInfo(product); }} className="absolute top-3 right-3 text-slate-300 hover:text-indigo-500 p-3 z-10 touch-manipulation"><Info className="w-6 h-6" /></button>
  </div>
);

// --- ANA UYGULAMA ---
export default function AscariDashboard() {
  const [data, setData] = useState(INITIAL_DATA);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [credentials, setCredentials] = useState({ url: '', db: '', username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [userRole, setUserRole] = useState('admin');
  const [rememberMe, setRememberMe] = useState(false);
  const [logoError, setLogoError] = useState(false);

  // Filtreler
  const [salesFilter, setSalesFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState(''); // EKSİK STATE EKLENDİ
  const [accountingSubTab, setAccountingSubTab] = useState('customer_invoices');

  // Seçimler & Detaylar
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderLines, setSelectedOrderLines] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('orders');

  // Hızlı Teklif
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // Satış Araması

  // Servis
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ customer: '', product: '', issue: '', priority: 'medium' });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // API Fonksiyonu
  const apiCall = async (endpoint, payload) => {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, ...payload })
      });
      const json = await res.json();
      if (json.status === 'error') throw new Error(json.message);
      return json;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ascari_creds');
    if (saved) { try { setCredentials(JSON.parse(saved)); setRememberMe(true); } catch (e) { } }
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault(); setLoading(true); setLoginError('');
    const res = await apiCall('connect', {});
    if (res && res.status === 'success') {
      if (rememberMe) localStorage.setItem('ascari_creds', JSON.stringify(credentials));
      setIsConnected(true);
      refreshData(res.uid);
      if (userRole === 'sales') setActiveTab('quick_offer');
    } else setLoginError('Giriş başarısız.');
    setLoading(false);
  };

  const refreshData = async (uid) => {
    setLoadingData(true);
    const res = await apiCall('dashboard-data', { uid });
    if (res) setData(prev => ({ ...prev, ...res }));
    setLoadingData(false);
  };

  const performSearch = async (model, query) => {
    if (!query || query.length < 2) return;
    setLoadingData(true);
    const res = await apiCall('search', { model, query });
    if (res && res.status === 'success') {
      if (model === 'product.product') setData(prev => ({ ...prev, products: res.data }));
      if (model === 'res.partner') setData(prev => ({ ...prev, customers: res.data }));
      if (model === 'sale.order') setData(prev => ({ ...prev, orders: res.data }));
    }
    setLoadingData(false);
  };

  const fetchOrderDetails = async (orderId) => {
    setLoadingData(true);
    const res = await apiCall('order-details', { order_id: orderId });
    if (res) setSelectedOrderLines(res.lines);
    setLoadingData(false);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
    setData(prev => ({
      ...prev,
      tickets: prev.tickets.map(t => t.id === ticketId ? { ...t, status: newStatus } : t)
    }));
    setSelectedTicket(prev => ({ ...prev, status: newStatus }));
  };

  // Sepet İşlemleri
  const addToCart = useCallback((product) => {
    setQuickCart(prev => {
      const exist = prev.find(i => i.id === product.id);
      if (exist) return prev.map(i => i.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { ...product, qty: 1 }];
    });
  }, []);

  const createQuickOffer = async () => {
    const total = quickCart.reduce((sum, i) => sum + (i.list_price * i.qty), 0);
    const quote_code = 'ASC-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);

    const offerData = {
      code: quote_code,
      customer: tempCustomerName || 'Sayın Ziyaretçi',
      phone: tempCustomerPhone || '',
      date: new Date().toLocaleDateString('tr-TR'),
      items: [...quickCart],
      total, tax: total * 0.2, grandTotal: total * 1.2
    };

    // Önce UI'da göster
    setQuickOfferDetails(offerData);

    // Odoo'ya kaydet (arka planda)
    try {
      setLoadingData(true);
      const res = await apiCall('create-quote', {
        quote_code: quote_code,
        customer_name: tempCustomerName || 'Sayın Ziyaretçi',
        customer_phone: tempCustomerPhone || '',
        items: quickCart.map(item => ({
          id: item.id,
          qty: item.qty,
          list_price: item.list_price
        }))
      });

      if (res && res.status === 'success') {
        console.log('Teklif Odoo\'ya kaydedildi:', res.order_id);
        // Başarı bildirimi göster (isteğe bağlı)
      }
    } catch (e) {
      console.error('Odoo kayıt hatası:', e);
      // Kullanıcıya uyarı vermek istemiyoruz, teklif yine de gösterilecek
    } finally {
      setLoadingData(false);
    }
  };

  const handleLogout = () => { setIsConnected(false); setActiveTab('dashboard'); setData(INITIAL_DATA); };

  // --- EKRAN RENDERLARI ---

  // 1. HIZLI TEKLİF & ÜRÜN LİSTESİ
  const renderProductGrid = (isOfferMode) => {
    const filtered = data.products.filter(p => {
      const catMatch = !selectedCategoryId || (p.categ_path && p.categ_path.includes(String(selectedCategoryId)));
      return catMatch;
    });

    if (quickOfferDetails) {
      return (
        <div className="flex flex-col h-full animate-fadeIn bg-white overflow-auto">
          <div className="flex justify-between items-center p-4 border-b no-print">
            <button onClick={() => { setQuickOfferDetails(null); setQuickCart([]); }} className="flex items-center text-slate-500"><ArrowLeft className="w-4 h-4 mr-2" /> Yeni Teklif</button>
            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center"><Printer className="w-4 h-4 mr-2" /> Yazdır</button>
          </div>
          <div className="p-10 max-w-4xl mx-auto w-full print:p-0 print:w-full">
            <div className="flex justify-between border-b-2 border-black pb-4 mb-6">
              <div><h1 className="text-3xl font-bold">ASCARI</h1><p className="text-gray-500">Mobilya & Tasarım</p></div>
              <div className="text-right"><h2 className="text-xl text-gray-400 font-light">TEKLİF</h2><p className="font-bold">#{quickOfferDetails.code}</p><p>{quickOfferDetails.date}</p></div>
            </div>
            <div className="mb-8"><h3 className="text-xs font-bold uppercase text-gray-400">Sayın</h3><p className="text-xl font-bold">{quickOfferDetails.customer}</p><p>{quickOfferDetails.phone}</p></div>
            <table className="w-full mb-8 text-sm">
              <thead><tr className="border-b-2 border-gray-200 text-left"><th className="py-2">Ürün</th><th className="text-right">Miktar</th><th className="text-right">Birim Fiyat</th><th className="text-right">Tutar</th></tr></thead>
              <tbody>{quickOfferDetails.items.map((i, k) => <tr key={k} className="border-b"><td className="py-3"><div className="font-bold">{i.name}</div><div className="text-xs text-gray-500">{i.default_code}</div></td><td className="text-right">{i.qty}</td><td className="text-right">{formatCurrency(i.list_price)}</td><td className="text-right font-bold">{formatCurrency(i.list_price * i.qty)}</td></tr>)}</tbody>
            </table>
            <div className="flex justify-end"><div className="w-1/2 text-right"><div className="flex justify-between border-t pt-2 text-xl font-bold"><span>GENEL TOPLAM:</span><span>{formatCurrency(quickOfferDetails.grandTotal)}</span></div></div></div>
            <div className="mt-10 text-center print-only"><div className="flex justify-center mb-2"><QRCode value={`https://ascari.com.tr/teklif-sorgula?code=${quickOfferDetails.code}`} size={80} /></div><p className="text-xs text-gray-400">Teklifinizi sorgulamak için QR kodu okutun</p><p className="text-xs text-gray-500 font-mono mt-1">{quickOfferDetails.code}</p></div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-full gap-4 animate-fadeIn no-print">
        <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
          <div className="p-4 border-b font-bold text-slate-700 bg-slate-50 rounded-t-xl">Kategoriler</div>
          <div className="p-2 flex-1 overflow-y-auto"><CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} /></div>
        </div>
        <div className={`${isOfferMode ? 'w-1/2' : 'w-3/4'} flex flex-col gap-4`}>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input className="w-full pl-10 border p-2.5 rounded-lg" placeholder="Sunucuda Ara..." value={productSearch} onChange={e => setProductSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSearch('product.product', productSearch)} /></div>
            <button onClick={() => performSearch('product.product', productSearch)} className="bg-indigo-600 text-white px-6 rounded-lg">Ara</button>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">{filtered.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} onInfo={setSelectedProduct} />)}</div>
            {filtered.length === 0 && <div className="text-center py-20 text-slate-400">Ürün yok.</div>}
          </div>
        </div>
        {isOfferMode && (
          <div className="w-1/4 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white font-bold rounded-t-xl flex justify-between"><span>Sepet</span><span className="bg-indigo-500 px-2 rounded text-xs py-1">{quickCart.length}</span></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">{quickCart.map(i => <div key={i.id} className="flex justify-between items-center border-b pb-3 gap-2"><div className="flex-1 pr-2"><div className="text-sm font-medium truncate">{i.name}</div><div className="text-xs text-slate-400">{formatCurrency(i.list_price)}</div></div><div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 touch-manipulation"><button onClick={() => setQuickCart(prev => prev.map(x => x.id === i.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="px-3 py-2 hover:bg-slate-200 rounded active:scale-95 transition-transform text-lg font-bold">-</button><span className="text-base font-bold min-w-[2rem] text-center">{i.qty}</span><button onClick={() => addToCart(i)} className="px-3 py-2 hover:bg-slate-200 rounded active:scale-95 transition-transform text-lg font-bold">+</button></div><button onClick={() => setQuickCart(prev => prev.filter(x => x.id !== i.id))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded touch-manipulation active:scale-95 transition-transform"><Trash2 className="w-5 h-5" /></button></div>)}</div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-3">
              <div className="flex justify-between font-bold text-lg"><span>Toplam</span><span>{formatCurrency(quickCart.reduce((a, b) => a + (b.list_price * b.qty), 0))}</span></div>
              <input className="w-full border-2 p-3 rounded-lg text-base touch-manipulation" placeholder="Müşteri Adı (Opsiyonel)" value={tempCustomerName} onChange={e => setTempCustomerName(e.target.value)} />
              <input className="w-full border-2 p-3 rounded-lg text-base touch-manipulation" placeholder="Telefon (Opsiyonel)" value={tempCustomerPhone} onChange={e => setTempCustomerPhone(e.target.value)} />
              <button onClick={createQuickOffer} disabled={quickCart.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 hover:bg-indigo-700 active:scale-98 transition-transform touch-manipulation">Teklif Oluştur</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. TEKNİK SERVİS
  const renderHelpdesk = () => {
    if (selectedTicket) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <button onClick={() => setSelectedTicket(null)} className="text-slate-500 flex items-center mb-4"><ArrowLeft className="mr-2 w-4 h-4" /> Listeye Dön</button>
          <div className="bg-white shadow rounded-lg p-6 border border-slate-200">
            <h2 className="text-2xl font-bold mb-1">{selectedTicket.issue}</h2>
            <p className="text-sm text-slate-500 mb-6">#{selectedTicket.id}</p>
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="p-4 bg-slate-50 rounded border"><h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Müşteri</h4><p>{selectedTicket.customer}</p></div>
              <div className="p-4 bg-slate-50 rounded border"><h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Ürün</h4><p>{selectedTicket.product}</p></div>
            </div>
            <div className="flex items-center gap-4 border-t pt-4">
              <span className="font-bold">Durum Güncelle:</span>
              <button className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">Yeni</button>
              <button className="px-3 py-1 bg-orange-100 text-orange-800 rounded text-sm">İşlemde</button>
              <button className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm">Çözüldü</button>
            </div>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex justify-between items-center"><h2 className="text-xl font-bold">Arıza Kayıtları</h2><button onClick={() => setShowNewTicketForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Yeni Kayıt</button></div>
        {showNewTicketForm && <div className="bg-white p-6 rounded-lg shadow-lg border mb-6"><div className="flex justify-between mb-4 font-bold"><h3>Yeni Kayıt</h3><button onClick={() => setShowNewTicketForm(false)}><X /></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Müşteri" /><input className="border p-2 rounded" placeholder="Ürün" /><textarea className="border p-2 rounded col-span-2" placeholder="Sorun..." /><button className="bg-indigo-600 text-white p-2 rounded col-span-2">Kaydet</button></div></div>}
        <div className="bg-white rounded-lg shadow overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-4">Müşteri</th><th className="p-4">Ürün</th><th className="p-4">Durum</th></tr></thead><tbody className="divide-y">{(data.tickets || []).map(t => <tr key={t.id} onClick={() => setSelectedTicket(t)} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 font-medium">{t.customer}</td><td className="p-4">{t.product}</td><td className="p-4"><StatusBadge status={t.status} /></td></tr>)}</tbody></table></div>
      </div>
    );
  };

  // 3. SATIŞLAR
  const renderSales = () => {
    if (selectedOrder) {
      return (
        <div className="space-y-6 animate-fadeIn">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center text-slate-500 mb-4"><ArrowLeft className="mr-2 w-4 h-4" /> Geri Dön</button>
          <div className="bg-white shadow rounded-lg p-6 border border-slate-200">
            <div className="flex justify-between border-b pb-4 mb-4"><div><h2 className="text-2xl font-bold">{selectedOrder.name}</h2><p className="text-slate-500">{selectedOrder.customer}</p></div><StatusBadge status={selectedOrder.status} /></div>
            <table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-3">Ürün</th><th className="p-3 text-right">Adet</th><th className="p-3 text-right">Tutar</th></tr></thead><tbody>{selectedOrderLines.length > 0 ? selectedOrderLines.map((l, i) => <tr key={i} className="border-b"><td className="p-3">{l.name}</td><td className="p-3 text-right">{l.qty}</td><td className="p-3 text-right font-bold">{formatCurrency(l.total)}</td></tr>) : <tr><td colSpan="3" className="p-4 text-center">Yükleniyor...</td></tr>}</tbody></table>
            <div className="text-right mt-4 text-xl font-bold">Toplam: {formatCurrency(selectedOrder.amount)}</div>
          </div>
        </div>
      )
    }
    const filtered = (data.orders || []).filter(o => salesFilter === 'all' ? true : salesFilter === 'sale' ? ['sale', 'done'].includes(o.status) : o.status === 'draft');
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-fit"><button onClick={() => setSalesFilter('all')} className={`px-4 py-2 rounded-md text-sm font-bold ${salesFilter === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Tümü</button><button onClick={() => setSalesFilter('sale')} className={`px-4 py-2 rounded-md text-sm font-bold ${salesFilter === 'sale' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Siparişler</button><button onClick={() => setSalesFilter('draft')} className={`px-4 py-2 rounded-md text-sm font-bold ${salesFilter === 'draft' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Teklifler</button></div>
        <div className="bg-white p-3 rounded-lg shadow-sm flex gap-2"><input className="w-full border p-2 rounded" placeholder="Sipariş Ara..." onKeyDown={e => e.key === 'Enter' && performSearch('sale.order', e.target.value)} /><button className="bg-slate-800 text-white px-4 rounded">Ara</button></div>
        <div className="bg-white rounded-lg shadow overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-4">Ref</th><th className="p-4">Müşteri</th><th className="p-4 text-right">Tutar</th><th className="p-4">Durum</th></tr></thead><tbody className="divide-y">{filtered.map(o => <tr key={o.id} onClick={() => { setSelectedOrder(o); fetchOrderDetails(o.id_raw); }} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 font-bold text-indigo-600">{o.name}</td><td className="p-4">{o.customer}</td><td className="p-4 text-right font-bold">{formatCurrency(o.amount)}</td><td className="p-4"><StatusBadge status={o.status} /></td></tr>)}</tbody></table></div>
      </div>
    );
  };

  // --- ÜRÜN MODAL ---
  const renderProductModal = () => {
    if (!selectedProduct) return null;
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedProduct(null)}>
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-8 relative" onClick={e => e.stopPropagation()}>
          <button onClick={() => setSelectedProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X /></button>
          <div className="flex gap-8 items-start">
            <div className="w-1/3 bg-slate-50 rounded flex items-center justify-center p-4 h-64 border">{selectedProduct.image_128 ? <img src={`data:image/png;base64,${selectedProduct.image_128}`} className="max-w-full max-h-full object-contain" /> : <Package className="w-20 h-20 text-slate-300" />}</div>
            <div className="w-2/3 space-y-6">
              <div><h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2><p className="text-slate-500 font-mono mt-1">{selectedProduct.default_code}</p></div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><label className="text-slate-400 text-xs uppercase font-bold">Fiyat</label><p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedProduct.list_price)}</p></div>
                <div><label className="text-slate-400 text-xs uppercase font-bold">Stok</label><p className="text-lg font-bold text-slate-800">{selectedProduct.qty_available || 0} Adet</p></div>
              </div>
              {(selectedProduct.x_assembled_width || selectedProduct.x_assembled_depth || selectedProduct.x_assembled_height) && (
                <div className="border-t pt-4">
                  <label className="text-slate-400 text-xs uppercase font-bold">Kurulu Ölçüler (G * D * Y)</label>
                  <p className="text-base font-medium text-slate-700 mt-2">
                    {[
                      selectedProduct.x_assembled_width || '-',
                      selectedProduct.x_assembled_depth || '-',
                      selectedProduct.x_assembled_height || '-'
                    ].join(' * ')} cm
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  };

  const renderCustomers = () => {
    if (selectedCustomer) {
      return (<div className="space-y-6 animate-fadeIn no-print"><button onClick={() => setSelectedCustomer(null)} className="flex items-center text-slate-500"><ArrowLeft className="w-4 h-4 mr-2" /> Listeye Dön</button><div className="grid grid-cols-3 gap-6"><div className="col-span-1 bg-white p-6 rounded-lg shadow text-center border-t-4 border-indigo-500"><div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-slate-500 mb-4">{selectedCustomer.name.charAt(0)}</div><h2 className="font-bold text-lg">{selectedCustomer.name}</h2><div className="mt-4 text-sm text-left space-y-2"><div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-slate-400" /> {selectedCustomer.email}</div><div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-slate-400" /> {selectedCustomer.phone}</div></div><div className="mt-6 pt-4 border-t text-2xl font-bold text-slate-800">{formatCurrency(selectedCustomer.balance)}</div><div className="text-xs text-slate-500">Bakiye</div></div><div className="col-span-2 bg-white rounded-lg shadow overflow-hidden"><div className="flex border-b"><button onClick={() => setCustomerDetailTab('orders')} className={`flex-1 py-3 ${customerDetailTab === 'orders' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Siparişler</button><button onClick={() => setCustomerDetailTab('invoices')} className={`flex-1 py-3 ${customerDetailTab === 'invoices' ? 'border-b-2 border-indigo-600 font-bold' : ''}`}>Faturalar</button></div><div className="p-4 max-h-[400px] overflow-y-auto">{customerDetailTab === 'orders' && <div className="text-center text-slate-500 py-10">Sipariş verisi yükleniyor...</div>}</div></div></div></div>)
    }
    const filteredContacts = (data.customers || []).filter(c => customerBalanceFilter === 'all' ? true : customerBalanceFilter === 'debtor' ? c.balance > 0 : c.balance <= 0);
    return (
      <div className="space-y-6 no-print">
        <div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm">
          <div className="flex space-x-2">
            <button onClick={() => setCustomerBalanceFilter('all')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter === 'all' ? 'bg-indigo-100' : 'bg-slate-100'}`}>Tümü</button>
            <button onClick={() => setCustomerBalanceFilter('debtor')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter === 'debtor' ? 'bg-red-100' : 'bg-slate-100'}`}>Borçlular</button>
            <button onClick={() => setCustomerBalanceFilter('creditor')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter === 'creditor' ? 'bg-green-100' : 'bg-slate-100'}`}>Alacaklılar</button>
          </div>
          <div className="flex gap-2">
            <input className="border p-2 rounded text-sm" placeholder="Cari Ara..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch('res.partner', customerSearch)} />
            <button className="bg-indigo-600 text-white px-3 rounded" onClick={() => performSearch('res.partner', customerSearch)}>Ara</button>
          </div>
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y">
            {filteredContacts.map(c => (
              <li key={c.id} onClick={() => setSelectedCustomer(c)} className="p-4 flex justify-between hover:bg-slate-50 cursor-pointer">
                <div><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">{c.phone}</div></div>
                <div className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(c.balance)}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  const renderAccounting = () => { if (selectedInvoice) { return (<div className="space-y-6 animate-fadeIn"><button onClick={() => setSelectedInvoice(null)} className="flex items-center text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-5 h-5 mr-2" /> Faturalara Dön</button><div className="bg-white shadow rounded-lg p-8 border border-slate-200 relative"><div className="absolute top-0 right-0 p-4"><PaymentBadge state={selectedInvoice.payment_state} /></div><h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedInvoice.id}</h2><p className="text-slate-500 mb-6">{selectedInvoice.date}</p><div className="grid grid-cols-2 gap-8 mb-8"><div><h4 className="font-bold text-gray-500 text-xs uppercase">Muhatap</h4><p className="text-lg">{selectedInvoice.partner}</p></div><div className="text-right"><h4 className="font-bold text-gray-500 text-xs uppercase">Tutar</h4><p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedInvoice.amount)}</p></div></div><table className="w-full border-t border-slate-200"><thead className="bg-slate-50"><tr><th className="text-left py-2 text-sm text-slate-600">Açıklama</th><th className="text-right py-2 text-sm text-slate-600">Tutar</th></tr></thead><tbody>{selectedInvoice.lines?.map((line, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2 text-slate-800">{line.desc}</td><td className="py-2 text-right font-medium">{formatCurrency(line.sub)}</td></tr>)}</tbody></table></div></div>) } return (<div className="space-y-6 animate-fadeIn"><div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4"><nav className="flex space-x-4 mb-4 sm:mb-0"><button onClick={() => setAccountingSubTab('customer_invoices')} className={`${accountingSubTab === 'customer_invoices' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowUpRight className="w-4 h-4 mr-2" /> Giden Faturalar</button><button onClick={() => setAccountingSubTab('vendor_bills')} className={`${accountingSubTab === 'vendor_bills' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowDownLeft className="w-4 h-4 mr-2" /> Gelen Faturalar</button></nav><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input type="text" placeholder="Fatura Ara..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} /></div></div><div className="bg-white shadow overflow-hidden sm:rounded-lg"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">No</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{accountingSubTab === 'customer_invoices' ? 'Müşteri' : 'Tedarikçi'}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Tarih</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Tutar</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Durum</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Ödeme</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{(data.invoices || []).filter(inv => (accountingSubTab === 'customer_invoices' ? inv.type === 'out_invoice' : inv.type === 'in_invoice')).map((inv) => (<tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50 cursor-pointer"><td className="px-6 py-4 text-sm font-medium text-indigo-600">{inv.id}</td><td className="px-6 py-4 text-sm text-slate-900">{inv.partner}</td><td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td><td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">{formatCurrency(inv.amount)}</td><td className="px-6 py-4 text-center"><StatusBadge status={inv.status} label={inv.status === 'posted' ? 'Onaylı' : 'Taslak'} /></td><td className="px-6 py-4 flex justify-center"><PaymentBadge state={inv.payment_state} /></td></tr>))}</tbody></table></div></div>); };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
          <div className="text-center mb-8">
            <div className="inline-block p-3 bg-slate-900 rounded-xl mb-3">
              <img src="/logo.png" className="h-12 brightness-200 filter" onError={(e) => e.target.style.display = 'none'} alt="Ascari Logo" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Yönetim Paneli</h2>
          </div>
          {loginError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border-l-4 border-red-500">{loginError}</div>}
          <form onSubmit={handleConnect} className="space-y-4">
            <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Odoo Adresi" value={credentials.url} onChange={e => setCredentials({ ...credentials, url: e.target.value })} />
            <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Veritabanı" value={credentials.db} onChange={e => setCredentials({ ...credentials, db: e.target.value })} />
            <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="E-Posta" value={credentials.username} onChange={e => setCredentials({ ...credentials, username: e.target.value })} />
            <input className="w-full p-4 border rounded-xl bg-slate-50" type="password" placeholder="Şifre" value={credentials.password} onChange={e => setCredentials({ ...credentials, password: e.target.value })} />
            <div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} /> <span>Beni Hatırla</span></div>
            <button disabled={loading} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold">{loading ? 'Bağlanıyor...' : 'Giriş Yap'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {renderProductModal()}
      <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 no-print">
        <div className="p-6 hidden lg:flex justify-center">
          <img src="/logo.png" className="h-10 brightness-200" onError={(e) => e.target.style.display = 'none'} alt="Ascari" />
        </div>
        <div className="lg:hidden p-4 flex justify-center">
          <img src="/logo.png" className="h-8 brightness-200" onError={(e) => e.target.style.display = 'none'} alt="Ascari" />
        </div>
        <nav className="flex-1 space-y-1 px-2 py-4">
          {MENU_ITEMS.map(item => (
            (item.roles.includes(userRole)) && (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center w-full p-4 rounded-xl transition-colors ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <item.icon className="w-6 h-6 lg:mr-3" /> <span className="hidden lg:inline font-medium">{item.name}</span>
              </button>
            )
          ))}
        </nav>
        <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white m-4 p-2 hover:bg-slate-800 rounded"><LogOut className="w-5 h-5 mr-2" /> <span className="hidden lg:inline">Çıkış</span></button>
      </div>
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-4 lg:p-6 relative">
          {loadingData && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-200 overflow-hidden z-50"><div className="h-full bg-indigo-600 animate-progress"></div></div>}
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-bold text-slate-800">Dashboard</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Teklifler</p>
                      <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.orders?.filter(o => o.status === 'draft').length || 0}</h3>
                    </div>
                    <Zap className="w-12 h-12 text-indigo-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Siparişler</p>
                      <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.orders?.filter(o => o.status !== 'draft').length || 0}</h3>
                    </div>
                    <ShoppingCart className="w-12 h-12 text-green-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Müşteriler</p>
                      <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.customers?.length || 0}</h3>
                    </div>
                    <Users className="w-12 h-12 text-blue-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Açık Ticketlar</p>
                      <h3 className="text-3xl font-bold text-slate-800 mt-2">{data.tickets?.length || 0}</h3>
                    </div>
                    <Wrench className="w-12 h-12 text-orange-500 opacity-20" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'quick_offer' && renderProductGrid(true)}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'helpdesk' && renderHelpdesk()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'accounting' && renderAccounting()}
        </div>
      </div>
    </div>
  );
}
