import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { MazeCanvas } from "@/components/game/MazeCanvas";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Trophy, RotateCcw, Home } from "lucide-react";

export default function Game() {
  const navigate = useNavigate();
  const [gameState, setGameState] = useState<"playing" | "won" | "lost" | "complete">("playing");
  const [finalScore, setFinalScore] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const gameAudioRef = useRef<HTMLAudioElement | null>(null);
  const victoryAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
    });

    // Initialize audio elements
    gameAudioRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3");
    victoryAudioRef.current = new Audio("https://assets.mixkit.co/music/preview/mixkit-dreaming-big-31.mp3");
    
    if (gameAudioRef.current) {
      gameAudioRef.current.loop = true;
      gameAudioRef.current.volume = 0.3;
    }
    if (victoryAudioRef.current) {
      victoryAudioRef.current.loop = false;
      victoryAudioRef.current.volume = 0.4;
    }

    return () => {
      if (gameAudioRef.current) {
        gameAudioRef.current.pause();
        gameAudioRef.current = null;
      }
      if (victoryAudioRef.current) {
        victoryAudioRef.current.pause();
        victoryAudioRef.current = null;
      }
    };
  }, [navigate]);

  useEffect(() => {
    // Control music based on game state
    if (gameState === "playing") {
      gameAudioRef.current?.play().catch(() => {});
      victoryAudioRef.current?.pause();
    } else if (gameState === "won" || gameState === "complete") {
      gameAudioRef.current?.pause();
      victoryAudioRef.current?.play().catch(() => {});
    } else if (gameState === "lost") {
      gameAudioRef.current?.pause();
      victoryAudioRef.current?.pause();
    }
  }, [gameState]);

  const handleGameOver = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    setGameState("lost");
    setFinalScore(score);
    setFinalTime(timeSeconds);
    
    if (userId) {
      await saveScore(score, timeSeconds, enemiesAvoided);
    }
  };

  const handleWin = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    setFinalScore(score);
    setFinalTime(timeSeconds);
    setTotalScore(prev => prev + score);
    
    if (currentLevel < 3) {
      // Not final level, advance to next
      setGameState("won");
      if (userId) {
        await saveScore(score, timeSeconds, enemiesAvoided);
      }
    } else {
      // Final level completed!
      setGameState("complete");
      if (userId) {
        await saveScore(score, timeSeconds, enemiesAvoided);
      }
    }
  };

  const saveScore = async (score: number, timeSeconds: number, enemiesAvoided: number) => {
    try {
      const { error } = await supabase.from("game_scores").insert({
        user_id: userId,
        score,
        level: currentLevel,
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

  const handleNextLevel = () => {
    setCurrentLevel(prev => prev + 1);
    setGameState("playing");
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
            Maze Game Naomi - Level {currentLevel}
          </h1>
          <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" />
            Menu
          </Button>
        </div>

        {gameState === "playing" ? (
          <Card className="glass-effect border-primary/20">
            <CardContent className="pt-6">
              <MazeCanvas onGameOver={handleGameOver} onWin={handleWin} level={currentLevel} />
            </CardContent>
          </Card>
        ) : gameState === "complete" ? (
          <Card className="glass-effect border-primary/20 text-center">
            <CardHeader>
              <CardTitle className="text-4xl">
                <span className="text-accent flex items-center justify-center gap-2">
                  <Trophy className="w-10 h-10" />
                  🎉 GAME TAMAT! 🎉
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <p className="text-2xl font-bold text-primary">
                  Selamat! Kamu berhasil menyelesaikan semua level!
                </p>
                <div className="space-y-2 text-lg">
                  <p>
                    <span className="text-muted-foreground">Total Skor:</span>{" "}
                    <span className="font-bold text-primary text-2xl">{totalScore + finalScore}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Level Terakhir:</span>{" "}
                    <span className="font-bold text-accent">{finalScore}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Waktu:</span>{" "}
                    <span className="font-bold text-accent">{finalTime}s</span>
                  </p>
                </div>
              </div>

              <p className="text-muted-foreground text-lg">
                Luar biasa! Kamu adalah juara sejati! 🏆
              </p>

              <div className="flex gap-4 justify-center">
                <Button onClick={handleRestart} className="gap-2 glow-primary">
                  <RotateCcw className="w-4 h-4" />
                  Main Ulang
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Menu Utama
                </Button>
              </div>
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
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    Selamat! Kamu berhasil menyelesaikan Level {currentLevel}! 🎉
                  </p>
                  <p className="text-sm text-accent">
                    Level berikutnya akan lebih menantang!
                  </p>
                </div>
              )}

              <div className="flex gap-4 justify-center">
                {gameState === "won" ? (
                  <>
                    <Button onClick={handleNextLevel} className="gap-2 glow-primary">
                      <Trophy className="w-4 h-4" />
                      Level Berikutnya
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                      <Home className="w-4 h-4" />
                      Menu Utama
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleRestart} className="gap-2 glow-primary">
                      <RotateCcw className="w-4 h-4" />
                      Main Lagi
                    </Button>
                    <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                      <Home className="w-4 h-4" />
                      Menu Utama
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
