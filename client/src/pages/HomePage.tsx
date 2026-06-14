import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/AuthContext";
import { apiGet } from "@/lib/api";

type HealthResponse = {
  status: "ok";
  time: string;
};

export function HomePage() {
  const { user } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    apiGet<HealthResponse>("/api/health")
      .then((data) => {
        setHealth(data);
        setError(false);
      })
      .catch(() => {
        setHealth(null);
        setError(true);
      });
  }, []);

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Welcome, {user?.displayName}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md bg-muted p-4 text-sm">
            <p className={error ? "text-destructive" : "text-emerald-600"}>
              {error ? "Backend unreachable" : "Backend connected"}
            </p>
            <p className="mt-2 text-muted-foreground">
              {health?.time
                ? `Server time: ${health.time}`
                : "Waiting for health check..."}
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
