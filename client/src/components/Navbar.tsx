import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

function NavLink({ to, children }: { to: string; children: string }) {
  const location = useLocation();
  const active = location.pathname === to;

  return (
    <Button
      asChild
      variant="ghost"
      className={cn(active && "bg-accent text-accent-foreground")}
    >
      <Link to={to}>{children}</Link>
    </Button>
  );
}

export function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link to="/" className="font-semibold tracking-tight">
          WC Predictions
        </Link>
        {user ? (
          <div className="flex items-center gap-3">
            <NavLink to="/">Matches</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
            <NavLink to="/my-predictions">My Predictions</NavLink>
            {user.role === "admin" ? (
              <NavLink to="/admin">Admin</NavLink>
            ) : null}
            <span className="text-sm text-muted-foreground">{user.displayName}</span>
            <Button type="button" variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
