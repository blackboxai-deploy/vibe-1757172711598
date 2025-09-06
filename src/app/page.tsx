'use client';

import React, { useState } from 'react';
import { CarromBoard } from '../components/CarromBoard';
import { GameControls } from '../components/GameControls';
import { useCarromGame } from '../hooks/use-carrom-game';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

export default function CarromPoolPage() {
  // Game configuration
  const [gameMode, setGameMode] = useState<'practice' | 'vs-ai' | 'multiplayer' | 'tutorial'>('practice');
  const [aiDifficulty, setAIDifficulty] = useState<'easy' | 'medium' | 'hard' | 'expert'>('medium');
  const [gameStarted, setGameStarted] = useState(false);

  // Board dimensions
  const BOARD_WIDTH = 800;
  const BOARD_HEIGHT = 600;

  // Initialize game
  const game = useCarromGame({
    boardWidth: BOARD_WIDTH,
    boardHeight: BOARD_HEIGHT,
    gameMode,
    aiDifficulty
  });

  // Start new game with configuration
  const startGame = () => {
    game.resetGame();
    setGameStarted(true);
  };

  // Game setup screen
  if (!gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-amber-900 mb-2">
              Carrom Pool AI Aim
            </h1>
            <p className="text-lg text-amber-700 mb-4">
              Professional carrom game with AI-powered aiming assistance
            </p>
            <div className="flex justify-center space-x-2">
              <Badge variant="secondary">Physics Simulation</Badge>
              <Badge variant="secondary">AI Trajectory Prediction</Badge>
              <Badge variant="secondary">Visual Overlays</Badge>
              <Badge variant="secondary">Smart Shot Analysis</Badge>
            </div>
          </div>

          {/* Game Configuration */}
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            {/* Game Mode Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Game Mode</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { 
                    mode: 'practice' as const, 
                    title: 'Practice Mode', 
                    desc: 'Free play with full AI assistance',
                    features: ['Unlimited AI help', 'No time limits', 'Perfect for learning']
                  },
                  { 
                    mode: 'vs-ai' as const, 
                    title: 'VS AI Mode', 
                    desc: 'Play against intelligent AI opponent',
                    features: ['Turn-based gameplay', 'Competitive scoring', 'Realistic AI behavior']
                  },
                  { 
                    mode: 'multiplayer' as const, 
                    title: 'Multiplayer (Coming Soon)', 
                    desc: 'Play with friends online',
                    features: ['Real-time multiplayer', 'Chat system', 'Tournaments'],
                    disabled: true
                  },
                  { 
                    mode: 'tutorial' as const, 
                    title: 'Tutorial Mode', 
                    desc: 'Learn carrom rules and techniques',
                    features: ['Step-by-step guide', 'Interactive lessons', 'Skill challenges']
                  }
                ].map((option) => (
                  <div 
                    key={option.mode}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      option.disabled 
                        ? 'bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed'
                        : gameMode === option.mode 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => !option.disabled && setGameMode(option.mode)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold">{option.title}</h3>
                      {gameMode === option.mode && !option.disabled && (
                        <Badge variant="default">Selected</Badge>
                      )}
                      {option.disabled && (
                        <Badge variant="secondary">Coming Soon</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{option.desc}</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-current rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* AI Difficulty Selection */}
            <Card>
              <CardHeader>
                <CardTitle>AI Difficulty</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { 
                    level: 'easy' as const, 
                    title: 'Easy', 
                    desc: 'Beginner-friendly AI',
                    accuracy: '70%',
                    features: ['Simple shot selection', 'Forgiving gameplay', 'Great for learning']
                  },
                  { 
                    level: 'medium' as const, 
                    title: 'Medium', 
                    desc: 'Balanced challenge',
                    accuracy: '85%',
                    features: ['Strategic thinking', 'Good shot variety', 'Competitive play']
                  },
                  { 
                    level: 'hard' as const, 
                    title: 'Hard', 
                    desc: 'Advanced AI opponent',
                    accuracy: '95%',
                    features: ['Complex strategies', 'Bank shots', 'Defensive play']
                  },
                  { 
                    level: 'expert' as const, 
                    title: 'Expert', 
                    desc: 'Master-level AI',
                    accuracy: '100%',
                    features: ['Perfect accuracy', 'Advanced tactics', 'Ultimate challenge']
                  }
                ].map((option) => (
                  <div 
                    key={option.level}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      aiDifficulty === option.level 
                        ? 'border-orange-500 bg-orange-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setAIDifficulty(option.level)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold">{option.title}</h3>
                        <Badge variant="outline" className="text-xs">
                          {option.accuracy} Accuracy
                        </Badge>
                      </div>
                      {aiDifficulty === option.level && (
                        <Badge variant="default">Selected</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{option.desc}</p>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {option.features.map((feature, index) => (
                        <li key={index} className="flex items-center">
                          <span className="w-1 h-1 bg-current rounded-full mr-2" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Game Features Preview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>AI-Powered Features</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    title: 'Trajectory Prediction',
                    desc: 'See exact coin paths with physics simulation',
                    image: 'https://placehold.co/300x200?text=AI+Trajectory+Visualization+with+Dotted+Lines+and+Angles'
                  },
                  {
                    title: 'Bank Shot Analysis',
                    desc: 'AI calculates perfect wall bounces and angles',
                    image: 'https://placehold.co/300x200?text=Bank+Shot+Analysis+with+Reflection+Points'
                  },
                  {
                    title: 'Success Probability',
                    desc: 'Color-coded success rates for each shot option',
                    image: 'https://placehold.co/300x200?text=Success+Rate+Indicators+with+Percentage+Display'
                  },
                  {
                    title: 'Strategic Recommendations',
                    desc: 'Smart shot selection based on game state',
                    image: 'https://placehold.co/300x200?text=Strategic+Shot+Recommendations+Dashboard'
                  }
                ].map((feature, index) => (
                  <div key={index} className="text-center space-y-2">
                    <img
                      src={feature.image}
                      alt={feature.title}
                      className="w-full h-32 object-cover rounded-lg border"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.backgroundColor = '#f3f4f6';
                        target.style.display = 'flex';
                        target.style.alignItems = 'center';
                        target.style.justifyContent = 'center';
                      }}
                    />
                    <h3 className="font-semibold text-sm">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start Game Button */}
          <div className="text-center">
            <Button 
              onClick={startGame}
              size="lg"
              className="px-8 py-4 text-lg font-semibold bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg"
            >
              Start Playing
            </Button>
            <p className="text-sm text-muted-foreground mt-2">
              Mode: {gameMode.toUpperCase()} • AI: {aiDifficulty.toUpperCase()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main game interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-amber-900">Carrom Pool AI Aim</h1>
            <p className="text-amber-700">
              Mode: {gameMode.toUpperCase()} • AI: {aiDifficulty.toUpperCase()}
            </p>
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => {
                setGameStarted(false);
                game.resetGame();
              }}
              variant="outline"
              size="sm"
            >
              Change Settings
            </Button>
          </div>
        </div>

        {/* Game Layout */}
        <div className="grid lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="p-4">
              <CarromBoard
                width={BOARD_WIDTH}
                height={BOARD_HEIGHT}
                gameMode={gameMode}
                aiDifficulty={aiDifficulty}
                className="w-full"
              />
            </Card>
          </div>

          {/* Game Controls */}
          <div className="lg:col-span-1">
            <GameControls 
              game={game}
              className="sticky top-4"
            />
          </div>
        </div>

        {/* Game Instructions */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How to Play</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold mb-1">1. Aiming</h4>
                <p className="text-muted-foreground">Click "Start Aiming" then click on the board to set your shot direction and power.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">2. AI Assistance</h4>
                <p className="text-muted-foreground">Enable AI overlays to see trajectory predictions and success probabilities.</p>
              </div>
              <div>
                <h4 className="font-semibold mb-1">3. Strategic Play</h4>
                <p className="text-muted-foreground">Pocket your coins while using the AI recommendations for optimal shots.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}