import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, Medal, Award } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Profile {
  username: string;
}

interface LeaderboardEntry {
  id: string;
  score: number;
  time_seconds: number;
  level: number;
  created_at: string;
  profiles: Profile | null;
}

export const Leaderboard = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("game_scores")
        .select(
          `
          id,
          score,
          time_seconds,
          level,
          created_at,
          profiles (username)
        `
        )
        .order("score", { ascending: false })
        .limit(10);

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 1:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 2:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center font-bold">{index + 1}</span>;
    }
  };

  return (
    <Card className="glass-effect border-primary/20">
      <CardHeader>
        <CardTitle className="text-2xl flex items-center gap-2">
          <Trophy className="w-6 h-6 text-primary" />
          Top Players
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No scores yet. Be the first to play!
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center gap-4 p-4 rounded-lg transition-all hover:scale-102 ${
                  index < 3
                    ? "bg-primary/10 border border-primary/30"
                    : "bg-card/50"
                }`}
              >
                <div className="flex items-center justify-center w-10">
                  {getRankIcon(index)}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{entry.profiles?.username || "Anonymous"}</p>
                  <p className="text-sm text-muted-foreground">
                    Level {entry.level} • {entry.time_seconds}s
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-primary">{entry.score}</p>
                  <p className="text-xs text-muted-foreground">points</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
