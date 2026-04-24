import { cn } from '@vigooth/ui';
import { Folder, PasswordEntry } from '../../lib/crypto/vault';
import { colorStyles } from './types';
import { EntryCard } from './EntryCard';
import { AddEntryForm } from './AddEntryForm';
import { useVault } from './VaultContext';

interface FolderCardProps {
  folder: Folder;
  entries: PasswordEntry[];
  index: number;
}

export function FolderCard({ folder, entries, index }: FolderCardProps) {
  const { addingToFolder, setAddingToFolder, deleteFolder } = useVault();
  const colors = colorStyles[folder.color || 'green'];
  const isAddingEntry = addingToFolder === folder.id;

  const handleHeaderClick = () => {
    if (!isAddingEntry) {
      setAddingToFolder(folder.id);
    }
  };

  return (
    <div className="border-2 border-cpc-green-500 p-3">
      {/* Folder header */}
      <div className="flex justify-between items-center mb-3">
        <div
          onClick={handleHeaderClick}
          className={cn(
            'font-bold flex items-center gap-2 cursor-pointer hover:opacity-80',
            colors.text,
          )}
        >
          <span className="text-cpc-green-500 opacity-60">[{index}]</span>
          <span>📂</span>
          <span>{folder.name}</span>
          <span className="text-xs opacity-60">({entries.length})</span>
        </div>
        <button
          onClick={() => deleteFolder(folder.id)}
          className="text-cpc-red-500 hover:text-cpc-red-900 text-xs"
        >
          ✕
        </button>
      </div>

      {/* Entries */}
      <div className="space-y-2">
        {entries.map((entry, entryIndex) => (
          <EntryCard key={entry.id} entry={entry} index={entryIndex + 1} />
        ))}

        {isAddingEntry && <AddEntryForm folderId={folder.id} />}
      </div>
    </div>
  );
}
