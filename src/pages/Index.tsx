import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Leaderboard } from "@/components/Leaderboard";
import { Play, Trophy, LogOut, LogIn } from "lucide-react";
import { toast } from "sonner";

export default function Index() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsername(session.user.id);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUsername(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUsername = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (data) {
      setUsername(data.username);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
  };

  const handlePlay = () => {
    if (user) {
      navigate("/game");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="absolute inset-0 game-gradient opacity-20"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-float">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 game-gradient bg-clip-text text-transparent">
            Maze Game Naomi
          </h1>
          <p className="text-xl text-muted-foreground">
            Navigate through the maze, avoid enemies, and reach the goal!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Play Card */}
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl">Ready to Play?</CardTitle>
              <CardDescription className="text-base">
                {user
                  ? `Welcome back, ${username || "Player"}!`
                  : "Sign in to save your scores and compete"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handlePlay}
                size="lg"
                className="w-full text-lg glow-primary animate-pulse-glow"
              >
                <Play className="w-5 h-5 mr-2" />
                {user ? "Start Game" : "Sign In to Play"}
              </Button>

              {user ? (
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Sign Out
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Sign In / Sign Up
                </Button>
              )}

              <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground text-base mb-3">How to Play:</h3>
                <div className="space-y-2 pl-2">
                  <p>🎮 Use Arrow Keys or WASD to move</p>
                  <p>🔵 You are the blue circle</p>
                  <p>🔴 Avoid the red enemies (3 HP)</p>
                  <p>🟢 Reach the green goal to win</p>
                  <p>⭐ Faster time = Higher score!</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Leaderboard */}
          <Leaderboard />
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="glass-effect border-secondary/20 hover:border-secondary/40 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-secondary">
                <Trophy className="w-5 h-5" />
                Compete
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Challenge players worldwide and climb the leaderboard
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Play className="w-5 h-5" />
                Dynamic Mazes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Every game features a unique randomly generated maze
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-accent/20 hover:border-accent/40 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Trophy className="w-5 h-5" />
                Smart AI
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Face enemies with intelligent patrol patterns
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
