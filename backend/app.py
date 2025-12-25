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

def get_conn(data):
    url = data.get('url','').strip().rstrip('/')
    for s in ['/web','/odoo','#']: 
        if url.endswith(s): url = url.split(s)[0]
    if not url.startswith('http'): url = 'https://' + url
    
    common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
    uid = common.authenticate(data.get('db'), data.get('username'), data.get('password'), {})
    return url, uid, common

# Kategori Ağacı
def build_category_tree(categories):
    tree = []
    lookup = {}
    for cat in categories:
        cat['children'] = []
        lookup[cat['id']] = cat
    for cat in categories:
        if cat['parent_id']:
            parent_id = cat['parent_id'][0]
            if parent_id in lookup: lookup[parent_id]['children'].append(cat)
            else: tree.append(cat)
        else: tree.append(cat)
    return tree

@app.route('/api/connect', methods=['POST'])
def connect():
    try:
        _, uid, _ = get_conn(request.json)
        return jsonify({"status": "success", "uid": uid}) if uid else jsonify({"status": "error", "message": "Giriş başarısız"})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

@app.route('/api/dashboard-data', methods=['POST'])
def data():
    d = request.json
    try:
        url, uid, _ = get_conn(d)
        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        db, pwd = d.get('db'), d.get('password')

        # Kategoriler (Ağaç)
        cats = models.execute_kw(db, uid, pwd, 'product.category', 'search_read', [], {'fields': ['id', 'name', 'parent_id']})
        categories = build_category_tree(cats)

        # Ürünler (Limitli, arama ile hepsi gelir)
        prods = models.execute_kw(db, uid, pwd, 'product.product', 'search_read', [[['sale_ok','=',True]]], {'fields': ['id', 'display_name', 'default_code', 'list_price', 'qty_available', 'categ_id', 'image_128'], 'limit': 100})
        products = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'] or '', 'list_price': p['list_price'], 'qty_available': p['qty_available'], 'image_128': p['image_128'], 'categ_path': str(p['categ_id'])} for p in prods]

        # Siparişler
        orders = models.execute_kw(db, uid, pwd, 'sale.order', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], 'limit': 50, 'order': 'date_order desc'})
        clean_orders = [{'id_raw': o['id'], 'name': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in orders]

        # Kontaklar
        partners = models.execute_kw(db, uid, pwd, 'res.partner', 'search_read', [], {'fields': ['id', 'name', 'phone', 'email', 'total_due', 'is_company'], 'limit': 50})
        customers = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'] or '', 'email': p['email'] or '', 'balance': p['total_due'], 'type': 'company' if p['is_company'] else 'individual'} for p in partners]

        # Teknik Servis (Güvenli)
        tickets = []
        try:
            raw_tickets = models.execute_kw(db, uid, pwd, 'helpdesk.ticket', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'stage_id', 'priority', 'description'], 'limit': 20, 'order': 'create_date desc'})
            tickets = [{'id': str(t['id']), 'product': t['name'], 'customer': t['partner_id'][1] if t['partner_id'] else 'Bilinmiyor', 'issue': t['description'] or '-', 'status': t['stage_id'][1] if t['stage_id'] else 'Yeni', 'priority': t['priority']} for t in raw_tickets]
        except: pass
        
        # Faturalar
        invoices = []
        try:
             raw_invoices = models.execute_kw(db, uid, pwd, 'account.move', 'search_read', [[['move_type', 'in', ['out_invoice', 'in_invoice']]]], {'fields': ['name', 'partner_id', 'invoice_date', 'amount_total', 'state', 'payment_state', 'move_type'], 'limit': 20})
             invoices = [{'id': i['name'], 'partner': i['partner_id'][1], 'date': i['invoice_date'], 'amount': i['amount_total'], 'status': i['state'], 'payment_state': i['payment_state'], 'type': i['move_type']} for i in raw_invoices]
        except: pass

        return jsonify({'categories': categories, 'products': products, 'customers': customers, 'orders': clean_orders, 'tickets': tickets, 'invoices': invoices})
    except Exception as e: return jsonify({"error": str(e)})

@app.route('/api/search', methods=['POST'])
def search():
    data = request.json
    model = data.get('model')
    query = data.get('query')
    try:
        url, uid, _ = get_connection(data)
        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        
        domain = []
        fields = []
        
        if model == 'product.product':
            domain = ['|', ('name', 'ilike', query), ('default_code', 'ilike', query)]
            fields = ['id', 'display_name', 'default_code', 'list_price', 'qty_available', 'categ_id', 'image_128']
        elif model == 'res.partner':
            domain = ['|', ('name', 'ilike', query), ('phone', 'ilike', query)]
            fields = ['id', 'name', 'phone', 'email', 'total_due', 'is_company']
        elif model == 'sale.order':
            domain = [('name', 'ilike', query)]
            fields = ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state']

        results_raw = models.execute_kw(data.get('db'), uid, data.get('password'), model, 'search_read', [domain], {'fields': fields, 'limit': 50})
        
        results = []
        if model == 'product.product':
             results = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'], 'list_price': p['list_price'], 'qty_available': p['qty_available'], 'image_128': p['image_128'], 'categ_path': str(p['categ_id'])} for p in results_raw]
        elif model == 'res.partner':
             results = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'], 'email': p['email'], 'balance': p['total_due'], 'type': 'company' if p['is_company'] else 'individual'} for p in results_raw]
        elif model == 'sale.order':
             results = [{'id_raw': o['id'], 'name': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in results_raw]

        return jsonify({"status": "success", "data": results})
    except Exception as e: return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/order-details', methods=['POST'])
def order_details():
    d = request.json
    try:
        url, uid, _ = get_conn(d)
        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        order = models.execute_kw(d.get('db'), uid, d.get('password'), 'sale.order', 'read', [[d.get('order_id')]], {'fields': ['order_line']})
        if not order: return jsonify({'lines': []})
        line_ids = order[0]['order_line']
        lines = models.execute_kw(d.get('db'), uid, d.get('password'), 'sale.order.line', 'read', [line_ids], {'fields': ['name', 'product_uom_qty', 'price_unit', 'price_subtotal']})
        clean_lines = [{'name': l['name'], 'qty': l['product_uom_qty'], 'price': l['price_unit'], 'total': l['price_subtotal']} for l in lines]
        return jsonify({'lines': clean_lines})
    except Exception as e: return jsonify({"error": str(e)})

if __name__ == '__main__': app.run(host='0.0.0.0', port=5000)
