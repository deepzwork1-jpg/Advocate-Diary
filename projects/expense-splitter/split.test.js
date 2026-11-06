import assert from 'node:assert/strict'
import { test } from 'node:test'
import { balances, settle } from './split.js'

const PEOPLE = ['Asha', 'Ravi', 'Meera']

const total = (map) => [...map.values()].reduce((sum, amount) => sum + amount, 0)

test('one person pays for everyone', () => {
  const result = balances([{ paidBy: 'Asha', amount: 30000 }], PEOPLE)
  assert.deepEqual(settle(result), [
    { from: 'Ravi', to: 'Asha', amount: 10000 },
    { from: 'Meera', to: 'Asha', amount: 10000 },
  ])
})

test('uneven amounts never lose a paisa', () => {
  const result = balances([{ paidBy: 'Ravi', amount: 10000 }], PEOPLE)
  assert.equal(total(result), 0)
})

test('an expense can be shared by only some people', () => {
  const result = balances([{ paidBy: 'Asha', amount: 2000, sharedBy: ['Asha', 'Ravi'] }], PEOPLE)
  assert.equal(result.get('Meera'), 0)
  assert.deepEqual(settle(result), [{ from: 'Ravi', to: 'Asha', amount: 1000 }])
})

test('equal spending needs no payments', () => {
  const expenses = PEOPLE.map((paidBy) => ({ paidBy, amount: 900 }))
  assert.deepEqual(settle(balances(expenses, PEOPLE)), [])
})

test('payments clear every balance', () => {
  const result = balances(
    [
      { paidBy: 'Asha', amount: 12345 },
      { paidBy: 'Ravi', amount: 678 },
      { paidBy: 'Meera', amount: 4001, sharedBy: ['Ravi', 'Meera'] },
    ],
    PEOPLE
  )
  for (const { from, to, amount } of settle(result)) {
    result.set(from, result.get(from) + amount)
    result.set(to, result.get(to) - amount)
  }
  assert.ok([...result.values()].every((amount) => amount === 0))
})

test('bad input is rejected', () => {
  assert.throws(() => balances([{ paidBy: 'Nobody', amount: 100 }], PEOPLE), /Unknown person/)
  assert.throws(() => balances([{ paidBy: 'Asha', amount: 10.5 }], PEOPLE), /whole paise/)
  assert.throws(() => balances([{ paidBy: 'Asha', amount: 100, sharedBy: [] }], PEOPLE), /at least one/)
})
