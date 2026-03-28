"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const CANVAS_W = 360;
const CANVAS_H = 500;
const BIRD_SIZE = 28;
const BIRD_X = 80;
const GRAVITY = 0.45;
const FLAP_FORCE = -7;
const PIPE_WIDTH = 48;
const PIPE_GAP = 135;
const PIPE_SPEED = 2.5;
const PIPE_SPAWN_DIST = 200;

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

export default function MiniGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);

  const stateRef = useRef({
    birdY: CANVAS_H / 2,
    birdVel: 0,
    pipes: [] as Pipe[],
    score: 0,
    playing: false,
    gameOver: false,
    frame: 0,
  });

  useEffect(() => {
    const saved = localStorage.getItem("rise_flappy_hs");
    if (saved) setHighScore(parseInt(saved));
  }, []);

  const flap = useCallback(() => {
    const s = stateRef.current;
    if (!s.playing && !s.gameOver) {
      // Start game
      s.birdY = CANVAS_H / 2;
      s.birdVel = 0;
      s.pipes = [];
      s.score = 0;
      s.playing = true;
      s.gameOver = false;
      s.frame = 0;
      setPlaying(true);
      setGameOver(false);
      setScore(0);
    }
    if (s.gameOver) {
      // Reset
      s.birdY = CANVAS_H / 2;
      s.birdVel = 0;
      s.pipes = [];
      s.score = 0;
      s.playing = false;
      s.gameOver = false;
      s.frame = 0;
      setPlaying(false);
      setGameOver(false);
      setScore(0);
      return;
    }
    if (s.playing) {
      s.birdVel = FLAP_FORCE;
    }
  }, []);

  // Draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;

    const drawBird = (y: number, vel: number) => {
      const angle = Math.min(Math.max(vel * 3, -30), 45) * (Math.PI / 180);
      ctx.save();
      ctx.translate(BIRD_X, y);
      ctx.rotate(angle);

      // Bun (bottom)
      ctx.fillStyle = "#D4874E";
      ctx.beginPath();
      ctx.ellipse(0, 6, 16, 10, 0, 0, Math.PI * 2);
      ctx.fill();

      // Filling
      ctx.fillStyle = "#F5C518";
      ctx.fillRect(-14, -2, 28, 8);

      // Lettuce/mitmita
      ctx.fillStyle = "#E63232";
      ctx.fillRect(-12, -4, 24, 4);

      // Bun (top)
      ctx.fillStyle = "#C47A3F";
      ctx.beginPath();
      ctx.ellipse(0, -6, 16, 10, 0, Math.PI, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(8, -4, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#000";
      ctx.beginPath();
      ctx.arc(9, -4, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    };

    const drawPipe = (pipe: Pipe) => {
      const topH = pipe.gapY - PIPE_GAP / 2;
      const botY = pipe.gapY + PIPE_GAP / 2;

      // Top pipe
      ctx.fillStyle = "#E63232";
      ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topH);
      // Top pipe cap
      ctx.fillStyle = "#CC2828";
      ctx.fillRect(pipe.x - 4, topH - 16, PIPE_WIDTH + 8, 16);

      // Bottom pipe
      ctx.fillStyle = "#E63232";
      ctx.fillRect(pipe.x, botY, PIPE_WIDTH, CANVAS_H - botY);
      // Bottom pipe cap
      ctx.fillStyle = "#CC2828";
      ctx.fillRect(pipe.x - 4, botY, PIPE_WIDTH + 8, 16);
    };

    const checkCollision = (s: typeof stateRef.current): boolean => {
      // Floor/ceiling
      if (s.birdY - BIRD_SIZE / 2 < 0 || s.birdY + BIRD_SIZE / 2 > CANVAS_H) return true;

      // Pipes
      for (const pipe of s.pipes) {
        const topH = pipe.gapY - PIPE_GAP / 2;
        const botY = pipe.gapY + PIPE_GAP / 2;

        if (
          BIRD_X + BIRD_SIZE / 2 > pipe.x - 4 &&
          BIRD_X - BIRD_SIZE / 2 < pipe.x + PIPE_WIDTH + 4
        ) {
          if (s.birdY - BIRD_SIZE / 2 < topH || s.birdY + BIRD_SIZE / 2 > botY) {
            return true;
          }
        }
      }
      return false;
    };

    const loop = () => {
      const s = stateRef.current;

      // Clear
      ctx.fillStyle = "#0A0A0A";
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Ground line
      ctx.strokeStyle = "#2A2A2A";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, CANVAS_H - 1);
      ctx.lineTo(CANVAS_W, CANVAS_H - 1);
      ctx.stroke();

      if (!s.playing && !s.gameOver) {
        // Title screen
        drawBird(CANVAS_H / 2 + Math.sin(Date.now() / 300) * 10, 0);

        ctx.fillStyle = "#F5C518";
        ctx.font = "bold 24px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Flappy Ertib", CANVAS_W / 2, CANVAS_H / 2 - 60);

        ctx.fillStyle = "#9A9A9A";
        ctx.font = "14px system-ui, sans-serif";
        ctx.fillText("Tap to fly!", CANVAS_W / 2, CANVAS_H / 2 + 50);

        const hs = parseInt(localStorage.getItem("rise_flappy_hs") || "0");
        if (hs > 0) {
          ctx.fillStyle = "#9A9A9A";
          ctx.font = "12px system-ui, sans-serif";
          ctx.fillText(`Best: ${hs}`, CANVAS_W / 2, CANVAS_H / 2 + 75);
        }

        animId = requestAnimationFrame(loop);
        return;
      }

      if (s.gameOver) {
        // Draw final state
        for (const pipe of s.pipes) drawPipe(pipe);
        drawBird(s.birdY, 5);

        ctx.fillStyle = "rgba(10,10,10,0.7)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        ctx.fillStyle = "#E63232";
        ctx.font = "bold 22px system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", CANVAS_W / 2, CANVAS_H / 2 - 40);

        ctx.fillStyle = "#F5C518";
        ctx.font = "bold 36px system-ui, sans-serif";
        ctx.fillText(`${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 5);

        ctx.fillStyle = "#9A9A9A";
        ctx.font = "13px system-ui, sans-serif";
        ctx.fillText("Tap to restart", CANVAS_W / 2, CANVAS_H / 2 + 40);

        const hs = parseInt(localStorage.getItem("rise_flappy_hs") || "0");
        if (hs > 0) {
          ctx.fillText(`Best: ${hs}`, CANVAS_W / 2, CANVAS_H / 2 + 65);
        }

        animId = requestAnimationFrame(loop);
        return;
      }

      // Update bird
      s.birdVel += GRAVITY;
      s.birdY += s.birdVel;
      s.frame++;

      // Spawn pipes
      const lastPipe = s.pipes[s.pipes.length - 1];
      if (!lastPipe || lastPipe.x < CANVAS_W - PIPE_SPAWN_DIST) {
        const minGap = 80;
        const maxGap = CANVAS_H - 80;
        const gapY = minGap + Math.random() * (maxGap - minGap);
        s.pipes.push({ x: CANVAS_W + 20, gapY, scored: false });
      }

      // Move pipes
      for (const pipe of s.pipes) {
        pipe.x -= PIPE_SPEED;

        // Score
        if (!pipe.scored && pipe.x + PIPE_WIDTH < BIRD_X) {
          pipe.scored = true;
          s.score++;
          setScore(s.score);
        }
      }

      // Remove offscreen pipes
      s.pipes = s.pipes.filter((p) => p.x > -PIPE_WIDTH - 10);

      // Collision
      if (checkCollision(s)) {
        s.playing = false;
        s.gameOver = true;
        setPlaying(false);
        setGameOver(true);
        const hs = parseInt(localStorage.getItem("rise_flappy_hs") || "0");
        if (s.score > hs) {
          localStorage.setItem("rise_flappy_hs", s.score.toString());
          setHighScore(s.score);
        }
      }

      // Draw pipes
      for (const pipe of s.pipes) drawPipe(pipe);

      // Draw bird
      drawBird(s.birdY, s.birdVel);

      // Score display
      ctx.fillStyle = "#FFFFFF";
      ctx.font = "bold 32px system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 3;
      ctx.strokeText(`${s.score}`, CANVAS_W / 2, 50);
      ctx.fillText(`${s.score}`, CANVAS_W / 2, 50);

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [flap]);

  if (!expanded) {
    return (
      <div style={{ padding: "0 16px", maxWidth: 480, margin: "0 auto" }}>
        <button
          onClick={() => setExpanded(true)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 18px",
            background: "var(--surface)",
            border: "1px solid var(--surface-border)",
            borderRadius: 14,
            cursor: "pointer",
            transition: "border-color 0.2s",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🥪</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--yellow)" }}>Flappy Ertib</div>
              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Tap to play while you wait!</div>
            </div>
          </div>
          <div style={{
            padding: "6px 14px",
            borderRadius: 8,
            background: "var(--red)",
            color: "var(--white)",
            fontSize: 13,
            fontWeight: 600,
          }}>
            Play
          </div>
        </button>
      </div>
    );
  }

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 90,
      background: "var(--bg)",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 16px",
          borderBottom: "1px solid var(--surface-border)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            onClick={() => { setExpanded(false); }}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: 20,
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            &#10005;
          </button>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--yellow)" }}>
            Flappy Ertib
          </span>
        </div>
        <div style={{ display: "flex", gap: 14, fontSize: 13 }}>
          <span style={{ color: "var(--white)" }}>
            Score: <b>{score}</b>
          </span>
          {highScore > 0 && (
            <span style={{ color: "var(--muted)" }}>
              Best: <b>{highScore}</b>
            </span>
          )}
        </div>
      </div>
      {/* Canvas fills remaining space */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          onClick={flap}
          onTouchStart={(e) => { e.preventDefault(); flap(); }}
          style={{
            width: "100%",
            maxWidth: 480,
            height: "auto",
            display: "block",
            touchAction: "none",
            cursor: "pointer",
          }}
        />
      </div>
    </div>
  );
}
