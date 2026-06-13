import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export type Status =
  | 'Upcoming'
  | 'Assigned'
  | 'Execution'
  | 'Testing'
  | 'Await Deploy'
  | 'Hypercare'
  | 'Complete'
  | 'Blocked'
  | 'Descoped'

export type StatusGroup = 'Pending' | 'In-Progress' | 'Complete' | 'Blocked' | 'Descoped'
export type Size = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL'
export type LinkType = 'RITM' | 'INC' | 'ADO' | 'CRF' | 'AskMe'
export type ReleaseType = 'PGT' | 'BreakFix' | 'Other'
export type BlockerBadgeStatus = 'cleared' | 'valid' | 'revalidate'

export interface Category {
  categoryId: string
  name: string
  longName: string
  development: boolean
  capex: boolean
  active: boolean
}

export interface BlockerType {
  blockerTypeId: string
  name: string
  days: number
}

export interface Person {
  id: string
  title: string
  email: string
  role: string
  active: boolean
  pendingCreatedAt?: number
}

export interface Release {
  id: string
  title: string
  date: string
  releaseType: ReleaseType
  active: boolean
  notes?: string
}

export interface WorkItem {
  workItemId: string
  title: string
  description: string
  assignedToId: string | null
  assignedDate: string
  goalDate: string
  brf: boolean
  complete: boolean
  categoryId: string | null
  parentItemId: string | null
  releaseId: string | null
  size: Size
  status: Status
}

export interface Link {
  linkId: string
  name: string
  workItemId: string
  linkType: LinkType
  number: string
}

export interface Blocker {
  blockerId: string
  title: string
  workItemId: string
  blockerTypeId: string
  logged: string
  assignedToId: string | null
  lastValidated: string
  blockerActive: boolean
  expectedResolution: string
  nextValidation: string
  priorStatus: string
}

export interface WorktrackDb {
  categories: Category[]
  blockerTypes: BlockerType[]
  workItems: WorkItem[]
  links: Link[]
  blockers: Blocker[]
  persons: Person[]
  releases: Release[]
}

export const FALLBACK_EMAIL = 'michael.girardi@pepsico.com'
export const STATUS_OPTIONS: Status[] = [
  'Upcoming',
  'Assigned',
  'Execution',
  'Testing',
  'Await Deploy',
  'Hypercare',
  'Complete',
  'Blocked',
  'Descoped',
]
export const STATUS_GROUPS: Record<Status, StatusGroup> = {
  Upcoming: 'Pending',
  Assigned: 'Pending',
  Execution: 'In-Progress',
  Testing: 'In-Progress',
  'Await Deploy': 'In-Progress',
  Hypercare: 'In-Progress',
  Complete: 'Complete',
  Blocked: 'Blocked',
  Descoped: 'Descoped',
}
export const SIZE_OPTIONS: Size[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
export const LINK_TYPE_OPTIONS: LinkType[] = ['RITM', 'INC', 'ADO', 'CRF', 'AskMe']
export const RELEASE_TYPE_OPTIONS: ReleaseType[] = ['PGT', 'BreakFix', 'Other']

const STORAGE_KEY = 'worktrack:v2:db'
const LAST_CHANGED_KEY = 'worktrack:lastChanged'
const oneDay = 24 * 60 * 60 * 1000

const formatDateValue = (date: Date) => {
  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const todayString = () => formatDateValue(new Date())

const addDays = (date: string, days: number) => {
  const next = parseLocalDate(date)
  next.setDate(next.getDate() + days)
  return formatDateValue(next)
}

const seedToday = new Date()
const within = (days: number) => formatDateValue(new Date(seedToday.getTime() + days * oneDay))
const before = (days: number) => formatDateValue(new Date(seedToday.getTime() - days * oneDay))

const seedDb = (): WorktrackDb => {
  const persons: Person[] = [
    { id: 'per-1', title: 'Michael Girardi', email: FALLBACK_EMAIL, role: 'Program Manager', active: true },
    { id: 'per-2', title: 'Priya Raman', email: 'priya.raman@pepsico.com', role: 'Product Owner', active: true },
    { id: 'per-3', title: 'Alex Chen', email: 'alex.chen@pepsico.com', role: 'Engineer', active: true },
    { id: 'per-4', title: 'Jordan Lee', email: 'jordan.lee@pepsico.com', role: 'QA Lead', active: true },
    { id: 'per-5', title: 'Mia Santos', email: 'mia.santos@pepsico.com', role: 'Release Lead', active: true },
    { id: 'per-6', title: 'Nina Patel', email: 'nina.patel@pepsico.com', role: 'Analyst', active: true },
    { id: 'per-7', title: 'Owen Brooks', email: 'owen.brooks@pepsico.com', role: 'Architect', active: true },
    { id: 'per-8', title: 'Ella Martinez', email: 'ella.martinez@pepsico.com', role: 'Support', active: true },
  ]

  const releases: Release[] = [
    { id: 'R0001', title: 'Summer Platform', date: within(6), releaseType: 'PGT', active: true, notes: 'Core platform wave.' },
    { id: 'R0002', title: 'Urgent Fix Pack', date: within(12), releaseType: 'BreakFix', active: true, notes: 'Production incident items.' },
    { id: 'R0003', title: 'Ops Clean-up', date: within(22), releaseType: 'Other', active: true, notes: 'Housekeeping and reporting.' },
    { id: 'R0004', title: 'Retired Train', date: before(30), releaseType: 'PGT', active: false, notes: 'Historical reference.' },
  ]

  const categories: Category[] = [
    { categoryId: 'cat-1', name: 'COE Internal', longName: 'COE Internal', development: true, capex: false, active: true },
    { categoryId: 'cat-2', name: 'AR', longName: 'Accounts Receivable', development: true, capex: true, active: true },
    { categoryId: 'cat-3', name: 'Poppi', longName: 'Poppi Integrations', development: true, capex: true, active: true },
    { categoryId: 'cat-4', name: 'RTS', longName: 'Ready to Ship', development: true, capex: false, active: true },
    { categoryId: 'cat-5', name: 'CLM', longName: 'Contract Lifecycle', development: false, capex: false, active: true },
    { categoryId: 'cat-6', name: 'CAR1A/CAR1B', longName: 'CAR1A/CAR1B', development: true, capex: true, active: true },
    { categoryId: 'cat-7', name: 'CI', longName: 'Continuous Improvement', development: false, capex: false, active: true },
    { categoryId: 'cat-8', name: 'Sustain', longName: 'Sustainment', development: false, capex: false, active: true },
    { categoryId: 'cat-9', name: 'Career', longName: 'Career Development', development: false, capex: false, active: true },
  ]

  const blockerTypes: BlockerType[] = [
    { blockerTypeId: 'bt-1', name: 'Hard', days: 1 },
    { blockerTypeId: 'bt-2', name: 'Soft', days: 2 },
    { blockerTypeId: 'bt-3', name: 'Potential', days: 3 },
    { blockerTypeId: 'bt-4', name: 'Vendor', days: 4 },
  ]

  const workItems: WorkItem[] = [
    {
      workItemId: 'wi-1001',
      title: 'Launch planning board',
      description: 'Initial planning board and seeded workload.',
      assignedToId: 'per-2',
      assignedDate: before(5),
      goalDate: within(5),
      brf: false,
      complete: false,
      categoryId: 'cat-1',
      parentItemId: null,
      releaseId: 'R0001',
      size: 'L',
      status: 'Execution',
    },
    {
      workItemId: 'wi-1002',
      title: 'Prepare release notes',
      description: 'Coordinate release notes for next wave.',
      assignedToId: 'per-5',
      assignedDate: before(3),
      goalDate: within(8),
      brf: true,
      complete: false,
      categoryId: 'cat-4',
      parentItemId: null,
      releaseId: 'R0001',
      size: 'M',
      status: 'Assigned',
    },
    {
      workItemId: 'wi-1003',
      title: 'Backfill support dashboard',
      description: 'Pending triage with no owner yet.',
      assignedToId: null,
      assignedDate: '',
      goalDate: within(10),
      brf: false,
      complete: false,
      categoryId: 'cat-7',
      parentItemId: null,
      releaseId: null,
      size: 'S',
      status: 'Upcoming',
    },
    {
      workItemId: 'wi-1004',
      title: 'Validate ServiceNow integration',
      description: 'Blocked on credential rotation.',
      assignedToId: 'per-3',
      assignedDate: before(6),
      goalDate: within(3),
      brf: false,
      complete: false,
      categoryId: 'cat-3',
      parentItemId: null,
      releaseId: 'R0002',
      size: 'XL',
      status: 'Blocked',
    },
    {
      workItemId: 'wi-1005',
      title: 'Refine hypercare metrics',
      description: 'Near term due-date example.',
      assignedToId: 'per-6',
      assignedDate: before(2),
      goalDate: within(2),
      brf: false,
      complete: false,
      categoryId: 'cat-8',
      parentItemId: null,
      releaseId: 'R0003',
      size: 'M',
      status: 'Testing',
    },
    {
      workItemId: 'wi-1006',
      title: 'Parent migration epic',
      description: 'Parent item for child demo.',
      assignedToId: 'per-7',
      assignedDate: before(8),
      goalDate: within(14),
      brf: false,
      complete: false,
      categoryId: 'cat-2',
      parentItemId: null,
      releaseId: 'R0001',
      size: 'XXL',
      status: 'Execution',
    },
    {
      workItemId: 'wi-1007',
      title: 'Sub-task: data mapping',
      description: 'Child item under migration epic.',
      assignedToId: 'per-3',
      assignedDate: before(4),
      goalDate: within(9),
      brf: false,
      complete: false,
      categoryId: 'cat-2',
      parentItemId: 'wi-1006',
      releaseId: 'R0001',
      size: 'M',
      status: 'Assigned',
    },
    {
      workItemId: 'wi-1008',
      title: 'Close out retired release',
      description: 'Completed history example.',
      assignedToId: 'per-8',
      assignedDate: before(25),
      goalDate: before(4),
      brf: false,
      complete: true,
      categoryId: 'cat-5',
      parentItemId: null,
      releaseId: 'R0004',
      size: 'S',
      status: 'Complete',
    },
    {
      workItemId: 'wi-1009',
      title: 'Document descoped ask',
      description: 'Descoped path example.',
      assignedToId: null,
      assignedDate: '',
      goalDate: within(13),
      brf: false,
      complete: false,
      categoryId: 'cat-9',
      parentItemId: null,
      releaseId: null,
      size: 'XS',
      status: 'Descoped',
    },
    {
      workItemId: 'wi-1010',
      title: 'Regression test release cutover',
      description: 'Ready for release example.',
      assignedToId: 'per-4',
      assignedDate: before(1),
      goalDate: within(7),
      brf: true,
      complete: false,
      categoryId: 'cat-4',
      parentItemId: null,
      releaseId: 'R0002',
      size: 'L',
      status: 'Await Deploy',
    },
  ]

  const blockers: Blocker[] = [
    {
      blockerId: 'blk-1',
      title: 'Credential rotation',
      workItemId: 'wi-1004',
      blockerTypeId: 'bt-1',
      logged: before(1),
      assignedToId: 'per-1',
      lastValidated: before(2),
      blockerActive: true,
      expectedResolution: within(2),
      nextValidation: before(1),
      priorStatus: 'Execution',
    },
    {
      blockerId: 'blk-2',
      title: 'UAT sign-off waiting',
      workItemId: 'wi-1010',
      blockerTypeId: 'bt-2',
      logged: before(4),
      assignedToId: 'per-4',
      lastValidated: before(1),
      blockerActive: true,
      expectedResolution: within(4),
      nextValidation: within(1),
      priorStatus: 'Testing',
    },
    {
      blockerId: 'blk-3',
      title: 'Historical blocker restore demo',
      workItemId: 'wi-1006',
      blockerTypeId: 'bt-3',
      logged: before(10),
      assignedToId: 'per-7',
      lastValidated: before(8),
      blockerActive: false,
      expectedResolution: before(6),
      nextValidation: before(7),
      priorStatus: 'Assigned',
    },
  ]

  const links: Link[] = [
    { linkId: 'lnk-1', name: 'RITM1000123', workItemId: 'wi-1004', linkType: 'RITM', number: 'RITM1000123' },
    { linkId: 'lnk-2', name: 'INC2000456', workItemId: 'wi-1004', linkType: 'INC', number: 'INC2000456' },
    { linkId: 'lnk-3', name: 'ADO 4112', workItemId: 'wi-1001', linkType: 'ADO', number: '4112' },
    { linkId: 'lnk-4', name: 'AskMe 98', workItemId: 'wi-1003', linkType: 'AskMe', number: '98' },
    { linkId: 'lnk-5', name: 'CRF 77', workItemId: 'wi-1010', linkType: 'CRF', number: '77' },
  ]

  return { categories, blockerTypes, workItems, links, blockers, persons, releases }
}

export const parseLocalDate = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export const daysRemaining = (goalDate: string) => {
  if (!goalDate) {
    return Number.POSITIVE_INFINITY
  }
  const today = parseLocalDate(todayString())
  const goal = parseLocalDate(goalDate)
  return Math.round((goal.getTime() - today.getTime()) / oneDay)
}

export const formatDisplayDate = (value: string) =>
  value
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }).format(parseLocalDate(value))
    : '—'

export const statusColor = (status: Status) => `badge badge-status-${status.toLowerCase().replaceAll(' ', '-')}`
export const sizeColor = (size: Size) => `badge badge-size-${size.toLowerCase()}`
export const releaseTypeColor = (type: ReleaseType) =>
  type === 'PGT' ? 'badge badge-plum' : type === 'BreakFix' ? 'badge badge-paprika' : 'badge badge-neutral'

export const normalizeLinkNumber = (type: LinkType, raw: string) => {
  const trimmed = raw.trim()
  if (type === 'AskMe') {
    return trimmed.replace(/\D+/g, '')
  }
  if (type === 'INC' || type === 'RITM') {
    const digits = trimmed.replace(/[^0-9]/g, '')
    return digits ? `${type}${digits}` : ''
  }
  return trimmed
}

export const validateLinkNumber = (type: LinkType, raw: string) => {
  const normalized = normalizeLinkNumber(type, raw)
  if (!normalized) {
    return 'A value is required.'
  }
  if (type === 'AskMe' && !/^\d+$/.test(normalized)) {
    return 'AskMe links must contain digits only.'
  }
  if (type === 'INC' && !/^INC\d+$/.test(normalized)) {
    return 'INC links must end in digits.'
  }
  if (type === 'RITM' && !/^RITM\d+$/.test(normalized)) {
    return 'RITM links must end in digits.'
  }
  return ''
}

export const deriveLinkDisplayName = (type: LinkType, number: string) => {
  if (type === 'RITM' || type === 'INC') {
    return number
  }
  if (type === 'AskMe') {
    return `AskMe ${number}`
  }
  return `${type} ${number}`
}

export const buildLinkUrl = (type: LinkType, number: string) => {
  if (type === 'AskMe') {
    return `https://nexus.pepsico.com/backlog/DispForm.aspx?ID=${number}`
  }
  if (type === 'INC' || type === 'RITM') {
    return `https://pepsico.service-now.com/nav_to.do?uri=task_list.do?sysparm_query=number=${number}`
  }
  if (type === 'ADO') {
    return `https://dev.azure.com/pepsico/WorkTrack/_workitems/edit/${number}`
  }
  if (type === 'CRF') {
    return `https://crf.pepsico.com/request/${number}`
  }
  return '#'
}

export const blockerValidationStatus = (lastValidated: string, days: number) => {
  return daysRemaining(addDays(lastValidated, days)) < 0 ? 'revalidate' : 'valid'
}

export const blockerBadgeStatus = (
  blockerActive: boolean,
  nextValidation: string,
): BlockerBadgeStatus => {
  if (!blockerActive) {
    return 'cleared'
  }
  return daysRemaining(nextValidation) < 0 ? 'revalidate' : 'valid'
}

export const blockerBadgeClass = (status: BlockerBadgeStatus) => `badge badge-${status}`
export const computeNextValidation = (lastValidated: string, days: number) => addDays(lastValidated, days)

export const computePriorStatus = (workItem: WorkItem, activeBlockersForWorkItem: Blocker[]) => {
  if (workItem.status !== 'Blocked') {
    return workItem.status
  }
  const prior = activeBlockersForWorkItem.find(
    (blocker) => blocker.priorStatus && blocker.priorStatus !== 'Blocked',
  )
  return prior?.priorStatus || 'Execution'
}

export const sortBlockerTypesForDialog = (items: BlockerType[]) => {
  const priority = new Map([
    ['Hard', 0],
    ['Soft', 1],
    ['Potential', 2],
  ])
  return [...items].sort((left, right) => {
    const leftRank = priority.get(left.name) ?? 99
    const rightRank = priority.get(right.name) ?? 99
    if (leftRank !== rightRank) {
      return leftRank - rightRank
    }
    return left.name.localeCompare(right.name)
  })
}

const getLastChangedMap = () => {
  if (typeof window === 'undefined') {
    return {} as Record<string, string>
  }
  const raw = window.localStorage.getItem(LAST_CHANGED_KEY)
  return raw ? (JSON.parse(raw) as Record<string, string>) : {}
}

export const getLastChanged = (workItemId: string) => getLastChangedMap()[workItemId] || 'Seeded data'

export const touchLastChanged = (workItemId: string) => {
  if (typeof window === 'undefined') {
    return
  }
  const next = getLastChangedMap()
  next[workItemId] = new Date().toLocaleString()
  window.localStorage.setItem(LAST_CHANGED_KEY, JSON.stringify(next))
}

const enrichPendingPersons = (persons: Person[]) =>
  persons.map((person) => {
    if (person.title && person.role) {
      return person
    }
    if (!person.pendingCreatedAt || Date.now() - person.pendingCreatedAt < 3500) {
      return person
    }
    const base = person.email.split('@')[0] || 'Pending Person'
    return {
      ...person,
      title: base
        .split(/[._-]/)
        .filter(Boolean)
        .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
        .join(' '),
      role: 'Enriched Analyst',
      pendingCreatedAt: undefined,
    }
  })

const ensureFallbackPerson = (persons: Person[]) => {
  const fallback = persons.find((person) => person.email.toLowerCase() === FALLBACK_EMAIL)
  if (fallback) {
    if (!fallback.active) {
      fallback.active = true
    }
    return persons
  }
  return [
    ...persons,
    { id: `per-${Date.now()}`, title: 'Michael Girardi', email: FALLBACK_EMAIL, role: 'Program Manager', active: true },
  ]
}

export const loadDb = (): WorktrackDb => {
  if (typeof window === 'undefined') {
    return seedDb()
  }
  const raw = window.localStorage.getItem(STORAGE_KEY)
  const parsed = raw ? (JSON.parse(raw) as WorktrackDb) : seedDb()
  const next: WorktrackDb = {
    ...parsed,
    persons: ensureFallbackPerson(enrichPendingPersons(parsed.persons)),
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export const saveDb = (db: WorktrackDb) => {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

export const updateDb = (updater: (db: WorktrackDb) => WorktrackDb) => {
  const next = updater(loadDb())
  saveDb(next)
  return next
}

const queryKeys = {
  categories: ['categories'],
  blockerTypes: ['blockerTypes'],
  workItems: ['workItems'],
  links: ['links'],
  blockers: ['blockers'],
  persons: ['persons'],
  releases: ['releases'],
} as const

const invalidateAll = (
  queryClient: ReturnType<typeof useQueryClient>,
  keys: ReadonlyArray<readonly string[]>,
) =>
  Promise.all(keys.map((key) => queryClient.invalidateQueries({ queryKey: key })))

const useCrudMutations = <T,>(
  key: readonly string[],
  field: keyof WorktrackDb,
  getId: (item: T) => string,
) => {
  const queryClient = useQueryClient()

  const create = useMutation({
    mutationFn: async (item: T) => {
      updateDb((db) => ({ ...db, [field]: [...((db[field] as unknown) as T[]), item] }))
      return item
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })

  const update = useMutation({
    mutationFn: async (item: T) => {
      updateDb((db) => ({
        ...db,
        [field]: ((db[field] as unknown) as T[]).map((current) =>
          getId(current) === getId(item) ? item : current,
        ),
      }))
      return item
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      updateDb((db) => ({
        ...db,
        [field]: ((db[field] as unknown) as T[]).filter((current) => getId(current) !== id),
      }))
      return id
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key })
    },
  })

  return { create, update, remove }
}

export const useCategories = () => useQuery({ queryKey: queryKeys.categories, queryFn: async () => loadDb().categories })
export const useBlockerTypes = () =>
  useQuery({ queryKey: queryKeys.blockerTypes, queryFn: async () => loadDb().blockerTypes })
export const useWorkItems = () => useQuery({ queryKey: queryKeys.workItems, queryFn: async () => loadDb().workItems })
export const useLinks = () => useQuery({ queryKey: queryKeys.links, queryFn: async () => loadDb().links })
export const useBlockers = () => useQuery({ queryKey: queryKeys.blockers, queryFn: async () => loadDb().blockers })
export const usePersons = () =>
  useQuery({
    queryKey: queryKeys.persons,
    queryFn: async () => loadDb().persons,
    refetchInterval: (query) => {
      const persons = (query.state.data as Person[] | undefined) ?? []
      return persons.some((person) => !person.title || !person.role) ? 3000 : false
    },
  })
export const useReleases = () => useQuery({ queryKey: queryKeys.releases, queryFn: async () => loadDb().releases })

export const useCategoryMutations = () => useCrudMutations<Category>(queryKeys.categories, 'categories', (item) => item.categoryId)
export const useBlockerTypeMutations = () =>
  useCrudMutations<BlockerType>(queryKeys.blockerTypes, 'blockerTypes', (item) => item.blockerTypeId)
export const useWorkItemMutations = () => useCrudMutations<WorkItem>(queryKeys.workItems, 'workItems', (item) => item.workItemId)
export const useLinkMutations = () => useCrudMutations<Link>(queryKeys.links, 'links', (item) => item.linkId)
export const useBlockerMutations = () => useCrudMutations<Blocker>(queryKeys.blockers, 'blockers', (item) => item.blockerId)
export const usePersonMutations = () => useCrudMutations<Person>(queryKeys.persons, 'persons', (item) => item.id)
export const useReleaseMutations = () => useCrudMutations<Release>(queryKeys.releases, 'releases', (item) => item.id)

export const useDeletePersonCascade = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (personId: string) => {
      const db = loadDb()
      const fallback = db.persons.find((person) => person.email.toLowerCase() === FALLBACK_EMAIL)
      const fallbackId = fallback?.id || `per-${Date.now()}`
      const nextPersons =
        fallback ||
        db.persons.some((person) => person.email.toLowerCase() === FALLBACK_EMAIL)
          ? db.persons
          : [
              ...db.persons,
              {
                id: fallbackId,
                title: 'Michael Girardi',
                email: FALLBACK_EMAIL,
                role: 'Program Manager',
                active: true,
              },
            ]
      let unassignedCount = 0
      let reassignedCount = 0
      const workItems = db.workItems.map((item) => {
        if (item.assignedToId === personId) {
          unassignedCount += 1
          touchLastChanged(item.workItemId)
          return { ...item, assignedToId: null, assignedDate: '' }
        }
        return item
      })
      const blockers = db.blockers.map((blocker) => {
        if (blocker.assignedToId === personId) {
          reassignedCount += 1
          return { ...blocker, assignedToId: fallbackId }
        }
        return blocker
      })
      saveDb({
        ...db,
        persons: nextPersons.filter((person) => person.id !== personId),
        workItems,
        blockers,
      })
      return { unassignedCount, reassignedCount }
    },
    onSuccess: async (summary) => {
      window.alert(`Deleted person. Unassigned ${summary.unassignedCount} work items and reassigned ${summary.reassignedCount} blockers.`)
      await invalidateAll(queryClient, [
        queryKeys.persons,
        queryKeys.workItems,
        queryKeys.blockers,
      ])
    },
  })
}

export const releaseSequence = (releases: Release[]) => {
  const next = releases
    .map((release) => Number.parseInt(release.id.replace(/\D+/g, ''), 10))
    .filter((value) => Number.isFinite(value))
  const max = next.length ? Math.max(...next) : 0
  return `R${`${max + 1}`.padStart(4, '0')}`
}

export const matchesWorkItemSearch = (item: WorkItem, people: Person[], value: string) => {
  if (!value.trim()) {
    return true
  }
  const person = people.find((entry) => entry.id === item.assignedToId)
  const haystack = [item.workItemId, item.title, person?.title, person?.email].join(' ').toLowerCase()
  return haystack.includes(value.trim().toLowerCase())
}
