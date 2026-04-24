import { createContext, useContext, ReactNode } from "react";
import { ColorType } from "../../types/colors";

export type SidebarView =
  | { type: "folder"; folderId: string | null; activeNoteId?: string }
  | { type: "note"; noteId: string };

interface SidebarContextValue {
  activeView: SidebarView;
  selectFolder: (folderId: string | null) => void;
  selectNote: (noteId: string, folderId?: string | null) => void;
  addFolder: (name: string, color: ColorType) => void;
  deleteFolder: (folderId: string) => void;
  addNote: (title: string, color: ColorType, folderId?: string) => void;
  deleteNote: (noteId: string) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);

interface SidebarProviderProps {
  children: ReactNode;
  activeView: SidebarView;
  onSelectFolder: (folderId: string | null) => void;
  onSelectNote: (noteId: string, folderId?: string | null) => void;
  onAddFolder: (name: string, color: ColorType) => void;
  onDeleteFolder: (folderId: string) => void;
  onAddNote: (title: string, color: ColorType) => void;
  onDeleteNote: (noteId: string) => void;
}

export function SidebarProvider({
  children,
  activeView,
  onSelectFolder,
  onSelectNote,
  onAddFolder,
  onDeleteFolder,
  onAddNote,
  onDeleteNote,
}: SidebarProviderProps) {
  return (
    <SidebarContext.Provider
      value={{
        activeView,
        selectFolder: onSelectFolder,
        selectNote: onSelectNote,
        addFolder: onAddFolder,
        deleteFolder: onDeleteFolder,
        addNote: onAddNote,
        deleteNote: onDeleteNote,
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
