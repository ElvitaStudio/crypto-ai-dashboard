from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List
import os
import httpx
from dotenv import load_dotenv
from database import get_user, create_user, create_payment, activate_pro

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

PLANS = {
    '1m': {'months': 1, 'amount': 19.99},
    '3m': {'months': 3, 'amount': 50.97},
    '6m': {'months': 6, 'amount': 89.94},
}

class UserRequest(BaseModel):
    telegram_id: str
    username: Optional[str] = None
    first_name: Optional[str] = None

class PaymentRequest(BaseModel):
    telegram_id: str
    plan: str
    network: str

class ActivateRequest(BaseModel):
    telegram_id: str
    plan: str
    tx_hash: str
    secret: str

class AnthropicMessage(BaseModel):
    role: str
    content: str

class AnthropicRequest(BaseModel):
    model: str = "claude-sonnet-4-6"
    max_tokens: int
    messages: List[AnthropicMessage]

@app.get("/")
def root():
    return {"status": "Crypto AI Payment API running"}

@app.post("/api/user/register")
def register_user(req: UserRequest):
    create_user(req.telegram_id, req.username, req.first_name)
    user = get_user(req.telegram_id)
    return {"ok": True, "user": user}

@app.get("/api/user/{telegram_id}")
def get_user_status(telegram_id: str):
    user = get_user(telegram_id)
    if not user:
        create_user(telegram_id)
        user = get_user(telegram_id)
    from datetime import datetime
    is_pro_active = False
    if user['is_pro'] and user['pro_expires_at']:
        try:
            expires = datetime.fromisoformat(user['pro_expires_at'])
            is_pro_active = expires > datetime.now()
            if not is_pro_active:
                import sqlite3
                conn = sqlite3.connect('/root/crypto-payment/payments.db')
                conn.execute('UPDATE users SET is_pro=0 WHERE telegram_id=?', (telegram_id,))
                conn.commit()
                conn.close()
        except:
            pass
    return {
        "ok": True,
        "telegram_id": telegram_id,
        "is_pro": is_pro_active,
        "pro_expires_at": user['pro_expires_at'],
        "first_name": user['first_name']
    }

@app.post("/api/payment/create")
def create_payment_request(req: PaymentRequest):
    if req.plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    plan = PLANS[req.plan]
    payment_id = create_payment(req.telegram_id, plan['amount'], req.network, req.plan, plan['months'])
    wallets = {
        'TRC20': os.getenv('WALLET_TRC20'),
        'ERC20': os.getenv('WALLET_ERC20'),
        'BEP20': os.getenv('WALLET_BEP20'),
    }
    return {
        "ok": True,
        "payment_id": payment_id,
        "amount": plan['amount'],
        "months": plan['months'],
        "wallet": wallets.get(req.network),
        "network": req.network
    }

@app.post("/api/payment/activate")
def manual_activate(req: ActivateRequest):
    if req.secret != os.getenv('SECRET_KEY'):
        raise HTTPException(403, "Forbidden")
    if req.plan not in PLANS:
        raise HTTPException(400, "Invalid plan")
    months = PLANS[req.plan]['months']
    expires = activate_pro(req.telegram_id, months)
    return {"ok": True, "telegram_id": req.telegram_id, "pro_expires_at": expires.isoformat(), "months": months}

@app.get("/api/stats")
def get_stats(secret: str):
    if secret != os.getenv('SECRET_KEY'):
        raise HTTPException(403, "Forbidden")
    import sqlite3
    conn = sqlite3.connect('/root/crypto-payment/payments.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM users')
    total_users = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM users WHERE is_pro=1')
    pro_users = c.fetchone()[0]
    c.execute('SELECT COUNT(*) FROM payments WHERE status="confirmed"')
    total_payments = c.fetchone()[0]
    c.execute('SELECT SUM(amount) FROM payments WHERE status="confirmed"')
    total_revenue = c.fetchone()[0] or 0
    conn.close()
    return {"total_users": total_users, "pro_users": pro_users, "total_payments": total_payments, "total_revenue": round(total_revenue, 2)}

@app.post("/api/anthropic")
async def anthropic_proxy(req: AnthropicRequest):
    api_key = os.getenv('ANTHROPIC_API_KEY')
    if not api_key:
        raise HTTPException(500, "ANTHROPIC_API_KEY not configured")
    async with httpx.AsyncClient() as client:
        r = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
            },
            json=req.dict(),
            timeout=60
        )
        return r.json()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv('API_PORT', 8001)))
