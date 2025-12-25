import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import xmlrpc.client

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
CORS(app)

@app.route('/')
def index(): return send_from_directory(app.static_folder, 'index.html')
@app.route('/<path:path>')
def static_proxy(path):
    if os.path.exists(os.path.join(app.static_folder, path)): return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

def get_connection(data):
    url = data.get('url', '').strip().rstrip('/')
    if url and not url.startswith(('http://', 'https://')): url = 'https://' + url
    for suffix in ['/web', '/odoo', '#']: 
        if url.endswith(suffix): url = url.split(suffix)[0]
    
    common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
    uid = common.authenticate(data.get('db'), data.get('username'), data.get('password'), {})
    return url, uid, common

# Kategori Ağacı Oluşturucu
def build_category_tree(categories):
    tree = []
    lookup = {}
    for cat in categories:
        cat['children'] = []
        lookup[cat['id']] = cat
    for cat in categories:
        if cat['parent_id']:
            parent_id = cat['parent_id'][0]
            if parent_id in lookup:
                lookup[parent_id]['children'].append(cat)
            else:
                tree.append(cat) # Parent'ı listede yoksa root kabul et
        else:
            tree.append(cat)
    return tree

@app.route('/api/connect', methods=['POST'])
def connect():
    try:
        url, uid, _ = get_connection(request.json)
        if uid: return jsonify({"status": "success", "uid": uid})
        return jsonify({"status": "error", "message": "Giriş başarısız"}), 401
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/dashboard-data', methods=['POST'])
def dashboard_data():
    data = request.json
    try:
        url, uid, _ = get_connection(data)
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))
        db, pwd = data.get('db'), data.get('password')

        # 1. Kategoriler (Tümünü Çek ve Ağaç Yap)
        cats_raw = models.execute_kw(db, uid, pwd, 'product.category', 'search_read', [], {'fields': ['id', 'name', 'parent_id']})
        categories = build_category_tree(cats_raw)

        # 2. Ürünler (Limitli - Arama ile devam edilecek)
        prods_raw = models.execute_kw(db, uid, pwd, 'product.product', 'search_read', [[['sale_ok','=',True]]], {'fields': ['id', 'display_name', 'default_code', 'list_price', 'qty_available', 'categ_id', 'image_128'], 'limit': 100})
        products = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'] or '', 'list_price': p['list_price'], 'qty_available': p['qty_available'], 'categ_id': p['categ_id'][0] if p['categ_id'] else None, 'category': p['categ_id'][1] if p['categ_id'] else '', 'image_128': p['image_128']} for p in prods_raw]

        # 3. Kontaklar (Müşteri & Tedarikçi)
        partners_raw = models.execute_kw(db, uid, pwd, 'res.partner', 'search_read', [], {'fields': ['id', 'name', 'phone', 'email', 'total_due'], 'limit': 50})
        customers = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'] or '', 'email': p['email'] or '', 'balance': p['total_due']} for p in partners_raw]
        
        # 4. Satışlar (Son 50)
        orders_raw = models.execute_kw(db, uid, pwd, 'sale.order', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], 'limit': 50, 'order': 'date_order desc'})
        orders = [{'id': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in orders_raw]

        # 5. Teknik Servis (Güvenli Çekim)
        tickets = []
        try:
            tickets_raw = models.execute_kw(db, uid, pwd, 'helpdesk.ticket', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'stage_id', 'priority', 'description'], 'limit': 20, 'order': 'create_date desc'})
            tickets = [{
                'id': str(t['id']), 
                'product': t['name'], 
                'customer': t['partner_id'][1] if t['partner_id'] else 'Bilinmiyor',
                'issue': t['description'] or '-',
                'status': t['stage_id'][1] if t['stage_id'] else 'Yeni', # Odoo stage name
                'priority': t['priority']
            } for t in tickets_raw]
        except: pass
        
        # 6. Faturalar (Güvenli Çekim)
        invoices = []
        try:
             invoices_raw = models.execute_kw(db, uid, pwd, 'account.move', 'search_read', [[['move_type', 'in', ['out_invoice', 'in_invoice']]]], {'fields': ['name', 'partner_id', 'invoice_date', 'amount_total', 'state', 'payment_state', 'move_type'], 'limit': 20})
             invoices = [{'id': i['name'], 'partner': i['partner_id'][1], 'date': i['invoice_date'], 'amount': i['amount_total'], 'status': i['state'], 'payment_state': i['payment_state'], 'type': i['move_type']} for i in invoices_raw]
        except: pass


        return jsonify({
            'categories': categories,
            'products': products,
            'customers': customers,
            'orders': orders,
            'tickets': tickets,
            'invoices': invoices
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    model = data.get('model')
    query = data.get('query')
    try:
        url, uid, _ = get_connection(data)
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))
        
        domain = []
        fields = []
        
        if model == 'product.product':
            domain = ['|', ('name', 'ilike', query), ('default_code', 'ilike', query)]
            fields = ['id', 'display_name', 'default_code', 'list_price', 'qty_available', 'categ_id', 'image_128']
        elif model == 'res.partner':
            domain = ['|', ('name', 'ilike', query), ('phone', 'ilike', query)]
            fields = ['id', 'name', 'phone', 'email', 'total_due']
        elif model == 'sale.order':
            domain = [('name', 'ilike', query)]
            fields = ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state']

        results_raw = models.execute_kw(data.get('db'), uid, data.get('password'), model, 'search_read', [domain], {'fields': fields, 'limit': 50})
        
        # Formatlama
        results = []
        if model == 'product.product':
             results = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'], 'list_price': p['list_price'], 'qty_available': p['qty_available'], 'image_128': p['image_128']} for p in results_raw]
        elif model == 'res.partner':
             results = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'], 'email': p['email'], 'balance': p['total_due']} for p in results_raw]
        elif model == 'sale.order':
             results = [{'id': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in results_raw]

        return jsonify({"status": "success", "data": results})
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
