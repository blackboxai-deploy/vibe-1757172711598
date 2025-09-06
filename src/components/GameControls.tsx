'use client';

import React from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useCarromGame } from '../hooks/use-carrom-game';

interface GameControlsProps {
  game: ReturnType<typeof useCarromGame>;
  className?: string;
}

export function GameControls({ game, className }: GameControlsProps) {
  const { gameState, shotPower, isAiming, shotInProgress, bestShot, showAIOverlay } = game;

  // Handle power change
  const handlePowerChange = (value: number[]) => {
    if (!shotInProgress && !isAiming) {
      game.setShotPower(value[0]);
    }
  };



  // Handle AI overlay toggle
  const handleOverlayToggle = () => {
    game.toggleAIOverlay();
  };

  // Execute AI suggested shot
  const handleExecuteAIShot = () => {
    if (bestShot && !shotInProgress) {
      game.executeAIShot(bestShot);
    }
  };

  // Get AI assistance level color
  const getAILevelColor = (level: string) => {
    switch (level) {
      case 'off': return 'bg-gray-500';
      case 'hints': return 'bg-blue-500';
      case 'full': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const isPlayerTurn = gameState.currentPlayer === 'player1';
  const canShoot = game.gameManager.canPlayerShoot() && !shotInProgress;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Game Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center justify-between">
            Game Status
            <Badge variant={gameState.phase === 'finished' ? 'destructive' : 'default'}>
              {gameState.phase.replace('-', ' ')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Current Player */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Player:</span>
            <Badge variant={isPlayerTurn ? 'default' : 'secondary'}>
              {isPlayerTurn ? 'You' : 'AI'}
            </Badge>
          </div>

          {/* Turn Number */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Turn:</span>
            <span className="text-sm">{gameState.turnNumber}</span>
          </div>

          {/* Game Score */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">{gameState.score.player1}</div>
              <div className="text-xs text-muted-foreground">Your Score</div>
              <div className="text-sm">{gameState.score.player1Coins} coins left</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-red-600">{gameState.score.player2}</div>
              <div className="text-xs text-muted-foreground">AI Score</div>
              <div className="text-sm">{gameState.score.player2Coins} coins left</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shot Controls Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Shot Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Power Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Shot Power</label>
              <span className="text-sm font-mono">{shotPower}%</span>
            </div>
            <Slider
              value={[shotPower]}
              onValueChange={handlePowerChange}
              max={100}
              min={10}
              step={5}
              disabled={!canShoot || isAiming}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Gentle</span>
              <span>Medium</span>
              <span>Strong</span>
            </div>
          </div>

          {/* Shot Action Buttons */}
          <div className="flex flex-col gap-2">
            {isAiming ? (
              <div className="space-y-2">
                <Button 
                  onClick={game.executeShot}
                  className="w-full"
                  variant="default"
                >
                  Shoot! ({shotPower}% power)
                </Button>
                <Button 
                  onClick={game.stopAiming}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  Cancel Aim
                </Button>
              </div>
            ) : (
              <Button 
                onClick={game.startAiming}
                disabled={!canShoot}
                className="w-full"
                variant={canShoot ? "default" : "secondary"}
              >
                {shotInProgress ? 'Shot in Progress...' : 
                 !isPlayerTurn ? 'AI Turn' : 
                 !canShoot ? 'Cannot Shoot' : 'Start Aiming'}
              </Button>
            )}
          </div>

          {/* Current shot status */}
          {shotInProgress && (
            <div className="text-center p-2 bg-blue-50 rounded-md">
              <div className="text-sm font-medium text-blue-800">
                Shot in progress...
              </div>
              <div className="text-xs text-blue-600">
                Physics simulation running
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Assistance Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">AI Assistance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* AI Level Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Assistance Level</label>
              <Badge className={getAILevelColor(gameState.aiAssistanceLevel)}>
                {gameState.aiAssistanceLevel}
              </Badge>
            </div>
            <Select 
              value={gameState.aiAssistanceLevel} 
              onValueChange={(value: 'off' | 'hints' | 'full') => game.setAIAssistanceLevel(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="off">Off - No assistance</SelectItem>
                <SelectItem value="hints">Hints - Show suggestions</SelectItem>
                <SelectItem value="full">Full - Complete guidance</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* AI Overlay Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Show AI Overlay</label>
            <Switch
              checked={showAIOverlay}
              onCheckedChange={handleOverlayToggle}
              disabled={gameState.aiAssistanceLevel === 'off'}
            />
          </div>

          {/* Best Shot Recommendation */}
          {bestShot && gameState.aiAssistanceLevel !== 'off' && (
            <div className="space-y-2 p-3 bg-green-50 rounded-md border">
              <div className="text-sm font-semibold text-green-800">
                AI Recommendation
              </div>
              <div className="text-xs text-green-700 space-y-1">
                <div>Type: <span className="font-medium">{bestShot.type.toUpperCase()}</span></div>
                <div>Success: <span className="font-medium">{Math.round(bestShot.successProbability * 100)}%</span></div>
                <div>Power: <span className="font-medium">{Math.round(bestShot.power)}%</span></div>
                <div>Risk: <span className="font-medium capitalize">{bestShot.risk}</span></div>
              </div>
              <div className="text-xs text-green-600 mt-2">
                {bestShot.description}
              </div>
              {gameState.aiAssistanceLevel === 'full' && (
                <Button
                  onClick={handleExecuteAIShot}
                  disabled={!canShoot || !isPlayerTurn}
                  size="sm"
                  variant="outline"
                  className="w-full mt-2 bg-green-100 hover:bg-green-200 border-green-300"
                >
                  Execute AI Shot
                </Button>
              )}
            </div>
          )}

          {/* AI Analysis */}
          {game.aiSuggestions.length > 0 && gameState.aiAssistanceLevel !== 'off' && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Available Shots</div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {game.aiSuggestions.slice(0, 3).map((shot, index: number) => (
                  <div key={shot.id} className="text-xs p-2 bg-gray-50 rounded border">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">#{index + 1} {shot.type}</span>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${
                          shot.successProbability > 0.7 ? 'bg-green-100 text-green-800' :
                          shot.successProbability > 0.4 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}
                      >
                        {Math.round(shot.successProbability * 100)}%
                      </Badge>
                    </div>
                    <div className="text-muted-foreground mt-1 truncate">
                      {shot.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Refresh AI Suggestions */}
          <Button
            onClick={game.getAISuggestions}
            variant="outline"
            size="sm"
            className="w-full"
            disabled={gameState.aiAssistanceLevel === 'off'}
          >
            Refresh AI Analysis
          </Button>
        </CardContent>
      </Card>

      {/* Game Actions Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Game Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            onClick={game.resetGame}
            variant="outline"
            className="w-full"
          >
            New Game
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}