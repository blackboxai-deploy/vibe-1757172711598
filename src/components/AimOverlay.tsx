'use client';

import React from 'react';
import { Point } from '../lib/geometry';
import { ShotOption } from '../lib/carrom-ai';

interface AimOverlayProps {
  shotOptions: ShotOption[];
  bestShot: ShotOption | null;
  isVisible: boolean;
  boardWidth: number;
  boardHeight: number;
  boardScale?: number;
}

export function AimOverlay({ 
  shotOptions, 
  bestShot, 
  isVisible, 
  boardWidth, 
  boardHeight,
  boardScale = 1 
}: AimOverlayProps) {
  if (!isVisible || shotOptions.length === 0) return null;

  return (
    <g className="aim-overlay">
      {/* Trajectory lines for all shot options */}
      {shotOptions.map((shot) => {
        const isBestShot = Boolean(bestShot && shot.id === bestShot.id);
        
        return (
          <g key={shot.id}>
            {/* Trajectory path */}
            <TrajectoryLine
              trajectory={shot.trajectory}
              successProbability={shot.successProbability}
              isBestShot={isBestShot}
              boardScale={boardScale}
            />
            
            {/* Bank points for bank shots */}
            {shot.bankPoints && shot.bankPoints.map((point: Point, bIndex: number) => (
              <BankPoint
                key={`bank-${shot.id}-${bIndex}`}
                position={point}
                boardScale={boardScale}
              />
            ))}
            
            {/* Target pocket indicator */}
            <PocketIndicator
              pocket={shot.targetPocket}
              successProbability={shot.successProbability}
              isBestShot={isBestShot}
              boardScale={boardScale}
            />
          </g>
        );
      })}
      
      {/* Power and angle indicators for best shot */}
      {bestShot && (
        <ShotInfo
          shot={bestShot}
          boardWidth={boardWidth}
          boardHeight={boardHeight}
          boardScale={boardScale}
        />
      )}
    </g>
  );
}

// Individual trajectory line component
interface TrajectoryLineProps {
  trajectory: Point[];
  successProbability: number;
  isBestShot: boolean;
  boardScale: number;
}

function TrajectoryLine({ trajectory, successProbability, isBestShot, boardScale }: TrajectoryLineProps) {
  if (trajectory.length < 2) return null;

  // Create path string from trajectory points
  const pathString = trajectory.reduce((path, point, index) => {
    const command = index === 0 ? 'M' : 'L';
    return `${path} ${command} ${point.x * boardScale} ${point.y * boardScale}`;
  }, '');

  // Color based on success probability
  const getLineColor = () => {
    if (isBestShot) return '#22c55e'; // Green for best shot
    if (successProbability > 0.7) return '#3b82f6'; // Blue for high probability
    if (successProbability > 0.4) return '#f59e0b'; // Yellow for medium probability
    return '#ef4444'; // Red for low probability
  };

  const lineColor = getLineColor();
  const strokeWidth = isBestShot ? 3 : 2;
  const opacity = isBestShot ? 1.0 : Math.max(0.3, successProbability);

  return (
    <g>
      {/* Main trajectory line */}
      <path
        d={pathString}
        fill="none"
        stroke={lineColor}
        strokeWidth={strokeWidth}
        strokeDasharray={isBestShot ? "none" : "8 4"}
        opacity={opacity}
        className="transition-all duration-300"
      />
      
      {/* Trajectory points */}
      {trajectory.map((point, index) => {
        if (index % 5 !== 0) return null; // Show every 5th point
        
        return (
          <circle
            key={index}
            cx={point.x * boardScale}
            cy={point.y * boardScale}
            r={isBestShot ? 2 : 1.5}
            fill={lineColor}
            opacity={opacity * 0.8}
          />
        );
      })}
      
      {/* Direction arrow at the end */}
      {trajectory.length > 1 && (
        <DirectionArrow
          from={trajectory[trajectory.length - 2]}
          to={trajectory[trajectory.length - 1]}
          color={lineColor}
          scale={boardScale}
          opacity={opacity}
        />
      )}
    </g>
  );
}

// Direction arrow component
interface DirectionArrowProps {
  from: Point;
  to: Point;
  color: string;
  scale: number;
  opacity: number;
}

function DirectionArrow({ from, to, color, scale, opacity }: DirectionArrowProps) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  if (length < 0.1) return null;
  
  const angle = Math.atan2(dy, dx);
  const arrowLength = 8 * scale;
  const arrowWidth = 4 * scale;
  
  // Calculate arrow points
  const tipX = to.x * scale;
  const tipY = to.y * scale;
  const baseX = tipX - Math.cos(angle) * arrowLength;
  const baseY = tipY - Math.sin(angle) * arrowLength;
  
  const leftX = baseX - Math.cos(angle + Math.PI / 2) * arrowWidth;
  const leftY = baseY - Math.sin(angle + Math.PI / 2) * arrowWidth;
  const rightX = baseX + Math.cos(angle + Math.PI / 2) * arrowWidth;
  const rightY = baseY + Math.sin(angle + Math.PI / 2) * arrowWidth;
  
  return (
    <polygon
      points={`${tipX},${tipY} ${leftX},${leftY} ${rightX},${rightY}`}
      fill={color}
      opacity={opacity}
    />
  );
}

// Bank point indicator
interface BankPointProps {
  position: Point;
  boardScale: number;
}

function BankPoint({ position, boardScale }: BankPointProps) {
  return (
    <g transform={`translate(${position.x * boardScale}, ${position.y * boardScale})`}>
      <circle
        cx={0}
        cy={0}
        r={6 * boardScale}
        fill="none"
        stroke="#f59e0b"
        strokeWidth={2}
        strokeDasharray="4 4"
        className="animate-spin"
      />
      <circle
        cx={0}
        cy={0}
        r={2 * boardScale}
        fill="#f59e0b"
        opacity={0.8}
      />
    </g>
  );
}

// Pocket indicator
interface PocketIndicatorProps {
  pocket: { position: Point; radius: number };
  successProbability: number;
  isBestShot: boolean;
  boardScale: number;
}

function PocketIndicator({ pocket, successProbability, isBestShot, boardScale }: PocketIndicatorProps) {
  const getIndicatorColor = () => {
    if (isBestShot) return '#22c55e';
    if (successProbability > 0.7) return '#3b82f6';
    if (successProbability > 0.4) return '#f59e0b';
    return '#ef4444';
  };

  const color = getIndicatorColor();
  const radius = pocket.radius * boardScale;

  return (
    <g transform={`translate(${pocket.position.x * boardScale}, ${pocket.position.y * boardScale})`}>
      {/* Outer glow */}
      <circle
        cx={0}
        cy={0}
        r={radius + 8}
        fill="none"
        stroke={color}
        strokeWidth={2}
        opacity={0.3}
        className="animate-pulse"
      />
      
      {/* Success probability ring */}
      <circle
        cx={0}
        cy={0}
        r={radius + 4}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeDasharray={`${2 * Math.PI * (radius + 4) * successProbability} ${2 * Math.PI * (radius + 4)}`}
        strokeLinecap="round"
        opacity={0.8}
        transform="rotate(-90)"
      />
      
      {/* Probability text */}
      <text
        x={0}
        y={-radius - 15}
        textAnchor="middle"
        fill={color}
        fontSize={10 * boardScale}
        fontWeight="bold"
        opacity={0.9}
      >
        {Math.round(successProbability * 100)}%
      </text>
    </g>
  );
}

// Shot information display
interface ShotInfoProps {
  shot: ShotOption;
  boardWidth: number;
  boardHeight: number;
  boardScale: number;
}

function ShotInfo({ shot, boardWidth, boardScale }: ShotInfoProps) {
  // Position info panel in top-right corner
  const panelX = (boardWidth - 200) * boardScale;
  const panelY = 20 * boardScale;

  return (
    <g transform={`translate(${panelX}, ${panelY})`}>
      {/* Background panel */}
      <rect
        x={0}
        y={0}
        width={180 * boardScale}
        height={120 * boardScale}
        fill="rgba(0, 0, 0, 0.8)"
        rx={8 * boardScale}
        ry={8 * boardScale}
      />
      
      {/* Shot type */}
      <text
        x={10 * boardScale}
        y={20 * boardScale}
        fill="white"
        fontSize={12 * boardScale}
        fontWeight="bold"
      >
        {shot.type.toUpperCase()} SHOT
      </text>
      
      {/* Success probability */}
      <text
        x={10 * boardScale}
        y={35 * boardScale}
        fill={shot.successProbability > 0.7 ? '#22c55e' : shot.successProbability > 0.4 ? '#f59e0b' : '#ef4444'}
        fontSize={11 * boardScale}
      >
        Success: {Math.round(shot.successProbability * 100)}%
      </text>
      
      {/* Power */}
      <text
        x={10 * boardScale}
        y={50 * boardScale}
        fill="#94a3b8"
        fontSize={10 * boardScale}
      >
        Power: {Math.round(shot.power)}%
      </text>
      
      {/* Risk level */}
      <text
        x={10 * boardScale}
        y={65 * boardScale}
        fill={shot.risk === 'low' ? '#22c55e' : shot.risk === 'medium' ? '#f59e0b' : '#ef4444'}
        fontSize={10 * boardScale}
      >
        Risk: {shot.risk.toUpperCase()}
      </text>
      
      {/* Description */}
      <text
        x={10 * boardScale}
        y={85 * boardScale}
        fill="#e2e8f0"
        fontSize={9 * boardScale}
        className="max-w-[160px]"
      >
        {shot.description}
      </text>
      
      {/* Power bar */}
      <rect
        x={10 * boardScale}
        y={95 * boardScale}
        width={160 * boardScale}
        height={8 * boardScale}
        fill="rgba(255, 255, 255, 0.2)"
        rx={4 * boardScale}
      />
      <rect
        x={10 * boardScale}
        y={95 * boardScale}
        width={160 * boardScale * (shot.power / 100)}
        height={8 * boardScale}
        fill="#3b82f6"
        rx={4 * boardScale}
      />
    </g>
  );
}