'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Point } from '../lib/geometry';
import { GamePiece, Striker } from './GamePiece';
import { AimOverlay } from './AimOverlay';
import { useCarromGame } from '../hooks/use-carrom-game';

interface CarromBoardProps {
  width: number;
  height: number;
  gameMode: 'practice' | 'vs-ai' | 'multiplayer' | 'tutorial';
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
  className?: string;
}

export function CarromBoard({ 
  width, 
  height, 
  gameMode, 
  aiDifficulty,
  className 
}: CarromBoardProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedCoinId, setSelectedCoinId] = useState<string | null>(null);
  const [boardScale, setBoardScale] = useState(1);

  // Initialize the carrom game
  const game = useCarromGame({
    boardWidth: width,
    boardHeight: height,
    gameMode,
    aiDifficulty
  });

  // Calculate responsive scale
  useEffect(() => {
    const updateScale = () => {
      if (svgRef.current) {
        const container = svgRef.current.parentElement;
        if (container) {
          const containerWidth = container.clientWidth;
          const containerHeight = container.clientHeight;
          const scaleX = containerWidth / width;
          const scaleY = containerHeight / height;
          const scale = Math.min(scaleX, scaleY, 1);
          setBoardScale(scale);
        }
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [width, height]);

  // Handle striker drag
  const handleStrikerDrag = (newPosition: Point) => {
    // Restrict striker movement to bottom area
    const restrictedPosition = {
      x: Math.max(60, Math.min(width - 60, newPosition.x)),
      y: Math.max(height - 80, Math.min(height - 20, newPosition.y))
    };
    game.setStrikerPosition(restrictedPosition);
  };

  // Handle coin selection
  const handleCoinClick = (coinId: string) => {
    setSelectedCoinId(coinId === selectedCoinId ? null : coinId);
  };

  // Handle striker click to start aiming
  const handleStrikerClick = () => {
    if (game.gameManager.canPlayerShoot() && !game.shotInProgress) {
      game.startAiming();
    }
  };

  // Handle board click to execute shot when aiming
  const handleBoardClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!game.isAiming) return;

    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;

    const clickX = (e.clientX - rect.left) / boardScale;
    const clickY = (e.clientY - rect.top) / boardScale;
    
    // Calculate angle from striker to click point
    const dx = clickX - game.strikerPosition.x;
    const dy = clickY - game.strikerPosition.y;
    const angle = Math.atan2(dy, dx);
    
    game.setShotAngle(angle);
    game.executeShot();
  };

  const pockets = [
    { x: 30, y: 30, radius: 25 },
    { x: width - 30, y: 30, radius: 25 },
    { x: 30, y: height - 30, radius: 25 },
    { x: width - 30, y: height - 30, radius: 25 }
  ];

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width * boardScale}
        height={height * boardScale}
        viewBox={`0 0 ${width} ${height}`}
        className="border-4 border-amber-800 rounded-lg shadow-2xl bg-amber-50 cursor-crosshair"
        onClick={handleBoardClick}
        style={{ backgroundColor: '#8b5a2b' }}
      >
        {/* Board background with wood texture effect */}
        <defs>
          <pattern id="woodGrain" patternUnits="userSpaceOnUse" width="100" height="20">
            <rect width="100" height="20" fill="#8b5a2b"/>
            <path d="M0,10 Q25,5 50,10 T100,10" stroke="#7c3a1d" strokeWidth="0.5" opacity="0.3"/>
            <path d="M0,15 Q30,8 60,15 T100,15" stroke="#7c3a1d" strokeWidth="0.3" opacity="0.2"/>
          </pattern>
          
          <radialGradient id="pocketGradient" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="#1f2937"/>
            <stop offset="70%" stopColor="#374151"/>
            <stop offset="100%" stopColor="#4b5563"/>
          </radialGradient>
        </defs>

        {/* Wood grain background */}
        <rect width={width} height={height} fill="url(#woodGrain)"/>

        {/* Board border lines */}
        <rect 
          x="20" 
          y="20" 
          width={width - 40} 
          height={height - 40} 
          fill="none" 
          stroke="#451a03" 
          strokeWidth="3"
        />
        
        {/* Inner playing area */}
        <rect 
          x="40" 
          y="40" 
          width={width - 80} 
          height={height - 80} 
          fill="none" 
          stroke="#451a03" 
          strokeWidth="1" 
          strokeDasharray="5,5"
          opacity="0.6"
        />

        {/* Center circle */}
        <circle
          cx={width / 2}
          cy={height / 2}
          r="80"
          fill="none"
          stroke="#451a03"
          strokeWidth="2"
          opacity="0.4"
        />

        {/* Corner pockets */}
        {pockets.map((pocket, index) => (
          <g key={`pocket-${index}`}>
            {/* Pocket shadow */}
            <circle
              cx={pocket.x + 2}
              cy={pocket.y + 2}
              r={pocket.radius}
              fill="rgba(0, 0, 0, 0.3)"
              className="blur-sm"
            />
            {/* Main pocket */}
            <circle
              cx={pocket.x}
              cy={pocket.y}
              r={pocket.radius}
              fill="url(#pocketGradient)"
              stroke="#1f2937"
              strokeWidth="2"
            />
            {/* Pocket highlight */}
            <circle
              cx={pocket.x - 3}
              cy={pocket.y - 3}
              r={pocket.radius * 0.3}
              fill="rgba(255, 255, 255, 0.1)"
            />
          </g>
        ))}

        {/* Striker baseline (bottom area) */}
        <line
          x1="60"
          y1={height - 80}
          x2={width - 60}
          y2={height - 80}
          stroke="#451a03"
          strokeWidth="2"
          strokeDasharray="10,5"
          opacity="0.8"
        />

        {/* AI Overlay */}
        {game.showAIOverlay && game.gameState.aiAssistanceLevel !== 'off' && (
          <AimOverlay
            shotOptions={game.aiSuggestions}
            bestShot={game.bestShot}
            isVisible={true}
            boardWidth={width}
            boardHeight={height}
            boardScale={boardScale}
          />
        )}

        {/* Aiming line when aiming */}
        {game.isAiming && (
          <line
            x1={game.strikerPosition.x}
            y1={game.strikerPosition.y}
            x2={game.strikerPosition.x + Math.cos(game.shotAngle) * game.shotPower * 2}
            y2={game.strikerPosition.y + Math.sin(game.shotAngle) * game.shotPower * 2}
            stroke="#ef4444"
            strokeWidth="3"
            strokeDasharray="8,4"
            opacity="0.8"
            className="animate-pulse"
          />
        )}

        {/* Game pieces (coins) */}
        {Array.from(game.gameState.coins.values()).map((coin) => (
          <GamePiece
            key={coin.id}
            coin={coin}
            isSelected={selectedCoinId === coin.id}
            isHighlighted={game.aiSuggestions.some(shot => shot.targetCoin === coin.id)}
            isMoving={game.shotInProgress && (Math.abs(coin.velocity.x) > 0.1 || Math.abs(coin.velocity.y) > 0.1)}
            onClick={handleCoinClick}
            boardScale={boardScale}
          />
        ))}

        {/* Striker */}
        <Striker
          position={game.strikerPosition}
          isAiming={game.isAiming}
          onClick={handleStrikerClick}
          onDrag={handleStrikerDrag}
          boardScale={boardScale}
          canMove={game.gameManager.canPlayerShoot() && !game.shotInProgress}
        />

        {/* Power indicator when aiming */}
        {game.isAiming && (
          <g transform={`translate(${width - 100}, 50)`}>
            <rect
              x="0"
              y="0"
              width="80"
              height="15"
              fill="rgba(0, 0, 0, 0.7)"
              rx="7"
            />
            <rect
              x="2"
              y="2"
              width={76 * (game.shotPower / 100)}
              height="11"
              fill={game.shotPower > 80 ? '#ef4444' : game.shotPower > 50 ? '#f59e0b' : '#22c55e'}
              rx="5"
            />
            <text
              x="40"
              y="11"
              textAnchor="middle"
              fill="white"
              fontSize="10"
              fontWeight="bold"
            >
              {Math.round(game.shotPower)}%
            </text>
          </g>
        )}

        {/* Turn indicator */}
        <g transform="translate(50, 50)">
          <rect
            x="0"
            y="0"
            width="120"
            height="30"
            fill="rgba(0, 0, 0, 0.8)"
            rx="15"
          />
          <text
            x="60"
            y="20"
            textAnchor="middle"
            fill={game.gameState.currentPlayer === 'player1' ? '#3b82f6' : '#ef4444'}
            fontSize="12"
            fontWeight="bold"
          >
            {game.gameState.currentPlayer === 'player1' ? 'Your Turn' : 'AI Turn'}
          </text>
        </g>

        {/* Game phase indicator */}
        {game.gameState.phase !== 'playing' && (
          <g transform={`translate(${width / 2}, 30)`}>
            <rect
              x="-60"
              y="-12"
              width="120"
              height="24"
              fill="rgba(0, 0, 0, 0.9)"
              rx="12"
            />
            <text
              x="0"
              y="5"
              textAnchor="middle"
              fill="#fbbf24"
              fontSize="11"
              fontWeight="bold"
            >
              {game.gameState.phase.toUpperCase().replace('-', ' ')}
            </text>
          </g>
        )}

        {/* Shot in progress overlay */}
        {game.shotInProgress && (
          <rect
            width={width}
            height={height}
            fill="rgba(0, 0, 0, 0.1)"
            className="pointer-events-none"
          />
        )}
      </svg>
    </div>
  );
}