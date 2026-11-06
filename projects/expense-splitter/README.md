# Expense Splitter

A dependency-free JavaScript module that works out who owes whom after a shared trip. Amounts are stored in whole paise, so uneven splits add up exactly.

```js
import { balances, settle } from './split.js'

const people = ['Asha', 'Ravi', 'Meera']
const expenses = [{ paidBy: 'Asha', amount: 30000 }]

settle(balances(expenses, people))
```

Run the tests with `npm test`. Node 20 or newer is needed.
