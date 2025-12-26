import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, ShoppingCart, Users, DollarSign, LogOut, RefreshCw,
  Package, FileText, Code, Printer, Search, Zap, Plus, Minus, Trash2,
  User, Wrench, CreditCard, Phone, Mail, MapPin, Calendar, Edit3, Save,
  CheckCircle, AlertCircle, Info, ChevronDown, ChevronRight, Layers, X,
  ArrowLeft, ArrowUpRight, ArrowDownLeft, Menu, Clock, CheckSquare, AlertTriangle
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

// Kategori Ağacı - Geliştirilmiş (Tek Tıkla Aç + Filtrele)
const CategoryTree = ({ categories, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState({});
  const handleClick = (node) => {
    // Hem genişlet hem de filtrele
    if (node.children && node.children.length > 0) {
      setExpanded(prev => ({ ...prev, [node.id]: !prev[node.id] }));
    }
    onSelect(node.id);
  };
  const renderNode = (nodes) => nodes.map(node => (
    <div key={node.id} className="ml-2 select-none">
      <div
        onClick={() => handleClick(node)}
        className={`flex items-center py-3 px-3 cursor-pointer rounded-md transition-colors touch-target ${selectedId === node.id
          ? 'bg-indigo-50 text-indigo-700 font-bold'
          : 'text-slate-600 hover:bg-slate-50 active:bg-slate-100'
          }`}
      >
        {node.children && node.children.length > 0 && (
          <ChevronRight className={`w-5 h-5 mr-2 text-slate-400 transition-transform ${expanded[node.id] ? 'rotate-90' : ''
            }`} />
        )}
        <span className="text-sm w-full truncate">{node.name}</span>
      </div>
      {expanded[node.id] && node.children && <div className="border-l border-slate-200 ml-3 pl-1">{renderNode(node.children)}</div>}
    </div>
  ));
  return <div className="overflow-y-auto max-h-[calc(100vh-250px)] pr-2">{renderNode(categories)}</div>
};

// Yatay Ürün Kartı - Dokunmatik Optimize + Ölçüler
const ProductCard = ({ product, onAdd, onInfo }) => {
  const hasDimensions = product.x_assembled_width || product.x_assembled_depth || product.x_assembled_height;
  return (
    <div onClick={() => onAdd(product)} className="bg-white border-2 border-slate-200 rounded-lg p-4 flex gap-4 hover:shadow-lg hover:border-indigo-300 transition-all relative group min-h-[120px] cursor-pointer active:scale-95 active:shadow-xl transition-transform duration-150 touch-manipulation">
      <div className="w-28 h-full flex-shrink-0 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden border border-slate-100">
        {product.image_128 ? <img src={`data:image/png;base64,${product.image_128}`} className="object-contain w-full h-full" /> : <Package className="text-slate-300 w-10 h-10" />}
      </div>
      <div className="flex-1 flex flex-col justify-between py-1">
        <div>
          <h4 className="text-slate-800 font-medium text-base leading-snug line-clamp-2 pr-8">{product.name}</h4>
          <p className="text-sm text-slate-400 mt-1 font-mono">{product.default_code}</p>
          {hasDimensions && (
            <div className="mt-1.5 text-xs text-slate-500 font-mono flex items-center gap-1">
              <Layers className="w-3 h-3" />
              <span>
                {product.x_assembled_width || '-'} × {product.x_assembled_depth || '-'} × {product.x_assembled_height || '-'} cm
              </span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-end mt-2">
          <span className="text-indigo-600 font-bold text-lg">{formatCurrency(product.list_price)}</span>
          <div className="bg-indigo-50 text-indigo-600 p-3 rounded-full"><Plus className="w-5 h-5" /></div>
        </div>
      </div>
      <button onClick={(e) => { e.stopPropagation(); onInfo(product); }} className="absolute top-3 right-3 text-slate-300 hover:text-indigo-500 p-3 z-10 touch-manipulation"><Info className="w-6 h-6" /></button>
    </div>
  );
};

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

  // Mobile
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Filtreler
  const [salesFilter, setSalesFilter] = useState('all');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [accountingSubTab, setAccountingSubTab] = useState('customer_invoices');
  const [ticketSearch, setTicketSearch] = useState('');

  // Seçimler & Detaylar
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderLines, setSelectedOrderLines] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('orders');
  const [ticketNotes, setTicketNotes] = useState('');

  // Hızlı Teklif
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [applyDiscount, setApplyDiscount] = useState(true); // Nakit/Tek çekim indirimi

  // CRM Data
  const [customerOrders, setCustomerOrders] = useState([]);
  const [customerInvoices, setCustomerInvoices] = useState([]);
  const [customerQuotes, setCustomerQuotes] = useState([]);
  const [customerTickets, setCustomerTickets] = useState([]);
  const [customerPayments, setCustomerPayments] = useState([]);
  const [newPayment, setNewPayment] = useState({ amount: '', date: '', method: 'cash', note: '', journal_id: '', installments: 1 });

  // Payment Journals (Kasa, Banka)
  const [cashRegisters, setCashRegisters] = useState([]);
  const [banks, setBanks] = useState([]);

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

  const addTicketNote = async (ticketId, note) => {
    // In real implementation, this would call API
    console.log('Adding note to ticket:', ticketId, note);
    // For now, just clear the note field
    setTicketNotes('');
  };

  // Fetch customer-specific data
  const fetchCustomerData = useCallback(async (customerId) => {
    // Filter orders for this customer
    const orders = (data.orders || []).filter(o => o.customer === selectedCustomer?.name);
    setCustomerOrders(orders);

    // Filter invoices
    const invoices = (data.invoices || []).filter(i => i.partner === selectedCustomer?.name);
    setCustomerInvoices(invoices);

    // Filter quotes (draft orders)
    const quotes = orders.filter(o => o.status === 'draft');
    setCustomerQuotes(quotes);

    // Filter tickets
    const tickets = (data.tickets || []).filter(t => t.customer === selectedCustomer?.name);
    setCustomerTickets(tickets);

    // Mock payments data
    setCustomerPayments([]);
  }, [data, selectedCustomer]);

  useEffect(() => {
    if (selectedCustomer) {
      fetchCustomerData(selectedCustomer.id);
      fetchPaymentJournals();
    }
  }, [selectedCustomer, fetchCustomerData]);

  const fetchPaymentJournals = async () => {
    const res = await apiCall('payment-journals', {});
    if (res && res.status === 'success') {
      setCashRegisters(res.cash_registers || []);
      setBanks(res.banks || []);
      // İlk journal'ı default olarak seç
      if (res.cash_registers && res.cash_registers.length > 0) {
        setNewPayment(prev => ({ ...prev, journal_id: res.cash_registers[0].id }));
      }
    }
  };

  const savePayment = async () => {
    if (!newPayment.amount || !newPayment.date || !newPayment.journal_id) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setLoadingData(true);
    const res = await apiCall('register-payment', {
      partner_id: selectedCustomer.id,
      amount: parseFloat(newPayment.amount),
      date: newPayment.date,
      journal_id: parseInt(newPayment.journal_id),
      payment_method: newPayment.method,
      installments: parseInt(newPayment.installments) || 1,
      payment_type: 'inbound',
      note: newPayment.note || ''
    });
    setLoadingData(false);

    if (res && res.status === 'success') {
      // Add to local state
      const payment = {
        id: res.payment_id,
        amount: newPayment.amount,
        date: newPayment.date,
        method: newPayment.method,
        note: newPayment.note,
        installments: newPayment.installments,
        timestamp: new Date().toISOString()
      };
      setCustomerPayments(prev => [payment, ...prev]);
      setNewPayment({ amount: '', date: '', method: 'cash', note: '', journal_id: cashRegisters[0]?.id || '', installments: 1 });
      alert('Ödeme başarıyla kaydedildi!');
    } else {
      alert('Ödeme kaydedilemedi: ' + (res?.message || 'Bilinmeyen hata'));
    }
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
    const discountedTotal = applyDiscount ? total / 1.15 : total;
    const quote_code = 'ASC-' + Date.now().toString().slice(-6) + Math.floor(100 + Math.random() * 900);

    const offerData = {
      code: quote_code,
      customer: tempCustomerName || 'Sayın Ziyaretçi',
      phone: tempCustomerPhone || '',
      date: new Date().toLocaleDateString('tr-TR'),
      items: [...quickCart],
      total,
      discountedTotal,
      hasDiscount: applyDiscount,
      grandTotal: total
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

  // 1. HIZLI TEKLİF & ÜRÜN LİSTESİ - Responsive
  const renderProductGrid = (isOfferMode) => {
    const filtered = data.products.filter(p => {
      const catMatch = !selectedCategoryId || (p.categ_path && p.categ_path.includes(String(selectedCategoryId)));
      return catMatch;
    });

    if (quickOfferDetails) {
      return (
        <div className="flex flex-col h-full animate-fadeIn bg-white overflow-auto">
          <div className="flex justify-between items-center p-4 border-b no-print">
            <button onClick={() => { setQuickOfferDetails(null); setQuickCart([]); }} className="flex items-center text-slate-500 touch-target"><ArrowLeft className="w-4 h-4 mr-2" /> Yeni Teklif</button>
            <button onClick={() => window.print()} className="bg-indigo-600 text-white px-4 py-2 rounded flex items-center touch-target"><Printer className="w-4 h-4 mr-2" /> Yazdır</button>
          </div>
          <div className="p-4 md:p-10 max-w-4xl mx-auto w-full print:p-0 print:w-full">
            <div className="flex flex-col md:flex-row justify-between border-b-2 border-black pb-4 mb-6 gap-4">
              <div><h1 className="text-2xl md:text-3xl font-bold">ASCARI</h1><p className="text-gray-500">Mobilya & Tasarım</p></div>
              <div className="md:text-right"><h2 className="text-lg md:text-xl text-gray-400 font-light">TEKLİF</h2><p className="font-bold">#{quickOfferDetails.code}</p><p>{quickOfferDetails.date}</p></div>
            </div>
            <div className="mb-8"><h3 className="text-xs font-bold uppercase text-gray-400">Sayın</h3><p className="text-lg md:text-xl font-bold">{quickOfferDetails.customer}</p><p>{quickOfferDetails.phone}</p></div>
            <div className="overflow-x-auto">
              <table className="w-full mb-8 text-sm">
                <thead><tr className="border-b-2 border-gray-200 text-left"><th className="py-2">Ürün</th><th className="text-right">Miktar</th><th className="text-right hidden sm:table-cell">Birim Fiyat</th><th className="text-right">Tutar</th></tr></thead>
                <tbody>{quickOfferDetails.items.map((i, k) => <tr key={k} className="border-b"><td className="py-3"><div className="font-bold">{i.name}</div><div className="text-xs text-gray-500">{i.default_code}</div></td><td className="text-right">{i.qty}</td><td className="text-right hidden sm:table-cell">{formatCurrency(i.list_price)}</td><td className="text-right font-bold">{formatCurrency(i.list_price * i.qty)}</td></tr>)}</tbody>
              </table>
            </div>
            <div className="flex justify-end"><div className="w-full md:w-1/2 text-right space-y-2"><div className="flex justify-between border-t pt-2 text-base"><span>Kredi Kartı 6 Taksit:</span><span className="font-bold">{formatCurrency(quickOfferDetails.grandTotal)}</span></div>{quickOfferDetails.hasDiscount && <div className="flex justify-between border-t pt-2 text-lg md:text-xl font-bold text-green-700"><span>Nakit/Tek Çekim:</span><span>{formatCurrency(quickOfferDetails.discountedTotal)}</span></div>}</div></div>
            <div className="mt-10 text-center print-only"><div className="flex justify-center mb-2"><QRCode value={`https://ascari.com.tr/teklif-sorgula?code=${quickOfferDetails.code}`} size={80} /></div><p className="text-xs text-gray-400">Teklifinizi sorgulamak için QR kodu okutun</p><p className="text-xs text-gray-500 font-mono mt-1">{quickOfferDetails.code}</p></div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col lg:flex-row h-full gap-4 animate-fadeIn no-print">
        {/* Categories - Hide on mobile, show as drawer or toggle */}
        <div className="hidden lg:block lg:w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex-col">
          <div className="p-4 border-b font-bold text-slate-700 bg-slate-50 rounded-t-xl">Kategoriler</div>
          <div className="p-2 flex-1 overflow-y-auto"><CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} /></div>
        </div>

        {/* Products */}
        <div className={`flex-1 flex flex-col gap-4`}>
          <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1"><Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" /><input className="w-full pl-10 border-2 p-3 rounded-lg touch-target" placeholder="Sunucuda Ara..." value={productSearch} onChange={e => setProductSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && performSearch('product.product', productSearch)} /></div>
            <button onClick={() => performSearch('product.product', productSearch)} className="bg-indigo-600 text-white px-6 py-3 rounded-lg touch-target">Ara</button>
          </div>
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto">
            <div className="grid grid-cols-1 gap-4">{filtered.map(p => <ProductCard key={p.id} product={p} onAdd={addToCart} onInfo={setSelectedProduct} />)}</div>
            {filtered.length === 0 && <div className="text-center py-20 text-slate-400">Ürün yok.</div>}
          </div>
        </div>

        {/* Cart - Mobile: Bottom drawer, Desktop: Sidebar */}
        {isOfferMode && (
          <div className="lg:w-1/4 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
            <div className="p-4 bg-slate-900 text-white font-bold rounded-t-xl flex justify-between"><span>Sepet</span><span className="bg-indigo-500 px-2 rounded text-xs py-1">{quickCart.length}</span></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">{quickCart.map(i => <div key={i.id} className="flex justify-between items-center border-b pb-3 gap-2"><div className="flex-1 pr-2"><div className="text-sm font-medium truncate">{i.name}</div><div className="text-xs text-slate-400">{formatCurrency(i.list_price)}</div></div><div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1 touch-manipulation"><button onClick={() => setQuickCart(prev => prev.map(x => x.id === i.id ? { ...x, qty: Math.max(1, x.qty - 1) } : x))} className="px-3 py-2 hover:bg-slate-200 rounded active:scale-95 transition-transform text-lg font-bold touch-target">-</button><span className="text-base font-bold min-w-[2rem] text-center">{i.qty}</span><button onClick={() => addToCart(i)} className="px-3 py-2 hover:bg-slate-200 rounded active:scale-95 transition-transform text-lg font-bold touch-target">+</button></div><button onClick={() => setQuickCart(prev => prev.filter(x => x.id !== i.id))} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded touch-manipulation active:scale-95 transition-transform touch-target"><Trash2 className="w-5 h-5" /></button></div>)}</div>
            <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-3">
              <div className="flex items-center justify-between mb-2 p-2 bg-white rounded border">
                <span className="text-sm font-medium">Nakit/Tek Çekim İndirimi</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={applyDiscount} onChange={e => setApplyDiscount(e.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              {applyDiscount ? (
                <>
                  <div className="flex justify-between text-sm text-slate-600"><span>6 Taksit Fiyatı:</span><span className="line-through">{formatCurrency(quickCart.reduce((a, b) => a + (b.list_price * b.qty), 0))}</span></div>
                  <div className="flex justify-between font-bold text-lg text-green-700"><span>Nakit/Tek Çekim:</span><span>{formatCurrency(quickCart.reduce((a, b) => a + (b.list_price * b.qty), 0) / 1.15)}</span></div>
                </>
              ) : (
                <div className="flex justify-between font-bold text-lg"><span>Toplam</span><span>{formatCurrency(quickCart.reduce((a, b) => a + (b.list_price * b.qty), 0))}</span></div>
              )}
              <input className="w-full border-2 p-3 rounded-lg text-base touch-target" placeholder="Müşteri Adı (Opsiyonel)" value={tempCustomerName} onChange={e => setTempCustomerName(e.target.value)} />
              <input className="w-full border-2 p-3 rounded-lg text-base touch-target" placeholder="Telefon (Opsiyonel)" value={tempCustomerPhone} onChange={e => setTempCustomerPhone(e.target.value)} />
              <button onClick={createQuickOffer} disabled={quickCart.length === 0} className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg disabled:opacity-50 hover:bg-indigo-700 active:scale-98 transition-transform touch-target">Teklif Oluştur</button>
            </div>
          </div>
        )}
      </div>
    );
  };

  // 2. TEKNİK SERVİS - Enhanced with summary cards
  const renderHelpdesk = () => {
    const tickets = data.tickets || [];
    const openTickets = tickets.filter(t => t.status === 'new' || t.status === 'progress');
    const closedTickets = tickets.filter(t => t.status === 'solved');
    const urgentTickets = tickets.filter(t => t.priority === 'high' || t.priority === 'urgent');

    const filteredTickets = ticketSearch
      ? tickets.filter(t =>
        t.customer?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.product?.toLowerCase().includes(ticketSearch.toLowerCase()) ||
        t.issue?.toLowerCase().includes(ticketSearch.toLowerCase())
      )
      : tickets;

    if (selectedTicket) {
      // HTML decode helper
      const decodeHTML = (html) => {
        const txt = document.createElement('textarea');
        txt.innerHTML = html;
        return txt.value.replace(/<[^>]*>/g, ''); // Strip HTML tags
      };

      return (
        <div className="space-y-4 md:space-y-6 animate-fadeIn">
          <button onClick={() => setSelectedTicket(null)} className="text-slate-500 flex items-center mb-4 touch-target">
            <ArrowLeft className="mr-2 w-4 h-4" /> Listeye Dön
          </button>
          <div className="bg-white shadow rounded-lg p-4 md:p-6 border border-slate-200">
            <h2 className="text-xl md:text-2xl font-bold mb-1">{selectedTicket.product}</h2>
            <p className="text-sm text-slate-500 mb-4 md:mb-6">#{selectedTicket.id}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
              <div className="p-4 bg-slate-50 rounded border">
                <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Müşteri</h4>
                <p>{selectedTicket.customer}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded border">
                <h4 className="font-bold text-xs uppercase text-slate-400 mb-1">Ürün</h4>
                <p>{selectedTicket.product}</p>
              </div>
            </div>
            {selectedTicket.issue && (
              <div className="p-4 bg-blue-50 rounded border mb-4">
                <h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Sorun Açıklaması</h4>
                <p className="whitespace-pre-wrap text-slate-700">{decodeHTML(selectedTicket.issue)}</p>
              </div>
            )}
            <div className="border-t pt-4 space-y-4">
              <div>
                <span className="font-bold block mb-2">Durum Güncelle:</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateTicketStatus(selectedTicket.id, 'new')} className="px-4 py-2 bg-blue-100 text-blue-800 rounded text-sm font-medium touch-target">Yeni</button>
                  <button onClick={() => updateTicketStatus(selectedTicket.id, 'progress')} className="px-4 py-2 bg-orange-100 text-orange-800 rounded text-sm font-medium touch-target">İşlemde</button>
                  <button onClick={() => updateTicketStatus(selectedTicket.id, 'solved')} className="px-4 py-2 bg-green-100 text-green-800 rounded text-sm font-medium touch-target">Çözüldü</button>
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="font-bold block mb-2">Not Ekle:</label>
                <textarea
                  className="w-full border-2 p-3 rounded-lg text-base resize-none touch-target"
                  rows="4"
                  placeholder="Ticket hakkında not ekleyin..."
                  value={ticketNotes}
                  onChange={e => setTicketNotes(e.target.value)}
                />
                <button
                  onClick={() => addTicketNote(selectedTicket.id, ticketNotes)}
                  className="mt-2 bg-indigo-600 text-white px-4 py-2 rounded-lg touch-target"
                  disabled={!ticketNotes.trim()}
                >
                  Notu Kaydet
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 md:space-y-6 animate-fadeIn">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Açık Ticketlar</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{openTickets.length}</h3>
              </div>
              <Clock className="w-10 h-10 md:w-12 md:h-12 text-blue-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Kapalı Ticketlar</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{closedTickets.length}</h3>
              </div>
              <CheckSquare className="w-10 h-10 md:w-12 md:h-12 text-green-500 opacity-20" />
            </div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-red-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-500 text-sm font-medium">Acil Ticketlar</p>
                <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{urgentTickets.length}</h3>
              </div>
              <AlertTriangle className="w-10 h-10 md:w-12 md:h-12 text-red-500 opacity-20" />
            </div>
          </div>
        </div>

        {/* Search & New Button */}
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5" />
            <input
              className="w-full pl-10 border-2 p-3 rounded-lg touch-target"
              placeholder="Ticket Ara (Müşteri, Ürün, Sorun)..."
              value={ticketSearch}
              onChange={e => setTicketSearch(e.target.value)}
            />
          </div>
          <button onClick={() => setShowNewTicketForm(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-medium touch-target whitespace-nowrap">
            Yeni Kayıt
          </button>
        </div>

        {showNewTicketForm && (
          <div className="bg-white p-4 md:p-6 rounded-lg shadow-lg border">
            <div className="flex justify-between mb-4 font-bold">
              <h3 className="text-lg">Yeni Kayıt</h3>
              <button onClick={() => setShowNewTicketForm(false)} className="touch-target"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="border-2 p-3 rounded-lg touch-target" placeholder="Müşteri" />
              <input className="border-2 p-3 rounded-lg touch-target" placeholder="Ürün" />
              <textarea className="border-2 p-3 rounded-lg col-span-1 md:col-span-2 touch-target" rows="3" placeholder="Sorun..." />
              <button className="bg-indigo-600 text-white p-3 rounded-lg col-span-1 md:col-span-2 font-medium touch-target">Kaydet</button>
            </div>
          </div>
        )}

        {/* Tickets List - Responsive */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden md:block table-scroll">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b">
                <tr>
                  <th className="p-4">Müşteri</th>
                  <th className="p-4">Ürün</th>
                  <th className="p-4">Sorun</th>
                  <th className="p-4">Durum</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredTickets.map(t => (
                  <tr key={t.id} onClick={() => setSelectedTicket(t)} className="hover:bg-slate-50 cursor-pointer">
                    <td className="p-4 font-medium">{t.customer}</td>
                    <td className="p-4">{t.product}</td>
                    <td className="p-4 text-sm text-slate-600">{t.issue}</td>
                    <td className="p-4"><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden divide-y">
            {filteredTickets.map(t => (
              <div key={t.id} onClick={() => setSelectedTicket(t)} className="p-4 active:bg-slate-50">
                <div className="flex justify-between items-start mb-2">
                  <div className="font-bold text-slate-800">{t.customer}</div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-sm text-slate-600 mb-1">{t.product}</div>
                <div className="text-sm text-slate-500">{t.issue}</div>
              </div>
            ))}
          </div>

          {filteredTickets.length === 0 && (
            <div className="p-8 text-center text-slate-400">Ticket bulunamadı.</div>
          )}
        </div>
      </div>
    );
  };

  // 3. SATIŞLAR - Responsive
  const renderSales = () => {
    if (selectedOrder) {
      return (
        <div className="space-y-4 md:space-y-6 animate-fadeIn">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center text-slate-500 mb-4 touch-target"><ArrowLeft className="mr-2 w-4 h-4" /> Geri Dön</button>
          <div className="bg-white shadow rounded-lg p-4 md:p-6 border border-slate-200">
            <div className="flex flex-col md:flex-row justify-between border-b pb-4 mb-4 gap-4">
              <div><h2 className="text-xl md:text-2xl font-bold">{selectedOrder.name}</h2><p className="text-slate-500">{selectedOrder.customer}</p></div>
              <StatusBadge status={selectedOrder.status} />
            </div>
            <div className="overflow-x-auto table-scroll">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left"><tr><th className="p-3">Ürün</th><th className="p-3 text-right">Adet</th><th className="p-3 text-right">Tutar</th></tr></thead>
                <tbody>{selectedOrderLines.length > 0 ? selectedOrderLines.map((l, i) => <tr key={i} className="border-b"><td className="p-3">{l.name}</td><td className="p-3 text-right">{l.qty}</td><td className="p-3 text-right font-bold">{formatCurrency(l.total)}</td></tr>) : <tr><td colSpan="3" className="p-4 text-center">Yükleniyor...</td></tr>}</tbody>
              </table>
            </div>
            <div className="text-right mt-4 text-lg md:text-xl font-bold">Toplam: {formatCurrency(selectedOrder.amount)}</div>
          </div>
        </div>
      )
    }
    const filtered = (data.orders || []).filter(o => salesFilter === 'all' ? true : salesFilter === 'sale' ? ['sale', 'done'].includes(o.status) : o.status === 'draft');
    return (
      <div className="space-y-4 md:space-y-6 animate-fadeIn">
        <div className="flex gap-2 bg-slate-100 p-1 rounded-lg w-full md:w-fit overflow-x-auto scrollbar-hide">
          <button onClick={() => setSalesFilter('all')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap touch-target ${salesFilter === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Tümü</button>
          <button onClick={() => setSalesFilter('sale')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap touch-target ${salesFilter === 'sale' ? 'bg-white shadow text-green-600' : 'text-slate-500'}`}>Siparişler</button>
          <button onClick={() => setSalesFilter('draft')} className={`px-4 py-2 rounded-md text-sm font-bold whitespace-nowrap touch-target ${salesFilter === 'draft' ? 'bg-white shadow text-blue-600' : 'text-slate-500'}`}>Teklifler</button>
        </div>
        <div className="bg-white p-3 rounded-lg shadow-sm flex flex-col sm:flex-row gap-2">
          <input className="flex-1 border-2 p-3 rounded-lg touch-target" placeholder="Sipariş Ara..." onKeyDown={e => e.key === 'Enter' && performSearch('sale.order', e.target.value)} />
          <button className="bg-slate-800 text-white px-6 py-3 rounded-lg touch-target">Ara</button>
        </div>
        {/* Desktop Table */}
        <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-4">Ref</th><th className="p-4">Müşteri</th><th className="p-4 text-right">Tutar</th><th className="p-4">Durum</th></tr></thead>
              <tbody className="divide-y">{filtered.map(o => <tr key={o.id} onClick={() => { setSelectedOrder(o); fetchOrderDetails(o.id_raw); }} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 font-bold text-indigo-600">{o.name}</td><td className="p-4">{o.customer}</td><td className="p-4 text-right font-bold">{formatCurrency(o.amount)}</td><td className="p-4"><StatusBadge status={o.status} /></td></tr>)}</tbody>
            </table>
          </div>
        </div>
        {/* Mobile Cards */}
        <div className="md:hidden bg-white rounded-lg shadow overflow-hidden divide-y">
          {filtered.map(o => (
            <div key={o.id} onClick={() => { setSelectedOrder(o); fetchOrderDetails(o.id_raw); }} className="p-4 active:bg-slate-50">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-indigo-600 text-base">{o.name}</div>
                <StatusBadge status={o.status} />
              </div>
              <div className="text-sm text-slate-600 mb-2">{o.customer}</div>
              <div className="font-bold text-base">{formatCurrency(o.amount)}</div>
            </div>
          ))}
        </div>
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
      return (
        <div className="space-y-4 md:space-y-6 animate-fadeIn no-print">
          <button onClick={() => setSelectedCustomer(null)} className="flex items-center text-slate-500 touch-target">
            <ArrowLeft className="w-4 h-4 mr-2" /> Listeye Dön
          </button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Customer Info Card */}
            <div className="lg:col-span-1 bg-white p-4 md:p-6 rounded-lg shadow text-center border-t-4 border-indigo-500">
              <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-xl md:text-2xl font-bold text-slate-500 mb-4">
                {selectedCustomer.name.charAt(0)}
              </div>
              <h2 className="font-bold text-base md:text-lg">{selectedCustomer.name}</h2>
              <div className="mt-4 text-sm text-left space-y-2">
                <div className="flex items-center break-all">
                  <Mail className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">{selectedCustomer.email}</span>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 mr-2 text-slate-400 flex-shrink-0" />
                  <span className="text-xs md:text-sm">{selectedCustomer.phone}</span>
                </div>
              </div>
              <div className="mt-6 pt-4 border-t text-xl md:text-2xl font-bold text-slate-800">
                {formatCurrency(selectedCustomer.balance)}
              </div>
              <div className="text-xs text-slate-500">Bakiye</div>
            </div>

            {/* Customer Detail Tabs */}
            <div className="lg:col-span-2 bg-white rounded-lg shadow overflow-hidden">
              {/* Tabs - Scrollable on Mobile */}
              <div className="flex border-b overflow-x-auto scrollbar-hide">
                <button onClick={() => setCustomerDetailTab('orders')} className={`flex-1 min-w-[100px] py-3 px-2 text-sm md:text-base whitespace-nowrap ${customerDetailTab === 'orders' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-slate-600'}`}>Siparişler</button>
                <button onClick={() => setCustomerDetailTab('invoices')} className={`flex-1 min-w-[100px] py-3 px-2 text-sm md:text-base whitespace-nowrap ${customerDetailTab === 'invoices' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-slate-600'}`}>Faturalar</button>
                <button onClick={() => setCustomerDetailTab('quotes')} className={`flex-1 min-w-[100px] py-3 px-2 text-sm md:text-base whitespace-nowrap ${customerDetailTab === 'quotes' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-slate-600'}`}>Teklifler</button>
                <button onClick={() => setCustomerDetailTab('tickets')} className={`flex-1 min-w-[100px] py-3 px-2 text-sm md:text-base whitespace-nowrap ${customerDetailTab === 'tickets' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-slate-600'}`}>Teknik Servis</button>
                <button onClick={() => setCustomerDetailTab('payments')} className={`flex-1 min-w-[100px] py-3 px-2 text-sm md:text-base whitespace-nowrap ${customerDetailTab === 'payments' ? 'border-b-2 border-indigo-600 font-bold text-indigo-600' : 'text-slate-600'}`}>Ödemeler</button>
              </div>

              {/* Tab Content */}
              <div className="p-4 max-h-[400px] md:max-h-[500px] overflow-y-auto">
                {customerDetailTab === 'orders' && (
                  <div>
                    {customerOrders.length > 0 ? (
                      <div className="space-y-2">
                        {customerOrders.map(o => (
                          <div key={o.id} className="border rounded-lg p-3 md:p-4 hover:bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-indigo-600 text-sm md:text-base">{o.name}</div>
                              <StatusBadge status={o.status} />
                            </div>
                            <div className="text-xs md:text-sm text-slate-500">{o.date || 'N/A'}</div>
                            <div className="font-bold text-sm md:text-base mt-2">{formatCurrency(o.amount)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-10">Sipariş bulunamadı</div>
                    )}
                  </div>
                )}

                {customerDetailTab === 'invoices' && (
                  <div>
                    {customerInvoices.length > 0 ? (
                      <div className="space-y-2">
                        {customerInvoices.map(inv => (
                          <div key={inv.id} className="border rounded-lg p-3 md:p-4 hover:bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-sm md:text-base">{inv.id}</div>
                              <PaymentBadge state={inv.payment_state} />
                            </div>
                            <div className="text-xs md:text-sm text-slate-500">{inv.date}</div>
                            <div className="font-bold text-sm md:text-base mt-2">{formatCurrency(inv.amount)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-10">Fatura bulunamadı</div>
                    )}
                  </div>
                )}

                {customerDetailTab === 'quotes' && (
                  <div>
                    {customerQuotes.length > 0 ? (
                      <div className="space-y-2">
                        {customerQuotes.map(q => (
                          <div key={q.id} className="border rounded-lg p-3 md:p-4 hover:bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-indigo-600 text-sm md:text-base">{q.name}</div>
                              <StatusBadge status={q.status} />
                            </div>
                            <div className="text-xs md:text-sm text-slate-500">{q.date || 'N/A'}</div>
                            <div className="font-bold text-sm md:text-base mt-2">{formatCurrency(q.amount)}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-10">Teklif bulunamadı</div>
                    )}
                  </div>
                )}

                {customerDetailTab === 'tickets' && (
                  <div>
                    {customerTickets.length > 0 ? (
                      <div className="space-y-2">
                        {customerTickets.map(t => (
                          <div key={t.id} className="border rounded-lg p-3 md:p-4 hover:bg-slate-50">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-bold text-sm md:text-base">{t.product}</div>
                              <StatusBadge status={t.status} />
                            </div>
                            <div className="text-xs md:text-sm text-slate-600">{t.issue}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-slate-500 py-10">Teknik servis kaydı bulunamadı</div>
                    )}
                  </div>
                )}

                {customerDetailTab === 'payments' && (
                  <div className="space-y-4">
                    {/* Advanced Payment Form */}
                    <div className="border-2 border-indigo-200 rounded-lg p-4 bg-indigo-50">
                      <h3 className="font-bold mb-4 text-sm md:text-base">Yeni Ödeme Kaydet</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input
                          type="number"
                          className="border-2 p-3 rounded-lg touch-target"
                          placeholder="Tutar (₺)"
                          value={newPayment.amount}
                          onChange={e => setNewPayment({ ...newPayment, amount: e.target.value })}
                        />
                        <input
                          type="date"
                          className="border-2 p-3 rounded-lg touch-target"
                          value={newPayment.date}
                          onChange={e => setNewPayment({ ...newPayment, date: e.target.value })}
                        />
                        <select
                          className="border-2 p-3 rounded-lg touch-target"
                          value={newPayment.method}
                          onChange={e => {
                            const method = e.target.value;
                            let journal_id = '';
                            if (method === 'cash' && cashRegisters.length > 0) {
                              journal_id = cashRegisters[0].id;
                            } else if ((method === 'card' || method === 'transfer') && banks.length > 0) {
                              journal_id = banks[0].id;
                            }
                            setNewPayment({ ...newPayment, method, journal_id, installments: 1 });
                          }}
                        >
                          <option value="cash">Nakit</option>
                          <option value="card">Kredi Kartı</option>
                          <option value="transfer">Havale/EFT</option>
                        </select>

                        {/* Conditional: Nakit - Kasa Seçimi */}
                        {newPayment.method === 'cash' && (
                          <select
                            className="border-2 p-3 rounded-lg touch-target bg-yellow-50"
                            value={newPayment.journal_id}
                            onChange={e => setNewPayment({ ...newPayment, journal_id: e.target.value })}
                          >
                            <option value="">Kasa Seçin</option>
                            {cashRegisters.map(r => (
                              <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                            ))}
                          </select>
                        )}

                        {/* Conditional: Kredi Kartı - Banka + Taksit */}
                        {newPayment.method === 'card' && (
                          <>
                            <select
                              className="border-2 p-3 rounded-lg touch-target bg-blue-50"
                              value={newPayment.journal_id}
                              onChange={e => setNewPayment({ ...newPayment, journal_id: e.target.value })}
                            >
                              <option value="">Banka Seçin</option>
                              {banks.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                              ))}
                            </select>
                            <select
                              className="border-2 p-3 rounded-lg touch-target bg-blue-50"
                              value={newPayment.installments}
                              onChange={e => setNewPayment({ ...newPayment, installments: e.target.value })}
                            >
                              <option value={1}>Tek Çekim</option>
                              {[2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                                <option key={i} value={i}>{i} Taksit</option>
                              ))}
                            </select>
                          </>
                        )}

                        {/* Conditional: Havale/EFT - Banka Hesabı */}
                        {newPayment.method === 'transfer' && (
                          <select
                            className="border-2 p-3 rounded-lg touch-target bg-green-50"
                            value={newPayment.journal_id}
                            onChange={e => setNewPayment({ ...newPayment, journal_id: e.target.value })}
                          >
                            <option value="">Banka Hesabı Seçin</option>
                            {banks.map(b => (
                              <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                          </select>
                        )}

                        <input
                          type="text"
                          className="border-2 p-3 rounded-lg touch-target md:col-span-2"
                          placeholder="Not (Opsiyonel)"
                          value={newPayment.note}
                          onChange={e => setNewPayment({ ...newPayment, note: e.target.value })}
                        />
                      </div>
                      <button
                        onClick={savePayment}
                        disabled={!newPayment.amount || !newPayment.date || !newPayment.journal_id}
                        className="w-full mt-3 bg-indigo-600 text-white p-3 rounded-lg font-medium touch-target disabled:opacity-50 hover:bg-indigo-700"
                      >
                        Ödeme Kaydet
                      </button>
                      {(!cashRegisters.length && !banks.length) && (
                        <div className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
                          ⚠️ Odoo'da kasa veya banka journal'ı bulunamadı. Lütfen Odoo'da journal oluşturun.
                        </div>
                      )}
                    </div>

                    {/* Payment History */}
                    <div>
                      <h3 className="font-bold mb-3 text-sm md:text-base">Ödeme Geçmişi</h3>
                      {customerPayments.length > 0 ? (
                        <div className="space-y-2">
                          {customerPayments.map(p => (
                            <div key={p.id} className="border rounded-lg p-3 md:p-4 bg-green-50">
                              <div className="flex justify-between items-start mb-1">
                                <div className="font-bold text-green-700 text-sm md:text-base">{formatCurrency(p.amount)}</div>
                                <div className="text-xs text-slate-500">{p.date}</div>
                              </div>
                              <div className="text-xs md:text-sm text-slate-600">Ödeme Yöntemi: {p.method === 'cash' ? 'Nakit' : p.method === 'card' ? 'Kredi Kartı' : 'Havale/EFT'}</div>
                              {p.note && <div className="text-xs text-slate-500 mt-1">{p.note}</div>}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center text-slate-500 py-10">Ödeme kaydı bulunamadı</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )
    }

    const filteredContacts = (data.customers || []).filter(c => customerBalanceFilter === 'all' ? true : customerBalanceFilter === 'debtor' ? c.balance > 0 : c.balance <= 0);
    return (
      <div className="space-y-4 md:space-y-6 no-print">
        <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-4 rounded-lg shadow-sm">
          <div className="flex space-x-2">
            <button onClick={() => setCustomerBalanceFilter('all')} className={`px-3 py-2 rounded text-xs md:text-sm touch-target ${customerBalanceFilter === 'all' ? 'bg-indigo-100 font-bold' : 'bg-slate-100'}`}>Tümü</button>
            <button onClick={() => setCustomerBalanceFilter('debtor')} className={`px-3 py-2 rounded text-xs md:text-sm touch-target ${customerBalanceFilter === 'debtor' ? 'bg-red-100 font-bold' : 'bg-slate-100'}`}>Borçlular</button>
            <button onClick={() => setCustomerBalanceFilter('creditor')} className={`px-3 py-2 rounded text-xs md:text-sm touch-target ${customerBalanceFilter === 'creditor' ? 'bg-green-100 font-bold' : 'bg-slate-100'}`}>Alacaklılar</button>
          </div>
          <div className="flex gap-2">
            <input className="flex-1 md:flex-none border-2 p-2 md:p-3 rounded-lg text-sm touch-target" placeholder="Cari Ara..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch('res.partner', customerSearch)} />
            <button className="bg-indigo-600 text-white px-4 md:px-6 rounded-lg touch-target" onClick={() => performSearch('res.partner', customerSearch)}>Ara</button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y">
            {filteredContacts.map(c => (
              <li key={c.id} onClick={() => setSelectedCustomer(c)} className="p-4 flex justify-between hover:bg-slate-50 cursor-pointer">
                <div>
                  <div className="font-bold">{c.name}</div>
                  <div className="text-xs text-slate-500">{c.phone}</div>
                </div>
                <div className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(c.balance)}</div>
              </li>
            ))}
          </ul>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden bg-white shadow rounded-lg overflow-hidden divide-y">
          {filteredContacts.map(c => (
            <div key={c.id} onClick={() => setSelectedCustomer(c)} className="p-4 active:bg-slate-50">
              <div className="flex justify-between items-start mb-2">
                <div className="font-bold text-base">{c.name}</div>
                <div className={`font-bold text-base ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(c.balance)}</div>
              </div>
              <div className="text-sm text-slate-500">{c.phone}</div>
            </div>
          ))}
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
    <div className="flex h-screen bg-slate-50 font-sans overflow-hidden">
      {renderProductModal()}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar - Responsive */}
      <div className={`
        fixed md:static inset-y-0 left-0 z-50
        w-64 md:w-20 lg:w-64
        bg-slate-900 text-white flex flex-col
        transition-transform duration-300 ease-in-out
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        no-print
      `}>
        {/* Logo */}
        <div className="p-4 md:p-6 flex justify-between items-center">
          <img src="/logo.png" className="h-8 md:h-10 brightness-200" onError={(e) => e.target.style.display = 'none'} alt="Ascari" />
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-white p-2 touch-target">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-1 px-2 py-4 overflow-y-auto">
          {MENU_ITEMS.map(item => (
            (item.roles.includes(userRole)) && (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center w-full p-4 rounded-xl transition-colors touch-target ${activeTab === item.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                  }`}
              >
                <item.icon className="w-6 h-6 mr-3 md:mr-0 lg:mr-3" />
                <span className="md:hidden lg:inline font-medium">{item.name}</span>
              </button>
            )
          ))}
        </nav>

        {/* Logout */}
        <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white m-4 p-2 hover:bg-slate-800 rounded touch-target">
          <LogOut className="w-5 h-5 mr-2 md:mr-0 lg:mr-2" />
          <span className="md:hidden lg:inline">Çıkış</span>
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Mobile Header */}
        <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-between no-print">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 touch-target">
            <Menu className="w-6 h-6 text-slate-700" />
          </button>
          <h1 className="font-bold text-lg text-slate-800">
            {MENU_ITEMS.find(item => item.id === activeTab)?.name || 'Dashboard'}
          </h1>
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-4 lg:p-6 relative">
          {loadingData && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-200 overflow-hidden z-50"><div className="h-full bg-indigo-600 animate-progress"></div></div>}
          {activeTab === 'dashboard' && (
            <div className="space-y-4 md:space-y-6">
              <h1 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-indigo-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Teklifler</p>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mt-2">
                        {formatCurrency(
                          data.orders?.filter(o => o.status === 'draft').reduce((sum, o) => sum + (o.amount || 0), 0) || 0
                        )}
                      </h3>
                    </div>
                    <Zap className="w-10 h-10 md:w-12 md:h-12 text-indigo-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Siparişler</p>
                      <h3 className="text-xl md:text-2xl font-bold text-slate-800 mt-2">
                        {formatCurrency(
                          data.orders?.filter(o => o.status !== 'draft').reduce((sum, o) => sum + (o.amount || 0), 0) || 0
                        )}
                      </h3>
                    </div>
                    <ShoppingCart className="w-10 h-10 md:w-12 md:h-12 text-green-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Toplam Müşteriler</p>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{data.customers?.length || 0}</h3>
                    </div>
                    <Users className="w-10 h-10 md:w-12 md:h-12 text-blue-500 opacity-20" />
                  </div>
                </div>
                <div className="bg-white p-4 md:p-6 rounded-xl shadow border-l-4 border-orange-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-slate-500 text-sm font-medium">Açık Ticketlar</p>
                      <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">{data.tickets?.length || 0}</h3>
                    </div>
                    <Wrench className="w-10 h-10 md:w-12 md:h-12 text-orange-500 opacity-20" />
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
