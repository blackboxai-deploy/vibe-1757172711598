import { PhysicsBody } from './physics';
import { Point } from './geometry';

export type CoinType = 'white' | 'black' | 'queen';
export type GamePhase = 'initial' | 'playing' | 'queen-captured' | 'endgame' | 'finished';
export type Player = 'player1' | 'player2';

export interface CarromCoin {
  id: string;
  position: Point;
  velocity: { x: number; y: number };
  radius: number;
  mass: number;
  friction: number;
  restitution: number;
  isStatic: boolean;
  type: CoinType;
  owner: Player | null; // null for queen initially
  isPocketed: boolean;
  pocketedBy: Player | null;
}

export interface GameScore {
  player1: number;
  player2: number;
  player1Coins: number; // Remaining coins
  player2Coins: number;
}

export interface GameRules {
  totalWhiteCoins: number;
  totalBlackCoins: number;
  queenBonus: number;
  foulPenalty: number;
  maxTurnsPerPlayer: number;
}

export interface GameMove {
  id: string;
  player: Player;
  timestamp: Date;
  strikerPosition: Point;
  power: number;
  angle: number;
  coinsHit: string[];
  coinsPocketed: string[];
  wasQueenPocketed: boolean;
  wasFoul: boolean;
  score: number;
}

export interface GameState {
  // Game metadata
  gameId: string;
  phase: GamePhase;
  currentPlayer: Player;
  turnNumber: number;
  gameStartTime: Date;

  // Coins and board state
  coins: Map<string, CarromCoin>;
  striker: PhysicsBody;
  queenCaptured: boolean;
  queenCapturedBy: Player | null;

  // Scoring
  score: GameScore;
  rules: GameRules;

  // Game history
  moves: GameMove[];
  
  // Current turn state
  canShoot: boolean;
  continueTurn: boolean; // True if player gets another turn
  shotInProgress: boolean;

  // Fouls and penalties
  consecutiveFouls: { player1: number; player2: number };
  
  // Game settings
  aiAssistanceLevel: 'off' | 'hints' | 'full';
  gameMode: 'practice' | 'vs-ai' | 'multiplayer' | 'tutorial';
}

export class CarromGameManager {
  private gameState: GameState;
  
  constructor(gameMode: 'practice' | 'vs-ai' | 'multiplayer' | 'tutorial' = 'practice') {
    this.gameState = this.initializeGame(gameMode);
  }

  // Initialize a new game
  private initializeGame(gameMode: 'practice' | 'vs-ai' | 'multiplayer' | 'tutorial'): GameState {
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize coins
    const coins = new Map<string, CarromCoin>();
    
    // Create white coins (9 pieces)
    for (let i = 0; i < 9; i++) {
      const coinId = `white_${i}`;
      coins.set(coinId, {
        id: coinId,
        position: this.getInitialCoinPosition('white', i),
        velocity: { x: 0, y: 0 },
        radius: 8,
        mass: 1,
        friction: 0.02,
        restitution: 0.8,
        isStatic: false,
        type: 'white',
        owner: 'player1',
        isPocketed: false,
        pocketedBy: null
      });
    }

    // Create black coins (9 pieces)
    for (let i = 0; i < 9; i++) {
      const coinId = `black_${i}`;
      coins.set(coinId, {
        id: coinId,
        position: this.getInitialCoinPosition('black', i),
        velocity: { x: 0, y: 0 },
        radius: 8,
        mass: 1,
        friction: 0.02,
        restitution: 0.8,
        isStatic: false,
        type: 'black',
        owner: 'player2',
        isPocketed: false,
        pocketedBy: null
      });
    }

    // Create queen (red coin)
    const queenId = 'queen';
    coins.set(queenId, {
      id: queenId,
      position: { x: 400, y: 300 }, // Center of board
      velocity: { x: 0, y: 0 },
      radius: 9,
      mass: 1.2,
      friction: 0.02,
      restitution: 0.8,
      isStatic: false,
      type: 'queen',
      owner: null,
      isPocketed: false,
      pocketedBy: null
    });

    // Create striker
    const striker: PhysicsBody = {
      id: 'striker',
      position: { x: 400, y: 550 }, // Bottom center
      velocity: { x: 0, y: 0 },
      radius: 12,
      mass: 2,
      friction: 0.025,
      restitution: 0.9,
      isStatic: false
    };

    return {
      gameId,
      phase: 'initial',
      currentPlayer: 'player1',
      turnNumber: 1,
      gameStartTime: new Date(),
      
      coins,
      striker,
      queenCaptured: false,
      queenCapturedBy: null,
      
      score: {
        player1: 0,
        player2: 0,
        player1Coins: 9,
        player2Coins: 9
      },
      
      rules: {
        totalWhiteCoins: 9,
        totalBlackCoins: 9,
        queenBonus: 3,
        foulPenalty: -1,
        maxTurnsPerPlayer: 50
      },
      
      moves: [],
      
      canShoot: true,
      continueTurn: false,
      shotInProgress: false,
      
      consecutiveFouls: { player1: 0, player2: 0 },
      
      aiAssistanceLevel: 'hints',
      gameMode
    };
  }

  // Get initial coin positions in carrom formation
  private getInitialCoinPosition(type: CoinType, index: number): Point {
    const centerX = 400;
    const centerY = 300;
    const radius = 8;
    const spacing = radius * 2 + 1;

    if (type === 'queen') {
      return { x: centerX, y: centerY };
    }

    // Carrom formation: alternating white and black in a specific pattern
    const positions: Point[] = [
      // Inner ring (around queen)
      { x: centerX - spacing, y: centerY },
      { x: centerX + spacing, y: centerY },
      { x: centerX, y: centerY - spacing },
      { x: centerX, y: centerY + spacing },
      { x: centerX - spacing, y: centerY - spacing },
      { x: centerX + spacing, y: centerY - spacing },
      { x: centerX - spacing, y: centerY + spacing },
      { x: centerX + spacing, y: centerY + spacing },
      
      // Outer ring
      { x: centerX - spacing * 2, y: centerY },
      { x: centerX + spacing * 2, y: centerY },
      { x: centerX, y: centerY - spacing * 2 },
      { x: centerX, y: centerY + spacing * 2 },
      { x: centerX - spacing * 2, y: centerY - spacing },
      { x: centerX + spacing * 2, y: centerY - spacing },
      { x: centerX - spacing * 2, y: centerY + spacing },
      { x: centerX + spacing * 2, y: centerY + spacing },
      { x: centerX - spacing, y: centerY - spacing * 2 },
      { x: centerX + spacing, y: centerY - spacing * 2 }
    ];

    return positions[index % positions.length];
  }

  // Execute a move
  executeMove(
    strikerPosition: Point,
    power: number,
    angle: number,
    coinsHit: string[],
    coinsPocketed: string[]
  ): GameMove {
    const move: GameMove = {
      id: `move_${this.gameState.turnNumber}_${Date.now()}`,
      player: this.gameState.currentPlayer,
      timestamp: new Date(),
      strikerPosition,
      power,
      angle,
      coinsHit,
      coinsPocketed,
      wasQueenPocketed: coinsPocketed.includes('queen'),
      wasFoul: this.checkForFouls(coinsHit, coinsPocketed),
      score: 0
    };

    // Calculate score for this move
    move.score = this.calculateMoveScore(move);

    // Update game state based on move
    this.updateGameStateAfterMove(move);

    // Add move to history
    this.gameState.moves.push(move);

    return move;
  }

  // Check for fouls
  private checkForFouls(coinsHit: string[], coinsPocketed: string[]): boolean {
    // Foul if no coins were hit
    if (coinsHit.length === 0) return true;

    // Foul if striker was pocketed
    if (coinsPocketed.includes('striker')) return true;

    // Foul if opponent's coins were hit first
    const firstCoinHit = coinsHit[0];
    const firstCoin = this.gameState.coins.get(firstCoinHit);
    if (firstCoin && firstCoin.owner !== this.gameState.currentPlayer && firstCoin.type !== 'queen') {
      return true;
    }

    // Foul if queen was pocketed without covering
    if (coinsPocketed.includes('queen') && coinsPocketed.length === 1) {
      return true;
    }

    return false;
  }

  // Calculate score for a move
  private calculateMoveScore(move: GameMove): number {
    let score = 0;

    for (const coinId of move.coinsPocketed) {
      if (coinId === 'striker') continue; // Striker pocketing is a foul, no score

      const coin = this.gameState.coins.get(coinId);
      if (!coin) continue;

      if (coin.type === 'queen') {
        // Queen bonus only if properly covered (another coin pocketed)
        if (move.coinsPocketed.length > 1) {
          score += this.gameState.rules.queenBonus;
        }
      } else if (coin.owner === this.gameState.currentPlayer) {
        score += 1; // 1 point for own coin
      }
    }

    // Apply foul penalty
    if (move.wasFoul) {
      score += this.gameState.rules.foulPenalty;
    }

    return score;
  }

  // Update game state after a move
  private updateGameStateAfterMove(move: GameMove): void {
    // Update score
    if (this.gameState.currentPlayer === 'player1') {
      this.gameState.score.player1 += move.score;
    } else {
      this.gameState.score.player2 += move.score;
    }

    // Handle pocketed coins
    for (const coinId of move.coinsPocketed) {
      const coin = this.gameState.coins.get(coinId);
      if (coin && coinId !== 'striker') {
        coin.isPocketed = true;
        coin.pocketedBy = this.gameState.currentPlayer;

        // Update coin counts
        if (coin.type === 'white' && coin.owner === 'player1') {
          this.gameState.score.player1Coins--;
        } else if (coin.type === 'black' && coin.owner === 'player2') {
          this.gameState.score.player2Coins--;
        } else if (coin.type === 'queen') {
          this.gameState.queenCaptured = true;
          this.gameState.queenCapturedBy = this.gameState.currentPlayer;
        }
      }
    }

    // Handle fouls
    if (move.wasFoul) {
      this.gameState.consecutiveFouls[this.gameState.currentPlayer]++;
      this.gameState.continueTurn = false;
    } else {
      this.gameState.consecutiveFouls[this.gameState.currentPlayer] = 0;
      // Continue turn if coins were pocketed (except for fouls)
      this.gameState.continueTurn = move.coinsPocketed.length > 0 && !move.coinsPocketed.includes('striker');
    }

    // Check for game end conditions
    this.checkGameEndConditions();

    // Switch players if turn is over
    if (!this.gameState.continueTurn && this.gameState.phase !== 'finished') {
      this.switchPlayer();
    }

    this.gameState.turnNumber++;
  }

  // Check if game should end
  private checkGameEndConditions(): void {
    // Game ends if a player has no coins left
    if (this.gameState.score.player1Coins === 0) {
      this.gameState.phase = 'finished';
      return;
    }

    if (this.gameState.score.player2Coins === 0) {
      this.gameState.phase = 'finished';
      return;
    }

    // Game ends if max turns reached
    if (this.gameState.turnNumber >= this.gameState.rules.maxTurnsPerPlayer * 2) {
      this.gameState.phase = 'finished';
      return;
    }

    // Update phase based on game progress
    if (this.gameState.queenCaptured && this.gameState.phase === 'initial') {
      this.gameState.phase = 'queen-captured';
    } else if (this.gameState.score.player1Coins <= 3 || this.gameState.score.player2Coins <= 3) {
      this.gameState.phase = 'endgame';
    } else if (this.gameState.phase === 'initial' && this.gameState.turnNumber > 2) {
      this.gameState.phase = 'playing';
    }
  }

  // Switch to the other player
  private switchPlayer(): void {
    this.gameState.currentPlayer = this.gameState.currentPlayer === 'player1' ? 'player2' : 'player1';
    this.gameState.canShoot = true;
    this.gameState.continueTurn = false;
  }

  // Public getters
  getGameState(): GameState {
    return { ...this.gameState };
  }

  getCurrentPlayer(): Player {
    return this.gameState.currentPlayer;
  }

  getScore(): GameScore {
    return { ...this.gameState.score };
  }

  canPlayerShoot(): boolean {
    return this.gameState.canShoot && !this.gameState.shotInProgress && this.gameState.phase !== 'finished';
  }

  isGameFinished(): boolean {
    return this.gameState.phase === 'finished';
  }

  getWinner(): Player | 'tie' | null {
    if (!this.isGameFinished()) return null;

    if (this.gameState.score.player1 > this.gameState.score.player2) {
      return 'player1';
    } else if (this.gameState.score.player2 > this.gameState.score.player1) {
      return 'player2';
    } else {
      return 'tie';
    }
  }

  // Reset game
  resetGame(): void {
    this.gameState = this.initializeGame(this.gameState.gameMode);
  }

  // Get available coins for targeting
  getTargetableCoins(player: Player): CarromCoin[] {
    const coins: CarromCoin[] = [];
    
    for (const coin of this.gameState.coins.values()) {
      if (!coin.isPocketed) {
        if (coin.owner === player || coin.type === 'queen') {
          coins.push(coin);
        }
      }
    }

    return coins;
  }

  // Update AI assistance level
  setAIAssistanceLevel(level: 'off' | 'hints' | 'full'): void {
    this.gameState.aiAssistanceLevel = level;
  }

  // Get move history
  getMoveHistory(): GameMove[] {
    return [...this.gameState.moves];
  }

  // Undo last move (for practice mode)
  undoLastMove(): boolean {
    if (this.gameState.gameMode !== 'practice' || this.gameState.moves.length === 0) {
      return false;
    }

    // This would require more complex state restoration logic
    // For now, just return false to indicate undo is not available
    return false;
  }
}