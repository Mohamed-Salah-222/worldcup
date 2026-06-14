import { Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink as RouterNavLink, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function NavLink({ to, children }: { to: string; children: string }) {
  return (
    <RouterNavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "rounded-md px-3 py-2 text-sm hover:bg-muted",
          isActive && "bg-muted font-medium",
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}

function MobileLink({
  to,
  onClick,
  children,
}: {
  to: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <RouterNavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "block rounded-md px-3 py-3 text-sm hover:bg-muted",
          isActive && "bg-muted font-medium",
        )
      }
    >
      {children}
    </RouterNavLink>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-3 sm:px-6">
        <Link to="/" className="text-base font-semibold sm:text-lg">
          WC Predictions
        </Link>

        {!user ? (
          <NavLink to="/login">Login</NavLink>
        ) : (
          <>
            <nav className="hidden items-center gap-1 md:flex">
              <NavLink to="/">Matches</NavLink>
              <NavLink to="/leaderboard">Leaderboard</NavLink>
              <NavLink to="/my-predictions">My Predictions</NavLink>
              {user.role === "admin" ? <NavLink to="/admin">Admin</NavLink> : null}
              <div className="ml-2 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{user.displayName}</span>
                <Button size="sm" variant="outline" onClick={logout}>
                  Logout
                </Button>
              </div>
            </nav>

            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Open menu"
                  className="md:hidden"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 flex flex-col gap-1">
                  <MobileLink to="/" onClick={() => setOpen(false)}>
                    Matches
                  </MobileLink>
                  <MobileLink to="/leaderboard" onClick={() => setOpen(false)}>
                    Leaderboard
                  </MobileLink>
                  <MobileLink to="/my-predictions" onClick={() => setOpen(false)}>
                    My Predictions
                  </MobileLink>
                  {user.role === "admin" ? (
                    <MobileLink to="/admin" onClick={() => setOpen(false)}>
                      Admin
                    </MobileLink>
                  ) : null}
                  <div className="my-3 h-px bg-border" />
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Signed in as{" "}
                    <span className="font-medium text-foreground">
                      {user.displayName}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="mx-3 mt-2"
                    onClick={() => {
                      logout();
                      setOpen(false);
                    }}
                  >
                    Logout
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </>
        )}
      </div>
    </header>
  );
}
