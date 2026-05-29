import { useEffect, useState } from 'react';
import { CpcButton } from '@vigooth/ui';
import type { CampaignMeta } from '@/types/campaign';

interface CampaignDialogProps {
  campaigns: CampaignMeta[];
  currentId: string | null;
  usage: number;
  onLoad: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function CampaignDialog({
  campaigns,
  currentId,
  usage,
  onLoad,
  onCreate,
  onRename,
  onDelete,
  onClose,
}: CampaignDialogProps) {
  const [newName, setNewName] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const commitRename = () => {
    if (!editing) return;
    const name = editing.value.trim();
    if (name) onRename(editing.id, name);
    setEditing(null);
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-40 flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-black border-2 border-cpc-green-500 w-full max-w-md p-4 font-mono">
        <div className="flex items-center justify-between mb-3">
          <div className="text-cpc-cyan-500 font-bold tracking-wider">CAMPAIGNS</div>
          <div className="text-cpc-green-900 text-xs">{formatBytes(usage)} used</div>
        </div>

        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newName.trim()) {
                onCreate(newName.trim());
                setNewName('');
              }
            }}
            placeholder="New campaign name"
            className="flex-1 bg-black border border-cpc-green-900 text-cpc-green-500 text-sm px-2 py-1 outline-none focus:border-cpc-cyan-500"
          />
          <CpcButton
            size="xs"
            color="cyan"
            disabled={!newName.trim()}
            onClick={() => {
              onCreate(newName.trim());
              setNewName('');
            }}
          >
            CREATE
          </CpcButton>
        </div>

        <div className="text-cpc-green-900 text-xs mb-1">
          {campaigns.length > 0 ? 'EXISTING' : 'NO CAMPAIGNS YET'}
        </div>
        <div className="max-h-72 overflow-y-auto border border-cpc-green-900">
          {campaigns.map((c) => {
            const isCurrent = c.id === currentId;
            const isEditing = editing?.id === c.id;
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 px-2 py-1 border-b border-cpc-green-900 last:border-b-0 hover:bg-cpc-green-500/10"
              >
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editing!.value}
                      onChange={(e) => setEditing({ id: c.id, value: e.target.value })}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename();
                        else if (e.key === 'Escape') setEditing(null);
                      }}
                      className="w-full bg-black border border-cpc-green-900 text-cpc-cyan-500 text-sm px-1 outline-none focus:border-cpc-cyan-500"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => onLoad(c.id)}
                      className="text-left w-full"
                    >
                      <div className="text-cpc-green-500 text-sm">
                        {c.name}
                        {isCurrent && <span className="text-cpc-cyan-500 ml-2">[CURRENT]</span>}
                      </div>
                      <div className="text-cpc-green-900 text-[10px]">
                        {c.sceneCount} scene{c.sceneCount > 1 ? 's' : ''} ·{' '}
                        {new Date(c.updatedAt).toLocaleString()}
                      </div>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setEditing({ id: c.id, value: c.name })}
                  className="text-cpc-green-500 text-xs px-2 py-1 hover:bg-cpc-green-500 hover:text-black"
                >
                  REN
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${c.name}" and all its scenes?`)) onDelete(c.id);
                  }}
                  className="text-cpc-red-500 text-xs px-2 py-1 hover:bg-cpc-red-500 hover:text-black"
                >
                  DEL
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end mt-3">
          <CpcButton size="xs" color="green" onClick={onClose}>
            CLOSE
          </CpcButton>
        </div>
      </div>
    </div>
  );
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
