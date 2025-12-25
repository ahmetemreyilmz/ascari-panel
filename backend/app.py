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
    url = data.get('url','').rstrip('/')
    for s in ['/web','/odoo','#']: 
        if url.endswith(s): url = url.split(s)[0]
    if not url.startswith('http'): url = 'https://' + url
    common = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/common')
    uid = common.authenticate(data.get('db'), data.get('username'), data.get('password'), {})
    return url, uid, common

def build_tree(cats):
    tree, lookup = [], {}
    for c in cats: c['children'] = []; lookup[c['id']] = c
    for c in cats:
        if c['parent_id'] and c['parent_id'][0] in lookup: lookup[c['parent_id'][0]]['children'].append(c)
        else: tree.append(c)
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

        # 1. Kategoriler (Tümünü Çek)
        cats = models.execute_kw(db, uid, pwd, 'product.category', 'search_read', [], {'fields': ['id', 'name', 'parent_id']})
        categories = build_tree(cats)

        # 2. Ürünler (Limit 1000)
        prods = models.execute_kw(db, uid, pwd, 'product.product', 'search_read', [[['sale_ok','=',True]]], {'fields': ['id', 'display_name', 'default_code', 'list_price', 'categ_id', 'image_128'], 'limit': 1000})
        products = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'] or '', 'list_price': p['list_price'], 'image_128': p['image_128'], 'categ_path': str(p['categ_id'])} for p in prods]

        # 3. Siparişler (Limit 100)
        orders = models.execute_kw(db, uid, pwd, 'sale.order', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], 'limit': 100, 'order': 'date_order desc'})
        clean_orders = [{'id_raw': o['id'], 'name': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in orders]

        # 4. Kontaklar (Güvenli Çekim - Try/Except)
        customers = []
        try:
             partners_raw = models.execute_kw(db, uid, pwd, 'res.partner', 'search_read', [], {'fields': ['id', 'name', 'phone', 'email', 'total_due', 'is_company'], 'limit': 50})
             # Not: total_due yoksa 0 ata
             customers = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'] or '', 'email': p['email'] or '', 'balance': p.get('total_due', 0), 'type': 'company' if p['is_company'] else 'individual'} for p in partners_raw]
        except: pass

        # 5. Helpdesk (Hata Kontrollü)
        tickets = []
        try:
            raw_t = models.execute_kw(db, uid, pwd, 'helpdesk.ticket', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'stage_id', 'description'], 'limit': 50})
            tickets = [{'id': t['id'], 'product': t['name'], 'customer': t['partner_id'][1] if t['partner_id'] else '-', 'issue': t['description'] or '-', 'status': 'new'} for t in raw_t]
        except: pass
        
        # 6. Faturalar
        invoices = []
        try:
             raw_invoices = models.execute_kw(db, uid, pwd, 'account.move', 'search_read', [[['move_type', 'in', ['out_invoice', 'in_invoice']]]], {'fields': ['name', 'partner_id', 'invoice_date', 'amount_total', 'state', 'payment_state', 'move_type'], 'limit': 20})
             invoices = [{'id': i['name'], 'partner': i['partner_id'][1], 'date': i['invoice_date'], 'amount': i['amount_total'], 'status': i['state'], 'payment_state': i['payment_state'], 'type': i['move_type']} for i in raw_invoices]
        except: pass

        return jsonify({'categories': categories, 'products': products, 'customers': customers, 'orders': clean_orders, 'tickets': tickets, 'invoices': invoices})
    except Exception as e: return jsonify({"error": str(e)})

@app.route('/api/search', methods=['POST'])
def search():
    d = request.json
    try:
        url, uid, _ = get_conn(d)
        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        model = d.get('model')
        query = d.get('query')
        
        domain = []
        fields = []
        if model == 'product.product':
             domain = ['|', ('name', 'ilike', query), ('default_code', 'ilike', query)]
             fields = ['id', 'display_name', 'default_code', 'list_price', 'categ_id', 'image_128']
        elif model == 'sale.order':
             domain = ['|', ('name', 'ilike', query), ('partner_id', 'ilike', query)]
             fields = ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state']
        elif model == 'res.partner':
             domain = ['|', ('name', 'ilike', query), ('phone', 'ilike', query)]
             fields = ['id', 'name', 'phone', 'email', 'total_due', 'is_company']
             
        res = models.execute_kw(d.get('db'), uid, d.get('password'), model, 'search_read', [domain], {'fields': fields, 'limit': 100})
        
        # Format
        data = []
        if model == 'product.product':
            data = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'], 'list_price': p['list_price'], 'image_128': p['image_128'], 'categ_path': str(p['categ_id'])} for p in res]
        elif model == 'sale.order':
            data = [{'id_raw': o['id'], 'name': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in res]
        elif model == 'res.partner':
            data = [{'id': p['id'], 'name': p['name'], 'phone': p['phone'], 'email': p['email'], 'balance': p.get('total_due', 0), 'type': 'company' if p['is_company'] else 'individual'} for p in res]

        return jsonify({"status": "success", "data": data})
    except Exception as e: return jsonify({"status": "error", "message": str(e)})

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
        return jsonify({'lines': [{'name': l['name'], 'qty': l['product_uom_qty'], 'price': l['price_unit'], 'total': l['price_subtotal']} for l in lines]})
    except Exception as e: return jsonify({"error": str(e)})

if __name__ == '__main__': app.run(host='0.0.0.0', port=5000)
