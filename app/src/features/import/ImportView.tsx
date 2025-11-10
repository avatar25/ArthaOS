import { useCallback, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient, type InboxItem } from '../../lib/apiClient'
import { currency } from '../../lib/format'

const CATEGORY_OPTIONS = [
  'Dining',
  'Groceries',
  'Transportation',
  'Housing',
  'Software',
  'Travel',
  'Misc',
]

export const ImportView = () => {
  const queryClient = useQueryClient()
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  const inboxQuery = useQuery({
    queryKey: ['inbox'],
    queryFn: apiClient.getInbox,
  })

  const importMutation = useMutation({
    mutationFn: apiClient.importCsv,
    onSuccess: (items) => {
      queryClient.setQueryData(['inbox'], items)
      setStatusMessage(`Imported ${items.length} inbox items.`)
    },
  })

  const setCategoryMutation = useMutation({
    mutationFn: ({ tempId, category }: { tempId: string; category: string }) =>
      apiClient.setInboxCategory(tempId, category),
    onSuccess: (_, variables) => {
      queryClient.setQueryData<InboxItem[]>(['inbox'], (prev) =>
        prev?.map((item) =>
          item.tempId === variables.tempId ? { ...item, suggestedCategory: variables.category } : item,
        ) ?? [],
      )
    },
  })

  const commitMutation = useMutation({
    mutationFn: apiClient.commitInbox,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] })
      setStatusMessage(`Committed ${result.committedCount} transactions to the ledger.`)
    },
  })

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files?.[0]) return
      importMutation.mutate(files[0])
    },
    [importMutation],
  )

  const onDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    handleFiles(event.dataTransfer.files)
  }

  const onInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div className="flex flex-1 flex-col gap-6 bg-slate-950/60 p-10">
      <header className="flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          Inbox
        </p>
        <h1 className="text-3xl font-semibold text-slate-100">Import transactions</h1>
        <p className="text-sm text-slate-500">
          Drag in CSV exports from your banks. They stay on-device. Suggested categories come from your local memory.
        </p>
      </header>

      <section
        onDragOver={(event) => {
          event.preventDefault()
          event.dataTransfer.dropEffect = 'copy'
        }}
        onDrop={onDrop}
        className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-800 bg-slate-900/60 p-10 text-center transition hover:border-brand-500 hover:bg-slate-900"
      >
        <input
          id="import-csv"
          type="file"
          accept=".csv"
          className="hidden"
          onChange={onInputChange}
        />
        <span className="text-4xl">📄</span>
        <p className="text-lg font-semibold text-slate-100">Drop CSV here</p>
        <p className="text-sm text-slate-400">
          or{' '}
          <label
            htmlFor="import-csv"
            className="cursor-pointer text-brand-400 underline underline-offset-4"
          >
            browse files
          </label>
        </p>
        {importMutation.isPending ? (
          <p className="text-xs text-slate-500">Importing data…</p>
        ) : null}
        {statusMessage ? <p className="text-xs text-brand-300">{statusMessage}</p> : null}
      </section>

      <section className="rounded-2xl border border-slate-900 bg-slate-900/80 shadow-card">
        <header className="flex items-center justify-between border-b border-slate-900 bg-slate-900/40 px-6 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-100">Inbox preview</h2>
            <p className="text-xs text-slate-500">
              {inboxQuery.data?.length ?? 0} pending transactions
            </p>
          </div>
          <button
            type="button"
            onClick={() => commitMutation.mutate()}
            disabled={commitMutation.isPending || (inboxQuery.data?.length ?? 0) === 0}
            className="rounded-full bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-brand-500/40"
          >
            Commit to ledger
          </button>
        </header>
        <div className="max-h-[420px] overflow-auto">
          <table className="min-w-full divide-y divide-slate-900 text-left text-sm text-slate-200">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Description</th>
                <th className="px-6 py-3 font-medium text-right">Amount</th>
                <th className="px-6 py-3 font-medium">Flow</th>
                <th className="px-6 py-3 font-medium">Category</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-900/60">
              {inboxQuery.data?.map((item) => (
                <tr key={item.tempId} className="bg-slate-900/40 hover:bg-slate-900/70">
                  <td className="whitespace-nowrap px-6 py-3 text-xs text-slate-400">
                    {new Date(item.date).toLocaleDateString('en-US')}
                  </td>
                  <td className="px-6 py-3 text-sm text-slate-100">{item.description}</td>
                  <td
                    className={`px-6 py-3 text-right text-sm font-semibold ${
                      item.amount < 0 ? 'text-rose-300' : 'text-emerald-300'
                    }`}
                  >
                    {currency(Math.abs(item.amount))}
                  </td>
                  <td className="px-6 py-3 text-xs uppercase tracking-wide text-slate-500">
                    {item.flow}
                  </td>
                  <td className="px-6 py-3 text-sm">
                    <select
                      value={item.suggestedCategory ?? ''}
                      onChange={(event) =>
                        setCategoryMutation.mutate({
                          tempId: item.tempId,
                          category: event.target.value,
                        })
                      }
                      className="w-44 rounded-lg border border-slate-800 bg-slate-900 px-2 py-1 text-xs text-slate-200 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400/40"
                    >
                      <option value="">Unassigned</option>
                      {CATEGORY_OPTIONS.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {!inboxQuery.data?.length ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-500">
                    Inbox empty. Import CSVs to populate transactions.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
