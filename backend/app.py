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

        # Kategoriler (Ağaç Yapısı İçin Parent ID ile)
        cats = models.execute_kw(db, uid, pwd, 'product.category', 'search_read', [], {'fields': ['id', 'name', 'parent_id']})
        
        # Ağaç Yapısını Oluştur (Backend'de işle)
        cat_map = {c['id']: {'id': c['id'], 'name': c['name'], 'children': []} for c in cats}
        tree = []
        for c in cats:
            if c['parent_id']:
                pid = c['parent_id'][0]
                if pid in cat_map: cat_map[pid]['children'].append(cat_map[c['id']])
                else: tree.append(cat_map[c['id']])
            else: tree.append(cat_map[c['id']])

        # Ürünler (Limitli, ama hepsi aranabilir)
        prods = models.execute_kw(db, uid, pwd, 'product.product', 'search_read', [[['sale_ok','=',True]]], {'fields': ['id', 'display_name', 'default_code', 'list_price', 'qty_available', 'categ_id', 'image_128'], 'limit': 100})
        products = [{'id': p['id'], 'name': p['display_name'], 'list_price': p['list_price'], 'image_128': p['image_128'], 'categ_id': p['categ_id'] ? p['categ_id'][0] : 0, 'categ_path': str(p['categ_id'])} for p in prods]

        # Siparişler
        orders = models.execute_kw(db, uid, pwd, 'sale.order', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], 'limit': 50, 'order': 'date_order desc'})
        clean_orders = [{'id_raw': o['id'], 'name': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state']} for o in orders]

        # Helpdesk (Hata Vermemesi İçin Try-Except)
        tickets = []
        try:
            raw_tickets = models.execute_kw(db, uid, pwd, 'helpdesk.ticket', 'search_read', [], {'fields': ['id', 'name', 'stage_id', 'description'], 'limit': 20})
            tickets = [{'id': t['id'], 'product': t['name'], 'issue': t['description'] or '-', 'status': 'new'} for t in raw_tickets]
        except: pass

        return jsonify({'categories': tree, 'products': products, 'orders': clean_orders, 'tickets': tickets, 'invoices': [], 'customers': []})
    except Exception as e: return jsonify({"error": str(e)})

@app.route('/api/order-details', methods=['POST'])
def order_details():
    d = request.json
    try:
        url, uid, _ = get_conn(d)
        models = xmlrpc.client.ServerProxy(f'{url}/xmlrpc/2/object')
        
        # Siparişin satırlarını bul
        order = models.execute_kw(d.get('db'), uid, d.get('password'), 'sale.order', 'read', [[d.get('order_id')]], {'fields': ['order_line']})
        line_ids = order[0]['order_line']
        
        # Satır detaylarını çek
        lines = models.execute_kw(d.get('db'), uid, d.get('password'), 'sale.order.line', 'read', [line_ids], {'fields': ['name', 'product_uom_qty', 'price_unit', 'price_subtotal']})
        
        clean_lines = [{'name': l['name'], 'qty': l['product_uom_qty'], 'price': l['price_unit'], 'total': l['price_subtotal']} for l in lines]
        return jsonify({'lines': clean_lines})
    except Exception as e: return jsonify({"error": str(e)})

if __name__ == '__main__': app.run(host='0.0.0.0', port=5000)
