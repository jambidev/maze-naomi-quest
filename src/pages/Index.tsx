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
    toast.success("Berhasil keluar");
  };

  const handlePlay = () => {
    if (user) {
      navigate("/game");
    } else {
      navigate("/auth");
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Video Background */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover -z-10"
      >
        <source src="/background-video.mp4" type="video/mp4" />
      </video>
      
      {/* Dark overlay for better text readability */}
      <div className="fixed inset-0 bg-black/50 -z-5"></div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12 animate-float">
          <h1 className="title-banner text-4xl md:text-5xl font-bold mb-6 mx-auto">
            Maze Game Naomi
          </h1>
          <p className="text-xl text-muted-foreground">
            Jelajahi labirin, hindari musuh, dan capai tujuan!
          </p>
        </div>

        {/* Main Content */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Play Card */}
          <Card className="glass-effect border-primary/20">
            <CardHeader>
              <CardTitle className="text-3xl">Siap Bermain?</CardTitle>
              <CardDescription className="text-base">
                {user
                  ? `Selamat datang kembali, ${username || "Pemain"}!`
                  : "Masuk untuk menyimpan skor dan bersaing"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={handlePlay}
                size="lg"
                className="w-full text-lg glow-primary animate-pulse-glow"
              >
                <Play className="w-5 h-5 mr-2" />
                {user ? "Mulai Game" : "Masuk untuk Bermain"}
              </Button>

              {user ? (
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <LogOut className="w-5 h-5 mr-2" />
                  Keluar
                </Button>
              ) : (
                <Button
                  onClick={() => navigate("/auth")}
                  variant="outline"
                  size="lg"
                  className="w-full"
                >
                  <LogIn className="w-5 h-5 mr-2" />
                  Masuk / Daftar
                </Button>
              )}

              <div className="pt-4 space-y-2 text-sm text-muted-foreground">
                <h3 className="font-semibold text-foreground text-base mb-3">Cara Bermain:</h3>
                <div className="space-y-2 pl-2">
                  <p>🎮 Gunakan tombol panah atau WASD untuk bergerak</p>
                  <p>🦸 Kamu adalah karakter pahlawan</p>
                  <p>👾 Hindari musuh (3 HP)</p>
                  <p>🏆 Capai trofi untuk menang</p>
                  <p>⭐ Waktu lebih cepat = Skor lebih tinggi!</p>
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
                Bersaing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Tantang pemain di seluruh dunia dan naik di papan peringkat
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-primary/20 hover:border-primary/40 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Play className="w-5 h-5" />
                Labirin Dinamis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Setiap game memiliki labirin acak yang unik
              </p>
            </CardContent>
          </Card>

          <Card className="glass-effect border-accent/20 hover:border-accent/40 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-accent">
                <Trophy className="w-5 h-5" />
                AI Pintar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Hadapi musuh dengan pola patroli yang cerdas
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
