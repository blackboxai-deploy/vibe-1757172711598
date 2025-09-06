'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Point, Vector } from '../lib/geometry';
import { PhysicsEngine } from '../lib/physics';
import { CarromAI, ShotOption, GameState as AIGameState } from '../lib/carrom-ai';
import { CarromGameManager, GameState, CarromCoin } from '../lib/game-state';

interface UseCarromGameOptions {
  boardWidth: number;
  boardHeight: number;
  gameMode: 'practice' | 'vs-ai' | 'multiplayer' | 'tutorial';
  aiDifficulty: 'easy' | 'medium' | 'hard' | 'expert';
}

interface CarromGameHook {
  // Game state
  gameState: GameState;
  gameManager: CarromGameManager;
  physicsEngine: PhysicsEngine;
  aiEngine: CarromAI;
  
  // Current shot state
  strikerPosition: Point;
  shotPower: number;
  shotAngle: number;
  isAiming: boolean;
  shotInProgress: boolean;
  
  // AI assistance
  aiSuggestions: ShotOption[];
  bestShot: ShotOption | null;
  showAIOverlay: boolean;
  
  // Animation state
  animationFrame: number | null;
  
  // Actions
  setStrikerPosition: (position: Point) => void;
  setShotPower: (power: number) => void;
  setShotAngle: (angle: number) => void;
  startAiming: () => void;
  stopAiming: () => void;
  executeShot: () => void;
  toggleAIOverlay: () => void;
  resetGame: () => void;
  
  // AI controls
  getAISuggestions: () => void;
  executeAIShot: (shotOption?: ShotOption) => void;
  setAIAssistanceLevel: (level: 'off' | 'hints' | 'full') => void;
}

export function useCarromGame(options: UseCarromGameOptions): CarromGameHook {
  // Initialize game engines
  const [physicsEngine] = useState(() => new PhysicsEngine(options.boardWidth, options.boardHeight));
  const [gameManager] = useState(() => new CarromGameManager(options.gameMode));
  const [aiEngine] = useState(() => new CarromAI(physicsEngine, options.boardWidth, options.boardHeight, options.aiDifficulty));
  
  // Game state
  const [gameState, setGameState] = useState<GameState>(gameManager.getGameState());
  const [strikerPosition, setStrikerPositionState] = useState<Point>({ x: options.boardWidth / 2, y: options.boardHeight - 50 });
  const [shotPower, setShotPower] = useState<number>(50);
  const [shotAngle, setShotAngle] = useState<number>(0);
  const [isAiming, setIsAiming] = useState<boolean>(false);
  const [shotInProgress, setShotInProgress] = useState<boolean>(false);
  
  // AI state
  const [aiSuggestions, setAISuggestions] = useState<ShotOption[]>([]);
  const [bestShot, setBestShot] = useState<ShotOption | null>(null);
  const [showAIOverlay, setShowAIOverlay] = useState<boolean>(true);
  
  // Animation
  const animationFrameRef = useRef<number | null>(null);
  const lastUpdateTime = useRef<number>(0);
  
  // Initialize physics bodies from game state
  useEffect(() => {
    // Clear existing bodies
    physicsEngine.getAllBodies().forEach(body => {
      physicsEngine.removeBody(body.id);
    });
    
    // Add coins to physics engine
    gameState.coins.forEach(coin => {
      if (!coin.isPocketed) {
        physicsEngine.addBody({
          id: coin.id,
          position: coin.position,
          velocity: coin.velocity,
          radius: coin.radius,
          mass: coin.mass,
          friction: coin.friction,
          restitution: coin.restitution,
          isStatic: coin.isStatic
        });
      }
    });
    
    // Add striker to physics engine
    physicsEngine.addBody({
      id: gameState.striker.id,
      position: gameState.striker.position,
      velocity: gameState.striker.velocity,
      radius: gameState.striker.radius,
      mass: gameState.striker.mass,
      friction: gameState.striker.friction,
      restitution: gameState.striker.restitution,
      isStatic: gameState.striker.isStatic
    });
  }, [gameState.coins, gameState.striker, physicsEngine]);
  
  // Physics simulation loop
  const startPhysicsLoop = useCallback(() => {
    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastUpdateTime.current;
      lastUpdateTime.current = currentTime;
      
      if (deltaTime > 0) {
        // Step physics simulation
        const collisions = physicsEngine.step(deltaTime * 0.001); // Convert to seconds
        
        // Update game state from physics engine
        const updatedCoins = new Map(gameState.coins);
        
        physicsEngine.getAllBodies().forEach(body => {
          if (body.id === 'striker') {
            // Update striker position in physics
          } else {
            const coin = updatedCoins.get(body.id);
            if (coin && !coin.isPocketed) {
              coin.position = body.position;
              coin.velocity = body.velocity;
            }
          }
        });
        
        // Check if shot is complete (all bodies stopped)
        if (shotInProgress && !physicsEngine.hasMovingBodies()) {
          setShotInProgress(false);
          handleShotComplete(collisions.map(c => c.bodyA.id));
        }
        
        // Update game state
        setGameState(gameManager.getGameState());
      }
      
      if (shotInProgress || physicsEngine.hasMovingBodies()) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };
    
    if (animationFrameRef.current === null) {
      lastUpdateTime.current = performance.now();
      animationFrameRef.current = requestAnimationFrame(animate);
    }
  }, [physicsEngine, gameManager, gameState.coins, shotInProgress]);
  
  // Handle shot completion
  const handleShotComplete = useCallback((coinsHit: string[]) => {
    // Determine which coins were pocketed
    const coinsPocketed: string[] = [];
    
    // Check each coin's position against pockets
    gameState.coins.forEach(coin => {
      if (!coin.isPocketed) {
        // Check if coin is in any pocket (simplified - would need actual pocket collision detection)
        const pockets = [
          { x: 30, y: 30 }, { x: options.boardWidth - 30, y: 30 },
          { x: 30, y: options.boardHeight - 30 }, { x: options.boardWidth - 30, y: options.boardHeight - 30 }
        ];
        
        for (const pocket of pockets) {
          const distance = Math.sqrt(
            Math.pow(coin.position.x - pocket.x, 2) + 
            Math.pow(coin.position.y - pocket.y, 2)
          );
          
          if (distance <= 25) { // Pocket radius
            coinsPocketed.push(coin.id);
            break;
          }
        }
      }
    });
    
    // Execute the move in game manager
    gameManager.executeMove(
      strikerPosition,
      shotPower,
      shotAngle,
      coinsHit,
      coinsPocketed
    );
    
    // Reset striker position
    setStrikerPositionState({ x: options.boardWidth / 2, y: options.boardHeight - 50 });
    setShotPower(50);
    
    // Update AI suggestions for next turn
    if (gameState.aiAssistanceLevel !== 'off') {
      getAISuggestions();
    }
  }, [gameManager, gameState, strikerPosition, shotPower, shotAngle, options.boardWidth, options.boardHeight]);
  
  // Set striker position
  const setStrikerPosition = useCallback((position: Point) => {
    if (!shotInProgress && gameManager.canPlayerShoot()) {
      setStrikerPositionState(position);
      physicsEngine.updateBody('striker', { position });
      
      // Update AI suggestions when striker position changes
      if (gameState.aiAssistanceLevel !== 'off') {
        getAISuggestions();
      }
    }
  }, [shotInProgress, gameManager, physicsEngine, gameState.aiAssistanceLevel]);
  
  // Start aiming
  const startAiming = useCallback(() => {
    if (gameManager.canPlayerShoot() && !shotInProgress) {
      setIsAiming(true);
    }
  }, [gameManager, shotInProgress]);
  
  // Stop aiming
  const stopAiming = useCallback(() => {
    setIsAiming(false);
  }, []);
  
  // Execute shot
  const executeShot = useCallback(() => {
    if (!gameManager.canPlayerShoot() || shotInProgress || !isAiming) {
      return;
    }
    
    // Convert power and angle to velocity
    const velocity: Vector = {
      x: Math.cos(shotAngle) * shotPower * 0.5,
      y: Math.sin(shotAngle) * shotPower * 0.5
    };
    
    // Apply velocity to striker
    physicsEngine.updateBody('striker', { 
      position: strikerPosition,
      velocity 
    });
    
    setShotInProgress(true);
    setIsAiming(false);
    startPhysicsLoop();
  }, [gameManager, shotInProgress, isAiming, shotAngle, shotPower, strikerPosition, physicsEngine, startPhysicsLoop]);
  
  // Get AI suggestions
  const getAISuggestions = useCallback(() => {
    if (gameState.phase === 'finished') return;
    
    // Convert game state to AI format
    const aiGameState: AIGameState = {
      playerCoins: Array.from(gameState.coins.values())
        .filter((coin: CarromCoin) => coin.owner === 'player1' && !coin.isPocketed)
        .map((coin: CarromCoin) => ({
          id: coin.id,
          position: coin.position,
          velocity: coin.velocity,
          radius: coin.radius,
          mass: coin.mass,
          friction: coin.friction,
          restitution: coin.restitution,
          isStatic: coin.isStatic
        })),
      opponentCoins: Array.from(gameState.coins.values())
        .filter((coin: CarromCoin) => coin.owner === 'player2' && !coin.isPocketed)
        .map((coin: CarromCoin) => ({
          id: coin.id,
          position: coin.position,
          velocity: coin.velocity,
          radius: coin.radius,
          mass: coin.mass,
          friction: coin.friction,
          restitution: coin.restitution,
          isStatic: coin.isStatic
        })),
      striker: {
        id: gameState.striker.id,
        position: gameState.striker.position,
        velocity: gameState.striker.velocity,
        radius: gameState.striker.radius,
        mass: gameState.striker.mass,
        friction: gameState.striker.friction,
        restitution: gameState.striker.restitution,
        isStatic: gameState.striker.isStatic
      },
      queen: gameState.queenCaptured ? null : {
        id: 'queen',
        position: gameState.coins.get('queen')?.position || { x: 0, y: 0 },
        velocity: { x: 0, y: 0 },
        radius: 9,
        mass: 1.2,
        friction: 0.02,
        restitution: 0.8,
        isStatic: false
      },
      pockets: [
        { position: { x: 30, y: 30 }, radius: 25 },
        { position: { x: options.boardWidth - 30, y: 30 }, radius: 25 },
        { position: { x: 30, y: options.boardHeight - 30 }, radius: 25 },
        { position: { x: options.boardWidth - 30, y: options.boardHeight - 30 }, radius: 25 }
      ],
      currentPlayer: gameState.currentPlayer === 'player1' ? 'player' : 'opponent',
      gamePhase: gameState.phase === 'initial' ? 'initial' : 
                gameState.phase === 'endgame' ? 'endgame' : 'playing'
    };
    
    // Get AI suggestions
    const suggestions = aiEngine.getShotOptions(aiGameState, 5);
    const best = aiEngine.getBestShot(aiGameState);
    
    setAISuggestions(suggestions);
    setBestShot(best);
  }, [gameState, aiEngine, options.boardWidth, options.boardHeight]);
  
  // Execute AI shot
  const executeAIShot = useCallback((shotOption?: ShotOption) => {
    const shot = shotOption || bestShot;
    if (!shot || !gameManager.canPlayerShoot() || shotInProgress) return;
    
    // Set shot parameters
    setStrikerPosition(shot.strikerPosition);
    setShotPower(shot.power);
    setShotAngle(shot.angle);
    
    // Execute after a brief delay
    setTimeout(() => {
      executeShot();
    }, 100);
  }, [bestShot, gameManager, shotInProgress, setStrikerPosition, executeShot]);
  
  // Toggle AI overlay
  const toggleAIOverlay = useCallback(() => {
    setShowAIOverlay(prev => !prev);
  }, []);
  
  // Reset game
  const resetGame = useCallback(() => {
    // Stop any ongoing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Reset game manager
    gameManager.resetGame();
    setGameState(gameManager.getGameState());
    
    // Reset shot state
    setShotInProgress(false);
    setIsAiming(false);
    setStrikerPositionState({ x: options.boardWidth / 2, y: options.boardHeight - 50 });
    setShotPower(50);
    setShotAngle(0);
    
    // Clear AI suggestions
    setAISuggestions([]);
    setBestShot(null);
  }, [gameManager, options.boardWidth, options.boardHeight]);
  
  // Set AI assistance level
  const setAIAssistanceLevel = useCallback((level: 'off' | 'hints' | 'full') => {
    gameManager.setAIAssistanceLevel(level);
    setGameState(gameManager.getGameState());
    
    if (level !== 'off') {
      getAISuggestions();
    } else {
      setAISuggestions([]);
      setBestShot(null);
    }
  }, [gameManager, getAISuggestions]);
  
  // Initialize AI suggestions
  useEffect(() => {
    if (gameState.aiAssistanceLevel !== 'off') {
      getAISuggestions();
    }
  }, [gameState.aiAssistanceLevel, getAISuggestions]);
  
  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  return {
    // Game state
    gameState,
    gameManager,
    physicsEngine,
    aiEngine,
    
    // Current shot state
    strikerPosition,
    shotPower,
    shotAngle,
    isAiming,
    shotInProgress,
    
    // AI assistance
    aiSuggestions,
    bestShot,
    showAIOverlay,
    
    // Animation state
    animationFrame: animationFrameRef.current,
    
    // Actions
    setStrikerPosition,
    setShotPower,
    setShotAngle,
    startAiming,
    stopAiming,
    executeShot,
    toggleAIOverlay,
    resetGame,
    
    // AI controls
    getAISuggestions,
    executeAIShot,
    setAIAssistanceLevel
  };
}