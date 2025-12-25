import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  LayoutDashboard, ShoppingCart, Users, DollarSign, Settings, 
  LogOut, RefreshCw, ChevronRight, TrendingUp, Package, FileText, Code,
  ArrowLeft, Printer, Download, CheckCircle, Clock, AlertCircle,
  Search, PackageSearch, Tag, Layers, Zap, Plus, Minus, Trash2, QrCode,
  UserPlus, Gift, Shield, User, Wrench, ClipboardList, PenTool, Filter, X,
  ArrowUpRight, ArrowDownLeft, CreditCard, History, Phone, Mail, MapPin,
  Calendar, Edit3, Save, Briefcase, AlertTriangle, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react';

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

const StatusBadge = ({ status, onClick }) => {
  const map = {
    draft: { color: 'bg-blue-100 text-blue-800', label: 'Teklif' },
    sale: { color: 'bg-green-100 text-green-800', label: 'Sipariş' },
    done: { color: 'bg-gray-100 text-gray-800', label: 'Kilitli' },
    cancel: { color: 'bg-red-100 text-red-800', label: 'İptal' },
    posted: { color: 'bg-indigo-100 text-indigo-800', label: 'Onaylı' },
    new: { color: 'bg-blue-100 text-blue-800', label: 'Yeni' },
    progress: { color: 'bg-orange-100 text-orange-800', label: 'İşlemde' },
    solved: { color: 'bg-green-100 text-green-800', label: 'Çözüldü' },
  };
  const conf = map[status] || { color: 'bg-gray-100', label: status };
  return <span onClick={onClick} className={`px-3 py-1 rounded-full text-xs font-bold border ${conf.color} ${onClick ? 'cursor-pointer' : ''}`}>{conf.label}</span>;
};

// Kategori Ağacı
const CategoryTree = ({ categories, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const renderNode = (nodes) => nodes.map(node => (
    <div key={node.id} className="ml-3 select-none">
      <div className={`flex items-center py-2 cursor-pointer transition-colors ${selectedId === node.id ? 'text-indigo-600 font-bold' : 'text-slate-600 hover:text-indigo-500'}`}>
        {node.children && node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); toggle(node.id); }} className="p-1 mr-1 rounded hover:bg-slate-100">
            {expanded[node.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRightIcon className="w-4 h-4"/>}
          </button>
        )}
        <span onClick={() => onSelect(node.id)} className="text-base">{node.name}</span>
      </div>
      {expanded[node.id] && node.children && <div className="border-l-2 border-slate-100 pl-1">{renderNode(node.children)}</div>}
    </div>
  ));

  return <div className="space-y-1 overflow-y-auto max-h-[calc(100vh-200px)]">{renderNode(categories)}</div>;
};

const PaymentBadge = ({ state }) => {
  if (state === 'paid') return <span className="flex items-center text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Ödendi</span>;
  return <span className="flex items-center text-red-500 text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1"/> Ödenmedi</span>;
}

export default function AscariDashboard() {
  // Global Durumlar
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

  // Modül State'leri
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Detaylar
  const [selectedOrder, setSelectedOrder] = useState(null); 
  const [selectedOrderLines, setSelectedOrderLines] = useState([]); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerHistory, setCustomerHistory] = useState({orders: [], invoices: []});

  // Filtreler
  const [salesFilter, setSalesFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all');
  const [accountingSubTab, setAccountingSubTab] = useState('customer_invoices');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('orders');
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ customer: '', product: '', issue: '', priority: 'medium' });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('ascari_creds');
    if (saved) {
      try { setCredentials(JSON.parse(saved)); setRememberMe(true); } catch(e){}
    }
  }, []);

  const apiCall = async (endpoint, payload) => {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...credentials, ...payload})
      });
      const json = await res.json();
      if(json.status === 'error' || json.error) throw new Error(json.message || json.error);
      return json;
    } catch (e) {
      console.error(`API Error (${endpoint}):`, e);
      return null;
    }
  };

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true); setLoginError('');
    const res = await apiCall('connect', {});
    if (res && res.status === 'success') {
      if(rememberMe) localStorage.setItem('ascari_creds', JSON.stringify(credentials));
      else localStorage.removeItem('ascari_creds');
      setIsConnected(true);
      refreshData(res.uid);
      if(userRole === 'sales') setActiveTab('quick_offer');
    } else {
      setLoginError(res?.message || 'Bağlantı hatası.');
    }
    setLoading(false);
  };

  const refreshData = async (uid) => {
    setLoadingData(true);
    const res = await apiCall('dashboard-data', { uid });
    if(res) setData(prev => ({...prev, ...res}));
    setLoadingData(false);
  };

  const fetchOrderDetails = async (orderId) => {
    setLoadingData(true);
    const res = await apiCall('order-details', { order_id: orderId });
    if(res && res.lines) setSelectedOrderLines(res.lines);
    setLoadingData(false);
  };

  const performSearch = async (model, query) => {
    if (!query || query.length < 2) return;
    setLoadingData(true);
    const res = await apiCall('search', { model, query });
    if (res && res.status === 'success') {
        if (model === 'product.product') setData(prev => ({...prev, products: res.data}));
        if (model === 'res.partner') setData(prev => ({...prev, customers: res.data}));
        if (model === 'sale.order') setData(prev => ({...prev, orders: res.data}));
    }
    setLoadingData(false);
  };

  const handleLogout = () => { setIsConnected(false); setActiveTab('dashboard'); setData(INITIAL_DATA); };
  
  const addToCart = useCallback((product) => {
    setQuickCart(prev => {
      const exist = prev.find(i => i.id === product.id);
      if(exist) return prev.map(i => i.id === product.id ? {...i, qty: i.qty+1} : i);
      return [...prev, {...product, qty: 1}];
    });
  }, []);

  const removeFromQuickCart = (productId) => setQuickCart(prev => prev.filter(item => item.id !== productId));
  const updateCartQty = (productId, change) => setQuickCart(prev => prev.map(item => item.id === productId ? { ...item, qty: Math.max(1, item.qty + change) } : item));
  const createQuickOffer = () => { const total = quickCart.reduce((sum, item) => sum + (item.list_price * item.qty), 0); setQuickOfferDetails({ code: 'ASC-' + Math.floor(1000 + Math.random() * 9000), customer: tempCustomerName || 'Sayın Ziyaretçi', phone: tempCustomerPhone || '', date: new Date().toLocaleDateString('tr-TR'), items: [...quickCart], total: total, tax: total * 0.20, grandTotal: total * 1.20 }); };
  const handlePrint = () => { window.print(); };
  const handleTicketSubmit = (e) => { e.preventDefault(); alert("Bu özellik canlı modda aktiftir."); setShowNewTicketForm(false); };
  const isWithinDateRange = (dateStr) => { if (!dateFilter.start && !dateFilter.end) return true; const date = new Date(dateStr); const start = dateFilter.start ? new Date(dateFilter.start) : new Date('2000-01-01'); const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31'); return date >= start && date <= end; };

  const getMenuItems = () => {
    return [ 
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard }, 
      { id: 'quick_offer', name: 'Hızlı Teklif', icon: Zap }, 
      { id: 'helpdesk', name: 'Teknik Servis', icon: Wrench }, 
      { id: 'sales', name: 'Satışlar', icon: ShoppingCart }, 
      { id: 'products', name: 'Ürünler', icon: Package }, 
      { id: 'customers', name: 'Kontaklar', icon: Users }, 
      { id: 'accounting', name: 'Muhasebe', icon: DollarSign }, 
      { id: 'code', name: 'Entegrasyon', icon: Code } 
    ];
  };

  const renderQuickOffer = () => {
    const filteredProducts = data.products.filter(p => {
       const catMatch = !selectedCategoryId || (p.categ_path && p.categ_path.includes(selectedCategoryId)); 
       const searchMatch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
       return catMatch && searchMatch;
    });
    const total = quickCart.reduce((sum, i) => sum + (i.list_price * i.qty), 0);

    if (quickOfferDetails) {
      return (
        <div className="flex flex-col h-full animate-fadeIn bg-white p-8 overflow-auto">
          <div className="max-w-4xl mx-auto w-full bg-white shadow-lg p-10 print:shadow-none print:w-full">
             <div className="flex justify-between items-start border-b-2 border-slate-800 pb-6 mb-8">
                <div><h1 className="text-4xl font-bold text-slate-900">ASCARI</h1><p className="text-slate-500">Mobilya & Tasarım</p></div>
                <div className="text-right"><h2 className="text-2xl font-light text-slate-400">TEKLİF</h2><p className="font-bold text-xl">#{quickOfferDetails.code}</p><p>{quickOfferDetails.date}</p></div>
             </div>
             <div className="mb-8"><p className="text-sm font-bold text-slate-400 uppercase">Sayın</p><h3 className="text-2xl font-bold">{quickOfferDetails.customer}</h3><p>{quickOfferDetails.phone}</p></div>
             <table className="w-full mb-8"><thead><tr className="border-b-2 border-slate-200 text-left"><th className="py-2">Ürün</th><th className="text-right">Miktar</th><th className="text-right">Birim Fiyat</th><th className="text-right">Tutar</th></tr></thead><tbody>{quickOfferDetails.items.map((i,k)=><tr key={k} className="border-b"><td className="py-2">{i.name}</td><td className="text-right">{i.qty}</td><td className="text-right">{formatCurrency(i.list_price)}</td><td className="text-right font-bold">{formatCurrency(i.list_price*i.qty)}</td></tr>)}</tbody></table>
             <div className="flex justify-end mb-10"><div className="w-1/2 text-right border-t pt-4"><div className="flex justify-between text-xl font-bold"><span>TOPLAM:</span><span>{formatCurrency(quickOfferDetails.grandTotal)}</span></div></div></div>
             <div className="text-center border-t pt-8 no-print flex justify-center gap-4"><button onClick={() => window.print()} className="bg-slate-900 text-white px-8 py-4 rounded-lg font-bold flex items-center"><Printer className="mr-2"/> Yazdır</button><button onClick={() => {setQuickOfferDetails(null); setQuickCart([]);}} className="bg-slate-200 text-slate-800 px-8 py-4 rounded-lg font-bold">Yeni Teklif</button></div>
             <div className="print-only text-center mt-10"><div className="flex justify-center mb-2"><QRCode value={`https://ascari.com.tr/t/${quickOfferDetails.code}`} size={80}/></div><p className="text-xs text-gray-400">Bu QR kod ile teklifi sitemizden görüntüleyebilirsiniz.</p></div>
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full gap-4 animate-fadeIn no-print">
         <div className="w-1/4 bg-white rounded-xl shadow-sm p-4 overflow-y-auto"><h3 className="font-bold text-slate-700 mb-4 flex items-center"><Layers className="mr-2"/> Kategoriler</h3><CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId}/></div>
         <div className="w-1/2 bg-white rounded-xl shadow-sm flex flex-col"><div className="p-4 border-b flex gap-2"><input className="w-full border p-3 rounded-lg bg-slate-50" placeholder="Ürün Ara..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch('product.product', e.target.value)}/></div><div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 gap-4 content-start">{filteredProducts.map(p => (<div key={p.id} onClick={()=>addToCart(p)} className="border rounded-lg p-3 cursor-pointer hover:border-indigo-500 active:scale-95 transition-transform flex flex-col items-center text-center"><div className="h-24 w-full flex items-center justify-center mb-2 bg-slate-50 rounded">{p.image_128 ? <img src={`data:image/png;base64,${p.image_128}`} className="max-h-full object-contain"/> : <PackageSearch className="text-slate-300 w-10 h-10"/>}</div><div className="font-bold text-sm line-clamp-2">{p.name}</div><div className="text-indigo-600 font-bold mt-1">{formatCurrency(p.list_price)}</div></div>))}</div></div>
         <div className="w-1/4 bg-white rounded-xl shadow-lg flex flex-col h-full border border-slate-200"><div className="p-4 bg-slate-50 border-b font-bold flex items-center"><Zap className="mr-2 text-orange-500"/> Teklif Sepeti</div><div className="flex-1 overflow-y-auto p-4 space-y-3">{quickCart.map(i => (<div key={i.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-lg"><div className="flex-1 min-w-0 pr-2"><div className="font-bold text-sm truncate">{i.name}</div><div className="text-xs text-slate-500">{formatCurrency(i.list_price)} x {i.qty}</div></div><div className="flex items-center gap-2"><div className="bg-white border rounded flex items-center"><button onClick={()=>setQuickCart(prev=>prev.map(x=>x.id===i.id?{...x,qty:Math.max(1,x.qty-1)}:x))} className="px-2 py-1">-</button><span className="px-1 text-sm font-bold">{i.qty}</span><button onClick={()=>addToCart(i)} className="px-2 py-1">+</button></div><button onClick={()=>setQuickCart(prev=>prev.filter(x=>x.id!==i.id))} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div></div>))}</div><div className="p-4 border-t bg-slate-50 space-y-3"><div className="flex justify-between text-xl font-bold"><span>Toplam</span><span>{formatCurrency(total)}</span></div><input className="w-full border p-3 rounded" placeholder="Müşteri Adı (Opsiyonel)" id="custName" value={tempCustomerName} onChange={e=>setTempCustomerName(e.target.value)}/><input className="w-full border p-3 rounded" placeholder="Telefon (Opsiyonel)" id="custPhone" value={tempCustomerPhone} onChange={e=>setTempCustomerPhone(e.target.value)}/><button onClick={createQuickOffer} disabled={quickCart.length===0} className="w-full bg-slate-900 text-white py-4 rounded-lg font-bold text-lg hover:bg-slate-800 disabled:opacity-50">Teklif Oluştur</button></div></div>
      </div>
    );
  };

  const renderSales = () => {
    if (selectedOrder) {
      return (
        <div className="space-y-6 animate-fadeIn">
           <button onClick={()=>{setSelectedOrder(null); setSelectedOrderLines([])}} className="flex items-center text-slate-500 mb-4 px-4 py-2 bg-white rounded shadow-sm"><ArrowLeft className="mr-2"/> Listeye Dön</button>
           <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-start border-b pb-4 mb-4"><div><h2 className="text-2xl font-bold">{selectedOrder.name}</h2><p className="text-slate-500">{selectedOrder.date}</p></div><StatusBadge status={selectedOrder.state} /></div>
              <div className="mb-4"><h3 className="font-bold text-slate-500 text-xs uppercase mb-1">Müşteri</h3><p className="text-lg">{selectedOrder.customer}</p></div>
              <h3 className="font-bold mb-2">Ürünler</h3>
              <table className="w-full text-left"><thead className="bg-slate-50 text-slate-500 text-sm"><tr><th className="p-3 rounded-l">Ürün</th><th className="p-3 text-right">Miktar</th><th className="p-3 text-right">Fiyat</th><th className="p-3 text-right rounded-r">Toplam</th></tr></thead><tbody>{selectedOrderLines.length > 0 ? selectedOrderLines.map((line, idx) => (<tr key={idx} className="border-b"><td className="p-3">{line.name}</td><td className="p-3 text-right">{line.qty}</td><td className="p-3 text-right">{formatCurrency(line.price)}</td><td className="p-3 text-right font-bold">{formatCurrency(line.total)}</td></tr>)) : <tr><td colSpan="4" className="p-6 text-center text-slate-400">Detaylar yükleniyor...</td></tr>}</tbody></table>
              <div className="flex justify-end mt-4 text-xl font-bold"><div>Toplam: {formatCurrency(selectedOrder.amount)}</div></div>
           </div>
        </div>
      );
    }
    return (
      <div className="space-y-6 animate-fadeIn">
         <div className="bg-white p-4 rounded-xl shadow-sm flex gap-4">
            <div className="relative flex-1"><Search className="absolute left-3 top-3.5 text-slate-400"/><input className="w-full pl-10 border p-3 rounded-lg" placeholder="Sipariş No veya Müşteri Ara..." onChange={(e)=>setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch('sale.order', e.target.value)}/></div>
            <select className="border p-3 rounded-lg bg-slate-50" onChange={(e)=>setSalesFilter(e.target.value)}><option value="all">Tümü</option><option value="sale">Siparişler</option><option value="draft">Teklifler</option></select>
         </div>
         <div className="bg-white rounded-xl shadow-sm overflow-hidden"><table className="w-full text-left"><thead className="bg-slate-50 text-slate-500"><tr><th className="p-4">Ref</th><th className="p-4">Müşteri</th><th className="p-4">Tarih</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-center">Durum</th></tr></thead><tbody className="divide-y">{data.orders.filter(o => (salesFilter==='all' || (salesFilter==='sale' && ['sale','done'].includes(o.status)) || (salesFilter==='draft' && o.status==='draft')) && (!searchTerm || o.name.includes(searchTerm) || o.customer.includes(searchTerm))).map(o => (<tr key={o.id} onClick={()=>{setSelectedOrder(o); fetchOrderDetails(o.id_raw);}} className="hover:bg-slate-50 cursor-pointer active:bg-slate-100"><td className="p-4 font-bold text-indigo-600">{o.name}</td><td className="p-4">{o.customer}</td><td className="p-4 text-slate-500">{o.date}</td><td className="p-4 text-right font-bold">{formatCurrency(o.amount)}</td><td className="p-4 text-center"><StatusBadge status={o.status}/></td></tr>))}</tbody></table></div>
      </div>
    );
  };

  const renderProducts = () => { 
    if (selectedProduct) { 
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center"><button onClick={() => {setSelectedProduct(null); setIsEditingProduct(false);}} className="flex items-center text-slate-500 hover:text-slate-900"><ArrowLeft className="w-5 h-5 mr-2" /> Ürünlere Dön</button><button onClick={() => setIsEditingProduct(!isEditingProduct)} className={`flex items-center px-4 py-2 rounded-md font-medium text-sm ${isEditingProduct ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>{isEditingProduct ? <><Save className="w-4 h-4 mr-2"/> Kaydet</> : <><Edit3 className="w-4 h-4 mr-2"/> Düzenle</>}</button></div>
          <div className="bg-white shadow rounded-lg p-8 flex flex-col md:flex-row gap-8"><div className="w-full md:w-1/3 flex items-center justify-center bg-slate-50 rounded-lg h-64 border border-slate-200">{selectedProduct.image_128 ? <img src={`data:image/png;base64,${selectedProduct.image_128}`} className="max-h-full max-w-full object-contain" /> : <PackageSearch className="w-24 h-24 text-slate-300" />}</div><div className="w-full md:w-2/3 space-y-6"><div><label className="text-xs font-bold text-slate-400 uppercase">Ürün Adı</label>{isEditingProduct ? <input className="w-full border p-2 rounded mt-1" defaultValue={selectedProduct.name} /> : <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>}</div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-400 uppercase">Kod</label><p className="font-mono text-slate-700">{selectedProduct.default_code}</p></div><div><label className="text-xs font-bold text-slate-400 uppercase">Kategori</label><p className="text-slate-700">{selectedProduct.category}</p></div><div><label className="text-xs font-bold text-slate-400 uppercase">Satış Fiyatı</label>{isEditingProduct ? <input className="border p-1 rounded w-full" defaultValue={selectedProduct.list_price}/> : <p className="text-xl font-bold text-indigo-600">{formatCurrency(selectedProduct.list_price)}</p>}</div><div className="col-span-2 bg-slate-50 p-4 rounded border border-slate-200"><label className="text-xs font-bold text-slate-400 uppercase">Stok Durumu</label><p className={`text-lg font-bold ${selectedProduct.qty_available > 0 ? 'text-green-600' : 'text-red-600'}`}>{selectedProduct.qty_available} Adet Mevcut</p></div></div></div></div>
        </div>
      ) 
    } 
    const filteredProducts = data.products.filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase())); 
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white shadow sm:rounded-lg p-4"><input type="text" className="block w-full pl-3 sm:text-sm border-slate-300 rounded-md py-3 border" placeholder="Ürün Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && performSearch('product.product', e.target.value)}/></div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">{filteredProducts.map(p => <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white shadow rounded-lg p-5 flex flex-col justify-between h-48 border border-slate-100 cursor-pointer hover:border-indigo-500 transition-colors"><div className="h-24 bg-slate-50 rounded mb-2 flex items-center justify-center">{p.image_128 ? <img src={`data:image/png;base64,${p.image_128}`} className="max-h-full max-w-full object-contain"/> : <PackageSearch className="text-slate-300 w-8 h-8" />}</div><h3 className="font-bold text-slate-800 line-clamp-2 text-sm">{p.name}</h3><div><p className="text-xs text-slate-400 mb-1">{p.default_code}</p><span className="text-indigo-600 font-bold text-lg">{formatCurrency(p.list_price)}</span></div></div>)}</div>
      </div>
    ); 
  };

  const renderCustomers = () => {
    if (selectedCustomer) {
      // Detay görünümü (Eksik veriyi apiCall ile doldurabiliriz ama şimdilik data'dan filtreliyoruz)
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center"><button onClick={() => setSelectedCustomer(null)} className="mr-3 p-2 rounded-full hover:bg-slate-100"><ArrowLeft className="w-5 h-5" /></button><div><h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2></div></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 bg-white shadow rounded-lg p-6 border-t-4 border-indigo-500 text-center">
                  <div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold mb-4">{selectedCustomer.name.charAt(0)}</div>
                  <h3 className="text-lg font-bold">{selectedCustomer.name}</h3>
                  <div className="mt-4 space-y-2 text-sm text-slate-600"><div className="flex items-center justify-center"><Mail className="w-4 h-4 mr-2"/> {selectedCustomer.email}</div><div className="flex items-center justify-center"><Phone className="w-4 h-4 mr-2"/> {selectedCustomer.phone}</div></div>
                  <div className="mt-6 pt-4 border-t"><div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedCustomer.balance)}</div><p className="text-xs text-slate-500">Bakiye</p></div>
             </div>
             <div className="lg:col-span-2 bg-white shadow rounded-lg min-h-[400px] p-4">
                  <div className="text-center text-slate-400 py-10">Müşteri detay verileri yükleniyor...</div>
             </div>
          </div>
        </div>
      );
    }
    const filteredCustomers = data.customers.filter(c => customerBalanceFilter === 'all' ? true : customerBalanceFilter === 'debtor' ? c.balance > 0 : c.balance <= 0);
    return (<div className="space-y-6 animate-fadeIn"><div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"><div className="flex space-x-2"><button onClick={()=>setCustomerBalanceFilter('all')} className={`px-3 py-1 text-xs rounded-full ${customerBalanceFilter === 'all' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100'}`}>Tümü</button><button onClick={()=>setCustomerBalanceFilter('debtor')} className={`px-3 py-1 text-xs rounded-full ${customerBalanceFilter === 'debtor' ? 'bg-red-100 text-red-700' : 'bg-slate-100'}`}>Borçlular</button><button onClick={()=>setCustomerBalanceFilter('creditor')} className={`px-3 py-1 text-xs rounded-full ${customerBalanceFilter === 'creditor' ? 'bg-green-100 text-green-700' : 'bg-slate-100'}`}>Alacaklılar</button></div><div className="flex gap-2"><input className="border p-2 rounded text-sm" placeholder="Cari Ara..." onKeyDown={(e)=>e.key==='Enter' && performSearch('res.partner', e.target.value)} /><button className="bg-indigo-600 text-white px-3 rounded">Ara</button></div></div><div className="bg-white shadow rounded-lg overflow-hidden"><ul className="divide-y">{filteredCustomers.map((customer) => (<li key={customer.id} onClick={() => setSelectedCustomer(customer)} className="hover:bg-indigo-50 cursor-pointer transition-colors px-4 py-4 flex justify-between items-center"><div className="flex items-center"><div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-4">{customer.name.charAt(0)}</div><div><p className="text-sm font-medium text-indigo-600">{customer.name}</p><p className="text-xs text-slate-500">{customer.phone}</p></div></div><div className={`text-sm font-bold ${customer.balance < 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(customer.balance)}</div></li>))}</ul></div></div>);
  };

  const renderAccounting = () => { 
    if (selectedInvoice) { return (<div className="space-y-6 animate-fadeIn"><button onClick={() => setSelectedInvoice(null)} className="flex items-center text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-5 h-5 mr-2" /> Faturalara Dön</button><div className="bg-white shadow rounded-lg p-8 border border-slate-200 relative"><div className="absolute top-0 right-0 p-4"><PaymentBadge state={selectedInvoice.payment_state} /></div><h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedInvoice.id}</h2><p className="text-slate-500 mb-6">{selectedInvoice.date}</p><div className="grid grid-cols-2 gap-8 mb-8"><div><h4 className="font-bold text-gray-500 text-xs uppercase">Muhatap</h4><p className="text-lg">{selectedInvoice.partner}</p></div><div className="text-right"><h4 className="font-bold text-gray-500 text-xs uppercase">Tutar</h4><p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedInvoice.amount)}</p></div></div></div></div>) } 
    const filteredInvoices = data.invoices.filter(inv => { const typeMatch = accountingSubTab === 'customer_invoices' ? inv.type === 'out_invoice' : inv.type === 'in_invoice'; const searchMatch = inv.partner.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()); return typeMatch && searchMatch; }); 
    return (<div className="space-y-6 animate-fadeIn"><div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4"><nav className="flex space-x-4 mb-4 sm:mb-0"><button onClick={() => setAccountingSubTab('customer_invoices')} className={`${accountingSubTab === 'customer_invoices' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowUpRight className="w-4 h-4 mr-2" /> Giden Faturalar</button><button onClick={() => setAccountingSubTab('vendor_bills')} className={`${accountingSubTab === 'vendor_bills' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowDownLeft className="w-4 h-4 mr-2" /> Gelen Faturalar</button></nav><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="text" placeholder="Fatura Ara..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)}/></div></div><div className="bg-white shadow overflow-hidden sm:rounded-lg"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">No</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{accountingSubTab === 'customer_invoices' ? 'Müşteri' : 'Tedarikçi'}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Tarih</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Tutar</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Durum</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Ödeme</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (<tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50 cursor-pointer"><td className="px-6 py-4 text-sm font-medium text-indigo-600">{inv.id}</td><td className="px-6 py-4 text-sm text-slate-900">{inv.partner}</td><td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td><td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">{formatCurrency(inv.amount)}</td><td className="px-6 py-4 text-center"><StatusBadge status={inv.status} label={inv.status === 'posted' ? 'Onaylı' : 'Taslak'} /></td><td className="px-6 py-4 flex justify-center"><PaymentBadge state={inv.payment_state} /></td></tr>)) : <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 text-sm">Fatura bulunamadı.</td></tr>}</tbody></table></div></div>); 
  };

  const renderHelpdesk = () => { 
    if (selectedTicket) { 
       return (
         <div className="space-y-6 animate-fadeIn"><button onClick={() => setSelectedTicket(null)} className="flex items-center text-slate-500 mb-4"><ArrowLeft className="w-4 h-4 mr-2"/> Geri Dön</button><div className="bg-white p-6 rounded shadow"><h2 className="text-xl font-bold">{selectedTicket.issue}</h2><p className="text-sm text-slate-500">Durum: {selectedTicket.status}</p></div></div>
       ) 
    }
    return (<div className="space-y-6 animate-fadeIn"><div className="flex justify-between items-center"><h2 className="text-lg font-medium text-slate-900">Arıza Kayıtları</h2><button onClick={() => setShowNewTicketForm(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">Yeni Kayıt</button></div>{showNewTicketForm && <div className="bg-white p-6 shadow-lg rounded-lg border border-indigo-100"><div className="flex justify-between mb-4"><h3 className="font-bold">Yeni Kayıt</h3><button onClick={()=>setShowNewTicketForm(false)}><X className="w-5 h-5"/></button></div><form onSubmit={handleTicketSubmit} className="grid grid-cols-2 gap-4"><input placeholder="Müşteri" className="border p-2 rounded" required value={newTicketData.customer} onChange={e=>setNewTicketData({...newTicketData, customer:e.target.value})}/><input placeholder="Ürün" className="border p-2 rounded" required value={newTicketData.product} onChange={e=>setNewTicketData({...newTicketData, product:e.target.value})}/><textarea placeholder="Sorun" className="border p-2 rounded col-span-2" required value={newTicketData.issue} onChange={e=>setNewTicketData({...newTicketData, issue:e.target.value})}/><button type="submit" className="bg-indigo-600 text-white p-2 rounded col-span-2">Kaydet</button></form></div>}<div className="bg-white shadow overflow-hidden sm:rounded-lg"><ul className="divide-y divide-slate-200">{data.tickets.length > 0 ? data.tickets.map(t=><li key={t.id} onClick={() => setSelectedTicket(t)} className="px-4 py-4 flex justify-between cursor-pointer hover:bg-slate-50"><div><div className="font-bold text-slate-800">{t.product}</div><div className="text-sm text-slate-500">{t.customer} - {t.issue}</div></div><StatusBadge status={t.status}/></li>) : <div className="p-8 text-center text-slate-400">Arıza kaydı bulunamadı.</div>}</ul></div></div>); 
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
           <div className="flex justify-center mb-6"><div className="w-16 h-16 bg-slate-900 rounded-xl flex items-center justify-center text-white text-2xl font-bold">A</div></div>
           <h2 className="text-2xl font-bold text-center mb-6 text-slate-800">Ascari Panel Giriş</h2>
           {loginError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm">{loginError}</div>}
           <form onSubmit={handleConnect} className="space-y-4">
              <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Odoo Adresi (örn: ascari.com.tr)" value={credentials.url} onChange={e=>setCredentials({...credentials, url:e.target.value})}/>
              <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Veritabanı" value={credentials.db} onChange={e=>setCredentials({...credentials, db:e.target.value})}/>
              <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Kullanıcı Adı" value={credentials.username} onChange={e=>setCredentials({...credentials, username:e.target.value})}/>
              <input className="w-full p-4 border rounded-xl bg-slate-50" type="password" placeholder="Şifre" value={credentials.password} onChange={e=>setCredentials({...credentials, password:e.target.value})}/>
              <div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} className="w-5 h-5"/> <span className="text-slate-600">Beni Hatırla</span></div>
              <button disabled={loading} className="w-full bg-indigo-600 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 transition-transform active:scale-95 disabled:opacity-50">{loading ? 'Bağlanıyor...' : 'Giriş Yap'}</button>
           </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
       <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col transition-all duration-300 no-print">
          <div className="p-6 font-bold text-2xl text-center lg:text-left tracking-widest hidden lg:block">ASCARI</div>
          <div className="p-4 lg:hidden text-center font-bold text-xl">A</div>
          <nav className="flex-1 space-y-1 px-2 py-4">
             {getMenuItems().map(item => (
                <button key={item.id} onClick={()=>setActiveTab(item.id)} className={`flex items-center w-full p-4 rounded-xl transition-colors ${activeTab===item.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                   <item.icon className="w-6 h-6 lg:mr-3"/> <span className="hidden lg:inline font-medium">{item.name}</span>
                </button>
             ))}
          </nav>
          <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white mt-4"><LogOut className="w-4 h-4 mr-2"/> Çıkış Yap</button>
       </div>
       <div className="flex-1 overflow-auto p-6 relative">
          {loadingData && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-200 overflow-hidden z-50"><div className="h-full bg-indigo-600 animate-progress"></div></div>}
          {activeTab === 'dashboard' && <div className="text-center py-20 text-slate-400">Dashboard İstatistikleri (Hazırlanıyor...)</div>}
          {activeTab === 'quick_offer' && renderQuickOffer()}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'accounting' && renderAccounting()} 
          {activeTab === 'helpdesk' && renderHelpdesk()}
          {activeTab === 'code' && <div className="bg-slate-900 text-green-400 p-6 rounded font-mono text-xs overflow-auto">Sistem Hazır.</div>}
       </div>
    </div>
  );
}
