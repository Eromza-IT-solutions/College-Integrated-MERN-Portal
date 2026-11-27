import { useState } from "react";
import { Menu } from "lucide-react";
import { useLocation } from "react-router-dom";
import NotificationBell from "./NotificationBell";
import ProfileDropdown from "./ProfileDropdown";
import SearchInput from "../ui/SearchInput";

export default function Header({ onMenuClick, navItems = [] }) {
  const [query, setQuery] = useState("");
  const location = useLocation();

  const currentItem = navItems.find(
    (item) =>
      location.pathname === item.to ||
      location.pathname.startsWith(`${item.to}/`),
  );

  const pageTitle = currentItem?.label ?? "Dashboard";

  return (
    <header className="sticky top-0 z-20 border-b border-eromza-border bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onMenuClick}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-eromza-muted transition hover:bg-eromza-bg hover:text-eromza-text lg:hidden"
          aria-label="Open navigation"
        >
          <Menu size={20} />
        </button>

        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-eromza-subtle">
            Abeda Inamdar Senior College
          </p>
          <h1 className="truncate text-sm font-semibold text-eromza-text sm:text-base">
            {pageTitle}
          </h1>
        </div>

        <SearchInput
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search records..."
          className="hidden w-64 md:flex"
        />

        <NotificationBell />
        <ProfileDropdown />
      </div>
    </header>
  );
}
