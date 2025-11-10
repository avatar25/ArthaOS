import { invokeNative } from './nativeBridge'

export interface SummaryResponse {
  month: string
  totalSpend: number
  byCategory: Array<{ category: string; amount: number }>
  budgets: Array<{ category: string; cap: number; spent: number }>
}

export interface NetWorthPoint {
  date: string
  netWorth: number
  cash: number
  invested: number
  debt: number
}

export interface InboxItem {
  tempId: string
  date: string
  description: string
  amount: number
  flow: 'debit' | 'credit'
  suggestedCategory: string | null
}

export interface InboxCommitResponse {
  committedCount: number
}

export interface SetCategoryResponse {
  ok: true
}

export type TransportMode = 'local' | 'remote'

export interface ApiClient {
  getSummary: (month: string) => Promise<SummaryResponse>
  getNetWorthCurve: () => Promise<NetWorthPoint[]>
  getInbox: () => Promise<InboxItem[]>
  importCsv: (file: File) => Promise<InboxItem[]>
  setInboxCategory: (tempId: string, category: string) => Promise<SetCategoryResponse>
  commitInbox: () => Promise<InboxCommitResponse>
}

type ApiImplementation = ApiClient

let transportMode: TransportMode = 'local'

export const setTransportMode = (mode: TransportMode) => {
  transportMode = mode
}

const mockSummary: SummaryResponse = {
  month: '2025-01',
  totalSpend: 4120,
  byCategory: [
    { category: 'Housing', amount: 1800 },
    { category: 'Groceries', amount: 620 },
    { category: 'Dining', amount: 280 },
    { category: 'Transportation', amount: 220 },
    { category: 'Discretionary', amount: 400 },
  ],
  budgets: [
    { category: 'Housing', cap: 1800, spent: 1800 },
    { category: 'Groceries', cap: 700, spent: 620 },
    { category: 'Dining', cap: 350, spent: 280 },
    { category: 'Transportation', cap: 250, spent: 220 },
    { category: 'Discretionary', cap: 500, spent: 400 },
  ],
}

const mockNetWorth: NetWorthPoint[] = Array.from({ length: 12 }).map((_, idx) => {
  const base = 50_000 + idx * 1_250
  return {
    date: new Date(2024, idx, 1).toISOString().slice(0, 10),
    netWorth: base,
    cash: base * 0.4,
    invested: base * 0.7,
    debt: base * 0.3,
  }
})

let mockInbox: InboxItem[] = [
  {
    tempId: '1',
    date: '2025-01-04',
    description: 'Blue Bottle Coffee',
    amount: -8.5,
    flow: 'debit',
    suggestedCategory: 'Dining',
  },
  {
    tempId: '2',
    date: '2025-01-04',
    description: 'Amazon Web Services',
    amount: -32.25,
    flow: 'debit',
    suggestedCategory: 'Software',
  },
  {
    tempId: '3',
    date: '2025-01-03',
    description: 'United Airlines',
    amount: -412.33,
    flow: 'debit',
    suggestedCategory: 'Travel',
  },
]

const localTransport: ApiImplementation = {
  async getSummary(month) {
    const response = await invokeNative<SummaryResponse>('get_summary', { month })
    return response ?? mockSummary
  },
  async getNetWorthCurve() {
    const response = await invokeNative<NetWorthPoint[]>('get_networth_curve')
    return response ?? mockNetWorth
  },
  async getInbox() {
    const response = await invokeNative<InboxItem[]>('get_inbox')
    return response ?? mockInbox
  },
  async importCsv(file) {
    const buffer = await file.arrayBuffer()
    const payload = { bytes: Array.from(new Uint8Array(buffer)), name: file.name }
    const response = await invokeNative<InboxItem[]>('import_csv', payload)
    if (response) {
      mockInbox = response
      return response
    }
    // Mock: append generated transactions
    const nextId = mockInbox.length + 1
    const mockRows: InboxItem[] = [
      {
        tempId: String(nextId),
        date: new Date().toISOString().slice(0, 10),
        description: `${file.name} Row ${nextId}`,
        amount: -45.67,
        flow: 'debit',
        suggestedCategory: 'Misc',
      },
    ]
    mockInbox = [...mockInbox, ...mockRows]
    return mockInbox
  },
  async setInboxCategory(tempId, category) {
    const response = await invokeNative<SetCategoryResponse>('set_inbox_category', {
      tempId,
      category,
    })
    if (!response) {
      mockInbox = mockInbox.map((item) =>
        item.tempId === tempId ? { ...item, suggestedCategory: category } : item,
      )
      return { ok: true }
    }
    return response
  },
  async commitInbox() {
    const response = await invokeNative<InboxCommitResponse>('commit_inbox')
    if (!response) {
      const committedCount = mockInbox.length
      mockInbox = []
      return { committedCount }
    }
    mockInbox = []
    return response
  },
}

const remoteTransport: ApiImplementation = {
  async getSummary(month) {
    console.warn(
      `[apiClient] remote transport not implemented for ${month}, falling back to mock data.`,
    )
    return mockSummary
  },
  async getNetWorthCurve() {
    console.warn('[apiClient] remote transport not implemented, falling back to mock data.')
    return mockNetWorth
  },
  async getInbox() {
    console.warn('[apiClient] remote transport not implemented, falling back to mock data.')
    return mockInbox
  },
  async importCsv(file) {
    console.warn('[apiClient] remote transport not implemented, falling back to mock data.')
    return localTransport.importCsv(file)
  },
  async setInboxCategory(tempId, category) {
    console.warn('[apiClient] remote transport not implemented, falling back to mock data.')
    return localTransport.setInboxCategory(tempId, category)
  },
  async commitInbox() {
    console.warn('[apiClient] remote transport not implemented, falling back to mock data.')
    return localTransport.commitInbox()
  },
}

const transports: Record<TransportMode, ApiImplementation> = {
  local: localTransport,
  remote: remoteTransport,
}

export const apiClient: ApiClient = {
  getSummary: (month) => transports[transportMode].getSummary(month),
  getNetWorthCurve: () => transports[transportMode].getNetWorthCurve(),
  getInbox: () => transports[transportMode].getInbox(),
  importCsv: (file) => transports[transportMode].importCsv(file),
  setInboxCategory: (tempId, category) =>
    transports[transportMode].setInboxCategory(tempId, category),
  commitInbox: () => transports[transportMode].commitInbox(),
}
