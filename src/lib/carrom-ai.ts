import { Point, Vector, distance, angle, normalizeAngle } from './geometry';
import { PhysicsEngine, PhysicsBody } from './physics';

export interface CarromPocket {
  position: Point;
  radius: number;
}

export interface ShotOption {
  id: string;
  type: 'direct' | 'bank' | 'carom' | 'combination';
  targetCoin: string;
  targetPocket: CarromPocket;
  strikerPosition: Point;
  angle: number;
  power: number;
  successProbability: number;
  trajectory: Point[];
  bankPoints?: Point[];
  intermediateCoins?: string[];
  description: string;
  risk: 'low' | 'medium' | 'high';
}

export interface GameState {
  playerCoins: PhysicsBody[];
  opponentCoins: PhysicsBody[];
  striker: PhysicsBody;
  queen: PhysicsBody | null;
  pockets: CarromPocket[];
  currentPlayer: 'player' | 'opponent';
  gamePhase: 'initial' | 'playing' | 'endgame';
}

export class CarromAI {
  private physicsEngine: PhysicsEngine;
  private boardWidth: number;
  private boardHeight: number;
  private pockets: CarromPocket[];
  
  // AI difficulty settings
  private accuracyMultiplier: number = 1.0;

  constructor(
    physicsEngine: PhysicsEngine, 
    boardWidth: number, 
    boardHeight: number,
    difficulty: 'easy' | 'medium' | 'hard' | 'expert' = 'medium'
  ) {
    this.physicsEngine = physicsEngine;
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
    // Set difficulty parameters
    switch (difficulty) {
      case 'easy':
        this.accuracyMultiplier = 0.7;
        break;
      case 'medium':
        this.accuracyMultiplier = 0.85;
        break;
      case 'hard':
        this.accuracyMultiplier = 0.95;
        break;
      case 'expert':
        this.accuracyMultiplier = 1.0;
        break;
    }

    // Initialize pockets (standard carrom board has 4 corner pockets)
    const pocketRadius = 25;
    const margin = 30;
    this.pockets = [
      { position: { x: margin, y: margin }, radius: pocketRadius }, // Top-left
      { position: { x: boardWidth - margin, y: margin }, radius: pocketRadius }, // Top-right
      { position: { x: margin, y: boardHeight - margin }, radius: pocketRadius }, // Bottom-left
      { position: { x: boardWidth - margin, y: boardHeight - margin }, radius: pocketRadius }, // Bottom-right
    ];
  }

  // Main AI decision-making function
  analyzeShot(gameState: GameState): ShotOption[] {
    const shots: ShotOption[] = [];
    const targetCoins = this.getTargetCoins(gameState);
    const strikerStartArea = this.getStrikerStartArea();

    // Generate shot options for each target coin
    for (const targetCoin of targetCoins) {
      // Direct shots to each pocket
      for (const pocket of this.pockets) {
        const directShots = this.calculateDirectShots(
          targetCoin, 
          pocket, 
          strikerStartArea, 
          gameState
        );
        shots.push(...directShots);

        // Bank shots
        const bankShots = this.calculateBankShots(
          targetCoin, 
          pocket, 
          strikerStartArea, 
          gameState
        );
        shots.push(...bankShots);

        // Carom shots (using other coins as intermediates)
        const caromShots = this.calculateCaromShots(
          targetCoin, 
          pocket, 
          strikerStartArea, 
          gameState
        );
        shots.push(...caromShots);
      }
    }

    // Sort by success probability and strategic value
    return this.rankShots(shots, gameState);
  }

  // Get coins that the current player should target
  private getTargetCoins(gameState: GameState): PhysicsBody[] {
    if (gameState.currentPlayer === 'player') {
      return gameState.playerCoins.filter(coin => !this.isCoinPocketed(coin));
    } else {
      return gameState.opponentCoins.filter(coin => !this.isCoinPocketed(coin));
    }
  }

  // Calculate direct shots to pocket
  private calculateDirectShots(
    targetCoin: PhysicsBody,
    pocket: CarromPocket,
    strikerArea: Point[],
    gameState: GameState
  ): ShotOption[] {
    const shots: ShotOption[] = [];

    for (const strikerPos of strikerArea) {
      // Calculate angle from striker to target coin
      const strikerToCoin = angle(strikerPos, targetCoin.position);
      
      // Calculate angle from coin to pocket
      const coinToPocket = angle(targetCoin.position, pocket.position);
      
      // For a direct shot, the angles should be roughly opposite (180° apart)
      const angleDiff = Math.abs(normalizeAngle(strikerToCoin) - normalizeAngle(coinToPocket + Math.PI));
      const maxAngleError = Math.PI / 6; // 30 degrees tolerance

      if (angleDiff <= maxAngleError || (2 * Math.PI - angleDiff) <= maxAngleError) {
        const shotDistance = distance(strikerPos, targetCoin.position);
        const pocketDistance = distance(targetCoin.position, pocket.position);
        
        // Calculate required power based on distances
        const power = this.calculateRequiredPower(shotDistance, pocketDistance);
        
        // Calculate success probability
        const probability = this.calculateShotProbability(
          strikerPos,
          targetCoin.position,
          pocket.position,
          'direct',
          gameState
        );

        // Simulate trajectory
        const velocity = this.powerToVelocity(power, strikerToCoin);
        const trajectory = this.physicsEngine.simulateTrajectory(strikerPos, velocity);

        shots.push({
          id: `direct_${targetCoin.id}_${pocket.position.x}_${pocket.position.y}`,
          type: 'direct',
          targetCoin: targetCoin.id,
          targetPocket: pocket,
          strikerPosition: strikerPos,
          angle: strikerToCoin,
          power: power,
          successProbability: probability,
          trajectory: trajectory,
          description: `Direct shot to ${this.getPocketName(pocket)}`,
          risk: probability > 0.7 ? 'low' : probability > 0.4 ? 'medium' : 'high'
        });
      }
    }

    return shots;
  }

  // Calculate bank shots (bouncing off walls)
  private calculateBankShots(
    targetCoin: PhysicsBody,
    pocket: CarromPocket,
    strikerArea: Point[],
    gameState: GameState
  ): ShotOption[] {
    const shots: ShotOption[] = [];
    const walls = this.getBoardWalls();

    for (const strikerPos of strikerArea) {
      for (const wall of walls) {
        // Calculate bank point on wall
        const bankPoint = this.calculateBankPoint(targetCoin.position, pocket.position, wall);
        
        if (bankPoint) {
          const strikerToBank = angle(strikerPos, bankPoint);
          const shotDistance = distance(strikerPos, bankPoint) + distance(bankPoint, targetCoin.position);
          const power = this.calculateRequiredPower(shotDistance, distance(targetCoin.position, pocket.position));
          
          const probability = this.calculateShotProbability(
            strikerPos,
            targetCoin.position,
            pocket.position,
            'bank',
            gameState
          );

          const velocity = this.powerToVelocity(power, strikerToBank);
          const trajectory = this.physicsEngine.simulateTrajectory(strikerPos, velocity);

          shots.push({
            id: `bank_${targetCoin.id}_${pocket.position.x}_${pocket.position.y}_${bankPoint.x}`,
            type: 'bank',
            targetCoin: targetCoin.id,
            targetPocket: pocket,
            strikerPosition: strikerPos,
            angle: strikerToBank,
            power: power,
            successProbability: probability * 0.8, // Bank shots are inherently less reliable
            trajectory: trajectory,
            bankPoints: [bankPoint],
            description: `Bank shot off ${wall.name} to ${this.getPocketName(pocket)}`,
            risk: probability > 0.6 ? 'medium' : 'high'
          });
        }
      }
    }

    return shots;
  }

  // Calculate carom shots (hitting intermediate coins)
  private calculateCaromShots(
    targetCoin: PhysicsBody,
    pocket: CarromPocket,
    strikerArea: Point[],
    gameState: GameState
  ): ShotOption[] {
    const shots: ShotOption[] = [];
    const allCoins = [...gameState.playerCoins, ...gameState.opponentCoins];
    const intermediateCoins = allCoins.filter(coin => coin.id !== targetCoin.id && !this.isCoinPocketed(coin));

    for (const strikerPos of strikerArea) {
      for (const intermediateCoin of intermediateCoins) {
        // Check if we can hit intermediate coin first, then target coin
        const strikerToIntermediate = angle(strikerPos, intermediateCoin.position);
        const intermediateToTarget = angle(intermediateCoin.position, targetCoin.position);
        const targetToPocket = angle(targetCoin.position, pocket.position);

        // Calculate required angles for successful carom
        const angleDiff = Math.abs(normalizeAngle(intermediateToTarget) - normalizeAngle(targetToPocket + Math.PI));
        const maxAngleError = Math.PI / 4; // 45 degrees tolerance for carom shots

        if (angleDiff <= maxAngleError || (2 * Math.PI - angleDiff) <= maxAngleError) {
          const totalDistance = distance(strikerPos, intermediateCoin.position) + 
                               distance(intermediateCoin.position, targetCoin.position);
          const power = this.calculateRequiredPower(totalDistance, distance(targetCoin.position, pocket.position));
          
          const probability = this.calculateShotProbability(
            strikerPos,
            targetCoin.position,
            pocket.position,
            'carom',
            gameState
          );

          const velocity = this.powerToVelocity(power, strikerToIntermediate);
          const trajectory = this.physicsEngine.simulateTrajectory(strikerPos, velocity);

          shots.push({
            id: `carom_${targetCoin.id}_${intermediateCoin.id}_${pocket.position.x}`,
            type: 'carom',
            targetCoin: targetCoin.id,
            targetPocket: pocket,
            strikerPosition: strikerPos,
            angle: strikerToIntermediate,
            power: power,
            successProbability: probability * 0.6, // Carom shots are complex
            trajectory: trajectory,
            intermediateCoins: [intermediateCoin.id],
            description: `Carom shot via ${intermediateCoin.id} to ${this.getPocketName(pocket)}`,
            risk: 'high'
          });
        }
      }
    }

    return shots;
  }

  // Calculate shot success probability
  private calculateShotProbability(
    strikerPos: Point,
    targetPos: Point,
    pocketPos: Point,
    shotType: 'direct' | 'bank' | 'carom',
    gameState: GameState
  ): number {
    let baseProbability = 0.8;

    // Distance factor
    const shotDistance = distance(strikerPos, targetPos);
    const distanceFactor = Math.max(0.1, 1 - (shotDistance / 400));
    baseProbability *= distanceFactor;

    // Angle factor (closer to optimal angle = higher probability)
    const optimalAngle = angle(targetPos, pocketPos);
    const shotAngle = angle(strikerPos, targetPos);
    const angleDiff = Math.abs(normalizeAngle(optimalAngle + Math.PI) - normalizeAngle(shotAngle));
    const angleFactor = Math.max(0.1, 1 - (angleDiff / Math.PI));
    baseProbability *= angleFactor;

    // Shot type modifier
    switch (shotType) {
      case 'direct':
        baseProbability *= 1.0;
        break;
      case 'bank':
        baseProbability *= 0.7;
        break;
      case 'carom':
        baseProbability *= 0.5;
        break;
    }

    // Obstacle penalty
    const pathClear = this.physicsEngine.isPathClear(strikerPos, targetPos);
    if (!pathClear) {
      baseProbability *= 0.6;
    }

    // Apply difficulty modifier
    baseProbability *= this.accuracyMultiplier;

    // Ensure probability is between 0 and 1
    return Math.max(0.05, Math.min(0.95, baseProbability));
  }

  // Rank shots by strategic value
  private rankShots(shots: ShotOption[], gameState: GameState): ShotOption[] {
    return shots.sort((a, b) => {
      // Primary sort: success probability
      const probDiff = b.successProbability - a.successProbability;
      if (Math.abs(probDiff) > 0.1) return probDiff;

      // Secondary sort: strategic value
      const stratValueA = this.calculateStrategicValue(a, gameState);
      const stratValueB = this.calculateStrategicValue(b, gameState);
      return stratValueB - stratValueA;
    }).slice(0, 10); // Return top 10 shots
  }

  // Calculate strategic value of a shot
  private calculateStrategicValue(shot: ShotOption, gameState: GameState): number {
    let value = shot.successProbability * 100;

    // Bonus for pocketing own coins
    if (gameState.currentPlayer === 'player' && 
        gameState.playerCoins.some(coin => coin.id === shot.targetCoin)) {
      value += 20;
    }

    // Penalty for difficult shots when easier ones are available
    if (shot.risk === 'high') {
      value -= 10;
    }

    // Bonus for clearing good position
    value += this.calculatePositionalValue(shot);

    return value;
  }

  // Helper functions
  private getStrikerStartArea(): Point[] {
    const area: Point[] = [];
    const centerX = this.boardWidth / 2;
    const startY = this.boardHeight - 40;
    const range = 60;

    for (let x = centerX - range; x <= centerX + range; x += 10) {
      area.push({ x, y: startY });
    }

    return area;
  }

  private getBoardWalls() {
    return [
      { name: 'top', start: { x: 0, y: 0 }, end: { x: this.boardWidth, y: 0 } },
      { name: 'right', start: { x: this.boardWidth, y: 0 }, end: { x: this.boardWidth, y: this.boardHeight } },
      { name: 'bottom', start: { x: this.boardWidth, y: this.boardHeight }, end: { x: 0, y: this.boardHeight } },
      { name: 'left', start: { x: 0, y: this.boardHeight }, end: { x: 0, y: 0 } }
    ];
  }

  private calculateBankPoint(coinPos: Point, pocketPos: Point, wall: any): Point | null {
    // Simplified bank point calculation - would need more sophisticated geometry
    // This is a placeholder for proper reflection calculation
    const midX = (coinPos.x + pocketPos.x) / 2;
    const midY = (coinPos.y + pocketPos.y) / 2;
    
    switch (wall.name) {
      case 'top':
        return { x: midX, y: 20 };
      case 'bottom':
        return { x: midX, y: this.boardHeight - 20 };
      case 'left':
        return { x: 20, y: midY };
      case 'right':
        return { x: this.boardWidth - 20, y: midY };
      default:
        return null;
    }
  }

  private calculateRequiredPower(shotDistance: number, pocketDistance: number): number {
    // Base power calculation
    const basePower = Math.min(100, Math.max(20, shotDistance * 0.3 + pocketDistance * 0.1));
    return basePower;
  }

  private powerToVelocity(power: number, angle: number): Vector {
    const speed = power * 0.5; // Convert power to velocity magnitude
    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
  }

  private getPocketName(pocket: CarromPocket): string {
    const { x, y } = pocket.position;
    const halfWidth = this.boardWidth / 2;
    const halfHeight = this.boardHeight / 2;

    if (x < halfWidth && y < halfHeight) return 'top-left';
    if (x >= halfWidth && y < halfHeight) return 'top-right';
    if (x < halfWidth && y >= halfHeight) return 'bottom-left';
    return 'bottom-right';
  }

  private isCoinPocketed(coin: PhysicsBody): boolean {
    for (const pocket of this.pockets) {
      if (distance(coin.position, pocket.position) <= pocket.radius) {
        return true;
      }
    }
    return false;
  }

  private getObstacles(gameState: GameState, exclude: Point[] = []): PhysicsBody[] {
    const allCoins = [...gameState.playerCoins, ...gameState.opponentCoins];
    return allCoins.filter(coin => 
      !this.isCoinPocketed(coin) && 
      !exclude.some(pos => distance(pos, coin.position) < 5)
    );
  }

  private calculatePositionalValue(shot: ShotOption): number {
    // Simplified positional value calculation
    // In a real implementation, this would consider board control, defensive positioning, etc.
    return shot.successProbability > 0.5 ? 5 : 0;
  }

  // Public method to get best shot recommendation
  getBestShot(gameState: GameState): ShotOption | null {
    const shots = this.analyzeShot(gameState);
    return shots.length > 0 ? shots[0] : null;
  }

  // Get multiple shot options for player choice
  getShotOptions(gameState: GameState, count: number = 5): ShotOption[] {
    const shots = this.analyzeShot(gameState);
    return shots.slice(0, count);
  }
}