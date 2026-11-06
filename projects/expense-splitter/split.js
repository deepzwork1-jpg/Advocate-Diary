/**
 * Work out who pays whom after a shared trip, using as few payments as this
 * greedy method allows. Amounts are whole paise, so rounding never loses money.
 */
export function balances(expenses, people) {
  const result = new Map(people.map((person) => [person, 0]))

  for (const { paidBy, amount, sharedBy = people } of expenses) {
    if (!result.has(paidBy)) throw new Error(`Unknown person: ${paidBy}`)
    if (!Number.isInteger(amount) || amount <= 0) throw new Error('Amount must be whole paise above zero')
    if (sharedBy.length === 0) throw new Error('An expense needs at least one person to share it')

    const share = Math.floor(amount / sharedBy.length)
    let leftover = amount - share * sharedBy.length
    result.set(paidBy, result.get(paidBy) + amount)
    for (const person of sharedBy) {
      if (!result.has(person)) throw new Error(`Unknown person: ${person}`)
      // The odd paise go to the first people, so shares always add up to the amount.
      const extra = leftover > 0 ? 1 : 0
      leftover -= extra
      result.set(person, result.get(person) - share - extra)
    }
  }
  return result
}

export function settle(balanceMap) {
  const entries = [...balanceMap].map(([person, amount]) => ({ person, amount }))
  const owed = entries.filter(({ amount }) => amount > 0).sort((a, b) => b.amount - a.amount)
  const owing = entries.filter(({ amount }) => amount < 0).sort((a, b) => a.amount - b.amount)

  const payments = []
  let creditor = 0
  let debtor = 0
  while (creditor < owed.length && debtor < owing.length) {
    const amount = Math.min(owed[creditor].amount, -owing[debtor].amount)
    payments.push({ from: owing[debtor].person, to: owed[creditor].person, amount })
    owed[creditor].amount -= amount
    owing[debtor].amount += amount
    if (owed[creditor].amount === 0) creditor += 1
    if (owing[debtor].amount === 0) debtor += 1
  }
  return payments
}
