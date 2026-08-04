import { useState } from 'react';
import { CpcButton, cn } from '@vigooth/ui';
import {
  type InitiativeEntry,
  type InitiativeState,
  nextTurn,
  prevTurn,
  resetInitiative,
  sortByInitiative,
} from '@/types/initiative';
import { useHorizontalResize } from '@/hooks/useHorizontalResize';

interface InitiativePanelProps {
  state: InitiativeState;
  onChange: (state: InitiativeState) => void;
}

const inputClass =
  'bg-black border border-cpc-green-900 text-cpc-green-500 text-xs px-1 py-0.5 outline-none focus:border-cpc-cyan-500';

export function InitiativePanel({ state, onChange }: InitiativePanelProps) {
  const { width, onPointerDown } = useHorizontalResize({
    initial: 280,
    min: 220,
    max: 480,
    side: 'right',
  });
  const [newName, setNewName] = useState('');
  const [newInit, setNewInit] = useState('');
  const [isPlayer, setIsPlayer] = useState(false);
  const [conditionInputs, setConditionInputs] = useState<Record<string, string>>({});

  const sorted = sortByInitiative(state.entries);
  const activeId = state.entries[state.activeIndex]?.id;

  const addEntry = () => {
    const name = newName.trim();
    if (!name) return;
    const initVal = parseInt(newInit, 10);
    if (Number.isNaN(initVal)) return;
    const entry: InitiativeEntry = {
      id: crypto.randomUUID(),
      name,
      initiative: initVal,
      hp: 10,
      maxHp: 10,
      conditions: [],
      isPlayer,
      stampId: null,
    };
    onChange({ ...state, entries: [...state.entries, entry] });
    setNewName('');
    setNewInit('');
  };

  const updateEntry = (id: string, patch: Partial<InitiativeEntry>) => {
    onChange({
      ...state,
      entries: state.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    });
  };

  const removeEntry = (id: string) => {
    const idx = state.entries.findIndex((e) => e.id === id);
    if (idx === -1) return;
    const newEntries = state.entries.filter((e) => e.id !== id);
    let activeIndex = state.activeIndex;
    if (newEntries.length === 0) activeIndex = 0;
    else if (idx < state.activeIndex) activeIndex = state.activeIndex - 1;
    else if (idx === state.activeIndex && activeIndex >= newEntries.length)
      activeIndex = newEntries.length - 1;
    onChange({ ...state, entries: newEntries, activeIndex });
  };

  const addCondition = (id: string) => {
    const input = conditionInputs[id]?.trim();
    if (!input) return;
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) return;
    if (entry.conditions.includes(input)) return;
    updateEntry(id, { conditions: [...entry.conditions, input] });
    setConditionInputs((s) => ({ ...s, [id]: '' }));
  };

  const removeCondition = (id: string, cond: string) => {
    const entry = state.entries.find((e) => e.id === id);
    if (!entry) return;
    updateEntry(id, { conditions: entry.conditions.filter((c) => c !== cond) });
  };

  return (
    <aside
      style={{ width }}
      className="relative shrink-0 border-l border-cpc-green-900 p-2 flex flex-col gap-2 overflow-y-auto bg-black"
    >
      <div className="flex items-center justify-between">
        <div className="text-cpc-cyan-500 font-bold text-xs tracking-wider">
          INITIATIVE — ROUND {state.round}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <CpcButton
          size="xs"
          color="green"
          onClick={() => onChange(prevTurn(state))}
          disabled={state.entries.length === 0}
        >
          PREV
        </CpcButton>
        <CpcButton
          size="xs"
          color="cyan"
          fullWidth
          className="justify-center"
          onClick={() => onChange(nextTurn(state))}
          disabled={state.entries.length === 0}
        >
          NEXT TURN
        </CpcButton>
        <CpcButton
          size="xs"
          color="yellow"
          onClick={() => onChange(resetInitiative(state))}
          disabled={state.entries.length === 0}
        >
          RST
        </CpcButton>
      </div>

      <div className="border border-cpc-green-900 p-1.5 flex flex-col gap-1">
        <div className="text-cpc-green-900 text-[10px]">ADD ENTRY</div>
        <div className="flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addEntry();
            }}
            placeholder="Name"
            className={inputClass + ' flex-1 min-w-0'}
          />
          <input
            type="number"
            value={newInit}
            onChange={(e) => setNewInit(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addEntry();
            }}
            placeholder="Init"
            className={inputClass + ' w-12'}
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-cpc-green-900 text-[10px] flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={isPlayer}
              onChange={(e) => setIsPlayer(e.target.checked)}
              className="accent-cpc-cyan-500"
            />
            PLAYER
          </label>
          <CpcButton size="xs" color="green" onClick={addEntry} disabled={!newName.trim()}>
            ADD
          </CpcButton>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        {sorted.length === 0 && (
          <div className="text-cpc-green-900 text-xs text-center py-4">
            No participants yet
          </div>
        )}
        {sorted.map((entry) => {
          const isActive = entry.id === activeId;
          return (
            <div
              key={entry.id}
              className={cn(
                'border p-1.5 flex flex-col gap-1',
                isActive
                  ? 'border-cpc-cyan-500 bg-cpc-cyan-500/5'
                  : 'border-cpc-green-900',
              )}
            >
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={entry.initiative}
                  onChange={(e) =>
                    updateEntry(entry.id, { initiative: Number(e.target.value) || 0 })
                  }
                  className={inputClass + ' w-10'}
                />
                <input
                  type="text"
                  value={entry.name}
                  onChange={(e) => updateEntry(entry.id, { name: e.target.value })}
                  className={cn(
                    inputClass,
                    'flex-1 min-w-0 font-bold',
                    entry.isPlayer ? 'text-cpc-cyan-500' : 'text-cpc-red-500',
                  )}
                />
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-cpc-red-500 text-xs px-1 hover:bg-cpc-red-500 hover:text-black"
                  title="Remove"
                >
                  X
                </button>
              </div>

              <div className="flex items-center gap-1 text-[10px] text-cpc-green-900">
                HP
                <input
                  type="number"
                  value={entry.hp}
                  onChange={(e) => updateEntry(entry.id, { hp: Number(e.target.value) || 0 })}
                  className={inputClass + ' w-12'}
                />
                /
                <input
                  type="number"
                  value={entry.maxHp}
                  onChange={(e) =>
                    updateEntry(entry.id, { maxHp: Number(e.target.value) || 0 })
                  }
                  className={inputClass + ' w-12'}
                />
                <div className="flex-1 ml-1 h-2 bg-cpc-grey-900 border border-cpc-green-900 relative">
                  <div
                    className={cn(
                      'absolute inset-y-0 left-0',
                      entry.hp <= 0
                        ? 'bg-cpc-red-500'
                        : entry.hp <= entry.maxHp * 0.3
                          ? 'bg-cpc-yellow-500'
                          : 'bg-cpc-green-500',
                    )}
                    style={{
                      width: `${Math.max(0, Math.min(100, (entry.hp / Math.max(1, entry.maxHp)) * 100))}%`,
                    }}
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {entry.conditions.map((cond) => (
                  <span
                    key={cond}
                    className="inline-flex items-center gap-1 border border-cpc-magenta-500 text-cpc-magenta-500 text-[10px] px-1"
                  >
                    {cond}
                    <button
                      type="button"
                      onClick={() => removeCondition(entry.id, cond)}
                      className="hover:text-cpc-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  value={conditionInputs[entry.id] ?? ''}
                  onChange={(e) =>
                    setConditionInputs((s) => ({ ...s, [entry.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCondition(entry.id);
                  }}
                  placeholder="+ condition"
                  className={inputClass + ' flex-1 min-w-20 text-[10px]'}
                />
              </div>
            </div>
          );
        })}
      </div>

      {state.entries.length > 0 && (
        <CpcButton
          size="xs"
          color="red"
          fullWidth
          className="justify-center mt-1"
          onClick={() => {
            if (window.confirm('Clear all initiative entries?')) {
              onChange({ entries: [], activeIndex: 0, round: 1 });
            }
          }}
        >
          CLEAR ALL
        </CpcButton>
      )}

      <div
        onPointerDown={onPointerDown}
        className="absolute top-0 left-0 bottom-0 w-1 cursor-col-resize hover:bg-cpc-cyan-500/40 z-10"
      />
    </aside>
  );
}
