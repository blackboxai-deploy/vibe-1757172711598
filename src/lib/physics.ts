import { Point, Vector, distance } from './geometry';

export interface PhysicsBody {
  id: string;
  position: Point;
  velocity: Vector;
  radius: number;
  mass: number;
  friction: number;
  restitution: number; // Bounciness (0-1)
  isStatic: boolean;
}

export interface CollisionResult {
  bodyA: PhysicsBody;
  bodyB: PhysicsBody;
  normal: Vector;
  penetration: number;
  point: Point;
}

export class PhysicsEngine {
  private bodies: Map<string, PhysicsBody> = new Map();
  private boardWidth: number;
  private boardHeight: number;
  private margin: number = 20;
  private gravity: Vector = { x: 0, y: 0 };
  private airResistance: number = 0.999;

  constructor(boardWidth: number, boardHeight: number) {
    this.boardWidth = boardWidth;
    this.boardHeight = boardHeight;
  }

  // Add a physics body to the simulation
  addBody(body: PhysicsBody): void {
    this.bodies.set(body.id, { ...body });
  }

  // Remove a physics body
  removeBody(id: string): void {
    this.bodies.delete(id);
  }

  // Get a body by ID
  getBody(id: string): PhysicsBody | undefined {
    return this.bodies.get(id);
  }

  // Get all bodies
  getAllBodies(): PhysicsBody[] {
    return Array.from(this.bodies.values());
  }

  // Update body position and velocity
  updateBody(id: string, updates: Partial<PhysicsBody>): void {
    const body = this.bodies.get(id);
    if (body) {
      Object.assign(body, updates);
    }
  }

  // Step the physics simulation forward
  step(deltaTime: number): CollisionResult[] {
    const collisions: CollisionResult[] = [];

    // Update positions based on velocity
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;

      // Apply gravity
      body.velocity.x += this.gravity.x * deltaTime;
      body.velocity.y += this.gravity.y * deltaTime;

      // Apply air resistance
      body.velocity.x *= this.airResistance;
      body.velocity.y *= this.airResistance;

      // Apply friction (surface friction)
      const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      if (speed > 0.1) {
        const frictionForce = body.friction * deltaTime;
        const frictionX = (body.velocity.x / speed) * frictionForce;
        const frictionY = (body.velocity.y / speed) * frictionForce;
        
        body.velocity.x = Math.abs(body.velocity.x) > Math.abs(frictionX) 
          ? body.velocity.x - frictionX 
          : 0;
        body.velocity.y = Math.abs(body.velocity.y) > Math.abs(frictionY) 
          ? body.velocity.y - frictionY 
          : 0;
      } else {
        body.velocity.x = 0;
        body.velocity.y = 0;
      }

      // Update position
      body.position.x += body.velocity.x * deltaTime;
      body.position.y += body.velocity.y * deltaTime;
    }

    // Check for wall collisions
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;

      this.handleWallCollisions(body);
    }

    // Check for body-to-body collisions
    const bodyArray = Array.from(this.bodies.values());
    for (let i = 0; i < bodyArray.length; i++) {
      for (let j = i + 1; j < bodyArray.length; j++) {
        const collision = this.checkCollision(bodyArray[i], bodyArray[j]);
        if (collision) {
          this.resolveCollision(collision);
          collisions.push(collision);
        }
      }
    }

    return collisions;
  }

  // Handle collisions with board walls
  private handleWallCollisions(body: PhysicsBody): void {
    // Left wall
    if (body.position.x - body.radius <= this.margin) {
      body.position.x = this.margin + body.radius;
      body.velocity.x = -body.velocity.x * body.restitution;
    }

    // Right wall
    if (body.position.x + body.radius >= this.boardWidth - this.margin) {
      body.position.x = this.boardWidth - this.margin - body.radius;
      body.velocity.x = -body.velocity.x * body.restitution;
    }

    // Top wall
    if (body.position.y - body.radius <= this.margin) {
      body.position.y = this.margin + body.radius;
      body.velocity.y = -body.velocity.y * body.restitution;
    }

    // Bottom wall
    if (body.position.y + body.radius >= this.boardHeight - this.margin) {
      body.position.y = this.boardHeight - this.margin - body.radius;
      body.velocity.y = -body.velocity.y * body.restitution;
    }
  }

  // Check collision between two bodies
  private checkCollision(bodyA: PhysicsBody, bodyB: PhysicsBody): CollisionResult | null {
    const dist = distance(bodyA.position, bodyB.position);
    const minDistance = bodyA.radius + bodyB.radius;

    if (dist < minDistance) {
      const normal = {
        x: (bodyB.position.x - bodyA.position.x) / dist,
        y: (bodyB.position.y - bodyA.position.y) / dist
      };

      const penetration = minDistance - dist;
      const contactPoint = {
        x: bodyA.position.x + normal.x * bodyA.radius,
        y: bodyA.position.y + normal.y * bodyA.radius
      };

      return {
        bodyA,
        bodyB,
        normal,
        penetration,
        point: contactPoint
      };
    }

    return null;
  }

  // Resolve collision between two bodies
  private resolveCollision(collision: CollisionResult): void {
    const { bodyA, bodyB, normal, penetration } = collision;

    // Separate bodies to resolve penetration
    const totalMass = bodyA.mass + bodyB.mass;
    const separationA = (bodyB.mass / totalMass) * penetration * 0.5;
    const separationB = (bodyA.mass / totalMass) * penetration * 0.5;

    if (!bodyA.isStatic) {
      bodyA.position.x -= normal.x * separationA;
      bodyA.position.y -= normal.y * separationA;
    }

    if (!bodyB.isStatic) {
      bodyB.position.x += normal.x * separationB;
      bodyB.position.y += normal.y * separationB;
    }

    // Calculate relative velocity
    const relativeVelocity = {
      x: bodyB.velocity.x - bodyA.velocity.x,
      y: bodyB.velocity.y - bodyA.velocity.y
    };

    // Calculate relative velocity along normal
    const velocityAlongNormal = 
      relativeVelocity.x * normal.x + relativeVelocity.y * normal.y;

    // Do not resolve if velocities are separating
    if (velocityAlongNormal > 0) return;

    // Calculate restitution
    const restitution = Math.min(bodyA.restitution, bodyB.restitution);

    // Calculate impulse scalar
    let impulse = -(1 + restitution) * velocityAlongNormal;
    impulse /= (1 / bodyA.mass) + (1 / bodyB.mass);

    // Apply impulse
    const impulseVector = {
      x: impulse * normal.x,
      y: impulse * normal.y
    };

    if (!bodyA.isStatic) {
      bodyA.velocity.x -= impulseVector.x / bodyA.mass;
      bodyA.velocity.y -= impulseVector.y / bodyA.mass;
    }

    if (!bodyB.isStatic) {
      bodyB.velocity.x += impulseVector.x / bodyB.mass;
      bodyB.velocity.y += impulseVector.y / bodyB.mass;
    }
  }

  // Simulate trajectory without affecting actual bodies
  simulateTrajectory(
    startPos: Point,
    velocity: Vector,
    radius: number = 10,
    steps: number = 100,
    timeStep: number = 1/60
  ): Point[] {
    const trajectory: Point[] = [];
    let pos = { ...startPos };
    let vel = { ...velocity };

    for (let i = 0; i < steps; i++) {
      trajectory.push({ ...pos });

      // Apply air resistance
      vel.x *= this.airResistance;
      vel.y *= this.airResistance;

      // Apply friction
      const speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y);
      if (speed > 0.1) {
        const friction = 0.02 * timeStep;
        const frictionX = (vel.x / speed) * friction;
        const frictionY = (vel.y / speed) * friction;
        
        vel.x = Math.abs(vel.x) > Math.abs(frictionX) ? vel.x - frictionX : 0;
        vel.y = Math.abs(vel.y) > Math.abs(frictionY) ? vel.y - frictionY : 0;
      } else {
        break; // Stop if velocity is too low
      }

      // Update position
      pos.x += vel.x * timeStep;
      pos.y += vel.y * timeStep;

      // Handle wall bounces
      if (pos.x - radius <= this.margin || pos.x + radius >= this.boardWidth - this.margin) {
        vel.x = -vel.x * 0.8; // Wall restitution
        pos.x = pos.x - radius <= this.margin ? 
          this.margin + radius : 
          this.boardWidth - this.margin - radius;
      }

      if (pos.y - radius <= this.margin || pos.y + radius >= this.boardHeight - this.margin) {
        vel.y = -vel.y * 0.8; // Wall restitution
        pos.y = pos.y - radius <= this.margin ? 
          this.margin + radius : 
          this.boardHeight - this.margin - radius;
      }

      // Stop if velocity is very low
      if (Math.abs(vel.x) < 0.5 && Math.abs(vel.y) < 0.5) {
        break;
      }
    }

    return trajectory;
  }

  // Check if trajectory path is clear of obstacles
  isPathClear(
    start: Point,
    end: Point,
    excludeIds: string[] = [],
    buffer: number = 2
  ): boolean {
    const pathLength = distance(start, end);
    const stepSize = 2;
    const steps = Math.ceil(pathLength / stepSize);

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const checkPoint = {
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      };

      for (const body of this.bodies.values()) {
        if (excludeIds.includes(body.id)) continue;
        
        const dist = distance(checkPoint, body.position);
        if (dist <= body.radius + buffer) {
          return false;
        }
      }
    }

    return true;
  }

  // Get bodies within a certain distance of a point
  getBodiesInRange(center: Point, range: number): PhysicsBody[] {
    return Array.from(this.bodies.values()).filter(body => 
      distance(center, body.position) <= range
    );
  }

  // Stop all bodies
  stopAllBodies(): void {
    for (const body of this.bodies.values()) {
      body.velocity.x = 0;
      body.velocity.y = 0;
    }
  }

  // Check if any body is moving
  hasMovingBodies(): boolean {
    for (const body of this.bodies.values()) {
      if (body.isStatic) continue;
      const speed = Math.sqrt(body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y);
      if (speed > 0.1) return true;
    }
    return false;
  }
}