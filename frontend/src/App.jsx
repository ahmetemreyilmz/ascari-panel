import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line, AreaChart, Area 
} from 'recharts';
import { 
  LayoutDashboard, ShoppingCart, Users, DollarSign, Settings, 
  LogOut, RefreshCw, ChevronRight, TrendingUp, Package, FileText, Code,
  ArrowLeft, Printer, Download, CheckCircle, Clock, AlertCircle,
  Search, PackageSearch, Tag, Layers, Zap, Plus, Minus, Trash2, QrCode,
  UserPlus, Gift, Shield, User, Wrench, ClipboardList, PenTool, Filter, X,
  ArrowUpRight, ArrowDownLeft, CreditCard, History, Phone, Mail, MapPin,
  Calendar, Edit3, Save, Briefcase, AlertTriangle
} from 'lucide-react';

const INITIAL_DATA = {
  salesStats: { totalRevenue: 0, dailyStoreRevenue: 0, activeQuotations: 0, confirmedOrders: 0, newCustomers: 0, personalQuotes: 0 },
  monthlySales: [],
  customers: [],
  orders: [],
  invoices: [],
  products: [],
  tickets: [],
  categories: ['Tümü', 'Ofis Mobilyası', 'Depolama', 'Toplantı', 'Aksesuar', 'Diğer']
};

const formatCurrency = (value) => new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(value || 0);

const StatusBadge = ({ status, label, onClick }) => {
  const colors = { draft: 'bg-blue-100 text-blue-800', sale: 'bg-green-100 text-green-800', done: 'bg-gray-100 text-gray-800', cancel: 'bg-red-100 text-red-800', posted: 'bg-indigo-100 text-indigo-800' };
  const labels = { draft: 'Teklif', sale: 'Sipariş', done: 'Tamamlandı', cancel: 'İptal', posted: 'Onaylı' };
  return <span onClick={onClick} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[status] || 'bg-gray-100'} ${onClick ? 'cursor-pointer' : ''}`}>{label || labels[status] || status}</span>;
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

  // Filtreler ve Seçimler
  const [salesFilter, setSalesFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [customerBalanceFilter, setCustomerBalanceFilter] = useState('all');
  const [accountingSubTab, setAccountingSubTab] = useState('customer_invoices');
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetailTab, setCustomerDetailTab] = useState('orders');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  // Hızlı Teklif
  const [searchTerm, setSearchTerm] = useState('');
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('Tümü');
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ customer: '', product: '', issue: '', priority: 'medium' });
  const [isEditingProduct, setIsEditingProduct] = useState(false);

  const getMenuItems = () => {
    const allItems = [ 
      { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'sales'] }, 
      { id: 'quick_offer', name: 'Hızlı Teklif', icon: Zap, roles: ['admin', 'sales'] }, 
      { id: 'helpdesk', name: 'Teknik Servis', icon: Wrench, roles: ['admin', 'sales'] }, 
      { id: 'sales', name: 'Satışlar', icon: ShoppingCart, roles: ['admin'] }, 
      { id: 'products', name: 'Ürünler', icon: Package, roles: ['admin', 'sales'] }, 
      { id: 'customers', name: 'Müşteriler', icon: Users, roles: ['admin'] }, 
      { id: 'accounting', name: 'Muhasebe', icon: DollarSign, roles: ['admin'] }, 
      { id: 'code', name: 'Entegrasyon Kodu', icon: Code, roles: ['admin'] } 
    ];
    return allItems.filter(item => item.roles.includes(userRole));
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
            setIsConnected(true);
            await fetchDashboardData(result.uid);
            if(userRole === 'sales') setActiveTab('quick_offer');
        } else {
             throw new Error(result.message || 'Giriş başarısız.');
        }
    } catch (error) {
        setLoginError(error.message);
    } finally {
        setLoading(false);
    }
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
    } catch (error) {
        console.error("Veri çekme hatası:", error);
    } finally {
        setLoadingData(false);
    }
  };

  const handleLogout = () => { setIsConnected(false); setActiveTab('dashboard'); setData(INITIAL_DATA); };
  
  const addToQuickCart = useCallback((product) => { setQuickCart(prev => { const existing = prev.find(item => item.id === product.id); if (existing) return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item); return [...prev, { ...product, qty: 1 }]; }); }, []);
  const removeFromQuickCart = (productId) => setQuickCart(prev => prev.filter(item => item.id !== productId));
  const updateCartQty = (productId, change) => setQuickCart(prev => prev.map(item => item.id === productId ? { ...item, qty: Math.max(1, item.qty + change) } : item));
  const createQuickOffer = () => { const total = quickCart.reduce((sum, item) => sum + (item.list_price * item.qty), 0); setQuickOfferDetails({ code: 'ASC-' + Math.floor(1000 + Math.random() * 9000), customer: tempCustomerName || 'Sayın Ziyaretçi', phone: tempCustomerPhone || '', date: new Date().toLocaleDateString('tr-TR'), items: [...quickCart], total: total, tax: total * 0.20, grandTotal: total * 1.20 }); };
  const handlePrint = () => { window.print(); };
  const handleTicketSubmit = (e) => { e.preventDefault(); alert("Kaydedildi (Demo)"); setShowNewTicketForm(false); };
  const isWithinDateRange = (dateStr) => { if (!dateFilter.start && !dateFilter.end) return true; const date = new Date(dateStr); const start = dateFilter.start ? new Date(dateFilter.start) : new Date('2000-01-01'); const end = dateFilter.end ? new Date(dateFilter.end) : new Date('2099-12-31'); return date >= start && date <= end; };

  const renderCustomers = () => {
    if (selectedCustomer) {
      const cOrders = data.orders.filter(o => o.customer === selectedCustomer.name);
      const cInvoices = data.invoices.filter(i => i.partner === selectedCustomer.name && i.type === 'out_invoice');
      const cTickets = data.tickets.filter(t => t.customer === selectedCustomer.name);
      return (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center"><button onClick={() => setSelectedCustomer(null)} className="mr-3 p-2 rounded-full hover:bg-slate-100 text-slate-500"><ArrowLeft className="w-5 h-5" /></button><div><h2 className="text-xl font-bold text-slate-900">{selectedCustomer.name}</h2><p className="text-xs text-slate-500">Müşteri Kartı</p></div></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-1 space-y-6">
                <div className="bg-white shadow rounded-lg p-6 border-t-4 border-indigo-500 text-center"><div className="mx-auto h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold mb-4">{selectedCustomer.name.charAt(0)}</div><h3 className="text-lg font-bold">{selectedCustomer.name}</h3><div className="mt-4 space-y-2 text-sm text-slate-600"><div className="flex items-center justify-center"><Mail className="w-4 h-4 mr-2"/> {selectedCustomer.email}</div><div className="flex items-center justify-center"><Phone className="w-4 h-4 mr-2"/> {selectedCustomer.phone}</div></div><div className="mt-6 pt-4 border-t"><div className="text-2xl font-bold text-slate-800">{formatCurrency(selectedCustomer.balance)}</div><p className="text-xs text-slate-500">Bakiye</p></div></div>
             </div>
             <div className="lg:col-span-2">
                <div className="bg-white shadow rounded-lg min-h-[400px] p-4">
                   <div className="flex border-b mb-4">
                      <button onClick={() => setCustomerDetailTab('orders')} className={`flex-1 pb-2 ${customerDetailTab==='orders'?'border-b-2 border-indigo-600 font-bold':''}`}>Siparişler</button>
                      <button onClick={() => setCustomerDetailTab('invoices')} className={`flex-1 pb-2 ${customerDetailTab==='invoices'?'border-b-2 border-indigo-600 font-bold':''}`}>Faturalar</button>
                      <button onClick={() => setCustomerDetailTab('tickets')} className={`flex-1 pb-2 ${customerDetailTab==='tickets'?'border-b-2 border-indigo-600 font-bold':''}`}>Servis</button>
                   </div>
                   {customerDetailTab === 'orders' && cOrders.map(o => <div key={o.id} className="flex justify-between py-2 border-b"><span>{o.id} ({o.date})</span><span className="font-bold">{formatCurrency(o.amount)}</span></div>)}
                   {customerDetailTab === 'invoices' && cInvoices.map(i => <div key={i.id} className="flex justify-between py-2 border-b"><span>{i.id} ({i.date})</span><span>{formatCurrency(i.amount)}</span></div>)}
                   {customerDetailTab === 'tickets' && cTickets.map(t => <div key={t.id} className="flex justify-between py-2 border-b"><span>{t.product} - {t.issue}</span><StatusBadge status={t.status} /></div>)}
                </div>
             </div>
          </div>
        </div>
      );
    }
    const filteredCustomers = data.customers.filter(c => customerBalanceFilter === 'all' ? true : customerBalanceFilter === 'debtor' ? c.balance > 0 : c.balance <= 0);
    return (<div className="space-y-6 animate-fadeIn"><div className="bg-white shadow rounded-lg"><ul className="divide-y">{filteredCustomers.map(c => <li key={c.id} onClick={() => setSelectedCustomer(c)} className="p-4 hover:bg-slate-50 cursor-pointer flex justify-between"><span>{c.name}</span><span className="font-bold">{formatCurrency(c.balance)}</span></li>)}</ul></div></div>);
  };

  const renderSales = () => { 
    const filteredOrders = data.orders.filter(order => { 
      const typeMatch = salesFilter === 'all' ? true : salesFilter === 'orders' ? ['sale', 'done'].includes(order.status) : order.status === 'draft'; 
      return typeMatch && isWithinDateRange(order.date); 
    }); 
    if (selectedOrder) { 
      return (
        <div className="space-y-6 animate-fadeIn">
          <button onClick={() => setSelectedOrder(null)} className="flex items-center text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-5 h-5 mr-2" /> Listeye Dön</button>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between"><div><h3 className="text-lg font-bold">{selectedOrder.id}</h3><p className="text-sm text-slate-500">{selectedOrder.date}</p></div><StatusBadge status={selectedOrder.status} label={selectedOrder.statusLabel} /></div>
            <div className="border-t border-slate-200 px-4 py-5 sm:px-6"><h4 className="font-medium mb-2">Müşteri: {selectedOrder.customer}</h4><div className="text-right text-lg font-bold">{formatCurrency(selectedOrder.amount)}</div></div>
          </div>
        </div>
      ); 
    } 
    return (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-white p-4 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg">{['all', 'orders', 'quotations'].map(f => (<button key={f} onClick={() => setSalesFilter(f)} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${salesFilter === f ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{f === 'all' ? 'Tümü' : f === 'orders' ? 'Siparişler' : 'Teklifler'}</button>))}</div>
          <div className="flex items-center space-x-2 text-sm"><Calendar className="w-4 h-4 text-slate-400" /><input type="date" className="border border-slate-300 rounded px-2 py-1" onChange={e => setDateFilter({...dateFilter, start: e.target.value})} /><span className="text-slate-400">-</span><input type="date" className="border border-slate-300 rounded px-2 py-1" onChange={e => setDateFilter({...dateFilter, end: e.target.value})} /></div>
        </div>
        <div className="bg-white shadow overflow-hidden sm:rounded-lg"><ul className="divide-y divide-slate-200">{filteredOrders.length > 0 ? filteredOrders.map((order) => (<li key={order.id} onClick={() => setSelectedOrder(order)} className="px-4 py-4 sm:px-6 hover:bg-slate-50 transition-colors cursor-pointer"><div className="grid grid-cols-12 gap-4 items-center"><div className="col-span-2 font-medium text-indigo-600">{order.id}</div><div className="col-span-4 text-slate-900">{order.customer}</div><div className="col-span-2 text-slate-500">{order.date}</div><div className="col-span-2 text-slate-900 font-medium text-right">{formatCurrency(order.amount)}</div><div className="col-span-2 flex justify-center"><StatusBadge status={order.status} label={order.statusLabel} /></div></div></li>)) : <div className="p-8 text-center text-slate-500">Kayıt bulunamadı.</div>}</ul></div>
      </div>
    ); 
  };

  const renderAccounting = () => { 
    if (selectedInvoice) { return (<div className="space-y-6 animate-fadeIn"><button onClick={() => setSelectedInvoice(null)} className="flex items-center text-slate-500 hover:text-slate-900 mb-4"><ArrowLeft className="w-5 h-5 mr-2" /> Faturalara Dön</button><div className="bg-white shadow rounded-lg p-8 border border-slate-200 relative"><div className="absolute top-0 right-0 p-4"><PaymentBadge state={selectedInvoice.payment_state} /></div><h2 className="text-2xl font-bold text-slate-800 mb-1">{selectedInvoice.id}</h2><p className="text-slate-500 mb-6">{selectedInvoice.date}</p><div className="grid grid-cols-2 gap-8 mb-8"><div><h4 className="font-bold text-gray-500 text-xs uppercase">Muhatap</h4><p className="text-lg">{selectedInvoice.partner}</p></div><div className="text-right"><h4 className="font-bold text-gray-500 text-xs uppercase">Tutar</h4><p className="text-2xl font-bold text-indigo-600">{formatCurrency(selectedInvoice.amount)}</p></div></div></div></div>) } 
    const filteredInvoices = data.invoices.filter(inv => { const typeMatch = accountingSubTab === 'customer_invoices' ? inv.type === 'out_invoice' : inv.type === 'in_invoice'; const searchMatch = inv.partner.toLowerCase().includes(invoiceSearch.toLowerCase()) || inv.id.toLowerCase().includes(invoiceSearch.toLowerCase()); return typeMatch && searchMatch; }); 
    return (<div className="space-y-6 animate-fadeIn"><div className="flex flex-col sm:flex-row justify-between items-center border-b border-slate-200 pb-4"><nav className="flex space-x-4 mb-4 sm:mb-0"><button onClick={() => setAccountingSubTab('customer_invoices')} className={`${accountingSubTab === 'customer_invoices' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowUpRight className="w-4 h-4 mr-2" /> Giden Faturalar</button><button onClick={() => setAccountingSubTab('vendor_bills')} className={`${accountingSubTab === 'vendor_bills' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'} px-4 py-2 rounded-lg font-medium text-sm flex items-center`}><ArrowDownLeft className="w-4 h-4 mr-2" /> Gelen Faturalar</button></nav><div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/><input type="text" placeholder="Fatura Ara..." className="pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm w-64" value={invoiceSearch} onChange={e=>setInvoiceSearch(e.target.value)}/></div></div><div className="bg-white shadow overflow-hidden sm:rounded-lg"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">No</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">{accountingSubTab === 'customer_invoices' ? 'Müşteri' : 'Tedarikçi'}</th><th className="px-6 py-3 text-left text-xs font-medium text-slate-500">Tarih</th><th className="px-6 py-3 text-right text-xs font-medium text-slate-500">Tutar</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Durum</th><th className="px-6 py-3 text-center text-xs font-medium text-slate-500">Ödeme</th></tr></thead><tbody className="bg-white divide-y divide-slate-200">{filteredInvoices.length > 0 ? filteredInvoices.map((inv) => (<tr key={inv.id} onClick={() => setSelectedInvoice(inv)} className="hover:bg-slate-50 cursor-pointer"><td className="px-6 py-4 text-sm font-medium text-indigo-600">{inv.id}</td><td className="px-6 py-4 text-sm text-slate-900">{inv.partner}</td><td className="px-6 py-4 text-sm text-slate-500">{inv.date}</td><td className="px-6 py-4 text-sm text-slate-900 font-bold text-right">{formatCurrency(inv.amount)}</td><td className="px-6 py-4 text-center"><StatusBadge status={inv.status} label={inv.status === 'posted' ? 'Onaylı' : 'Taslak'} /></td><td className="px-6 py-4 flex justify-center"><PaymentBadge state={inv.payment_state} /></td></tr>)) : <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-500 text-sm">Fatura bulunamadı.</td></tr>}</tbody></table></div></div>); 
  };

  const renderProducts = () => { if (selectedProduct) { return (<div className="space-y-6 animate-fadeIn"><div className="flex justify-between items-center"><button onClick={() => {setSelectedProduct(null); setIsEditingProduct(false);}} className="flex items-center text-slate-500 hover:text-slate-900"><ArrowLeft className="w-5 h-5 mr-2" /> Ürünlere Dön</button><button onClick={() => setIsEditingProduct(!isEditingProduct)} className={`flex items-center px-4 py-2 rounded-md font-medium text-sm ${isEditingProduct ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'}`}>{isEditingProduct ? <><Save className="w-4 h-4 mr-2"/> Kaydet</> : <><Edit3 className="w-4 h-4 mr-2"/> Düzenle</>}</button></div><div className="bg-white shadow rounded-lg p-8 flex flex-col md:flex-row gap-8"><div className="w-full md:w-1/3 flex items-center justify-center bg-slate-50 rounded-lg h-64 border border-slate-200">{selectedProduct.image_128 ? <img src={`data:image/png;base64,${selectedProduct.image_128}`} className="max-h-full max-w-full object-contain" /> : <PackageSearch className="w-24 h-24 text-slate-300" />}</div><div className="w-full md:w-2/3 space-y-6"><div><label className="text-xs font-bold text-slate-400 uppercase">Ürün Adı</label>{isEditingProduct ? <input className="w-full border p-2 rounded mt-1" defaultValue={selectedProduct.name} /> : <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>}</div><div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-bold text-slate-400 uppercase">Kod</label><p className="font-mono text-slate-700">{selectedProduct.default_code}</p></div><div><label className="text-xs font-bold text-slate-400 uppercase">Kategori</label><p className="text-slate-700">{selectedProduct.category}</p></div><div><label className="text-xs font-bold text-slate-400 uppercase">Satış Fiyatı</label>{isEditingProduct ? <input className="border p-1 rounded w-full" defaultValue={selectedProduct.list_price}/> : <p className="text-xl font-bold text-indigo-600">{formatCurrency(selectedProduct.list_price)}</p>}</div><div className="col-span-2 bg-slate-50 p-4 rounded border border-slate-200"><label className="text-xs font-bold text-slate-400 uppercase">Stok Durumu</label><p className={`text-lg font-bold ${selectedProduct.qty_available > 0 ? 'text-green-600' : 'text-red-600'}`}>{selectedProduct.qty_available} Adet Mevcut</p></div></div></div></div></div>) } const filteredProducts = data.products.filter(product => product.name.toLowerCase().includes(searchTerm.toLowerCase())); return <div className="space-y-6 animate-fadeIn"><div className="bg-white shadow sm:rounded-lg p-4"><input type="text" className="block w-full pl-3 sm:text-sm border-slate-300 rounded-md py-3 border" placeholder="Ürün Ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div><div className="grid grid-cols-1 gap-6 sm:grid-cols-4">{filteredProducts.map(p => <div key={p.id} onClick={() => setSelectedProduct(p)} className="bg-white shadow rounded-lg p-5 flex flex-col justify-between h-48 border border-slate-100 cursor-pointer hover:border-indigo-500 transition-colors"><div className="h-24 bg-slate-50 rounded mb-2 flex items-center justify-center">{p.image_128 ? <img src={`data:image/png;base64,${p.image_128}`} className="max-h-full max-w-full object-contain"/> : <PackageSearch className="text-slate-300 w-8 h-8" />}</div><h3 className="font-bold text-slate-800 line-clamp-2 text-sm">{p.name}</h3><div><p className="text-xs text-slate-400 mb-1">{p.default_code}</p><span className="text-indigo-600 font-bold text-lg">{formatCurrency(p.list_price)}</span></div></div>)}</div></div>; };
  const renderQuickOfferFull = () => { 
    const filteredProducts = data.products.filter(product => { const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || product.default_code.toLowerCase().includes(searchTerm.toLowerCase()); const matchesCategory = selectedCategory === 'Tümü' || product.category === selectedCategory; return matchesSearch && matchesCategory; }); 
    const cartTotal = quickCart.reduce((sum, item) => sum + (item.list_price * item.qty), 0); 
    if (quickOfferDetails) { 
      return (
        <div className="flex flex-col h-full animate-fadeIn">
          <div className="flex justify-between items-center mb-6 bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex items-center text-green-600"><CheckCircle className="w-6 h-6 mr-2" /><span className="font-bold text-lg">Teklif Hazır</span></div>
            <div className="flex space-x-3">
              <button onClick={() => { setQuickOfferDetails(null); setQuickCart([]); setSearchTerm(''); setTempCustomerName(''); setTempCustomerPhone(''); }} className="flex items-center px-4 py-2 border border-slate-300 rounded-md text-slate-700 bg-white hover:bg-slate-50 text-sm font-medium"><Plus className="w-4 h-4 mr-2"/> Yeni</button>
              <button onClick={handlePrint} className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm font-medium shadow-sm"><Printer className="w-4 h-4 mr-2"/> Yazdır</button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-slate-100 p-8 flex justify-center">
            <div id="printable-offer" className="bg-white w-[210mm] min-h-[297mm] p-10 shadow-lg text-slate-900 relative">
              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-100 pb-8"><div><div className="bg-slate-900 text-white font-bold text-2xl p-3 inline-block rounded mb-2">ASCARI</div><p className="text-sm text-slate-500">info@ascari.com.tr</p></div><div className="text-right"><h1 className="text-4xl font-light text-slate-300 mb-2">TEKLİF</h1><p className="font-bold text-lg text-indigo-600">#{quickOfferDetails.code}</p><p className="text-sm text-slate-500">{quickOfferDetails.date}</p></div></div>
              <div className="mb-10"><h3 className="text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Sayın</h3><div className="text-xl font-semibold text-slate-800">{quickOfferDetails.customer}</div>{quickOfferDetails.phone && <div className="text-sm text-slate-500">{quickOfferDetails.phone}</div>}</div>
              <table className="w-full mb-8"><thead><tr className="border-b border-slate-300"><th className="text-left py-3 text-sm font-bold text-slate-600">Ürün</th><th className="text-right py-3 text-sm font-bold text-slate-600">Miktar</th><th className="text-right py-3 text-sm font-bold text-slate-600">Fiyat</th><th className="text-right py-3 text-sm font-bold text-slate-600">Toplam</th></tr></thead><tbody>{quickOfferDetails.items.map((item, idx) => (<tr key={idx} className="border-b border-slate-100"><td className="py-4 text-sm text-slate-700">{item.name}</td><td className="py-4 text-right text-sm text-slate-700">{item.qty}</td><td className="py-4 text-right text-sm text-slate-700">{formatCurrency(item.list_price)}</td><td className="py-4 text-right text-sm font-medium text-slate-900">{formatCurrency(item.list_price * item.qty)}</td></tr>))}</tbody></table>
              <div className="flex justify-end mb-16"><div className="w-64"><div className="flex justify-between py-4"><span className="text-lg font-bold text-slate-800">Genel Toplam</span><span className="text-lg font-bold text-indigo-600">{formatCurrency(quickOfferDetails.grandTotal)}</span></div></div></div>
            </div>
          </div>
        </div>
      ); 
    } 
    return (
      <div className="flex flex-col h-[calc(100vh-140px)] gap-4 animate-fadeIn">
        <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">{data.categories.map(cat => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>{cat}</button>))}</div>
        <div className="flex flex-1 gap-6 overflow-hidden">
          <div className="w-2/3 flex flex-col space-y-4">
            <div className="bg-white p-3 rounded-lg shadow-sm"><div className="relative"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-5 w-5 text-slate-400" /></div><input type="text" className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-slate-300 rounded-md py-2.5" placeholder="Ürün ara..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/></div></div>
            <div className="flex-1 overflow-y-auto bg-white rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">{filteredProducts.map(product => (<div key={product.id} className="border border-slate-200 rounded-lg p-3 hover:border-indigo-300 transition-colors flex flex-col group cursor-pointer" onClick={() => addToQuickCart(product)}><div className="h-24 bg-slate-50 rounded mb-2 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">{product.image_128 ? <img src={`data:image/png;base64,${product.image_128}`} className="max-h-full max-w-full object-contain"/> : <PackageSearch className="text-slate-300 w-8 h-8 group-hover:text-indigo-300" />}</div><div className="flex-1"><h4 className="text-sm font-medium text-slate-900 line-clamp-2" title={product.name}>{product.name}</h4><p className="text-xs text-slate-500 mb-2">{product.default_code}</p></div><div className="flex items-center justify-between mt-2"><span className="font-bold text-slate-900">{formatCurrency(product.list_price)}</span><div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-full"><Plus className="w-4 h-4" /></div></div></div>))}</div>
            </div>
          </div>
          <div className="w-1/3 flex flex-col bg-white rounded-lg shadow-lg border border-slate-200 h-full">
            <div className="p-4 border-b border-slate-100 bg-slate-50 rounded-t-lg"><h3 className="font-bold text-slate-800 flex items-center"><Zap className="w-4 h-4 text-orange-500 mr-2" fill="currentColor" />Hızlı Teklif Taslağı</h3></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">{quickCart.length === 0 ? (<div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm"><Package className="w-12 h-12 mb-2 opacity-20" /><p>Ürün seçilmedi</p></div>) : (quickCart.map(item => (<div key={item.id} className="flex items-start justify-between bg-slate-50 p-3 rounded-md"><div className="flex-1 pr-2"><div className="text-sm font-medium text-slate-900 line-clamp-2">{item.name}</div><div className="text-xs text-slate-500 mt-1">{formatCurrency(item.list_price)} x {item.qty}</div></div><div className="flex flex-col items-end space-y-2"><div className="font-bold text-slate-900 text-sm">{formatCurrency(item.list_price * item.qty)}</div><div className="flex items-center bg-white rounded border border-slate-200"><button onClick={() => updateCartQty(item.id, -1)} className="p-1 hover:bg-slate-100 text-slate-600"><Minus className="w-3 h-3"/></button><span className="px-2 text-xs font-medium">{item.qty}</span><button onClick={() => addToQuickCart(item)} className="p-1 hover:bg-slate-100 text-slate-600"><Plus className="w-3 h-3"/></button></div></div><button onClick={() => removeFromQuickCart(item.id)} className="ml-2 text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button></div>)))}</div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg space-y-3">
              <div className="flex justify-between items-center mb-2"><span className="text-slate-600 font-medium">Toplam Tutar</span><span className="text-xl font-bold text-slate-900">{formatCurrency(cartTotal)}</span></div>
              <div className="grid grid-cols-2 gap-2"><input type="text" placeholder="Müşteri Adı" value={tempCustomerName} onChange={(e) => setTempCustomerName(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm p-2 border"/><input type="tel" placeholder="Telefon" value={tempCustomerPhone} onChange={(e) => setTempCustomerPhone(e.target.value)} className="w-full border-slate-300 rounded-md shadow-sm text-sm p-2 border"/></div>
              <button onClick={createQuickOffer} disabled={quickCart.length === 0} className={`w-full py-3 rounded-lg font-bold text-white shadow-lg transition-all transform active:scale-95 ${quickCart.length === 0 ? 'bg-slate-300 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}>Teklif Oluştur</button>
            </div>
          </div>
        </div>
      </div>
    ); 
  };

  const menuItems = getMenuItems();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="text-center mb-8"><h2 className="text-2xl font-bold">Odoo Giriş</h2></div>
          {loginError && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{loginError}</div>}
          <form onSubmit={handleConnect} className="space-y-4">
            <input className="w-full border p-2 rounded" placeholder="Odoo URL" value={credentials.url} onChange={e=>setCredentials({...credentials, url:e.target.value})} />
            <input className="w-full border p-2 rounded" placeholder="Database" value={credentials.db} onChange={e=>setCredentials({...credentials, db:e.target.value})} />
            <select className="w-full border p-2 rounded" value={userRole} onChange={e=>setUserRole(e.target.value)}><option value="admin">Yönetici</option><option value="sales">Satış Personeli</option></select>
            <input className="w-full border p-2 rounded" placeholder="Kullanıcı Adı" value={credentials.username} onChange={e=>setCredentials({...credentials, username:e.target.value})} />
            <input className="w-full border p-2 rounded" type="password" placeholder="Şifre" value={credentials.password} onChange={e=>setCredentials({...credentials, password:e.target.value})} />
            <button disabled={loading} className="w-full bg-indigo-600 text-white p-2 rounded">{loading ? 'Bağlanıyor...' : 'Giriş Yap'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50">
       <div className="w-64 bg-slate-900 text-white p-4 flex flex-col">
          <div className="text-2xl font-bold mb-8">ASCARI</div>
          <nav className="flex-1 space-y-2">{menuItems.map(item => <button key={item.id} onClick={() => setActiveTab(item.id)} className={`flex items-center w-full p-2 rounded ${activeTab === item.id ? 'bg-indigo-600' : 'hover:bg-slate-800'}`}><item.icon className="w-5 h-5 mr-2"/> {item.name}</button>)}</nav>
          <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white"><LogOut className="w-4 h-4 mr-2"/> Çıkış</button>
       </div>
       <div className="flex-1 overflow-auto p-8">
          {loadingData && <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-50">Veriler Yükleniyor...</div>}
          {activeTab === 'dashboard' && <div className="grid grid-cols-4 gap-4"><div className="bg-white p-4 shadow rounded"><h3>Ciro</h3><p className="text-2xl font-bold">{formatCurrency(data.salesStats.totalRevenue)}</p></div><div className="bg-white p-4 shadow rounded"><h3>Siparişler</h3><p className="text-2xl font-bold">{data.salesStats.confirmedOrders}</p></div></div>}
          {activeTab === 'sales' && renderSales()}
          {activeTab === 'customers' && renderCustomers()}
          {activeTab === 'products' && renderProducts()}
          {activeTab === 'accounting' && renderAccounting()}
          {activeTab === 'quick_offer' && renderQuickOfferFull()}
          {activeTab === 'helpdesk' && renderHelpdesk()}
       </div>
    </div>
  );
}
