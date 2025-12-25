import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import xmlrpc.client

app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
CORS(app)

@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

@app.route('/<path:path>')
def static_proxy(path):
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')

def get_odoo_connection(url, db, username, password):
    url = url.strip().rstrip('/')
    for suffix in ['/web', '/odoo', '#', '/web/login']:
        if url.endswith(suffix): url = url.split(suffix)[0]
    if not url.startswith(('http://', 'https://')): url = 'https://' + url
    
    common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
    uid = common.authenticate(db, username, password, {})
    return url, uid, common

@app.route('/api/connect', methods=['POST'])
def connect_to_odoo():
    data = request.json
    try:
        url, uid, _ = get_odoo_connection(data.get('url'), data.get('db'), data.get('username'), data.get('password'))
        if uid:
            return jsonify({"status": "success", "uid": uid, "message": "Bağlantı Başarılı!"})
        else:
            return jsonify({"status": "error", "message": "Kullanıcı adı veya şifre yanlış."}), 401
    except Exception as e:
        return jsonify({"status": "error", "message": f"Bağlantı Hatası: {str(e)}"}), 500

@app.route('/api/dashboard-data', methods=['POST'])
def get_dashboard_data():
    data = request.json
    try:
        url, uid, _ = get_odoo_connection(data.get('url'), data.get('db'), data.get('username'), data.get('password'))
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))
        password = data.get('password')
        db = data.get('db')

        # 1. Müşteriler (Customers)
        customers_raw = models.execute_kw(db, uid, password, 'res.partner', 'search_read', [[['customer_rank', '>', 0]]], {'fields': ['id', 'name', 'email', 'phone', 'street', 'total_due'], 'limit': 20})
        customers = [{'id': c['id'], 'name': c['name'], 'email': c['email'] or '-', 'phone': c['phone'] or '-', 'address': c['street'] or '-', 'balance': c['total_due'] or 0, 'type': 'company' if c.get('is_company') else 'individual'} for c in customers_raw]

        # 2. Siparişler (Orders)
        orders_raw = models.execute_kw(db, uid, password, 'sale.order', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'date_order', 'amount_total', 'state'], 'limit': 20, 'order': 'date_order desc'})
        orders = [{'id': o['name'], 'customer': o['partner_id'][1], 'date': o['date_order'], 'amount': o['amount_total'], 'status': o['state'], 'label': o['state']} for o in orders_raw]

        # 3. Ürünler (Products)
        products_raw = models.execute_kw(db, uid, password, 'product.product', 'search_read', [[['sale_ok', '=', True]]], {'fields': ['id', 'display_name', 'default_code', 'list_price', 'standard_price', 'qty_available', 'categ_id', 'image_128'], 'limit': 50})
        products = [{'id': p['id'], 'name': p['display_name'], 'default_code': p['default_code'] or '', 'list_price': p['list_price'], 'cost_price': p['standard_price'], 'qty_available': p['qty_available'], 'category': p['categ_id'][1] if p['categ_id'] else 'Diğer', 'image_128': p['image_128']} for p in products_raw]

        # 4. Faturalar (Invoices)
        try:
            invoices_raw = models.execute_kw(db, uid, password, 'account.move', 'search_read', [[['move_type', 'in', ['out_invoice', 'in_invoice']]]], {'fields': ['name', 'partner_id', 'invoice_date', 'amount_total', 'state', 'payment_state', 'move_type'], 'limit': 20})
            invoices = [{'id': i['name'], 'partner': i['partner_id'][1], 'date': i['invoice_date'], 'amount': i['amount_total'], 'status': i['state'], 'payment_state': i['payment_state'], 'type': i['move_type']} for i in invoices_raw]
        except:
            invoices = []

        # 5. Helpdesk (Tickets)
        try:
            tickets_raw = models.execute_kw(db, uid, password, 'helpdesk.ticket', 'search_read', [], {'fields': ['id', 'name', 'partner_id', 'priority', 'stage_id', 'description'], 'limit': 20})
            tickets = [{'id': str(t['id']), 'product': t['name'], 'customer': t['partner_id'][1] if t['partner_id'] else 'Bilinmiyor', 'issue': t['description'] or '-', 'status': 'new', 'priority': t['priority']} for t in tickets_raw]
        except:
            tickets = []

        # 5. İstatistikler
        total_revenue = sum(o['amount'] for o in orders if o['status'] in ['sale', 'done'])
        
        return jsonify({
            'customers': customers,
            'orders': orders,
            'products': products,
            'invoices': invoices,
            'tickets': tickets,
            'salesStats': { 'totalRevenue': total_revenue, 'confirmedOrders': len(orders), 'activeQuotations': 0, 'dailyStoreRevenue': 0, 'newCustomers': 0, 'personalQuotes': 0 }
        })
    except Exception as e:
        print(f"Veri çekme hatası: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
