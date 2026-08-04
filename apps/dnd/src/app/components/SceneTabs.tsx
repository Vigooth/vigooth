import { useEffect, useRef, useState } from 'react';
import { CpcButton, cn } from '@vigooth/ui';
import type { Scene } from '@/types/campaign';
import { ContextMenu, type ContextMenuItem } from '@/components/ContextMenu';

interface SceneTabsProps {
  scenes: Scene[];
  activeSceneId: string;
  onSwitch: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

interface CtxState {
  x: number;
  y: number;
  sceneId: string;
}

export function SceneTabs(props: SceneTabsProps) {
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commitRename = () => {
    if (!editing) return;
    const name = editing.value.trim();
    if (name) props.onRename(editing.id, name);
    setEditing(null);
  };

  const ctxItems: ContextMenuItem[] = ctx
    ? [
        {
          label: 'RENAME',
          onClick: () => {
            const scene = props.scenes.find((s) => s.id === ctx.sceneId);
            if (scene) setEditing({ id: scene.id, value: scene.name });
          },
        },
        { label: 'DUPLICATE', onClick: () => props.onDuplicate(ctx.sceneId) },
        {
          label: 'DELETE',
          onClick: () => {
            if (props.scenes.length <= 1) {
              window.alert('Cannot delete the last scene.');
              return;
            }
            const scene = props.scenes.find((s) => s.id === ctx.sceneId);
            if (scene && window.confirm(`Delete scene "${scene.name}"?`)) {
              props.onDelete(ctx.sceneId);
            }
          },
          danger: true,
          disabled: props.scenes.length <= 1,
        },
      ]
    : [];

  return (
    <div className="border-b border-cpc-green-900 px-2 py-1 flex items-center gap-1 overflow-x-auto">
      {props.scenes.map((scene) => {
        const isActive = scene.id === props.activeSceneId;
        const isEditing = editing?.id === scene.id;
        return (
          <div
            key={scene.id}
            onClick={() => !isEditing && props.onSwitch(scene.id)}
            onDoubleClick={() => setEditing({ id: scene.id, value: scene.name })}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtx({ x: e.clientX, y: e.clientY, sceneId: scene.id });
            }}
            className={cn(
              'px-2 py-1 text-xs cursor-pointer border whitespace-nowrap shrink-0',
              isActive
                ? 'border-cpc-cyan-500 text-cpc-cyan-500'
                : 'border-cpc-green-900 text-cpc-green-500 hover:border-cpc-green-500',
            )}
          >
            {isEditing ? (
              <input
                ref={inputRef}
                value={editing!.value}
                onChange={(e) => setEditing({ id: scene.id, value: e.target.value })}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  else if (e.key === 'Escape') setEditing(null);
                }}
                className="bg-black text-cpc-cyan-500 outline-none w-32"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              scene.name
            )}
          </div>
        );
      })}
      <CpcButton size="xs" color="green" onClick={props.onAdd} className="shrink-0">
        + SCENE
      </CpcButton>

      {ctx && (
        <ContextMenu x={ctx.x} y={ctx.y} items={ctxItems} onClose={() => setCtx(null)} />
      )}
    </div>
  );
}
