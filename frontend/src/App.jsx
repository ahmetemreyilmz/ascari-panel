import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, ShoppingCart, Users, DollarSign, Settings, 
  LogOut, RefreshCw, ChevronRight, TrendingUp, Package, FileText, Code,
  ArrowLeft, Printer, Download, CheckCircle, Clock, AlertCircle,
  Search, PackageSearch, Tag, Layers, Zap, Plus, Minus, Trash2, QrCode,
  UserPlus, Gift, Shield, User, Wrench, ClipboardList, PenTool, Filter, X,
  ArrowUpRight, ArrowDownLeft, CreditCard, History, Phone, Mail, MapPin,
  Calendar, Edit3, Save, Briefcase, AlertTriangle, ChevronDown, Info
} from 'lucide-react';
import QRCode from 'react-qr-code';

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

// --- YARDIMCI BİLEŞENLER ---

const StatusBadge = ({ status }) => {
  const map = {
    draft: { color: 'bg-blue-100 text-blue-800', label: 'Teklif' },
    sale: { color: 'bg-green-100 text-green-800', label: 'Sipariş' },
    done: { color: 'bg-gray-100 text-gray-800', label: 'Kilitli' },
    cancel: { color: 'bg-red-100 text-red-800', label: 'İptal' },
    new: { color: 'bg-blue-100 text-blue-800', label: 'Yeni' },
    progress: { color: 'bg-orange-100 text-orange-800', label: 'İşlemde' },
    solved: { color: 'bg-green-100 text-green-800', label: 'Çözüldü' },
  };
  const conf = map[status] || { color: 'bg-gray-100', label: status };
  return <span className={`px-2 py-1 rounded text-xs font-medium border ${conf.color}`}>{conf.label}</span>;
};

// Kategori Ağacı (Hiyerarşik)
const CategoryTree = ({ categories, onSelect, selectedId }) => {
  const [expanded, setExpanded] = useState({});
  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const renderNode = (nodes) => nodes.map(node => (
    <div key={node.id} className="ml-2 select-none">
      <div className={`flex items-center py-2 cursor-pointer rounded-md px-2 ${selectedId === node.id ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}`}>
        {node.children && node.children.length > 0 && (
          <button onClick={(e) => { e.stopPropagation(); toggle(node.id); }} className="mr-1 text-slate-400">
            {expanded[node.id] ? <ChevronDown className="w-4 h-4"/> : <ChevronRight className="w-4 h-4"/>}
          </button>
        )}
        <span onClick={() => onSelect(node.id)} className="text-sm truncate w-full">{node.name}</span>
      </div>
      {expanded[node.id] && node.children && <div className="border-l border-slate-200 ml-2 pl-1">{renderNode(node.children)}</div>}
    </div>
  ));
  return <div className="overflow-y-auto max-h-[calc(100vh-220px)] pr-2">{renderNode(categories)}</div>;
};

// Ürün Kartı (Yatay & Şık)
const ProductCard = ({ product, onAdd, onInfo }) => (
  <div className="bg-white border border-slate-200 rounded-lg p-3 flex gap-4 hover:shadow-md transition-shadow relative group">
    <div className="w-24 h-24 flex-shrink-0 bg-slate-50 rounded-md flex items-center justify-center overflow-hidden">
       {product.image_128 ? <img src={`data:image/png;base64,${product.image_128}`} className="object-contain w-full h-full"/> : <Package className="text-slate-300 w-10 h-10"/>}
    </div>
    <div className="flex-1 flex flex-col justify-between">
       <div>
          <h4 className="text-slate-800 font-medium text-sm leading-snug line-clamp-2">{product.name}</h4>
          <p className="text-xs text-slate-400 mt-1">{product.default_code}</p>
       </div>
       <div className="flex justify-between items-end mt-2">
          <span className="text-indigo-600 font-medium">{formatCurrency(product.list_price)}</span>
          <button onClick={() => onAdd(product)} className="bg-indigo-50 text-indigo-600 p-2 rounded-full hover:bg-indigo-600 hover:text-white transition-colors"><Plus className="w-4 h-4"/></button>
       </div>
    </div>
    <button onClick={(e) => { e.stopPropagation(); onInfo(product); }} className="absolute top-2 right-2 text-slate-300 hover:text-indigo-500"><Info className="w-5 h-5"/></button>
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
  const [invoiceSearch, setInvoiceSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  
  // Seçimler & Detaylar (Modal)
  const [selectedProduct, setSelectedProduct] = useState(null); // Ürün Pop-up
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedOrderLines, setSelectedOrderLines] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // Hızlı Teklif
  const [quickCart, setQuickCart] = useState([]);
  const [quickOfferDetails, setQuickOfferDetails] = useState(null);
  const [tempCustomerName, setTempCustomerName] = useState('');
  const [tempCustomerPhone, setTempCustomerPhone] = useState('');

  // Teknik Servis Form
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);
  const [newTicketData, setNewTicketData] = useState({ customer: '', product: '', issue: '', priority: 'medium' });

  // --- API ---
  const apiCall = async (endpoint, payload) => {
    try {
      const res = await fetch(`/api/${endpoint}`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...credentials, ...payload})
      });
      const json = await res.json();
      if(json.status === 'error') throw new Error(json.message);
      return json;
    } catch (e) {
      console.error(e);
      return null;
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem('ascari_creds');
    if (saved) { try { setCredentials(JSON.parse(saved)); setRememberMe(true); } catch(e){} }
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault(); setLoading(true); setLoginError('');
    const res = await apiCall('connect', {});
    if (res && res.status === 'success') {
      if(rememberMe) localStorage.setItem('ascari_creds', JSON.stringify(credentials));
      setIsConnected(true);
      refreshData(res.uid);
      if(userRole === 'sales') setActiveTab('quick_offer');
    } else setLoginError('Giriş başarısız.');
    setLoading(false);
  };

  const refreshData = async (uid) => {
    setLoadingData(true);
    const res = await apiCall('dashboard-data', { uid });
    if(res) setData(prev => ({...prev, ...res}));
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

  const fetchOrderDetails = async (orderId) => {
     setLoadingData(true);
     const res = await apiCall('order-details', { order_id: orderId });
     if(res) setSelectedOrderLines(res.lines);
     setLoadingData(false);
  };

  const updateTicketStatus = async (ticketId, newStatus) => {
      // Backend entegrasyonu gerekir, şimdilik UI update
      setData(prev => ({
          ...prev, 
          tickets: prev.tickets.map(t => t.id === ticketId ? {...t, status: newStatus} : t)
      }));
      setSelectedTicket(prev => ({...prev, status: newStatus}));
  };

  // --- SEPET ---
  const addToCart = (product) => {
    setQuickCart(prev => {
      const exist = prev.find(i => i.id === product.id);
      if(exist) return prev.map(i => i.id === product.id ? {...i, qty: i.qty+1} : i);
      return [...prev, {...product, qty: 1}];
    });
  };

  const createQuickOffer = () => {
    const total = quickCart.reduce((sum, i) => sum + (i.list_price * i.qty), 0);
    setQuickOfferDetails({
        code: 'ASC-' + Math.floor(1000 + Math.random() * 9000),
        customer: tempCustomerName || 'Sayın Ziyaretçi',
        phone: tempCustomerPhone || '',
        date: new Date().toLocaleDateString('tr-TR'),
        items: [...quickCart],
        total, tax: total*0.2, grandTotal: total*1.2
    });
  };

  const handleLogout = () => { setIsConnected(false); setActiveTab('dashboard'); setData(INITIAL_DATA); };

  // --- EKRANLAR ---

  // 1. HIZLI TEKLİF & ÜRÜNLER (ORTAK BİLEŞEN)
  const renderProductGrid = (isOfferMode) => {
    const filtered = data.products.filter(p => {
        const catMatch = !selectedCategoryId || (p.categ_path && p.categ_path.includes(String(selectedCategoryId)));
        return catMatch;
    });

    return (
      <div className="flex h-full gap-4 animate-fadeIn no-print">
         {/* Sol Kategori */}
         <div className="w-1/4 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col">
            <div className="p-4 border-b font-bold text-slate-700 flex items-center bg-slate-50 rounded-t-xl"><Layers className="w-4 h-4 mr-2"/> Kategoriler</div>
            <div className="p-2 flex-1 overflow-y-auto">
                <CategoryTree categories={data.categories} selectedId={selectedCategoryId} onSelect={setSelectedCategoryId} />
            </div>
         </div>

         {/* Orta Ürünler */}
         <div className={`${isOfferMode ? 'w-1/2' : 'w-3/4'} flex flex-col gap-4`}>
             <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex gap-2">
                 <div className="relative flex-1">
                     <Search className="absolute left-3 top-3 text-slate-400 w-5 h-5"/>
                     <input className="w-full pl-10 border p-2.5 rounded-lg" placeholder="Ürün Ara (Tüm Veritabanı)..." 
                            value={productSearch} onChange={e=>setProductSearch(e.target.value)} 
                            onKeyDown={e=>e.key==='Enter' && performSearch('product.product', productSearch)}/>
                 </div>
                 <button onClick={()=>performSearch('product.product', productSearch)} className="bg-indigo-600 text-white px-6 rounded-lg font-medium">Ara</button>
             </div>
             <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 p-4 overflow-y-auto">
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                     {filtered.map(p => (
                         <ProductCard key={p.id} product={p} onAdd={addToCart} onInfo={setSelectedProduct} />
                     ))}
                 </div>
                 {filtered.length === 0 && <div className="text-center py-20 text-slate-400">Ürün bulunamadı.</div>}
             </div>
         </div>

         {/* Sağ Sepet (Sadece Teklif Modunda) */}
         {isOfferMode && (
             <div className="w-1/4 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col">
                 <div className="p-4 bg-slate-900 text-white font-bold rounded-t-xl flex items-center justify-between">
                     <span>Teklif Sepeti</span>
                     <span className="bg-indigo-500 px-2 py-0.5 rounded text-xs">{quickCart.length}</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-4 space-y-3">
                     {quickCart.map(i => (
                         <div key={i.id} className="flex justify-between items-center border-b pb-2">
                             <div className="flex-1 pr-2">
                                 <div className="text-sm font-medium truncate">{i.name}</div>
                                 <div className="text-xs text-slate-500">{formatCurrency(i.list_price)}</div>
                             </div>
                             <div className="flex items-center gap-1 bg-slate-100 rounded">
                                 <button onClick={()=>setQuickCart(prev=>prev.map(x=>x.id===i.id?{...x,qty:Math.max(1,x.qty-1)}:x))} className="px-2 py-1 hover:bg-slate-200">-</button>
                                 <span className="text-sm font-bold w-4 text-center">{i.qty}</span>
                                 <button onClick={()=>addToCart(i)} className="px-2 py-1 hover:bg-slate-200">+</button>
                             </div>
                         </div>
                     ))}
                 </div>
                 <div className="p-4 border-t bg-slate-50 rounded-b-xl space-y-3">
                     <div className="flex justify-between font-bold text-lg"><span>Toplam</span><span>{formatCurrency(quickCart.reduce((a,b)=>a+(b.list_price*b.qty),0))}</span></div>
                     <input className="w-full border p-2 rounded text-sm" placeholder="Müşteri Adı (Opsiyonel)" value={tempCustomerName} onChange={e=>setTempCustomerName(e.target.value)}/>
                     <input className="w-full border p-2 rounded text-sm" placeholder="Telefon (Opsiyonel)" value={tempCustomerPhone} onChange={e=>setTempCustomerPhone(e.target.value)}/>
                     <button onClick={createQuickOffer} disabled={quickCart.length===0} className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold hover:bg-indigo-700 disabled:opacity-50">Teklif Oluştur</button>
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
            <button onClick={()=>setSelectedTicket(null)} className="text-slate-500 flex items-center mb-4"><ArrowLeft className="mr-2 w-4 h-4"/> Listeye Dön</button>
            <div className="bg-white shadow rounded-lg p-6 border border-slate-200">
               <div className="flex justify-between items-start mb-6 border-b pb-4">
                  <div>
                      <h2 className="text-2xl font-bold text-slate-800">{selectedTicket.issue}</h2>
                      <p className="text-sm text-slate-500">Kayıt No: #{selectedTicket.id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Durum:</span>
                      <select className="border p-2 rounded bg-slate-50" value={selectedTicket.status} onChange={e=>updateTicketStatus(selectedTicket.id, e.target.value)}>
                          <option value="new">Yeni</option>
                          <option value="progress">İşlemde</option>
                          <option value="solved">Çözüldü</option>
                      </select>
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                   <div className="p-4 bg-slate-50 rounded border"><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Müşteri</h4><p className="font-medium">{selectedTicket.customer}</p></div>
                   <div className="p-4 bg-slate-50 rounded border"><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Ürün</h4><p className="font-medium">{selectedTicket.product}</p></div>
                   <div className="col-span-2"><h4 className="font-bold text-xs uppercase text-slate-400 mb-2">Açıklama / Notlar</h4><p className="text-slate-700">{selectedTicket.issue} - Detaylar burada yer alacak.</p></div>
               </div>
            </div>
         </div>
       );
    }
    return (
      <div className="space-y-6 animate-fadeIn">
         <div className="flex justify-between items-center"><h2 className="text-xl font-bold text-slate-800">Arıza Kayıtları</h2><button onClick={()=>setShowNewTicketForm(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Yeni Kayıt</button></div>
         {showNewTicketForm && <div className="bg-white p-6 rounded-lg shadow-lg border border-indigo-100 mb-6"><div className="flex justify-between mb-4 font-bold"><h3>Hızlı Kayıt Formu</h3><button onClick={()=>setShowNewTicketForm(false)}><X/></button></div><div className="grid grid-cols-2 gap-4"><input className="border p-2 rounded" placeholder="Müşteri"/><input className="border p-2 rounded" placeholder="Ürün"/><textarea className="border p-2 rounded col-span-2" placeholder="Sorun..."/><button className="bg-indigo-600 text-white p-2 rounded col-span-2">Kaydet</button></div></div>}
         <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
             <table className="w-full text-left">
                 <thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-4">Müşteri</th><th className="p-4">Tarih</th><th className="p-4">Durum</th></tr></thead>
                 <tbody className="divide-y">{data.tickets.length>0 ? data.tickets.map(t=>(<tr key={t.id} onClick={()=>setSelectedTicket(t)} className="hover:bg-slate-50 cursor-pointer"><td className="p-4 font-medium">{t.customer}</td><td className="p-4 text-slate-500">Bugün</td><td className="p-4"><StatusBadge status={t.status}/></td></tr>)) : <tr><td colSpan="3" className="p-8 text-center text-slate-400">Kayıt yok.</td></tr>}</tbody>
             </table>
         </div>
      </div>
    );
  };

  // 3. SATIŞLAR (SEKMELİ)
  const renderSales = () => {
    if(selectedOrder) {
        return (
            <div className="space-y-6 animate-fadeIn">
                <button onClick={()=>setSelectedOrder(null)} className="flex items-center text-slate-500 mb-4"><ArrowLeft className="mr-2 w-4 h-4"/> Listeye Dön</button>
                <div className="bg-white shadow rounded-lg p-6 border border-slate-200">
                    <div className="flex justify-between items-center border-b pb-4 mb-4">
                        <div><h2 className="text-2xl font-bold">{selectedOrder.name}</h2><p className="text-slate-500">{selectedOrder.customer}</p></div>
                        <StatusBadge status={selectedOrder.status}/>
                    </div>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50"><tr><th className="p-3 text-left">Ürün</th><th className="p-3 text-right">Miktar</th><th className="p-3 text-right">Tutar</th></tr></thead>
                        <tbody className="divide-y">
                           {selectedOrderLines.length > 0 ? selectedOrderLines.map((l,i)=><tr key={i}><td className="p-3">{l.name}</td><td className="p-3 text-right">{l.qty}</td><td className="p-3 text-right font-bold">{formatCurrency(l.total)}</td></tr>) : <tr><td colSpan="3" className="p-4 text-center text-slate-400">Kalemler yükleniyor...</td></tr>}
                        </tbody>
                    </table>
                    <div className="text-right mt-4 text-xl font-bold border-t pt-4">Toplam: {formatCurrency(selectedOrder.amount)}</div>
                </div>
            </div>
        )
    }

    const filtered = data.orders.filter(o => salesFilter === 'all' ? true : salesFilter === 'sale' ? ['sale','done'].includes(o.status) : o.status === 'draft');
    return (
        <div className="space-y-6 animate-fadeIn">
            <div className="flex gap-4">
                <button onClick={()=>setSalesFilter('all')} className={`flex-1 py-3 rounded-lg font-bold text-sm shadow-sm transition ${salesFilter==='all'?'bg-indigo-600 text-white':'bg-white text-slate-600'}`}>Tümü</button>
                <button onClick={()=>setSalesFilter('sale')} className={`flex-1 py-3 rounded-lg font-bold text-sm shadow-sm transition ${salesFilter==='sale'?'bg-green-600 text-white':'bg-white text-slate-600'}`}>Siparişler</button>
                <button onClick={()=>setSalesFilter('draft')} className={`flex-1 py-3 rounded-lg font-bold text-sm shadow-sm transition ${salesFilter==='draft'?'bg-blue-600 text-white':'bg-white text-slate-600'}`}>Teklifler</button>
            </div>
            <div className="bg-white p-3 rounded-lg shadow-sm flex gap-2"><input className="w-full border p-2 rounded" placeholder="Sipariş Ara..." onKeyDown={e=>e.key==='Enter' && performSearch('sale.order', e.target.value)}/><button className="bg-slate-800 text-white px-4 rounded">Ara</button></div>
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="w-full text-left">
                   <thead className="bg-slate-50 text-slate-500 border-b"><tr><th className="p-4">Ref</th><th className="p-4">Müşteri</th><th className="p-4 text-right">Tutar</th><th className="p-4 text-center">Durum</th></tr></thead>
                   <tbody className="divide-y">
                      {filtered.map(o => (
                          <tr key={o.id} onClick={()=>{setSelectedOrder(o); fetchOrderDetails(o.id_raw);}} className="hover:bg-slate-50 cursor-pointer">
                              <td className="p-4 font-medium text-indigo-600">{o.name}</td><td className="p-4">{o.customer}</td><td className="p-4 text-right font-bold">{formatCurrency(o.amount)}</td><td className="p-4 text-center"><StatusBadge status={o.status}/></td>
                          </tr>
                      ))}
                   </tbody>
                </table>
            </div>
        </div>
    );
  };

  // --- POPUP ÜRÜN DETAYI ---
  const renderProductModal = () => {
      if(!selectedProduct) return null;
      return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={()=>setSelectedProduct(null)}>
              <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full p-6 relative" onClick={e=>e.stopPropagation()}>
                  <button onClick={()=>setSelectedProduct(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-800"><X/></button>
                  <div className="flex gap-6">
                      <div className="w-1/3 bg-slate-50 rounded flex items-center justify-center p-2">
                          {selectedProduct.image_128 ? <img src={`data:image/png;base64,${selectedProduct.image_128}`} className="max-w-full max-h-60"/> : <PackageSearch className="w-20 h-20 text-slate-300"/>}
                      </div>
                      <div className="w-2/3 space-y-4">
                          <h2 className="text-2xl font-bold text-slate-900">{selectedProduct.name}</h2>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                              <div><label className="text-slate-400 text-xs uppercase">Kod</label><p className="font-mono">{selectedProduct.default_code}</p></div>
                              <div><label className="text-slate-400 text-xs uppercase">Fiyat</label><p className="text-xl font-bold text-indigo-600">{formatCurrency(selectedProduct.list_price)}</p></div>
                              <div><label className="text-slate-400 text-xs uppercase">Stok</label><p>{selectedProduct.qty_available} Adet</p></div>
                              <div><label className="text-slate-400 text-xs uppercase">Kategori</label><p>{selectedProduct.category || '-'}</p></div>
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-100">
           <div className="text-center mb-8"><div className="inline-block p-3 bg-slate-900 rounded-xl mb-3"><img src="Ascari Beyaz Logo.png" className="h-8 invert brightness-0 filter" onError={(e)=>e.target.style.display='none'}/></div><h2 className="text-2xl font-bold text-slate-800">Yönetim Paneli</h2></div>
           {loginError && <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm border-l-4 border-red-500">{loginError}</div>}
           <form onSubmit={handleConnect} className="space-y-4">
              <input className="w-full p-4 border rounded-xl bg-slate-50 focus:bg-white transition-colors" placeholder="Odoo Adresi (örn: ascari.com.tr)" value={credentials.url} onChange={e=>setCredentials({...credentials, url:e.target.value})}/>
              <div className="grid grid-cols-2 gap-2"><input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="Veritabanı" value={credentials.db} onChange={e=>setCredentials({...credentials, db:e.target.value})}/><select className="w-full p-4 border rounded-xl bg-slate-50" value={userRole} onChange={e=>setUserRole(e.target.value)}><option value="admin">Yönetici</option><option value="sales">Satış</option></select></div>
              <input className="w-full p-4 border rounded-xl bg-slate-50" placeholder="E-Posta" value={credentials.username} onChange={e=>setCredentials({...credentials, username:e.target.value})}/>
              <input className="w-full p-4 border rounded-xl bg-slate-50" type="password" placeholder="Şifre" value={credentials.password} onChange={e=>setCredentials({...credentials, password:e.target.value})}/>
              <div className="flex items-center gap-2 mt-2"><input type="checkbox" checked={rememberMe} onChange={e=>setRememberMe(e.target.checked)} className="w-5 h-5 rounded text-indigo-600"/> <span className="text-slate-600">Beni Hatırla</span></div>
              <button disabled={loading} className="w-full bg-slate-900 text-white p-4 rounded-xl font-bold text-lg shadow-lg hover:bg-slate-800 transition-transform active:scale-95 disabled:opacity-50">{loading ? 'Bağlanıyor...' : 'Giriş Yap'}</button>
           </form>
        </div>
      </div>
    );
  }

  // YAZDIRMA EKRANI (ÖZEL)
  if (quickOfferDetails && activeTab === 'quick_offer') {
      return renderQuickOffer();
  }

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
       {renderProductModal()}
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
          <button onClick={handleLogout} className="flex items-center text-slate-400 hover:text-white m-4 p-2 hover:bg-slate-800 rounded"><LogOut className="w-5 h-5 mr-2"/> <span className="hidden lg:inline">Çıkış</span></button>
       </div>
       <div className="flex-1 overflow-hidden flex flex-col">
          <div className="bg-white border-b p-4 shadow-sm flex justify-between items-center no-print">
             <h1 className="text-xl font-bold text-slate-800 capitalize">{activeTab.replace('_', ' ')}</h1>
             {loadingData && <span className="text-xs text-indigo-600 animate-pulse font-bold bg-indigo-50 px-2 py-1 rounded">Veri Yükleniyor...</span>}
          </div>
          <div className="flex-1 overflow-auto p-4 lg:p-6 relative">
             {activeTab === 'dashboard' && <div className="text-center py-20 text-slate-400">Dashboard Raporları</div>}
             {activeTab === 'quick_offer' && renderProductGrid(true)}
             {activeTab === 'products' && renderProductGrid(false)}
             {activeTab === 'sales' && renderSales()}
             {activeTab === 'helpdesk' && renderHelpdesk()}
             {/* Diğer modüller için placeholder, kod şişmesin diye */}
             {['customers','accounting','code'].includes(activeTab) && <div className="text-center py-10 text-slate-500">Bu modül güncelleniyor...</div>}
          </div>
       </div>
    </div>
  );
}
