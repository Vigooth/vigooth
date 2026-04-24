import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CpcInput, CpcButton } from "@vigooth/ui";
import { useFriendList } from "@/hooks/useFriendList";
import { usePlayerSearch } from "@/hooks/usePlayerSearch";
import type { FriendWithProfile } from "@/hooks/useFriendList";

const MIN_WIDTH = 48;
const MAX_WIDTH = 400;
const DEFAULT_WIDTH = 224;

function FriendRow({ friend, onClick }: { friend: FriendWithProfile; onClick: () => void }) {
  return (
    <div
      className="group flex items-center gap-2 px-2 py-1.5 hover:bg-cpc-magenta-500/10 cursor-pointer transition-colors"
      onClick={onClick}
    >
      {friend.avatarfull ? (
        <img
          src={friend.avatarfull}
          alt={friend.personaname}
          className="w-6 h-6 border border-cpc-green-900 group-hover:border-cpc-magenta-500 transition-colors shrink-0"
        />
      ) : (
        <div className="w-6 h-6 border border-cpc-green-900 flex items-center justify-center text-cpc-green-900 text-[8px] shrink-0">
          ?
        </div>
      )}
      <span className="text-cpc-green-500 text-xs truncate group-hover:text-cpc-magenta-500 transition-colors">
        {friend.personaname}
      </span>
    </div>
  );
}

function CollapsedSidebar({
  friendCount,
  onExpand,
}: {
  friendCount: number | null;
  onExpand: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center w-12 border-l border-cpc-green-900 shrink-0 h-full cursor-pointer hover:bg-cpc-magenta-500/10 transition-colors"
      onClick={onExpand}
    >
      <div className="p-2 text-cpc-magenta-500 text-[10px] font-bold writing-mode-vertical">
        FRIENDS
      </div>
      {friendCount !== null && <div className="text-cpc-green-900 text-[10px]">{friendCount}</div>}
    </div>
  );
}

export function FriendsSidebar() {
  const navigate = useNavigate();
  const { data: friends, isLoading, error } = useFriendList();
  const { search: searchSteam, searching, error: searchError } = usePlayerSearch();
  const [search, setSearch] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(0);

  const filtered = useMemo(() => {
    if (!friends) return [];
    if (!search) return friends;
    const q = search.toLowerCase();
    return friends.filter((f) => f.personaname.toLowerCase().includes(q));
  }, [friends, search]);

  const handleFriendClick = (steamid: string) => {
    navigate(`/u/${steamid}`);
    setMobileOpen(false);
  };

  const handleSteamSearch = () => {
    if (search.trim()) {
      searchSteam(search);
    }
  };

  const showSteamSearch = search.trim().length > 0 && filtered.length === 0 && !isLoading;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - e.clientX;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      if (newWidth <= MIN_WIDTH) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
        setWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const handleExpand = () => {
    setCollapsed(false);
    setWidth(DEFAULT_WIDTH);
  };

  const sidebarContent = (
    <>
      <div className="p-2 border-b border-cpc-green-900">
        <div className="text-cpc-magenta-500 text-xs font-bold mb-1.5">
          FRIENDS {friends ? `(${friends.length})` : ""}
        </div>
        <CpcInput
          value={search}
          onChange={setSearch}
          onEnter={showSteamSearch ? handleSteamSearch : undefined}
          placeholder="Filter..."
          cursorBlink={false}
        />
      </div>
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="text-cpc-green-500 text-xs text-center py-4 animate-pulse">
            LOADING...
          </div>
        )}
        {error && <div className="text-cpc-red-500 text-xs text-center py-4">PRIVATE</div>}
        {!isLoading &&
          !error &&
          filtered.map((friend) => (
            <FriendRow
              key={friend.steamid}
              friend={friend}
              onClick={() => handleFriendClick(friend.steamid)}
            />
          ))}
        {showSteamSearch && (
          <div className="p-3 flex flex-col items-center gap-2">
            <span className="text-cpc-green-900 text-xs text-center">No friends match</span>
            <CpcButton variant="outlined" color="cyan" onClick={handleSteamSearch}>
              {searching ? "..." : "SEARCH STEAM"}
            </CpcButton>
            {searchError && <span className="text-cpc-red-500 text-[10px]">{searchError}</span>}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed bottom-4 right-4 z-40 bg-cpc-grey-900 border-2 border-cpc-magenta-500 text-cpc-magenta-500 px-3 py-2 text-xs font-bold cursor-pointer"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        FRIENDS
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-72 bg-cpc-grey-900 border-l-2 border-cpc-magenta-500 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {sidebarContent}
      </div>

      {/* Desktop sidebar */}
      {collapsed ? (
        <CollapsedSidebar friendCount={friends?.length ?? null} onExpand={handleExpand} />
      ) : (
        <div
          className="hidden lg:flex flex-col shrink-0 h-full overflow-hidden relative"
          style={{ width }}
        >
          {/* Resize handle */}
          <div
            className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-cpc-magenta-500/30 z-10 border-l border-cpc-green-900"
            onMouseDown={handleMouseDown}
          />
          <div className="flex flex-col h-full overflow-hidden pl-1">{sidebarContent}</div>
        </div>
      )}
    </>
  );
}
