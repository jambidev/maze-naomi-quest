import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MazeCanvas } from "@/components/game/MazeCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, RotateCcw, Home } from "lucide-react";

export default function Game() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<"playing" | "won" | "lost">("playing");
  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });
  }, [navigate]);

  const handleGameOver = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    setGameState("lost");
    setFinalScore(score);
    setFinalTime(timeSeconds);
    
    if (userId) {
      await saveScore(score, timeSeconds, enemiesAvoided);
    }
  };

  const handleWin = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    setGameState("won");
    setFinalScore(score);
    setFinalTime(timeSeconds);
    
    if (userId) {
      await saveScore(score, timeSeconds, enemiesAvoided);
    }
  };

  const saveScore = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: userId,
        score,
        level: 1,
        time_seconds: timeSeconds,
        enemies_avoided: enemiesAvoided,
      });

      if (error) throw error;
      toast.success("Skor tersimpan!");
    } catch (error: any) {
      console.error("Error saving score:", error);
      toast.error("Gagal menyimpan skor");
    }
  };

  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen p-8">
      <div className="absolute inset-0 game-gradient opacity-10"></div>
      
      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="title-banner text-2xl md:text-3xl font-bold shrink-0">
            Maze Game Naomi
          </h1>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" />
            Menu
          </Button>
        </div>

        {gameState === "playing" ? (
          <Card className="glass-effect border-primary/20">
            <CardContent className="pt-6">
              <MazeCanvas onGameOver={handleGameOver} onWin={handleWin} />
            </CardContent>
          </Card>
        ) : (
          <Card className="glass-effect border-primary/20 text-center">
            <CardHeader>
              <CardTitle className="text-3xl">
                {gameState === "won" ? (
                  <span className="text-accent flex items-center justify-center gap-2">
                    <Trophy className="w-8 h-8" />
                    Kemenangan!
                  </span>
                ) : (
                  <span className="text-destructive">Game Berakhir</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2 text-lg">
                <p>
                  <span className="text-muted-foreground">Skor Akhir:</span>{" "}
                  <span className="font-bold text-primary">{finalScore}</span>
                </p>
                <p>
                  <span className="text-muted-foreground">Waktu:</span>{" "}
                  <span className="font-bold text-accent">{finalTime}s</span>
                </p>
              </div>

              {gameState === "won" && (
                <p className="text-muted-foreground">
                  Selamat! Kamu berhasil menyelesaikan labirin! 🎉
                </p>
              )}

              <div className="flex gap-4 justify-center">
                <Button onClick={handleRestart} className="gap-2 glow-primary">
                  <RotateCcw className="w-4 h-4" />
                  Main Lagi
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Menu Utama
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
