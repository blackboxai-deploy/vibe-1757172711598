'use client';

import React from 'react';
import { Point } from '../lib/geometry';
import { CarromCoin } from '../lib/game-state';

interface GamePieceProps {
  coin: CarromCoin;
  isSelected?: boolean;
  isHighlighted?: boolean;
  isMoving?: boolean;
  onClick?: (coinId: string) => void;
  boardScale?: number;
}

export function GamePiece({ 
  coin, 
  isSelected = false, 
  isHighlighted = false, 
  isMoving = false,
  onClick,
  boardScale = 1 
}: GamePieceProps) {
  if (coin.isPocketed) return null;

  const handleClick = () => {
    if (onClick) {
      onClick(coin.id);
    }
  };

  const getColorStyle = () => {
    switch (coin.type) {
      case 'white':
        return {
          fill: isSelected ? '#f0f0f0' : '#ffffff',
          stroke: isHighlighted ? '#4ade80' : '#d1d5db',
          strokeWidth: isHighlighted ? 3 : 2
        };
      case 'black':
        return {
          fill: isSelected ? '#374151' : '#1f2937',
          stroke: isHighlighted ? '#4ade80' : '#6b7280',
          strokeWidth: isHighlighted ? 3 : 2
        };
      case 'queen':
        return {
          fill: isSelected ? '#dc2626' : '#ef4444',
          stroke: isHighlighted ? '#fbbf24' : '#f59e0b',
          strokeWidth: isHighlighted ? 4 : 3
        };
      default:
        return {
          fill: '#9ca3af',
          stroke: '#6b7280',
          strokeWidth: 2
        };
    }
  };

  const style = getColorStyle();
  const scaledRadius = coin.radius * boardScale;

  return (
    <g 
      transform={`translate(${coin.position.x * boardScale}, ${coin.position.y * boardScale})`}
      onClick={handleClick}
      className={`cursor-pointer transition-all duration-200 ${
        isMoving ? 'animate-pulse' : ''
      } ${
        isSelected || isHighlighted ? 'drop-shadow-lg' : 'drop-shadow-md'
      }`}
    >
      {/* Shadow */}
      <circle
        cx={1}
        cy={1}
        r={scaledRadius}
        fill="rgba(0, 0, 0, 0.2)"
        className="blur-sm"
      />
      
      {/* Main coin body */}
      <circle
        cx={0}
        cy={0}
        r={scaledRadius}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        className="transition-all duration-200"
      />
      
      {/* Inner highlight for 3D effect */}
      <circle
        cx={0}
        cy={0}
        r={scaledRadius * 0.6}
        fill="none"
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={1}
      />
      
      {/* Queen crown symbol */}
      {coin.type === 'queen' && (
        <g>
          <path
            d={`M -${scaledRadius * 0.4} -${scaledRadius * 0.2} 
                L -${scaledRadius * 0.2} -${scaledRadius * 0.4}
                L 0 -${scaledRadius * 0.2}
                L ${scaledRadius * 0.2} -${scaledRadius * 0.4}
                L ${scaledRadius * 0.4} -${scaledRadius * 0.2}
                L ${scaledRadius * 0.3} ${scaledRadius * 0.1}
                L -${scaledRadius * 0.3} ${scaledRadius * 0.1} Z`}
            fill="rgba(255, 215, 0, 0.8)"
            stroke="rgba(255, 193, 7, 1)"
            strokeWidth={0.5}
          />
        </g>
      )}
      
      {/* Selection indicator */}
      {isSelected && (
        <circle
          cx={0}
          cy={0}
          r={scaledRadius + 4}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="4 4"
          className="animate-spin"
        />
      )}
      
      {/* Highlight glow */}
      {isHighlighted && (
        <circle
          cx={0}
          cy={0}
          r={scaledRadius + 2}
          fill="none"
          stroke="#4ade80"
          strokeWidth={1}
          opacity={0.6}
          className="animate-pulse"
        />
      )}
    </g>
  );
}

// Striker component (larger and different style)
interface StrikerProps {
  position: Point;
  isAiming?: boolean;
  onClick?: () => void;
  onDrag?: (position: Point) => void;
  boardScale?: number;
  canMove?: boolean;
}

export function Striker({ 
  position, 
  isAiming = false, 
  onClick, 
  onDrag, 
  boardScale = 1,
  canMove = true 
}: StrikerProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState<Point>({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!canMove) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    
    if (onClick) {
      onClick();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !onDrag || !canMove) return;
    
    const dx = (e.clientX - dragStart.x) / boardScale;
    const dy = (e.clientY - dragStart.y) / boardScale;
    
    onDrag({
      x: position.x + dx,
      y: position.y + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const scaledRadius = 12 * boardScale; // Striker is larger than coins

  return (
    <g 
      transform={`translate(${position.x * boardScale}, ${position.y * boardScale})`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`${canMove ? 'cursor-grab' : 'cursor-not-allowed'} ${
        isDragging ? 'cursor-grabbing' : ''
      } transition-all duration-200`}
    >
      {/* Shadow */}
      <circle
        cx={2}
        cy={2}
        r={scaledRadius}
        fill="rgba(0, 0, 0, 0.3)"
        className="blur-sm"
      />
      
      {/* Main striker body */}
      <circle
        cx={0}
        cy={0}
        r={scaledRadius}
        fill={isAiming ? '#fbbf24' : '#f59e0b'}
        stroke={isAiming ? '#d97706' : '#92400e'}
        strokeWidth={3}
        className="transition-all duration-200"
      />
      
      {/* Inner ring */}
      <circle
        cx={0}
        cy={0}
        r={scaledRadius * 0.7}
        fill="none"
        stroke="rgba(255, 255, 255, 0.4)"
        strokeWidth={2}
      />
      
      {/* Center dot */}
      <circle
        cx={0}
        cy={0}
        r={scaledRadius * 0.2}
        fill={isAiming ? '#92400e' : '#451a03'}
      />
      
      {/* Aiming indicator */}
      {isAiming && (
        <>
          <circle
            cx={0}
            cy={0}
            r={scaledRadius + 6}
            fill="none"
            stroke="#ef4444"
            strokeWidth={2}
            strokeDasharray="8 8"
            className="animate-spin"
          />
          <circle
            cx={0}
            cy={0}
            r={scaledRadius + 12}
            fill="none"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 8"
            opacity={0.5}
            className="animate-spin animate-reverse"
          />
        </>
      )}
    </g>
  );
}