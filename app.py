
from flask import Flask, render_template, request, redirect, url_for, session, flash, send_from_directory
import json, os, datetime, random, string

app = Flask(__name__)
app.secret_key = 'change-this-secret'  # change for production

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(BASE_DIR, 'key.json')

# Default admin credentials (as requested)
ADMIN_USER = '1234'
ADMIN_PASS = '1234'

def load_keys():
    if not os.path.exists(KEY_FILE):
        return {'keys': {}}
    with open(KEY_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_keys(data):
    with open(KEY_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)

def generate_key():
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
    return f'HESAM-KU-VIP-{suffix}'

def days_left(expire_str):
    try:
        exp = datetime.datetime.fromisoformat(expire_str)
    except Exception:
        exp = datetime.datetime.strptime(expire_str, '%Y-%m-%d')
    delta = exp - datetime.datetime.utcnow()
    return max(delta.days, 0)

@app.route('/static/<path:p>')
def static_proxy(p):
    return send_from_directory(os.path.join(BASE_DIR, 'static'), p)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        user = request.form.get('username')
        pwd = request.form.get('password')
        if user == ADMIN_USER and pwd == ADMIN_PASS:
            session['logged_in'] = True
            return redirect(url_for('dashboard'))
        else:
            flash('نام کاربری یا رمز عبور اشتباه است.')
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

def login_required(f):
    from functools import wraps
    @wraps(f)
    def wrapper(*a, **k):
        if not session.get('logged_in'):
            return redirect(url_for('login'))
        return f(*a, **k)
    return wrapper

@app.route('/')
@login_required
def dashboard():
    data = load_keys()
    keys = []
    for k,v in data.get('keys', {}).items():
        days = days_left(v['expires'])
        keys.append({
            'key': k,
            'expires': v['expires'],
            'status': v.get('status','unknown'),
            'days_left': days
        })
    keys = sorted(keys, key=lambda x: x['days_left'])
    return render_template('dashboard.html', keys=keys)

@app.route('/create', methods=['POST'])
@login_required
def create():
    days = int(request.form.get('days', '30'))
    key = generate_key()
    expire_date = (datetime.datetime.utcnow() + datetime.timedelta(days=days)).date().isoformat()
    data = load_keys()
    data.setdefault('keys', {})[key] = {
        'expires': expire_date,
        'status': 'active'
    }
    save_keys(data)
    flash(f'لایسنس ساخته شد: {key} (منقضی: {expire_date})')
    return redirect(url_for('dashboard'))

@app.route('/renew/<key>', methods=['POST'])
@login_required
def renew(key):
    add_days = int(request.form.get('add_days', '30'))
    data = load_keys()
    if key not in data.get('keys', {}):
        flash('کد یافت نشد.')
        return redirect(url_for('dashboard'))
    old = data['keys'][key]['expires']
    try:
        old_dt = datetime.datetime.fromisoformat(old)
    except Exception:
        old_dt = datetime.datetime.strptime(old, '%Y-%m-%d')
    # if expired, start from today
    base = max(old_dt, datetime.datetime.utcnow())
    new_dt = (base + datetime.timedelta(days=add_days)).date().isoformat()
    data['keys'][key]['expires'] = new_dt
    save_keys(data)
    flash(f'لایسنس تمدید شد تا {new_dt}')
    return redirect(url_for('dashboard'))

@app.route('/toggle/<key>', methods=['POST'])
@login_required
def toggle(key):
    data = load_keys()
    if key in data.get('keys', {}):
        st = data['keys'][key].get('status','active')
        data['keys'][key]['status'] = 'inactive' if st=='active' else 'active'
        save_keys(data)
        flash('وضعیت تغییر کرد.')
    return redirect(url_for('dashboard'))

@app.route('/delete/<key>', methods=['POST'])
@login_required
def delete(key):
    data = load_keys()
    if key in data.get('keys', {}):
        del data['keys'][key]
        save_keys(data)
        flash('لایسنس حذف شد.')
    return redirect(url_for('dashboard'))

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
