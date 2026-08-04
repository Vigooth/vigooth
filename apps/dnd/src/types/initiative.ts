export interface InitiativeEntry {
  id: string;
  name: string;
  initiative: number;
  hp: number;
  maxHp: number;
  conditions: string[];
  isPlayer: boolean;
  stampId: string | null;
}

export interface InitiativeState {
  entries: InitiativeEntry[];
  activeIndex: number;
  round: number;
}

export function emptyInitiative(): InitiativeState {
  return { entries: [], activeIndex: 0, round: 1 };
}

export function sortByInitiative(entries: InitiativeEntry[]): InitiativeEntry[] {
  return entries.toSorted((a, b) => b.initiative - a.initiative);
}

export function nextTurn(state: InitiativeState): InitiativeState {
  if (state.entries.length === 0) return state;
  const nextIndex = (state.activeIndex + 1) % state.entries.length;
  const round = nextIndex === 0 ? state.round + 1 : state.round;
  return { ...state, activeIndex: nextIndex, round };
}

export function prevTurn(state: InitiativeState): InitiativeState {
  if (state.entries.length === 0) return state;
  const prevIndex =
    state.activeIndex === 0 ? state.entries.length - 1 : state.activeIndex - 1;
  const round = state.activeIndex === 0 ? Math.max(1, state.round - 1) : state.round;
  return { ...state, activeIndex: prevIndex, round };
}

export function resetInitiative(state: InitiativeState): InitiativeState {
  return { ...state, activeIndex: 0, round: 1 };
}
