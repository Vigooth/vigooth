import { cn } from "@vigooth/ui";
import { useTranslation } from "react-i18next";
import { PasswordEntry } from "../../lib/crypto/vault";
import { useVault } from "./VaultContext";

interface EntryCardProps {
  entry: PasswordEntry;
  index?: number;
}

export function EntryCard({ entry, index }: EntryCardProps) {
  const { t } = useTranslation();
  const { expandedEntryId, toggleEntry, copiedField, copyField, deleteEntry } = useVault();
  const isExpanded = expandedEntryId === entry.id;

  return (
    <div
      onClick={() => toggleEntry(entry.id)}
      className={cn(
        "p-2 cursor-pointer transition-colors w-40",
        isExpanded ? "bg-cpc-green-500 text-cpc-grey-900" : "hover:bg-cpc-green-500/10",
      )}
    >
      <div className="flex justify-between items-center text-sm">
        <span className="font-bold truncate">
          {index && (
            <span className="text-cpc-green-500 text-xs relative top-[-5px] opacity-60 mr-1">
              [{index}]
            </span>
          )}
          {entry.name}
        </span>
      </div>
      <div className="text-xs truncate opacity-80">{entry.username}</div>

      {isExpanded && (
        <div className="mt-2 pt-2 border-t border-cpc-grey-900 space-y-2">
          {entry.url && <div className="text-xs opacity-80 truncate">{entry.url}</div>}
          <div className="flex flex-wrap gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyField(entry.username, `user-${entry.id}`);
              }}
              className="border border-current px-2 py-0.5 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500"
            >
              {copiedField === `user-${entry.id}` ? t("entry.copied") : t("entry.copyUser")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                copyField(entry.password, `pass-${entry.id}`);
              }}
              className="border border-current px-2 py-0.5 text-xs hover:bg-cpc-grey-900 hover:text-cpc-green-500"
            >
              {copiedField === `pass-${entry.id}` ? t("entry.copied") : t("entry.copyPass")}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteEntry(entry.id);
              }}
              className="border border-cpc-red-500 text-cpc-red-500 px-2 py-0.5 text-xs hover:bg-cpc-red-500 hover:text-cpc-grey-900"
            >
              {t("entry.delete")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
