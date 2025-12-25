import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import xmlrpc.client

# React build dosyalarının nerede olduğunu belirtiyoruz (Docker içinde 'client' klasörü olacak)
app = Flask(__name__, static_folder='../frontend/dist', static_url_path='/')
CORS(app)

# --- ANA SAYFA (React Uygulamasını Sunar) ---
@app.route('/')
def index():
    return send_from_directory(app.static_folder, 'index.html')

# React Router desteği için diğer yolları da index.html'e yönlendir
@app.route('/<path:path>')
def static_proxy(path):
    # Eğer dosya varsa onu gönder (css, js, png vb.)
    if os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # Yoksa React uygulamasını gönder (Router halleder)
    return send_from_directory(app.static_folder, 'index.html')

# --- API ENDPOINTLERİ (Odoo ile Konuşan Kısım) ---

@app.route('/api/connect', methods=['POST'])
def connect_to_odoo():
    data = request.json
    url = data.get('url')
    db = data.get('db')
    username = data.get('username')
    password = data.get('password')

    try:
        common = xmlrpc.client.ServerProxy('{}/xmlrpc/2/common'.format(url))
        uid = common.authenticate(db, username, password, {})

        if uid:
            return jsonify({"status": "success", "uid": uid, "message": "Bağlantı Başarılı!"})
        else:
            return jsonify({"status": "error", "message": "Kullanıcı adı veya şifre yanlış"}), 401

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/customers', methods=['POST'])
def get_customers():
    data = request.json
    url = data.get('url')
    db = data.get('db')
    password = data.get('password')
    uid = data.get('uid')

    try:
        models = xmlrpc.client.ServerProxy('{}/xmlrpc/2/object'.format(url))
        customers = models.execute_kw(db, uid, password,
            'res.partner', 'search_read',
            [[['customer_rank', '>', 0]]],
            {'fields': ['name', 'email', 'phone', 'street', 'total_due'], 'limit': 10}
        )
        return jsonify(customers)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Sunucuda dışarıya açmak için host 0.0.0.0 olmalı
    app.run(host='0.0.0.0', port=5000)
