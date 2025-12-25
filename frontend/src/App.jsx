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
import QRCode from 'react-qr-code';

const INITIAL_DATA = {
  salesStats: { totalRevenue: 0, dailyStoreRevenue: 0, activeQuotations: 0, confirmedOrders: 0, newCustomers: 0, personalQuotes: 0 },
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
  const colors = { draft: 'bg-blue-100 text-blue-800', sale: 'bg-green-100 text-green-800', done: 'bg-gray-100 text-gray-800', cancel: 'bg-red-100 text-red-800', posted: 'bg-indigo-100 text-indigo-800' };
  return <span onClick={onClick} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100'} ${onClick ? 'cursor-pointer' : ''}`}>{label || status}</span>;
};

// Kategori Ağacı Bileşeni
const CategoryTree = ({ categories, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  const renderNode = (nodes) => {
    return nodes.map(node => (
      <div key={node.id} className="ml-2">
        <div className={`flex items-center py-1 cursor-pointer hover:text-indigo-600 ${selectedId === node.id ? 'font-bold text-indigo-600' : 'text-slate-600'}`}>
          {node.children && node.children.length > 0 && (
            <button onClick={(e) => { e.stopPropagation(); toggle(node.id); }} className="mr-1">
              {expanded[node.id] ? <ChevronDown className="w-3 h-3" /> : <ChevronRightIcon className="w-3 h-3" />}
            </button>
          )}
          <span onClick={() => onSelect(node.id)} className="text-sm">{node.name}</span>
        </div>
        {expanded[node.id] && node.children && (
           <div className="ml-2 border-l border-slate-200 pl-2">{renderNode(node.children)}</div>
        )}
      </div>
    ));
  };
  return <div className="space-y-1">{renderNode(categories)}</div>;
};

const PaymentBadge = ({ state }) => {
  if (state === 'paid') return <span className="flex items-center text-green-600 text-xs font-bold"><CheckCircle className="w-3 h-3 mr-1"/> Ödendi</span>;
  return <span className="flex items-center text-red-500 text-xs font-bold"><AlertCircle className="w-3 h-3 mr-1"/> Ödenmedi</span>;
}

export default function AscariDashboard() {
  const [data, setData] = useState(INITIAL_DATA); 
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userRole, setUserRole] = useState('admin');
  const [logoError, setLogoError] = useState(false);
  const [credentials, setCredentials] = useState({ url: '', db: '', username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loadingData, setLoadingData] = useState(false);
  const [rememberMe, setRememberMe] = useState(false); // Beni Hatırla State'i

  // Filtreler
  const [salesFilter, setSalesFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all');
  const [accountingSubTab, setAccountingSubTab] = useState('customer_invoices');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  
  // Seçimler
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('orders');

  // Hızlı Teklif
  const [searchTerm, setSearchTerm] = useState('');
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ customer: '', product: '', issue: '', priority: 'medium' });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  // --- BENİ HATIRLA ÖZELLİĞİ ---
  useEffect(() => {
    const savedCreds = localStorage.getItem('ascari_credentials');
    if (savedCreds) {
        try {
            const parsed = JSON.parse(savedCreds);
            setCredentials(parsed);
            setRememberMe(true);
        } catch (e) {
            console.error("Kayıtlı bilgiler okunamadı.");
        }
    }
  }, []);

  const performSearch = async (model, query) => {
    if (!query || query.length < 2) return;
    setLoadingData(true);
    try {
        const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...credentials, model, query })
        });
        const result = await response.json();
        if (result.status === 'success') {
            if (model === 'product.product') setData(prev => ({...prev, products: result.data}));
            if (model === 'res.partner') setData(prev => ({...prev, customers: result.data}));
            if (model === 'sale.order') setData(prev => ({...prev, orders: result.data}));
        }
    } catch (e) { console.error("Arama hatası", e); }
    finally { setLoadingData(false); }
  };

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

  const handleConnect = async (e) => {
    e.preventDefault();
    setLoading(true);
    setLoginError('');
    try {
        const response = await fetch('/api/connect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
        });
        const result = await response.json();
        if (result.status === 'success') {
            // Başarılı girişte Beni Hatırla kontrolü
            if (rememberMe) {
                localStorage.setItem('ascari_credentials', JSON.stringify(credentials));
            } else {
                localStorage.removeItem('ascari_credentials');
            }

            setIsConnected(true);
            await fetchDashboardData(result.uid);
            if(userRole === 'sales') setActiveTab('quick_offer');
        } else throw new Error(result.message || 'Giriş başarısız.');
    } catch (error) { setLoginError(error.message); } 
    finally { setLoading(false); }
  };

  const fetchDashboardData = async (uid) => {
    setLoadingData(true);
    try {
        const response = await fetch('/api/dashboard-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...credentials, uid })
        });
        const result = await response.json();
        if (result.error) throw new Error(result.error);
        setData(prev => ({ ...prev, ...result }));
    } catch (error) { console.error("Veri hatası:", error); } 
    finally { setLoadingData(false); }
  };

  const handleLogout = () => { setIsConnected(false); setActiveTab('dashboard'); setData(INITIAL_DATA); };

  // --- RENDERERS ---

  const renderQuickOfferFull = () => {
    const filteredProducts = data.products.filter(p => {
        const matchesCat = selectedCategoryId ? (p.categ_id && p.categ_id[0] === selectedCategoryId) : true;
        return matchesCat;
    });

    const total = quickCart.reduce((sum, item) => sum + (item.list_price * item.qty), 0);

    if (quickOfferDetails) {
        return (
            <div className="flex flex-col h-full animate-fadeIn">
                <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200 no-print">
                    <div className="flex items-center text-green-600"><CheckCircle className="w-6 h-6 mr-2" /><span className="font-bold">Teklif Hazır</span></div>
                    <div className="flex space-x-3">
                        <button onClick={() => { setQuickOfferDetails(null); setQuickCart([]); setTempCustomerName(''); }} className="px-4 py-2 border rounded bg-white hover:bg-slate-50 text-sm">Yeni Teklif</button>
                        <button onClick={() => window.print()} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm shadow-sm flex items-center"><Printer className="w-4 h-4 mr-2"/> Yazdır</button>
                    </div>
                </div>

                <div className="print-only fixed inset-0 bg-white z-[9999] p-10">
                    <div className="flex justify-between items-start mb-10 border-b-2 border-black pb-6">
                        <div>
                             <img src="Ascari Beyaz Logo.png" alt="ASCARI" className="h-16 invert object-contain filter brightness-0" onError={(e)=>e.target.style.display='none'} />
                             <h1 className="text-3xl font-bold mt-2">ASCARI</h1>
                             <p className="text-sm text-gray-600">Mobilya & Tasarım</p>
                        </div>
                        <div className="text-right">
                             <h2 className="text-4xl font-light text-gray-400">TEKLİF</h2>
                             <p className="font-bold text-xl">#{quickOfferDetails.code}</p>
                             <p>{quickOfferDetails.date}</p>
                        </div>
                    </div>
                    <div className="mb-10"><h3 className="font-bold uppercase text-gray-500 text-xs">Sayın</h3><p className="text-xl font-bold">{quickOfferDetails.customer}</p><p>{quickOfferDetails.phone}</p></div>
                    <table className="w-full mb-10"><thead><tr className="border-b-2 border-black"><th className="text-left py-2">Ürün / Hizmet</th><th className="text-right py-2">Miktar</th><th className="text-right py-2">Birim Fiyat</th><th className="text-right py-2">Toplam</th></tr></thead><tbody>{quickOfferDetails.items.map((item, i) => (<tr key={i} className="border-b border-gray-200"><td className="py-3"><div className="font-bold">{item.name}</div><div className="text-xs text-gray-500">{item.default_code}</div></td><td className="py-3 text-right">{item.qty}</td><td className="py-3 text-right">{formatCurrency(item.list_price)}</td><td className="py-3 text-right font-bold">{formatCurrency(item.list_price * item.qty)}</td></tr>))}</tbody></table>
                    <div className="flex justify-end mb-10"><div className="w-1/3 text-right space-y-2"><div className="flex justify-between border-b pb-1"><span>Ara Toplam:</span><span>{formatCurrency(quickOfferDetails.total)}</span></div><div className="flex justify-between border-b pb-1"><span>KDV (%20):</span><span>{formatCurrency(quickOfferDetails.tax)}</span></div><div className="flex justify-between text-xl font-bold mt-2"><span>GENEL TOPLAM:</span><span>{formatCurrency(quickOfferDetails.grandTotal)}</span></div></div></div>
                    <div className="border-t border-gray-200 pt-6 text-center"><p className="text-sm text-gray-500 mb-4">Bu teklif ile web sitemizden alışveriş yapabilirsiniz.</p><div className="flex justify-center"><QRCode value={`https://ascari.com.tr/teklif/${quickOfferDetails.code}`} size={100} /></div><p className="text-xs text-gray-400 mt-2">{quickOfferDetails.code}</p></div>
                </div>

                <div className="flex-1 bg-slate-100 p-8 flex justify-center overflow-auto no-print">
                    <div className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-lg scale-75 origin-top"><div className="text-center text-gray-400 py-20">Önizleme Alanı (Yazdır butonuna basınca tam format çıkar)</div><div className="text-center text-2xl font-bold">{quickOfferDetails.customer} - {formatCurrency(quickOfferDetails.grandTotal)}</div></div>
                </div>
            </div>
        );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-fadeIn no-print">
         <div className="flex flex-1 gap-6 overflow-hidden">
            <div className="w-1/5 bg-white p-4 rounded-lg shadow-sm overflow-y-auto"><h4 className="font-bold text-slate-700 mb-4 flex items-center"><Layers className="w-4 h-4 mr-2"/> Kategoriler</h4><CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} /></div>
            <div className="w-2/5 flex flex-col space-y-4">
                <div className="bg-white p-3 rounded-lg shadow-sm flex gap-2"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="text" className="w-full pl-9 border rounded-md py-2 text-sm" placeholder="Ürün Ara..." onKeyDown={(e) => e.key === 'Enter' && performSearch('product.product', e.target.value)} /></div><button className="bg-indigo-600 text-white px-4 rounded text-sm">Ara</button></div>
                <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm p-4 grid grid-cols-2 gap-3 content-start">{filteredProducts.map(p => (<div key={p.id} onClick={() => { setQuickCart(prev => { const exist = prev.find(i => i.id === p.id); return exist ? prev.map(i => i.id === p.id ? {...i, qty: i.qty+1} : i) : [...prev, {...p, qty: 1}]; }); }} className="border rounded p-2 hover:border-indigo-500 cursor-pointer flex flex-col items-center text-center">{p.image_128 ? <img src={`data:image/png;base64,${p.image_128}`} className="h-20 object-contain mb-2"/> : <PackageSearch className="h-20 text-slate-200"/>}<h4 className="text-xs font-bold line-clamp-2">{p.name}</h4><span className="text-indigo-600 font-bold text-sm mt-1">{formatCurrency(p.list_price)}</span></div>))}</div>
            </div>
            <div className="w-2/5 bg-white rounded-lg shadow-lg flex flex-col h-full border border-slate-200">
                <div className="p-4 border-b bg-slate-50 rounded-t-lg"><h3 className="font-bold flex items-center"><Zap className="w-4 h-4 mr-2 text-orange-500"/> Hızlı Teklif</h3></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">{quickCart.map(item => (<div key={item.id} className="flex justify-between items-center bg-slate-50 p-2 rounded"><div className="flex-1"><div className="text-xs font-bold truncate">{item.name}</div><div className="text-xs text-slate-500">{formatCurrency(item.list_price)} x {item.qty}</div></div><div className="flex items-center space-x-2"><span className="font-bold text-sm">{formatCurrency(item.list_price * item.qty)}</span><button onClick={() => setQuickCart(prev => prev.filter(i => i.id !== item.id))} className="text-red-500"><Trash2 className="w-4 h-4"/></button></div></div>))}</div>
                <div className="p-4 border-t bg-slate-50 space-y-3"><div className="flex justify-between text-lg font-bold"><span>Toplam</span><span>{formatCurrency(total)}</span></div><div className="grid grid-cols-2 gap-2"><input className="border p-2 rounded text-sm" placeholder="Müşteri Adı" value={tempCustomerName} onChange={e=>setTempCustomerName(e.target.value)} /><input className="border p-2 rounded text-sm" placeholder="Telefon" value={tempCustomerPhone} onChange={e=>setTempCustomerPhone(e.target.value)} /></div><button onClick={createQuickOffer} className="w-full bg-indigo-900 text-white py-3 rounded font-bold hover:bg-indigo-800">Teklif Oluştur</button></div>
            </div>
         </div>
      </div>
    );
  };

  const renderSales = () => {
    if (selectedOrder) { return (<div className="space-y-6 animate-fadeIn no-print"><button onClick={() => setSelectedOrder(null)} className="flex items-center text-slate-500 mb-4"><ArrowLeft className="w-4 h-4 mr-2"/> Geri Dön</button><div className="bg-white shadow rounded-lg p-6"><div className="flex justify-between items-start mb-6"><div><h2 className="text-2xl font-bold">{selectedOrder.id}</h2><p className="text-sm text-slate-500">{selectedOrder.date}</p></div><StatusBadge status={selectedOrder.status} /></div><div className="border-t pt-4"><h3 className="font-bold mb-3">Ürünler</h3><table className="w-full text-sm"><thead className="bg-slate-50 text-left"><tr><th className="p-2">Ürün</th><th className="p-2 text-right">Miktar</th><th className="p-2 text-right">Tutar</th></tr></thead><tbody>{selectedOrder.lines && selectedOrder.lines.map((l, i) => (<tr key={i} className="border-b"><td className="p-2">{l.name}</td><td className="p-2 text-right">{l.qty}</td><td className="p-2 text-right font-bold">{formatCurrency(l.subtotal)}</td></tr>))}</tbody></table></div></div></div>) }
    const filtered = data.orders.filter(o => salesFilter === 'all' ? true : salesFilter === 'sale' ? ['sale','done'].includes(o.status) : o.status === 'draft');
    return (
        <div className="space-y-6 animate-fadeIn no-print"><div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"><div className="flex space-x-2"><button onClick={()=>setSalesFilter('all')} className={`px-4 py-2 rounded ${salesFilter==='all'?'bg-indigo-100 text-indigo-700':'bg-slate-100'}`}>Tümü</button><button onClick={()=>setSalesFilter('sale')} className={`px-4 py-2 rounded ${salesFilter==='sale'?'bg-green-100 text-green-700':'bg-slate-100'}`}>Siparişler</button><button onClick={()=>setSalesFilter('draft')} className={`px-4 py-2 rounded ${salesFilter==='draft'?'bg-blue-100 text-blue-700':'bg-slate-100'}`}>Teklifler</button></div><div className="flex space-x-2"><input className="border p-2 rounded text-sm" placeholder="Sipariş / Müşteri Ara..." onKeyDown={(e) => e.key === 'Enter' && performSearch('sale.order', e.target.value)} /></div></div><div className="bg-white shadow rounded-lg overflow-hidden"><table className="w-full text-sm text-left"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-4">Ref</th><th className="p-4">Müşteri</th><th className="p-4">Tarih</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-center">Durum</th></tr></thead><tbody className="divide-y">{filtered.map(o => (<tr key={o.id} onClick={() => setSelectedOrder(o)} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 font-medium text-indigo-600">{o.id}</td><td className="p-4">{o.customer}</td><td className="p-4 text-slate-500">{o.date}</td><td className="p-4 text-right font-bold">{formatCurrency(o.amount)}</td><td className="p-4 text-center"><StatusBadge status={o.status} /></td></tr>))}</tbody></table></div></div>
    );
  };

  const renderProducts = () => {
      if (selectedProduct) { return (<div className="space-y-6 no-print"><button onClick={()=>setSelectedProduct(null)} className="flex items-center text-slate-500"><ArrowLeft className="w-4 h-4 mr-2"/> Geri Dön</button><div className="bg-white p-8 rounded-lg shadow flex gap-8"><div className="w-1/3 border rounded flex items-center justify-center p-4">{selectedProduct.image_128 ? <img src={`data:image/png;base64,${selectedProduct.image_128}`} className="max-w-full max-h-64" /> : <Package className="w-24 h-24 text-slate-200"/>}</div><div className="w-2/3 space-y-4"><h2 className="text-2xl font-bold">{selectedProduct.name}</h2><div className="grid grid-cols-2 gap-4 text-sm"><div><label className="text-slate-500 block">Kod</label>{selectedProduct.default_code}</div><div><label className="text-slate-500 block">Kategori</label>{selectedProduct.category}</div><div><label className="text-slate-500 block">Satış Fiyatı</label><span className="text-xl font-bold text-indigo-600">{formatCurrency(selectedProduct.list_price)}</span></div><div><label className="text-slate-500 block">Stok</label>{selectedProduct.qty_available} Adet</div></div></div></div></div>) }
      return (<div className="flex h-[calc(100vh-140px)] gap-4 no-print"><div className="w-1/5 bg-white p-4 rounded-lg shadow-sm overflow-y-auto"><CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} /></div><div className="w-4/5 flex flex-col space-y-4"><div className="bg-white p-3 rounded-lg flex gap-2"><input className="w-full border p-2 rounded" placeholder="Ürün Ara..." onKeyDown={(e)=>e.key==='Enter' && performSearch('product.product', e.target.value)} /><button className="bg-indigo-600 text-white px-4 rounded">Ara</button></div><div className="flex-1 overflow-y-auto grid grid-cols-4 gap-4 content-start">{data.products.filter(p => !selectedCategoryId || (p.categ_id && p.categ_id[0] === selectedCategoryId)).map(p => (<div key={p.id} onClick={()=>setSelectedProduct(p)} className="bg-white p-4 rounded shadow hover:shadow-md cursor-pointer transition"><div className="h-32 flex items-center justify-center mb-2">{p.image_128 ? <img src={`data:image/png;base64,${p.image_128}`} className="max-h-full"/> : <Package className="text-slate-300"/>}</div><h4 className="font-bold text-sm line-clamp-2">{p.name}</h4><p className="text-indigo-600 font-bold mt-1">{formatCurrency(p.list_price)}</p></div>))}</div></div></div>);
  };

  const renderCustomers = () => {
    if (selectedCustomer) {
        return (<div className="space-y-6 no-print"><button onClick={()=>setSelectedCustomer(null)} className="flex items-center text-slate-500"><ArrowLeft className="w-4 h-4 mr-2"/> Listeye Dön</button><div className="grid grid-cols-3 gap-6"><div className="col-span-1 bg-white p-6 rounded-lg shadow text-center border-t-4 border-indigo-500"><div className="w-20 h-20 bg-slate-100 rounded-full mx-auto flex items-center justify-center text-2xl font-bold text-slate-500 mb-4">{selectedCustomer.name.charAt(0)}</div><h2 className="font-bold text-lg">{selectedCustomer.name}</h2><div className="mt-4 text-sm text-left space-y-2"><div className="flex items-center"><Mail className="w-4 h-4 mr-2 text-slate-400"/> {selectedCustomer.email}</div><div className="flex items-center"><Phone className="w-4 h-4 mr-2 text-slate-400"/> {selectedCustomer.phone}</div></div><div className="mt-6 pt-4 border-t text-2xl font-bold text-slate-800">{formatCurrency(selectedCustomer.balance)}</div><div className="text-xs text-slate-500">Bakiye</div></div><div className="col-span-2 bg-white rounded-lg shadow overflow-hidden"><div className="flex border-b"><button onClick={()=>setCustomerDetailTab('orders')} className={`flex-1 py-3 ${customerDetailTab==='orders'?'border-b-2 border-indigo-600 font-bold':''}`}>Siparişler</button><button onClick={()=>setCustomerDetailTab('invoices')} className={`flex-1 py-3 ${customerDetailTab==='invoices'?'border-b-2 border-indigo-600 font-bold':''}`}>Faturalar</button></div><div className="p-4 max-h-[400px] overflow-y-auto">{customerDetailTab==='orders' && <div className="text-center text-slate-500 py-10">Sipariş verisi yükleniyor...</div>}</div></div></div></div>)
    }
    const filteredContacts = data.customers.filter(c => customerBalanceFilter==='all' ? true : customerBalanceFilter==='debtor' ? c.balance > 0 : c.balance <= 0);
    return (<div className="space-y-6 no-print"><div className="flex justify-between items-center bg-white p-4 rounded-lg shadow-sm"><div className="flex space-x-2"><button onClick={()=>setCustomerBalanceFilter('all')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter==='all'?'bg-indigo-100':'bg-slate-100'}`}>Tümü</button><button onClick={()=>setCustomerBalanceFilter('debtor')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter==='debtor'?'bg-red-100':'bg-slate-100'}`}>Borçlular</button><button onClick={()=>setCustomerBalanceFilter('creditor')} className={`px-3 py-1 rounded text-xs ${customerBalanceFilter==='creditor'?'bg-green-100':'bg-slate-100'}`}>Alacaklılar</button></div><div className="flex gap-2"><input className="border p-2 rounded text-sm" placeholder="Cari Ara..." onKeyDown={(e)=>e.key==='Enter' && performSearch('res.partner', e.target.value)} /><button className="bg-indigo-600 text-white px-3 rounded">Ara</button></div></div><div className="bg-white shadow rounded-lg overflow-hidden"><ul className="divide-y">{filteredContacts.map(c => (<li key={c.id} onClick={()=>setSelectedCustomer(c)} className="p-4 flex justify-between hover:bg-slate-50 cursor-pointer"><div><div className="font-bold">{c.name}</div><div className="text-xs text-slate-500">{c.phone}</div></div><div className={`font-bold ${c.balance > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(c.balance)}</div></li>))}</ul></div></div>);
  };

  const renderAccounting = () => {
      // 1. Fatura Detay Görünümü
      if (selectedInvoice) {
          return (
              <div className="space-y-6 animate-fadeIn">
                  <button onClick={() => setSelectedInvoice(null)} className="flex items-center text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-5 h-5 mr-2" /> Faturalara Dön</button>
                  <div className="bg-white shadow rounded-lg p-8 border border-slate-200 relative">
                      <div className="absolute top-0 right-0 p-4"><PaymentBadge state={selectedInvoice.payment_state} /></div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedInvoice.id}</h2>
                      <p className="text-slate-500 mb-6">{selectedInvoice.date}</p>
                      <div className="grid grid-cols-2 gap-8 mb-8">
                          <div><h4 className="font-bold text-gray-500 text-xs uppercase">Muhatap</h4><p className="text-lg">{selectedInvoice.partner}</p></div>
                          <div className="text-right"><h4 className="font-bold text-gray-500 text-xs uppercase">Tutar</h4><p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedInvoice.amount)}</p></div>
                      </div>
                      <table className="w-full border-t border-slate-200">
                          <thead className="bg-slate-50"><tr><th className="text-left py-2 text-sm text-slate-600">Açıklama</th><th className="text-right py-2 text-sm text-slate-600">Tutar</th></tr></thead>
                          <tbody>{selectedInvoice.lines?.map((line, i) => <tr key={i} className="border-b border-slate-100"><td className="py-2 text-slate-800">{line.desc}</td><td className="py-2 text-right font-medium">{formatCurrency(line.sub)}</td></tr>)}</tbody>
                      </table>
                  </div>
              </div>
          )
      }
      const filteredInvoices = data.invoices.filter(inv => {
        const typeMatch = accountingSubTab === 'customer_invoices' ? inv.type === 'out_invoice' : inv.type === 'in_invoice';
        const searchMatch = inv.partner.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.id.toLowerCase().includes(invoiceSearch.toLowerCase());
        return typeMatch && searchMatch;
      });
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4">
            <nav className="flex space-x-4 mb-4 sm:mb-0">
              <button onClick={() => setAccountingSubTab('customer_invoices')} className={`${accountingSubTab === 'customer_invoices' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowUpRight className="w-4 h-4 mr-2" /> Giden Faturalar</button>
              <button onClick={() => setAccountingSubTab('vendor_bills')} className={`${accountingSubTab === 'vendor_bills' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowDownLeft className="w-4 h-4 mr-2" /> Gelen Faturalar</button>
            </nav>
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="text" placeholder="Fatura Ara..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)}/></div>
          </div>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">No</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{accountingSubTab === 'customer_invoices' ? 'Müşteri' : 'Tedarikçi'}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Tarih</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Tutar</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Durum</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Ödeme</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (<tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50 cursor-pointer"><td className="px-6 py-4 text-sm font-medium text-indigo-600">{inv.id}</td><td className="px-6 py-4 text-sm text-slate-900">{inv.partner}</td><td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td><td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">{formatCurrency(inv.amount)}</td><td className="px-6 py-4 text-center"><StatusBadge status={inv.status} label={inv.status === 'posted' ? 'Onaylı' : 'Taslak'} /></td><td className="px-6 py-4 flex justify-center"><PaymentBadge state={inv.payment_state} /></td></tr>)) : <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 text-sm">Fatura bulunamadı.</td></tr>}</tbody></table></div>
        </div>
      );
  };

  // --- ANA RENDER ---
  if (!isConnected) {
     return (
         <div className="min-h-screen bg-slate-50 flex items-center justify-center">
             <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
                 <div className="text-center mb-6"><h1 className="text-2xl font-bold text-slate-800">Ascari Panel v2.1</h1></div>
                 {loginError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{loginError}</div>}
                 <form onSubmit={handleConnect} className="space-y-4">
                     <input className="w-full border p-3 rounded" placeholder="Odoo URL (örn: ascari.com.tr)" value={credentials.url} onChange={e=>setCredentials({...credentials, url:e.target.value})} />
                     <div className="grid grid-cols-2 gap-2">
                        <input className="w-full border p-3 rounded" placeholder="Veritabanı" value={credentials.db} onChange={e=>setCredentials({...credentials, db:e.target.value})} />
                        <select className="w-full border p-3 rounded" value={userRole} onChange={e=>setUserRole(e.target.value)}><option value="admin">Yönetici</option><option value="sales">Satış</option></select>
                     </div>
                     <input className="w-full border p-3 rounded" placeholder="E-Posta" value={credentials.username} onChange={e=>setCredentials({...credentials, username:e.target.value})} />
                     <input className="w-full border p-3 rounded" type="password" placeholder="Şifre" value={credentials.password} onChange={e=>setCredentials({...credentials, password:e.target.value})} />
                     <label className="flex items-center space-x-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                        <span>Bilgilerimi Hatırla</span>
                     </label>
                     <button disabled={loading} className="w-full bg-indigo-600 text-white p-3 rounded font-bold hover:bg-indigo-700 transition">{loading ? 'Bağlanıyor...' : 'Giriş Yap'}</button>
                 </form>
             </div>
         </div>
     )
  }

  const menuItems = getMenuItems();

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
        <div className="w-64 bg-slate-900 text-white flex flex-col p-4 no-print">
            <div className="text-2xl font-bold mb-8 tracking-wider">ASCARI</div>
            <nav className="flex-1 space-y-2">
                {menuItems.map(item => (
                    <button key={item.id} onClick={()=>setActiveTab(item.id)} className={`flex items-center w-full p-3 rounded transition ${activeTab===item.id ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}>
                        <item.icon className="w-5 h-5 mr-3"/> {item.name}
                    </button>
                ))}
            </nav>
            <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white mt-4"><LogOut className="w-4 h-4 mr-2"/> Çıkış Yap</button>
        </div>
        <div className="flex-1 overflow-auto p-6 relative">
            {loadingData && <div className="absolute top-0 left-0 right-0 h-1 bg-indigo-200 overflow-hidden z-50"><div className="h-full bg-indigo-600 animate-progress"></div></div>}
            {activeTab === 'dashboard' && <div className="text-center py-20 text-slate-400">Dashboard Raporları (Hazırlanıyor...)</div>}
            {activeTab === 'quick_offer' && renderQuickOfferFull()}
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
