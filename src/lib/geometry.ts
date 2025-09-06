// Geometry utilities for carrom game calculations
export interface Point {
  x: number;
  y: number;
}

export interface Vector {
  x: number;
  y: number;
}

export interface Line {
  start: Point;
  end: Point;
}

export interface Circle {
  center: Point;
  radius: number;
}

// Calculate distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Calculate angle between two points in radians
export function angle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Convert radians to degrees
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI;
}

// Convert degrees to radians
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

// Normalize angle to 0-2π range
export function normalizeAngle(angle: number): number {
  while (angle < 0) angle += 2 * Math.PI;
  while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
  return angle;
}

// Calculate point at distance and angle from origin
export function pointAtAngle(origin: Point, angle: number, distance: number): Point {
  return {
    x: origin.x + Math.cos(angle) * distance,
    y: origin.y + Math.sin(angle) * distance
  };
}

// Check if two circles intersect
export function circlesIntersect(c1: Circle, c2: Circle): boolean {
  const dist = distance(c1.center, c2.center);
  return dist <= c1.radius + c2.radius;
}

// Find intersection point of two lines (if they intersect)
export function lineIntersection(line1: Line, line2: Line): Point | null {
  const x1 = line1.start.x, y1 = line1.start.y;
  const x2 = line1.end.x, y2 = line1.end.y;
  const x3 = line2.start.x, y3 = line2.start.y;
  const x4 = line2.end.x, y4 = line2.end.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null; // Lines are parallel

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  return null;
}

// Calculate reflection angle off a wall
export function reflect(velocity: Vector, normal: Vector): Vector {
  const dot = 2 * (velocity.x * normal.x + velocity.y * normal.y);
  return {
    x: velocity.x - dot * normal.x,
    y: velocity.y - dot * normal.y
  };
}

// Check if a point is inside a circle
export function pointInCircle(point: Point, circle: Circle): boolean {
  return distance(point, circle.center) <= circle.radius;
}

// Calculate the closest point on a line to a given point
export function closestPointOnLine(point: Point, line: Line): Point {
  const dx = line.end.x - line.start.x;
  const dy = line.end.y - line.start.y;
  
  if (dx === 0 && dy === 0) {
    return line.start;
  }
  
  const t = ((point.x - line.start.x) * dx + (point.y - line.start.y) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));
  
  return {
    x: line.start.x + clampedT * dx,
    y: line.start.y + clampedT * dy
  };
}

// Calculate trajectory path with multiple bounces
export function calculateTrajectory(
  start: Point,
  velocity: Vector,
  friction: number = 0.98,
  boardWidth: number,
  boardHeight: number,
  maxBounces: number = 5
): Point[] {
  const path: Point[] = [{ ...start }];
  let currentPos = { ...start };
  let currentVel = { ...velocity };
  let bounces = 0;

  const margin = 20; // Board margin
  
  while (bounces < maxBounces && (Math.abs(currentVel.x) > 0.1 || Math.abs(currentVel.y) > 0.1)) {
    // Calculate next position
    const nextPos = {
      x: currentPos.x + currentVel.x,
      y: currentPos.y + currentVel.y
    };

    // Check for wall collisions
    let collided = false;
    
    // Left/right walls
    if (nextPos.x <= margin || nextPos.x >= boardWidth - margin) {
      currentVel.x = -currentVel.x * friction;
      nextPos.x = nextPos.x <= margin ? margin : boardWidth - margin;
      collided = true;
      bounces++;
    }
    
    // Top/bottom walls
    if (nextPos.y <= margin || nextPos.y >= boardHeight - margin) {
      currentVel.y = -currentVel.y * friction;
      nextPos.y = nextPos.y <= margin ? margin : boardHeight - margin;
      collided = true;
      bounces++;
    }

    currentPos = nextPos;
    path.push({ ...currentPos });

    // Apply friction
    if (!collided) {
      currentVel.x *= friction;
      currentVel.y *= friction;
    }
  }

  return path;
}

// Find optimal angle to hit target point
export function calculateOptimalAngle(from: Point, to: Point, obstacles: Circle[] = []): number {
  const directAngle = angle(from, to);
  
  // Check if direct path is clear
  const directLine: Line = { start: from, end: to };
  let pathClear = true;
  
  for (const obstacle of obstacles) {
    const closestPoint = closestPointOnLine(obstacle.center, directLine);
    if (distance(closestPoint, obstacle.center) <= obstacle.radius + 2) {
      pathClear = false;
      break;
    }
  }
  
  if (pathClear) {
    return directAngle;
  }
  
  // Try angles around the direct angle to find clear path
  const angleStep = toRadians(5);
  for (let offset = angleStep; offset <= toRadians(45); offset += angleStep) {
    for (const sign of [-1, 1]) {
      const testAngle = directAngle + (offset * sign);
      const testDistance = distance(from, to);
      const testEnd = pointAtAngle(from, testAngle, testDistance);
      const testLine: Line = { start: from, end: testEnd };
      
      let testPathClear = true;
      for (const obstacle of obstacles) {
        const closestPoint = closestPointOnLine(obstacle.center, testLine);
        if (distance(closestPoint, obstacle.center) <= obstacle.radius + 2) {
          testPathClear = false;
          break;
        }
      }
      
      if (testPathClear) {
        return testAngle;
      }
    }
  }
  
  // Return direct angle as fallback
  return directAngle;
}