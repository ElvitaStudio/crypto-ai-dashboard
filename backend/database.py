import sqlite3
import os
from datetime import datetime

DB_PATH = '/root/crypto-payment/payments.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT UNIQUE NOT NULL,
        username TEXT,
        first_name TEXT,
        is_pro INTEGER DEFAULT 0,
        pro_expires_at TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        telegram_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USDT',
        network TEXT NOT NULL,
        tx_hash TEXT UNIQUE,
        plan TEXT NOT NULL,
        months INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        confirmed_at TEXT
    )''')
    conn.commit()
    conn.close()

def get_user(telegram_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM users WHERE telegram_id = ?', (str(telegram_id),))
    row = c.fetchone()
    conn.close()
    if row:
        return {
            'id': row[0], 'telegram_id': row[1],
            'username': row[2], 'first_name': row[3],
            'is_pro': row[4], 'pro_expires_at': row[5],
            'created_at': row[6]
        }
    return None

def create_user(telegram_id, username=None, first_name=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT OR IGNORE INTO users 
        (telegram_id, username, first_name) VALUES (?, ?, ?)''',
        (str(telegram_id), username, first_name))
    conn.commit()
    conn.close()

def activate_pro(telegram_id, months):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    user = get_user(telegram_id)
    now = datetime.now()
    if user and user['is_pro'] and user['pro_expires_at']:
        try:
            expires = datetime.fromisoformat(user['pro_expires_at'])
            if expires > now:
                from datetime import timedelta
                new_expires = expires + timedelta(days=30*months)
            else:
                from datetime import timedelta
                new_expires = now + timedelta(days=30*months)
        except:
            from datetime import timedelta
            new_expires = now + timedelta(days=30*months)
    else:
        from datetime import timedelta
        new_expires = now + timedelta(days=30*months)
    c.execute('''UPDATE users SET is_pro=1, pro_expires_at=? 
        WHERE telegram_id=?''',
        (new_expires.isoformat(), str(telegram_id)))
    conn.commit()
    conn.close()
    return new_expires

def create_payment(telegram_id, amount, network, plan, months):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT INTO payments 
        (telegram_id, amount, network, plan, months) 
        VALUES (?, ?, ?, ?, ?)''',
        (str(telegram_id), amount, network, plan, months))
    payment_id = c.lastrowid
    conn.commit()
    conn.close()
    return payment_id

def confirm_payment(payment_id, tx_hash):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''UPDATE payments SET status='confirmed', 
        tx_hash=?, confirmed_at=CURRENT_TIMESTAMP
        WHERE id=?''', (tx_hash, payment_id))
    conn.commit()
    conn.close()

def get_pending_payments():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''SELECT * FROM payments WHERE status='pending' 
        ORDER BY created_at DESC''')
    rows = c.fetchall()
    conn.close()
    return rows

def get_expiring_soon():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''SELECT telegram_id, pro_expires_at FROM users 
        WHERE is_pro=1 AND pro_expires_at IS NOT NULL''')
    rows = c.fetchall()
    conn.close()
    return rows

init_db()
print("✅ База данных инициализирована")
