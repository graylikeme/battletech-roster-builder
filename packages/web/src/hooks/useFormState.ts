import { useReducer, useEffect } from 'react'
import type { Mission, Era, FactionType, TechBase, RulesLevel } from '@bt-roster/core'

const STORAGE_KEY = 'bt-form-state'

export interface FormState {
  unitSource: 'api' | 'collection'
  collectionId: string
  mission: Mission | ''
  bv: number
  count: number
  era: Era | ''
  factionType: FactionType | ''
  factionSlug: string
  techBase: TechBase | ''
  rulesLevel: RulesLevel
  pilotMode: 'auto' | 'fixed'
  gunnery: number
  piloting: number
  variants: number
  seed: string
}

type FormAction =
  | { type: 'SET_FIELD'; field: keyof FormState; value: FormState[keyof FormState] }
  | { type: 'RESET' }

const defaultState: FormState = {
  unitSource: 'api',
  collectionId: '',
  mission: '',
  bv: 6000,
  count: 4,
  era: '',
  factionType: '',
  factionSlug: '',
  techBase: '',
  rulesLevel: 'STANDARD',
  pilotMode: 'auto',
  gunnery: 4,
  piloting: 5,
  variants: 1,
  seed: '',
}

function loadState(): FormState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultState, ...JSON.parse(raw) }
  } catch {}
  return defaultState
}

function reducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value }
    case 'RESET':
      return defaultState
    default:
      return state
  }
}

export function useFormState() {
  const [form, dispatch] = useReducer(reducer, null, loadState)

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(form))
  }, [form])

  const setField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    dispatch({ type: 'SET_FIELD', field, value: value as FormState[keyof FormState] })
  }

  const isValid = form.mission !== '' && form.era !== '' && form.bv > 0 && form.count > 0
    && (form.unitSource === 'api' || form.collectionId !== '')

  return { form, setField, isValid, reset: () => dispatch({ type: 'RESET' }) }
}
