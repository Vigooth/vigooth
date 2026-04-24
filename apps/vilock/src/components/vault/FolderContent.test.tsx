import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";
import i18n from "i18next";
import { initReactI18next, I18nextProvider } from "react-i18next";
import { FolderContent } from "./FolderContent";
import { VaultProvider } from "./VaultContext";
import { SidebarProvider, SidebarView } from "./SidebarContext";
import type { Folder, PasswordEntry, Note } from "../../lib/crypto/vault";

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      translation: {
        "vault.unsorted": "NON CLASSÉ",
        "vault.empty.subtitle": "Créez un dossier pour organiser vos mots de passe",
        "entry.add": "AJOUTER",
        "note.untitled": "SANS TITRE",
      },
    },
  },
  lng: "fr",
  fallbackLng: "fr",
  keySeparator: false,
  interpolation: { escapeValue: false },
});

const mockVaultProps = {
  onAddEntry: vi.fn().mockResolvedValue(undefined),
  onDeleteEntry: vi.fn().mockResolvedValue(undefined),
  onDeleteFolder: vi.fn().mockResolvedValue(undefined),
  onAddNote: vi.fn().mockResolvedValue("new-note-id"),
  onUpdateFolder: vi.fn().mockResolvedValue(undefined),
  onUpdateNote: vi.fn().mockResolvedValue(undefined),
  onUpdateEntry: vi.fn().mockResolvedValue(undefined),
  onGeneratePassword: vi.fn().mockReturnValue("gen-password-123"),
};

const defaultView: SidebarView = { type: "folder", folderId: null };

const mockSidebarProps = {
  activeView: defaultView,
  onSelectFolder: vi.fn(),
  onSelectNote: vi.fn(),
  onAddFolder: vi.fn(),
  onDeleteFolder: vi.fn(),
  onAddNote: vi.fn(),
  onDeleteNote: vi.fn(),
};

function renderFolderContent(props: {
  folder?: Folder | null;
  entries?: PasswordEntry[];
  notes?: Note[];
  folderIndex?: number;
}) {
  const { folder = null, entries = [], notes = [], folderIndex = 0 } = props;

  return render(
    <I18nextProvider i18n={i18n}>
      <SidebarProvider {...mockSidebarProps}>
        <VaultProvider {...mockVaultProps}>
          <FolderContent
            folder={folder}
            entries={entries}
            notes={notes}
            folderIndex={folderIndex}
          />
        </VaultProvider>
      </SidebarProvider>
    </I18nextProvider>,
  );
}

const makeFolder = (overrides?: Partial<Folder>): Folder => ({
  id: "folder-1",
  name: "EMAILS",
  color: "green",
  createdAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeEntry = (overrides?: Partial<PasswordEntry>): PasswordEntry => ({
  id: "entry-1",
  folderId: "folder-1",
  name: "Gmail",
  username: "user@gmail.com",
  password: "secret123",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const makeNote = (overrides?: Partial<Note>): Note => ({
  id: "note-1",
  title: "Ma note",
  content: "Contenu de la note",
  color: "green",
  folderId: "folder-1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

describe("FolderContent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders folder name in an editable input", () => {
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    const input = screen.getByDisplayValue("EMAILS");
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe("INPUT");
  });

  it('renders "NON CLASSÉ" for root folder (null)', () => {
    renderFolderContent({ folder: null, folderIndex: 0 });

    expect(screen.getByText("NON CLASSÉ")).toBeInTheDocument();
  });

  it("displays the folder index", () => {
    renderFolderContent({ folder: makeFolder(), folderIndex: 3 });

    expect(screen.getByText("[3]")).toBeInTheDocument();
  });

  it("displays entry count", () => {
    const entries = [makeEntry(), makeEntry({ id: "entry-2", name: "Outlook" })];
    renderFolderContent({ folder: makeFolder(), entries, folderIndex: 1 });

    expect(screen.getByText("(2)")).toBeInTheDocument();
  });

  it("shows the add entry button", () => {
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    expect(screen.getByText("+ AJOUTER")).toBeInTheDocument();
  });

  it("shows delete button for non-root folders", () => {
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    expect(screen.getByText("✕")).toBeInTheDocument();
  });

  it("hides delete button for root folder", () => {
    renderFolderContent({ folder: null, folderIndex: 0 });

    expect(screen.queryByText("✕")).not.toBeInTheDocument();
  });

  it("renders note tabs", () => {
    const notes = [makeNote(), makeNote({ id: "note-2", title: "Autre note" })];
    renderFolderContent({ folder: makeFolder(), notes, folderIndex: 1 });

    expect(screen.getByText("Ma note")).toBeInTheDocument();
    expect(screen.getByText("Autre note")).toBeInTheDocument();
  });

  it("shows empty state when no entries or notes", () => {
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    expect(
      screen.getByText("Créez un dossier pour organiser vos mots de passe"),
    ).toBeInTheDocument();
  });

  it("calls addNote when + button is clicked on notes bar", async () => {
    const user = userEvent.setup();
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    const addNoteBtn = screen.getByText("+");
    await user.click(addNoteBtn);

    expect(mockVaultProps.onAddNote).toHaveBeenCalledWith("SANS TITRE", "green", "folder-1");
  });

  it("calls deleteFolder when delete button is clicked", async () => {
    const user = userEvent.setup();
    renderFolderContent({ folder: makeFolder(), folderIndex: 1 });

    await user.click(screen.getByText("✕"));

    expect(mockVaultProps.onDeleteFolder).toHaveBeenCalledWith("folder-1");
  });
});
