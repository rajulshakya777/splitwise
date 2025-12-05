

from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3


app = Flask(__name__)
CORS(app)
DB_PATH = 'splitwise.db'

# Root route for browser access
@app.route('/')
def home():
    return '<h2>Splitwise Backend Running! Use /add_expense (POST) and /settle (GET).</h2>'

class Expense:
    def __init__(self, name: str, amount: float):
        self.name = name
        self.amount = amount

class ExpenseRepository:
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            amount REAL NOT NULL
        )''')
        conn.commit()
        conn.close()

    def add_expense(self, expense: Expense):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('INSERT INTO expenses (name, amount) VALUES (?, ?)', (expense.name, expense.amount))
        conn.commit()
        conn.close()

    def get_expenses(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('SELECT name, amount FROM expenses')
        rows = c.fetchall()
        conn.close()
        return [Expense(name, amount) for name, amount in rows]

    def clear_expenses(self):
        conn = sqlite3.connect(self.db_path)
        c = conn.cursor()
        c.execute('DELETE FROM expenses')
        conn.commit()
        conn.close()

class SettlementCalculator:
    def __init__(self, expenses):
        self.expenses = expenses

    def calculate(self):
        if not self.expenses:
            return None
        total = sum(e.amount for e in self.expenses)
        per_person = total / len(self.expenses)
        balances = {e.name: e.amount - per_person for e in self.expenses}
        owes = []
        gets = []
        for name, bal in balances.items():
            if bal < 0:
                owes.append({'name': name, 'amount': round(-bal, 2)})
            elif bal > 0:
                gets.append({'name': name, 'amount': round(bal, 2)})
        settlements = []
        i, j = 0, 0
        while i < len(owes) and j < len(gets):
            owe = owes[i]
            get = gets[j]
            pay = min(owe['amount'], get['amount'])
            settlements.append({'from': owe['name'], 'to': get['name'], 'amount': pay})
            owe['amount'] -= pay
            get['amount'] -= pay
            if owe['amount'] == 0:
                i += 1
            if get['amount'] == 0:
                j += 1
        return {
            'total': round(total, 2),
            'per_person': round(per_person, 2),
            'settlements': settlements
        }

expense_repo = ExpenseRepository(DB_PATH)

@app.route('/add_expense', methods=['POST'])
def add_expense():
    data = request.json
    expense = Expense(data['name'], float(data['amount']))
    expense_repo.add_expense(expense)
    return jsonify({'status': 'success'})

@app.route('/settle', methods=['GET'])
def settle():
    expenses = expense_repo.get_expenses()
    calc = SettlementCalculator(expenses)
    result = calc.calculate()
    if not result:
        return jsonify({'error': 'No expenses found'})
    return jsonify(result)

@app.route('/clear', methods=['POST'])
def clear():
    expense_repo.clear_expenses()
    return jsonify({'status': 'cleared'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
