import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import heroImage from "@/assets/hero-character.png";
import enemyImage from "@/assets/enemy-character.png";
import goalImage from "@/assets/goal-trophy.png";

interface Position {
  x: number;
  y: number;
}

interface Enemy {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  dx: number;
  dy: number;
  patrolIndex: number;
  patrolPoints: Position[];
  facingRight: boolean;
  animationOffset: number;
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

const ORTHOGONAL_DIRECTIONS: Position[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
];

const findShortestPath = (maze: number[][], start: Position, goal: Position): Position[] => {
  const key = (pos: Position) => `${pos.x},${pos.y}`;
  const queue: Position[] = [{ ...start }];
  const visited = new Set<string>([key(start)]);
  const parents = new Map<string, string>();

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === goal.x && current.y === goal.y) {
      const path: Position[] = [current];
      let currentKey = key(current);

      while (parents.has(currentKey)) {
        currentKey = parents.get(currentKey)!;
        const [px, py] = currentKey.split(",").map(Number);
        path.push({ x: px, y: py });
      }

      return path.reverse();
    }

    for (const dir of ORTHOGONAL_DIRECTIONS) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (ny < 0 || ny >= maze.length || nx < 0 || nx >= maze[0].length) continue;
      if (maze[ny][nx] !== 0) continue;

      const neighborKey = `${nx},${ny}`;
      if (visited.has(neighborKey)) continue;

      visited.add(neighborKey);
      parents.set(neighborKey, key(current));
      queue.push({ x: nx, y: ny });
    }
  }

  return [];
};

export const MazeCanvas = ({ onGameOver, onWin }: MazeCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hp, setHp] = useState(3);
  const [score, setScore] = useState(0);
  const [gameTime, setGameTime] = useState(0);
  const [enemiesAvoided, setEnemiesAvoided] = useState(0);
  const playerRef = useRef<Position>({ x: 1, y: 1 });
  const playerTargetRef = useRef<Position>({ x: 1, y: 1 });
  const playerFacingRight = useRef(true);
  const goalRef = useRef<Position>({ x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 });
  const enemiesRef = useRef<Enemy[]>([]);
  const mazeRef = useRef<number[][]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const gameLoopRef = useRef<number>();
  const startTimeRef = useRef<number>(Date.now());
  const lastEnemyCheckRef = useRef<number>(Date.now());
  
  // Image loading
  const heroImageRef = useRef<HTMLCanvasElement | null>(null);
  const enemyImageRef = useRef<HTMLCanvasElement | null>(null);
  const goalImageRef = useRef<HTMLCanvasElement | null>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  
  // Audio refs
  const bgMusicRef = useRef<HTMLAudioElement>();
  const coinSoundRef = useRef<HTMLAudioElement>();
  const hitSoundRef = useRef<HTMLAudioElement>();
  const winSoundRef = useRef<HTMLAudioElement>();
  const gameOverSoundRef = useRef<HTMLAudioElement>();

  // Generate solvable maze with guaranteed path
  const generateMaze = () => {
    const maze: number[][] = Array(MAZE_HEIGHT)
      .fill(0)
      .map(() => Array(MAZE_WIDTH).fill(1));

    // Create paths using DFS to ensure connectivity
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

      // Shuffle directions for randomness
      const shuffledDirs = [...directions].sort(() => Math.random() - 0.5);
      
      shuffledDirs.forEach((dir) => {
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
    
    // Add extra paths for better gameplay
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(Math.random() * (MAZE_WIDTH - 2)) + 1;
      const y = Math.floor(Math.random() * (MAZE_HEIGHT - 2)) + 1;
      if (maze[y][x] === 1) {
        // Check if this creates a valid path connection
        const neighbors = [
          maze[y-1]?.[x],
          maze[y+1]?.[x],
          maze[y]?.[x-1],
          maze[y]?.[x+1]
        ].filter(n => n === 0);
        
        if (neighbors.length >= 2) {
          maze[y][x] = 0;
        }
      }
    }

    return maze;
  };

  // Load images
  useEffect(() => {
    const removeWhiteBackground = (image: HTMLImageElement) => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      ctx.drawImage(image, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        if (r > 240 && g > 240 && b > 240) {
          data[i + 3] = 0;
        }
      }

      ctx.putImageData(imageData, 0, 0);
      return canvas;
    };

    const loadImages = async () => {
      const hero = new Image();
      const enemy = new Image();
      const goal = new Image();
      
      hero.src = heroImage;
      enemy.src = enemyImage;
      goal.src = goalImage;
      
      await Promise.all([
        new Promise((resolve) => { hero.onload = resolve; }),
        new Promise((resolve) => { enemy.onload = resolve; }),
        new Promise((resolve) => { goal.onload = resolve; }),
      ]);
      
      heroImageRef.current = removeWhiteBackground(hero);
      enemyImageRef.current = removeWhiteBackground(enemy);
      goalImageRef.current = removeWhiteBackground(goal);
      setImagesLoaded(true);
    };
    
    loadImages();
  }, []);

  // Initialize audio
  useEffect(() => {
    // Create audio context for background music
    bgMusicRef.current = new Audio();
    bgMusicRef.current.loop = true;
    bgMusicRef.current.volume = 0.3;
    
    // Note: Using data URLs for simple tones since we can't load external files
    // In production, replace with actual audio files
    
    // Play background music
    bgMusicRef.current.play().catch(() => {
      // Autoplay might be blocked, will play on first user interaction
    });
    
    return () => {
      if (bgMusicRef.current) {
        bgMusicRef.current.pause();
        bgMusicRef.current = undefined;
      }
    };
  }, []);

  // Initialize game
  useEffect(() => {
    mazeRef.current = generateMaze();
    playerRef.current = { x: 1, y: 1 };
    playerTargetRef.current = { x: 1, y: 1 };
    goalRef.current = { x: MAZE_WIDTH - 2, y: MAZE_HEIGHT - 2 };

    const pathToGoal = findShortestPath(mazeRef.current, playerRef.current, goalRef.current);
    const pathSet = new Set(pathToGoal.map((pos) => `${pos.x},${pos.y}`));

    const isNearPath = (pos: Position) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const key = `${pos.x + dx},${pos.y + dy}`;
          if (pathSet.has(key)) {
            return true;
          }
        }
      }
      return false;
    };

    // Find valid patrol positions that don't choke the main path
    const centralPathY = Math.floor(MAZE_HEIGHT / 2);
    const allOpenCells: Position[] = [];
    const safeCells: Position[] = [];
    for (let y = 1; y < MAZE_HEIGHT - 1; y++) {
      for (let x = 1; x < MAZE_WIDTH - 1; x++) {
        if (mazeRef.current[y][x] === 0) {
          const pos = { x, y };
          allOpenCells.push(pos);

          const wallNeighbors = [
            mazeRef.current[y - 1]?.[x],
            mazeRef.current[y + 1]?.[x],
            mazeRef.current[y]?.[x - 1],
            mazeRef.current[y]?.[x + 1],
          ].filter((cell) => cell === 1).length;

          if (wallNeighbors <= 1 && !isNearPath(pos)) {
            safeCells.push(pos);
          }
        }
      }
    }

    const pickSafeCell = (predicate: (pos: Position) => boolean): Position | null => {
      const choices = safeCells.filter(predicate);
      if (choices.length > 0) {
        return choices[Math.floor(Math.random() * choices.length)];
      }
      return null;
    };

    const createPatrol = (start: Position, offsets: Position[]): Position[] => {
      const points = [start, ...offsets.map((offset) => ({ x: start.x + offset.x, y: start.y + offset.y }))]
        .filter((point) => mazeRef.current[point.y]?.[point.x] === 0 && !isNearPath(point));

      if (points.length === 0) {
        points.push(start);
      }
      if (points.length === 1) {
        points.push(points[0]);
      }
      return points;
    };

    const enemyConfigs: Array<{ start: Position | null; offsets: Position[]; speed: { dx: number; dy: number }; facingRight: boolean; animationOffset: number }> = [
      {
        start: pickSafeCell((pos) => pos.y < centralPathY - 1 && pos.x > 2 && pos.x < MAZE_WIDTH - 3),
        offsets: [{ x: 2, y: 0 }, { x: -2, y: 0 }],
        speed: { dx: 0.015, dy: 0 },
        facingRight: true,
        animationOffset: 0,
      },
      {
        start: pickSafeCell((pos) => pos.y > 1 && pos.y < MAZE_HEIGHT - 2 && pos.x > 4 && pos.x < MAZE_WIDTH - 4),
        offsets: [{ x: 0, y: -2 }, { x: 0, y: 2 }],
        speed: { dx: 0, dy: 0.015 },
        facingRight: false,
        animationOffset: 120,
      },
      {
        start: pickSafeCell((pos) => pos.y > centralPathY + 1 && pos.x > 3 && pos.x < MAZE_WIDTH - 2),
        offsets: [{ x: 3, y: 0 }, { x: -3, y: 0 }],
        speed: { dx: 0.02, dy: 0 },
        facingRight: true,
        animationOffset: 240,
      },
    ];

    enemiesRef.current = enemyConfigs
      .filter((config) => config.start)
      .map((config) => {
        const start = config.start as Position;
        const patrolPoints = createPatrol(start, config.offsets);
        return {
          x: start.x,
          y: start.y,
          targetX: start.x,
          targetY: start.y,
          dx: config.speed.dx,
          dy: config.speed.dy,
          patrolIndex: 0,
          patrolPoints,
          facingRight: config.facingRight,
          animationOffset: config.animationOffset,
        } as Enemy;
      });

    // If we failed to place any enemies safely, keep at least one in a non-blocking area
    if (enemiesRef.current.length === 0 && allOpenCells.length > 0) {
      const fallback = allOpenCells.find((pos) => !pathSet.has(`${pos.x},${pos.y}`)) ?? allOpenCells[0];
      enemiesRef.current = [
        {
          x: fallback.x,
          y: fallback.y,
          targetX: fallback.x,
          targetY: fallback.y,
          dx: 0.01,
          dy: 0,
          patrolIndex: 0,
          patrolPoints: [fallback, { x: Math.min(fallback.x + 1, MAZE_WIDTH - 2), y: fallback.y }],
          facingRight: true,
          animationOffset: 0,
        },
      ];
    }

    startTimeRef.current = Date.now();
    toast.success("Permainan dimulai! Raih trofi emas!");
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imagesLoaded) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const gameLoop = () => {
      // Clear canvas with dark background
      ctx.fillStyle = "#1a1d2e";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw maze with better visuals
      mazeRef.current.forEach((row, y) => {
        row.forEach((cell, x) => {
          if (cell === 1) {
            // Wall with 3D effect
            ctx.fillStyle = "#2d3548";
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            
            // Add border for clarity
            ctx.strokeStyle = "#4a5568";
            ctx.lineWidth = 2;
            ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            
            // Add inner shadow effect
            ctx.fillStyle = "#1a1f2e";
            ctx.fillRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
          } else {
            // Path with gradient
            const gradient = ctx.createRadialGradient(
              x * CELL_SIZE + CELL_SIZE / 2,
              y * CELL_SIZE + CELL_SIZE / 2,
              0,
              x * CELL_SIZE + CELL_SIZE / 2,
              y * CELL_SIZE + CELL_SIZE / 2,
              CELL_SIZE / 2
            );
            gradient.addColorStop(0, "#1e2336");
            gradient.addColorStop(1, "#151820");
            ctx.fillStyle = gradient;
            ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
          }
        });
      });

      // Draw goal with pulsing animation
      const goal = goalRef.current;
      if (goalImageRef.current) {
        const pulse = Math.sin(Date.now() / 300) * 0.1 + 1;
        const size = GOAL_SIZE * pulse;
        ctx.save();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "#fbbf24";
        ctx.drawImage(
          goalImageRef.current,
          goal.x * CELL_SIZE + (CELL_SIZE - size) / 2,
          goal.y * CELL_SIZE + (CELL_SIZE - size) / 2,
          size,
          size
        );
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Draw and update enemies with smooth animation
      enemiesRef.current.forEach((enemy) => {
        // Smooth movement interpolation
        const smoothing = 0.15;
        enemy.x += (enemy.targetX - enemy.x) * smoothing;
        enemy.y += (enemy.targetY - enemy.y) * smoothing;

        // Update enemy target position (patrol)
        const target = enemy.patrolPoints[enemy.patrolIndex];
        const dx = target.x - enemy.targetX;
        const dy = target.y - enemy.targetY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 0.1) {
          enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
          const newTarget = enemy.patrolPoints[enemy.patrolIndex];
          enemy.facingRight = newTarget.x > enemy.targetX;
        } else {
          enemy.targetX += (dx / distance) * 0.03;
          enemy.targetY += (dy / distance) * 0.03;
        }

        // Draw enemy with animation
        if (enemyImageRef.current) {
          ctx.save();
          
          // Bobbing animation
          const bob = Math.sin((Date.now() + enemy.animationOffset) / 200) * 3;
          
          // Position
          const enemyX = enemy.x * CELL_SIZE + CELL_SIZE / 2;
          const enemyY = enemy.y * CELL_SIZE + CELL_SIZE / 2 + bob;
          
          ctx.translate(enemyX, enemyY);
          
          // Flip based on direction
          if (!enemy.facingRight) {
            ctx.scale(-1, 1);
          }
          
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#a855f7";
          ctx.drawImage(
            enemyImageRef.current,
            -ENEMY_SIZE / 2,
            -ENEMY_SIZE / 2,
            ENEMY_SIZE,
            ENEMY_SIZE
          );
          ctx.shadowBlur = 0;
          ctx.restore();
        }
      });

      // Handle player movement with improved collision
      const speed = 0.12;
      const playerTarget = playerTargetRef.current;
      let targetX = playerTarget.x;
      let targetY = playerTarget.y;

      // Calculate movement direction - check for lowercase keys
      let moveX = 0;
      let moveY = 0;
      
      if (keysPressed.current.has("arrowup") || keysPressed.current.has("w")) {
        moveY -= speed;
      }
      if (keysPressed.current.has("arrowdown") || keysPressed.current.has("s")) {
        moveY += speed;
      }
      if (keysPressed.current.has("arrowleft") || keysPressed.current.has("a")) {
        moveX -= speed;
        playerFacingRight.current = false;
      }
      if (keysPressed.current.has("arrowright") || keysPressed.current.has("d")) {
        moveX += speed;
        playerFacingRight.current = true;
      }

      // Improved collision detection function
      const canMoveTo = (x: number, y: number): boolean => {
        const spriteRadius = PLAYER_SIZE / CELL_SIZE / 2;
        const margin = spriteRadius - 0.05;
        const worldX = x + 0.5;
        const worldY = y + 0.5;
        const checkPoints = [
          { x: worldX - margin, y: worldY - margin }, // top-left
          { x: worldX + margin, y: worldY - margin }, // top-right
          { x: worldX - margin, y: worldY + margin }, // bottom-left
          { x: worldX + margin, y: worldY + margin }, // bottom-right
        ];

        for (const point of checkPoints) {
          const cellX = Math.floor(point.x);
          const cellY = Math.floor(point.y);
          
          // Check bounds
          if (cellX < 0 || cellX >= MAZE_WIDTH || cellY < 0 || cellY >= MAZE_HEIGHT) {
            return false;
          }
          
          // Check wall collision
          if (mazeRef.current[cellY]?.[cellX] === 1) {
            return false;
          }
        }
        return true;
      };

      // Try to move with sliding on walls
      const newX = targetX + moveX;
      const newY = targetY + moveY;
      
      if (canMoveTo(newX, newY)) {
        // Can move freely
        playerTarget.x = newX;
        playerTarget.y = newY;
      } else if (canMoveTo(newX, targetY)) {
        // Can slide horizontally
        playerTarget.x = newX;
      } else if (canMoveTo(targetX, newY)) {
        // Can slide vertically
        playerTarget.y = newY;
      }

      // Smooth movement interpolation
      const player = playerRef.current;
      const smoothing = 0.25;
      player.x += (playerTarget.x - player.x) * smoothing;
      player.y += (playerTarget.y - player.y) * smoothing;

      // Draw player with enhanced walking animation
      if (heroImageRef.current) {
        ctx.save();
        
        // Calculate movement speed for animation
        const isMoving = keysPressed.current.size > 0;
        const time = Date.now();
        
        // Enhanced bounce animation
        const bounce = isMoving ? Math.abs(Math.sin(time / 120)) * 4 : Math.sin(time / 500) * 1;
        
        // Squash and stretch effect
        const squash = isMoving ? 1 + Math.sin(time / 120) * 0.1 : 1;
        const stretch = isMoving ? 1 - Math.sin(time / 120) * 0.1 : 1;
        
        // Position
        const playerX = player.x * CELL_SIZE + CELL_SIZE / 2;
        const playerY = player.y * CELL_SIZE + CELL_SIZE / 2 - bounce;
        
        ctx.translate(playerX, playerY);
        
        // Flip based on direction
        if (!playerFacingRight.current) {
          ctx.scale(-1, 1);
        }
        
        // Dynamic rotation when moving
        if (isMoving) {
          const tilt = Math.sin(time / 100) * 0.08;
          ctx.rotate(tilt);
        }
        
        // Apply squash and stretch
        ctx.scale(squash, stretch);
        
        // Enhanced glow effect
        ctx.shadowBlur = 25;
        ctx.shadowColor = "#06b6d4";
        
        // Draw with slight transparency cycle for "breathing" effect
        ctx.globalAlpha = 0.95 + Math.sin(time / 300) * 0.05;
        
        ctx.drawImage(
          heroImageRef.current,
          -PLAYER_SIZE / 2,
          -PLAYER_SIZE / 2,
          PLAYER_SIZE,
          PLAYER_SIZE
        );
        
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Check collision with enemies
      const now = Date.now();
      if (now - lastEnemyCheckRef.current > 500) {
        enemiesRef.current.forEach((enemy) => {
          const dx = player.x - enemy.x;
          const dy = player.y - enemy.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 0.8) {
            // Play hit sound
            playSound(440, 0.1, 0.2);
            
            setHp((prev) => {
              const newHp = prev - 1;
              if (newHp <= 0) {
                const timeSeconds = Math.floor((Date.now() - startTimeRef.current) / 1000);
                playSound(200, 0.3, 0.5);
                if (bgMusicRef.current) bgMusicRef.current.pause();
                onGameOver(score, timeSeconds, enemiesAvoided);
                toast.error("Game Over! Kamu tertangkap musuh!");
              } else {
                toast.warning(`Terkena musuh! HP: ${newHp}/3`);
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
        
        // Play win sound
        playSound(523, 0.2, 0.15);
        setTimeout(() => playSound(659, 0.2, 0.15), 150);
        setTimeout(() => playSound(784, 0.2, 0.3), 300);
        
        if (bgMusicRef.current) bgMusicRef.current.pause();
        onWin(finalScore, timeSeconds, enemiesAvoided);
        toast.success("Kamu Menang! 🎉");
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
  }, [hp, score, enemiesAvoided, onGameOver, onWin, imagesLoaded]);

  // Simple sound effect generator
  const playSound = (frequency: number, volume: number, duration: number) => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (e) {
      // Audio not supported
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const validKeys = ["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d"];
      
      if (validKeys.includes(key)) {
        e.preventDefault();
        const wasPressed = keysPressed.current.has(key);
        keysPressed.current.add(key);
        
        // Play step sound on first press
        if (!wasPressed) {
          playSound(150, 0.05, 0.05);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysPressed.current.delete(key);
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
        <p className="text-sm">Gunakan Tombol Panah atau WASD untuk bergerak</p>
        <p className="text-xs mt-1">
          <span className="text-cyan-400">Biru = Kamu</span> |{" "}
          <span className="text-purple-400">Ungu = Musuh</span> |{" "}
          <span className="text-yellow-400">Emas = Tujuan</span>
        </p>
      </div>
    </div>
  );
};
