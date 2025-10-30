import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Position {
  x: number;
  y: number;
}

interface Enemy {
  x: number;
  y: number;
  dx: number;
  dy: number;
  patrolIndex: number;
  patrolPoints: Position[];
}

interface MazeCanvasProps {
  onGameOver: (score: number, timeSeconds: number, enemiesAvoided: number) => void;
  onWin: (score: number, timeSeconds: number, enemiesAvoided: number) => void;
}

const CELL_SIZE = 40;
const MAZE_WIDTH = 15;
const MAZE_HEIGHT = 11;
const PLAYER_SIZE = 30;
const ENEMY_SIZE = 30;
const GOAL_SIZE = 35;

export const MazeCanvas = ({ onGameOver, onWin }: MazeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [enemiesAvoided, setEnemiesAvoided] = useState(0);
  const playerRef = useRef<Position>({ x: 1, y: 1 });
  const goalRef = useRef<Position>({ x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 });
  const enemiesRef = useRef<Enemy[]>([]);
  const mazeRef = useRef<number[][]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastEnemyCheckRef = useRef<number>(Date.now());

  // Generate random maze
  const generateMaze = () => {
    const maze: number[][] = Array(MAZE_HEIGHT)
      .fill(0)
      .map(() => Array(MAZE_WIDTH).fill(1));

    // Simple maze generation - create paths
    const stack: Position[] = [];
    const start = { x: 1, y: 1 };
    maze[start.y][start.x] = 0;
    stack.push(start);

    const directions = [
      { x: 0, y: -2 },
      { x: 2, y: 0 },
      { x: 0, y: 2 },
      { x: -2, y: 0 },
    ];

    while (stack.length > 0) {
      const current = stack[stack.length - 1];
      const neighbors: Position[] = [];

      directions.forEach((dir) => {
        const nx = current.x + dir.x;
        const ny = current.y + dir.y;
        if (nx > 0 && nx < MAZE_WIDTH - 1 && ny > 0 && ny < MAZE_HEIGHT - 1 && maze[ny][nx] === 1) {
          neighbors.push({ x: nx, y: ny });
        }
      });

      if (neighbors.length > 0) {
        const next = neighbors[Math.floor(Math.random() * neighbors.length)];
        maze[next.y][next.x] = 0;
        maze[current.y + (next.y - current.y) / 2][current.x + (next.x - current.x) / 2] = 0;
        stack.push(next);
      } else {
        stack.pop();
      }
    }

    // Ensure goal position is accessible
    maze[MAZE_HEIGHT - 2][MAZE_WIDTH - 2] = 0;
    maze[MAZE_HEIGHT - 2][MAZE_WIDTH - 3] = 0;
    maze[MAZE_HEIGHT - 3][MAZE_WIDTH - 2] = 0;

    return maze;
  };

  // Initialize game
  useEffect(() => {
    mazeRef.current = generateMaze();
    playerRef.current = { x: 1, y: 1 };
    goalRef.current = { x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 };

    // Create enemies with patrol patterns
    enemiesRef.current = [
      {
        x: 5,
        y: 3,
        dx: 0.02,
        dy: 0,
        patrolIndex: 0,
        patrolPoints: [
          { x: 5, y: 3 },
          { x: 7, y: 3 },
        ],
      },
      {
        x: 3,
        y: 7,
        dx: 0,
        dy: 0.02,
        patrolIndex: 0,
        patrolPoints: [
          { x: 3, y: 7 },
          { x: 3, y: 9 },
        ],
      },
      {
        x: 9,
        y: 5,
        dx: 0.02,
        dy: 0.02,
        patrolIndex: 0,
        patrolPoints: [
          { x: 9, y: 5 },
          { x: 11, y: 7 },
        ],
      },
    ];

    startTimeRef.current = Date.now();
    toast.success("Game started! Reach the green goal!");
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      // Clear canvas with dark background
      ctx.fillStyle = "#1a1d2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw maze
      mazeRef.current.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) {
            // Wall
            ctx.fillStyle = "#252a3f";
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            ctx.strokeStyle = "#3a4262";
            ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          } else {
            // Path
            ctx.fillStyle = "#1e2236";
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        });
      });

      // Draw goal as trophy emoji
      const goal = goalRef.current;
      ctx.font = "32px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#10b981";
      ctx.fillText("🏆", goal.x * CELL_SIZE + CELL_SIZE / 2, goal.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.shadowBlur = 0;

      // Draw enemies as monsters
      enemiesRef.current.forEach((enemy) => {
        ctx.font = "28px Arial";
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#ef4444";
        ctx.fillText("👾", enemy.x * CELL_SIZE + CELL_SIZE / 2, enemy.y * CELL_SIZE + CELL_SIZE / 2);
        ctx.shadowBlur = 0;

        // Update enemy position (patrol)
        const target = enemy.patrolPoints[enemy.patrolIndex];
        const dx = target.x - enemy.x;
        const dy = target.y - enemy.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.1) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
        } else {
          enemy.x += (dx / distance) * 0.02;
          enemy.y += (dy / distance) * 0.02;
        }
      });

      // Draw player as animated character
      const player = playerRef.current;
      ctx.font = "32px Arial";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "#06b6d4";
      // Animate between different frames
      const frames = ["🦸", "🦸‍♂️"];
      const frameIndex = Math.floor(Date.now() / 500) % frames.length;
      ctx.fillText(frames[frameIndex], player.x * CELL_SIZE + CELL_SIZE / 2, player.y * CELL_SIZE + CELL_SIZE / 2);
      ctx.shadowBlur = 0;

      // Handle player movement
      const speed = 0.08;
      let newX = player.x;
      let newY = player.y;

      if (keysPressed.current.has("ArrowUp") || keysPressed.current.has("w")) newY -= speed;
      if (keysPressed.current.has("ArrowDown") || keysPressed.current.has("s")) newY += speed;
      if (keysPressed.current.has("ArrowLeft") || keysPressed.current.has("a")) newX -= speed;
      if (keysPressed.current.has("ArrowRight") || keysPressed.current.has("d")) newX += speed;

      // Check collision with walls
      const cellX = Math.floor(newX);
      const cellY = Math.floor(newY);
      if (mazeRef.current[cellY] && mazeRef.current[cellY][cellX] === 0) {
        player.x = newX;
        player.y = newY;
      }

      // Check collision with enemies
      const now = Date.now();
      if (now - lastEnemyCheckRef.current > 500) {
        enemiesRef.current.forEach((enemy) => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.8) {
            setHp((prev) => {
              const newHp = prev - 1;
              if (newHp <= 0) {
                const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                onGameOver(score, timeSeconds, enemiesAvoided);
                toast.error("Game Over! You were caught by an enemy!");
              } else {
                toast.warning(`Hit by enemy! HP: ${newHp}/3`);
              }
              return newHp;
            });
            lastEnemyCheckRef.current = now;
          }
        });
      }

      // Check win condition
      const goalDx = player.x - goal.x;
      const goalDy = player.y - goal.y;
      const goalDistance = Math.sqrt(goalDx * goalDx + goalDy * goalDy);

      if (goalDistance < 0.7) {
        const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const finalScore = score + 1000 - timeSeconds * 10 + enemiesAvoided * 50;
        onWin(finalScore, timeSeconds, enemiesAvoided);
        toast.success("You Win! 🎉");
        return;
      }

      // Update game time
      setGameTime(Math.floor((Date.now() - startTimeRef.current) / 1000));

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [hp, score, enemiesAvoided, onGameOver, onWin]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
        keysPressed.current.add(e.key);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-6 items-center text-lg font-semibold">
        <div className="flex items-center gap-2">
          <span className="text-destructive">❤️</span>
          <span>HP: {hp}/3</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-primary">⭐</span>
          <span>Score: {score}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-accent">⏱️</span>
          <span>Time: {gameTime}s</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        width={MAZE_WIDTH * CELL_SIZE}
        height={MAZE_HEIGHT * CELL_SIZE}
        className="border-2 border-primary rounded-lg glow-primary"
      />

      <div className="text-center text-muted-foreground">
        <p className="text-sm">Use Arrow Keys or WASD to move</p>
        <p className="text-xs mt-1">
          <span className="text-primary">Blue = You</span> |{" "}
          <span className="text-destructive">Red = Enemy</span> |{" "}
          <span className="text-accent">Green = Goal</span>
        </p>
      </div>
    </div>
  );
};
