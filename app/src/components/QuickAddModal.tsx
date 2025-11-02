import { useState, type FormEvent } from 'react'
import { useQuickAddStore } from '../stores/quickAdd'

export const QuickAddModal = () => {
  const isOpen = useQuickAddStore((state) => state.isOpen)
  const close = useQuickAddStore((state) => state.close)
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('Misc')

  if (!isOpen) {
    return null
  }

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    console.info('[quick-add] payload', {
      description,
      amount: Number(amount),
      category,
    })
    setDescription('')
    setAmount('')
    setCategory('Misc')
    close()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100">Quick Add Expense</h2>
            <p className="text-xs text-slate-500">
              Captures a fast transaction. It will land in the inbox for confirmation.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-100"
            onClick={close}
            aria-label="Close quick add modal"
          >
            ✕
          </button>
        </div>
        <form className="space-y-4" onSubmit={onSubmit}>
          <label className="block text-sm font-medium text-slate-300">
            Description
            <input
              required
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Amount
            <input
              required
              value={amount}
              type="number"
              step="0.01"
              onChange={(event) => setAmount(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            />
          </label>
          <label className="block text-sm font-medium text-slate-300">
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
            >
              <option>Misc</option>
              <option>Dining</option>
              <option>Groceries</option>
              <option>Transportation</option>
              <option>Software</option>
            </select>
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 hover:border-slate-600 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-400"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
