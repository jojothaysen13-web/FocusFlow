/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Brain, 
  Palette, 
  ArrowLeft, 
  RotateCcw, 
  Trophy,
  Timer,
  Info,
  Flame,
  Volume2,
  VolumeX,
  Settings,
  Search,
  Target,
  LogIn,
  LogOut,
  User as UserIcon,
  Users as UsersIcon,
  Send
} from 'lucide-react';
import { auth, loginWithGoogle, db, handleFirestoreError, OperationType, increment, onSnapshot, updateDoc, collection, addDoc, query, orderBy, limit } from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- Types ---

type GameType = 'SPEED' | 'STROOP' | 'MEMORY' | 'SEARCH' | 'RHYTHM' | 'TAP' | 'BREATH' | 'MATH' | 'NONE';

interface GameProps {
  onBack: () => void;
  updateHighScore: (score: number) => void;
  highScore: number;
}

// --- Persistence Helpers ---

const getStorage = (key: string, defaultValue: any) => {
  const saved = localStorage.getItem(key);
  return saved ? JSON.parse(saved) : defaultValue;
};

const setStorage = (key: string, value: any) => {
  localStorage.setItem(key, JSON.stringify(value));
};

// --- Custom Hooks ---

const useScreenShake = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const shake = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 300);
  };
  return { isRefreshing, shake };
};

// --- Games ---

/**
 * SPEED CHALLENGE
 * Now with shrinking targets and combo levels!
 */
const SpeedChallenge: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [score, setScore] = useState(0);
  const [target, setTarget] = useState({ x: 50, y: 50, size: 48 });
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { isRefreshing, shake } = useScreenShake();

  const moveTarget = useCallback((currentScore: number) => {
    // Difficulty scaling: target gets smaller as score increases
    const newSize = Math.max(24, 48 - Math.floor(currentScore / 5) * 4);
    setTarget({
      x: Math.random() * 80 + 10,
      y: Math.random() * 80 + 10,
      size: newSize
    });
  }, []);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(30);
    setGameOver(false);
    setIsPlaying(true);
    moveTarget(0);
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying) return;
    const nextScore = score + 1;
    setScore(nextScore);
    moveTarget(nextScore);
  };

  const handleMiss = () => {
    if (!isPlaying) return;
    shake();
    setScore(s => Math.max(0, s - 1));
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 relative overflow-hidden transition-all duration-300 ${isRefreshing ? 'border-red-500/50' : ''}`}>
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Zap className="w-16 h-16 text-yellow-400 mx-auto animate-pulse" />
          <h2 className="text-3xl font-bold text-white">Speed-Fokus</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Klicke die gelben Kreise. Fehler kosten Punkte!</p>
            <p className="text-xs text-yellow-400/60 font-mono">Beste Punktzahl: {highScore}</p>
          </div>
          <button 
            onClick={handleStart}
            className="px-10 py-4 bg-yellow-400 text-black font-black uppercase text-xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(250,204,21,0.3)]"
          >
            Start
          </button>
        </div>
      ) : isPlaying ? (
        <motion.div 
          onClick={handleMiss}
          animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
          className="w-full h-[400px] relative cursor-crosshair overflow-hidden rounded-2xl bg-black/20"
        >
          <div className="absolute top-0 left-0 right-0 flex justify-between p-4 text-white font-mono z-10 pointer-events-none">
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Trophy size={16} /> {score}</div>
            <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Timer size={16} /> {timeLeft}s</div>
          </div>
          
          <motion.div
            key={`${target.x}-${target.y}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bg-yellow-400 rounded-full cursor-pointer shadow-[0_0_30px_rgba(250,204,21,0.6)] flex items-center justify-center"
            style={{ 
              left: `${target.x}%`, 
              top: `${target.y}%`,
              width: `${target.size}px`,
              height: `${target.size}px`,
              marginLeft: `-${target.size/2}px`,
              marginTop: `-${target.size/2}px`
            }}
            onClick={handleTargetClick}
          >
            <div className="w-1/2 h-1/2 bg-black/20 rounded-full animate-ping" />
          </motion.div>
        </motion.div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
          <div>
            <h2 className="text-sm font-mono text-yellow-500 uppercase tracking-[0.3em] mb-2">Session Beendet</h2>
            <div className="text-8xl font-black text-white inline-flex items-baseline gap-2">
              {score}
              <span className="text-2xl text-yellow-500">pts</span>
            </div>
          </div>
          
          <div className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-2">
             <p className="text-gray-400 text-sm">Persönlicher Rekord: {Math.max(score, highScore)}</p>
             {score > highScore && score > 0 && (
               <p className="text-yellow-400 font-bold flex items-center justify-center gap-2">
                 <Trophy size={16} /> Neuer Rekord!
               </p>
             )}
          </div>

          <div className="flex gap-4 justify-center">
            <button 
              onClick={handleStart}
              className="p-4 bg-white/10 rounded-2xl hover:bg-white/20 text-white transition-colors"
            >
              <RotateCcw size={24} />
            </button>
            <button 
              onClick={onBack}
              className="px-8 py-4 bg-yellow-400 text-black font-black rounded-2xl hover:scale-105 transition-transform"
            >
              MENÜ
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * STROOP TEST
 * Now with shuffling choices and countdown pressure.
 */
const colors = [
  { name: 'Rot', value: '#ef4444' },
  { name: 'Blau', value: '#3b82f6' },
  { name: 'Grün', value: '#22c55e' },
  { name: 'Gelb', value: '#eab308' },
  { name: 'Lila', value: '#a855f7' },
];

const StroopTest: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [currentChallenge, setCurrentChallenge] = useState({ textIdx: 0, colorIdx: 1 });
  const [shuffledOptions, setShuffledOptions] = useState([...colors]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { isRefreshing, shake } = useScreenShake();

  const nextChallenge = useCallback(() => {
    const textIdx = Math.floor(Math.random() * colors.length);
    let colorIdx = Math.floor(Math.random() * colors.length);
    // Shuffle the options to prevent muscle memory
    setShuffledOptions([...colors].sort(() => Math.random() - 0.5));
    setCurrentChallenge({ textIdx, colorIdx });
  }, []);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(32);
    setGameOver(false);
    setIsPlaying(true);
    nextChallenge();
  };

  const handleAnswer = (colorValue: string) => {
    if (colorValue === colors[currentChallenge.colorIdx].value) {
      setScore(s => s + 1);
    } else {
      shake();
      setScore(s => Math.max(0, s - 1));
    }
    nextChallenge();
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transition-all ${isRefreshing ? 'border-red-500/50' : ''}`}>
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Palette className="w-16 h-16 text-blue-400 mx-auto" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-white">Farben-Fokus</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Wähle die FARBE des Wortes! Die Buttons wechseln ihre Position.</p>
            <p className="text-xs text-blue-400/60 font-mono">Beste Punktzahl: {highScore}</p>
          </div>
          <button onClick={handleStart} className="px-10 py-4 bg-blue-500 text-white font-black uppercase rounded-2xl text-xl shadow-[0_0_30px_rgba(59,130,246,0.3)] hover:scale-105 active:scale-95 transition-all">Start</button>
        </div>
      ) : isPlaying ? (
        <motion.div 
          animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
          className="w-full space-y-12"
        >
          <div className="flex justify-between text-white font-mono">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Trophy size={16} /> {score}</div>
             <div className="flex items-center gap-3 bg-black/40 px-3 py-1 rounded-full">
               <Timer size={16} /> 
               <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                 <motion.div 
                   className="h-full bg-blue-400"
                   initial={{ width: "100%" }}
                   animate={{ width: `${(timeLeft / 32) * 100}%` }}
                   transition={{ duration: 1, ease: 'linear' }}
                 />
               </div>
               <span>{timeLeft}s</span>
             </div>
          </div>
          <div className="text-center py-10 relative">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={`${currentChallenge.textIdx}-${currentChallenge.colorIdx}`}
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 1.2 }}
                className="text-7xl font-black uppercase tracking-widest italic"
                style={{ color: colors[currentChallenge.colorIdx].value }}
              >
                {colors[currentChallenge.textIdx].name}
              </motion.h1>
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {shuffledOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => handleAnswer(c.value)}
                className="h-16 rounded-2xl border border-white/10 hover:scale-105 active:scale-90 transition-all shadow-lg hover:shadow-white/5"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </motion.div>
      ) : (
        <div className="text-center space-y-8 animate-in slide-in-from-bottom-8 duration-500">
          <div>
            <h2 className="text-sm font-mono text-blue-500 uppercase tracking-[0.3em] mb-2">Training Abgeschlossen</h2>
            <div className="text-8xl font-black text-white">{score}</div>
          </div>
          
          <div className="flex gap-4 justify-center">
             <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white hover:bg-white/20"><RotateCcw size={24} /></button>
             <button onClick={onBack} className="px-8 py-4 bg-blue-500 text-white font-black rounded-2xl">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * SEQUENCE MEMORY
 * Now with visual noise and varying speeds.
 */
const SequenceMemory: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'SHOWING' | 'INPUT' | 'FAILED'>('IDLE');
  const [score, setScore] = useState(0);
  const { isRefreshing, shake } = useScreenShake();

  const showSequence = async (seq: number[]) => {
    setStatus('SHOWING');
    await new Promise(r => setTimeout(r, 800));
    
    // Dynamic speed based on score
    const speed = Math.max(300, 600 - (seq.length * 20));
    
    for (const val of seq) {
      setActiveIdx(val);
      await new Promise(r => setTimeout(r, speed));
      setActiveIdx(null);
      await new Promise(r => setTimeout(r, 150));
    }
    setStatus('INPUT');
  };

  const startNextLevel = useCallback((prevSeq: number[]) => {
    const nextValue = Math.floor(Math.random() * 9);
    const newSeq = [...prevSeq, nextValue];
    setSequence(newSeq);
    setUserSequence([]);
    showSequence(newSeq);
  }, []);

  const handleTileClick = (idx: number) => {
    if (status !== 'INPUT') return;
    
    const newUserSeq = [...userSequence, idx];
    setUserSequence(newUserSeq);

    if (idx !== sequence[newUserSeq.length - 1]) {
      shake();
      setStatus('FAILED');
      updateHighScore(score);
      return;
    }

    if (newUserSeq.length === sequence.length) {
      setScore(s => s + 1);
      setTimeout(() => startNextLevel(sequence), 800);
    }
  };

  const handleStart = () => {
    setScore(0);
    const initial = Math.floor(Math.random() * 9);
    const seq = [initial];
    setSequence(seq);
    setUserSequence([]);
    showSequence(seq);
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transition-all ${isRefreshing ? 'border-red-500/50' : ''}`}>
      {status === 'IDLE' ? (
        <div className="text-center space-y-6">
          <Brain className="w-16 h-16 text-emerald-400 mx-auto" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-white">Memo-Sequenz</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Das Gehirn-Training. Die Intervalle werden schneller!</p>
            <p className="text-xs text-emerald-400/60 font-mono">Beste Punktzahl: {highScore} Level</p>
          </div>
          <button onClick={handleStart} className="px-10 py-4 bg-emerald-500 text-white font-black uppercase rounded-2xl text-xl shadow-[0_0_30px_rgba(52,211,153,0.3)] hover:scale-105 transition-all">Start</button>
        </div>
      ) : (
        <motion.div 
          animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
          className="w-full space-y-10"
        >
           <div className="flex justify-between items-center text-white font-mono">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-emerald-400"><Trophy size={16} /> {score}</div>
             <div className="text-xs uppercase tracking-widest font-black flex items-center gap-2">
               <div className={`w-2 h-2 rounded-full ${status === 'SHOWING' ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'}`} />
               {status === 'SHOWING' ? 'Muster einprägen' : status === 'FAILED' ? 'Fahler!' : 'Wiederhole!'}
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 max-w-[320px] mx-auto p-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.button
                key={i}
                whileHover={status === 'INPUT' ? { scale: 1.05 } : {}}
                whileTap={status === 'INPUT' ? { scale: 0.95 } : {}}
                onClick={() => handleTileClick(i)}
                className={`aspect-square rounded-2xl transition-all duration-200 border border-white/5 ${
                  activeIdx === i 
                    ? 'bg-emerald-400 shadow-[0_0_40px_rgba(52,211,153,0.8)] scale-105 z-10' 
                    : 'bg-white/5 active:bg-white/20'
                }`}
              />
            ))}
          </div>

          {status === 'FAILED' && (
            <div className="text-center space-y-6 animate-in zoom-in-95 duration-500">
              <div className="text-4xl font-black text-white italic tracking-tighter uppercase">Fehler!</div>
              <div className="flex gap-4 justify-center">
                <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
                <button onClick={onBack} className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase tracking-widest text-sm">MENÜ</button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

/**
 * SELECTIVE SEARCH
 * Find the "Odd one out" in a grid.
 */
const SelectiveSearch: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [gridSize, setGridSize] = useState(4);
  const [targetIdx, setTargetIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const { isRefreshing, shake } = useScreenShake();

  const setupLevel = useCallback((currentScore: number) => {
    // Increase grid size based on score
    const size = currentScore > 20 ? 6 : currentScore > 10 ? 5 : 4;
    setGridSize(size);
    setTargetIdx(Math.floor(Math.random() * (size * size)));
  }, []);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGameOver(false);
    setupLevel(0);
  };

  const handleTileClick = (idx: number) => {
    if (idx === targetIdx) {
      const nextScore = score + 1;
      setScore(nextScore);
      setupLevel(nextScore);
    } else {
      shake();
      setScore(s => Math.max(0, s - 1));
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transition-all ${isRefreshing ? 'border-red-500/50' : ''}`}>
       {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Search className="w-16 h-16 text-purple-400 mx-auto" strokeWidth={1.5} />
          <h2 className="text-3xl font-bold text-white">Such-Fokus</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Finde das Symbol, das sich von den anderen unterscheidet!</p>
            <p className="text-xs text-purple-400/60 font-mono">Beste Punktzahl: {highScore}</p>
          </div>
          <button onClick={handleStart} className="px-10 py-4 bg-purple-500 text-white font-black uppercase rounded-2xl text-xl shadow-[0_0_30px_rgba(168,85,247,0.3)] hover:scale-105 transition-all">Start</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-8">
           <div className="flex justify-between items-center text-white font-mono">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-purple-400"><Trophy size={16} /> {score}</div>
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Timer size={16} /> {timeLeft}s</div>
          </div>
          <div 
            className="grid gap-2 mx-auto" 
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              maxWidth: '350px'
            }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleTileClick(i)}
                className={`aspect-square rounded-xl transition-all ${
                  i === targetIdx 
                    ? 'bg-purple-500/20 text-purple-300' 
                    : 'bg-white/10 text-white/30'
                } flex items-center justify-center`}
              >
                {i === targetIdx ? <Target size={24} /> : <div className="w-2 h-2 rounded-full bg-current" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Abgeschlossen</h2>
          <div className="text-8xl font-black text-purple-400">{score}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
            <button onClick={onBack} className="px-8 py-4 bg-purple-500 text-white font-black rounded-2xl uppercase tracking-widest text-sm">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * RHYTHMIC SYNC
 * Click when the moving bar hits the target zone.
 */
const RhythmicSync: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);
  const barPos = useRef(0);
  const [renderPos, setRenderPos] = useState(0);
  const direction = useRef(1);
  const speed = useRef(2);
  const { isRefreshing, shake } = useScreenShake();

  useEffect(() => {
    let animationFrame: number;
    if (isPlaying) {
      const step = () => {
        barPos.current += direction.current * speed.current;
        if (barPos.current >= 100 || barPos.current <= 0) {
          direction.current *= -1;
        }
        setRenderPos(barPos.current);
        animationFrame = requestAnimationFrame(step);
      };
      animationFrame = requestAnimationFrame(step);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGameOver(false);
    speed.current = 2;
  };

  const handleSync = () => {
    if (!isPlaying) return;
    
    // Target zone is 45 to 55
    if (barPos.current >= 42 && barPos.current <= 58) {
      setScore(s => s + 1);
      speed.current = Math.min(6, 2 + (score / 10)); // Speed increases
    } else {
      shake();
      setScore(s => Math.max(0, s - 1));
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10 transition-all ${isRefreshing ? 'border-red-500/50' : ''}`}>
       {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-white/10 rounded-full mx-auto flex items-center justify-center text-orange-400">
             <Target className="animate-pulse" />
          </div>
          <h2 className="text-3xl font-bold text-white">Rhythm-Sync</h2>
          <div className="space-y-2">
            <p className="text-gray-400">Klicke, wenn der Balken genau in der Mitte ist!</p>
            <p className="text-xs text-orange-400/60 font-mono">Beste Punktzahl: {highScore}</p>
          </div>
          <button onClick={handleStart} className="px-10 py-4 bg-orange-500 text-white font-black uppercase rounded-2xl text-xl shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-105 transition-all">Start</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12">
           <div className="flex justify-between items-center text-white font-mono">
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full text-orange-400"><Trophy size={16} /> {score}</div>
             <div className="flex items-center gap-2 bg-black/40 px-3 py-1 rounded-full"><Timer size={16} /> {timeLeft}s</div>
          </div>
          
          <div className="h-24 bg-black/40 rounded-2xl relative border border-white/5 overflow-hidden flex items-center justify-center">
            {/* Target Zone */}
            <div className="absolute w-[16%] h-full bg-orange-500/20 border-x border-orange-500/40" />
            
            {/* Moving Bar */}
            <motion.div 
               className="absolute w-2 h-full bg-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.8)] z-10"
               style={{ left: `${renderPos}%` }}
            />
          </div>

          <button 
            onPointerDown={handleSync}
            className="w-full py-10 bg-white/5 border border-white/10 rounded-3xl text-3xl font-black uppercase italic tracking-widest hover:bg-white/10 active:scale-[0.98] active:bg-orange-500/10 transition-all font-mono"
          >
            JETZT!
          </button>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95 duration-500">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Abgeschlossen</h2>
          <div className="text-8xl font-black text-orange-400">{score}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
            <button onClick={onBack} className="px-8 py-4 bg-orange-500 text-white font-black rounded-2xl uppercase tracking-widest text-sm">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Community Goals ---

const GOAL_LIMITS = {
  totalSpeedPoints: 100000,
  totalStroopPoints: 50000,
  totalMemoryLevels: 10000,
  totalSearchPoints: 25000,
  totalRhythmSyncs: 5000,
  totalTurboTaps: 250000,
  totalHoldScore: 5000,
  totalMathPoints: 15000,
};

const CommunityGoals = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'stats', 'community'), (docSnap) => {
      if (docSnap.exists()) {
        setStats(docSnap.data());
      } else if (auth.currentUser) {
        // Initialize if doesn't exist and user is logged in
        setDoc(doc(db, 'stats', 'community'), {
          totalSpeedPoints: 0,
          totalStroopPoints: 0,
          totalMemoryLevels: 0,
          totalSearchPoints: 0,
          totalRhythmSyncs: 0,
          totalTurboTaps: 0,
          totalHoldScore: 0,
          totalMathPoints: 0
        }, { merge: true }).catch(err => console.warn("Seed failed", err));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const GoalRow = ({ label, current, limit, colorClass }: { label: string, current: number, limit: number, colorClass: string }) => {
    const progress = Math.min(100, (current / limit) * 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-mono uppercase tracking-widest">
          <span className="text-gray-400">{label}</span>
          <span className={colorClass}>{loading ? '...' : `${Math.floor(progress)}%`}</span>
        </div>
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${colorClass.replace('text-', 'bg-')}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 bg-white/5 border border-white/10 rounded-3xl space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <UsersIcon size={18} className="text-blue-400" />
        <h3 className="text-sm font-black italic uppercase tracking-widest text-blue-400">Community Ziele</h3>
      </div>
      <div className="space-y-4">
        <GoalRow label="Speed Hits" current={stats?.totalSpeedPoints || 0} limit={GOAL_LIMITS.totalSpeedPoints} colorClass="text-yellow-400" />
        <GoalRow label="Perfect Timing" current={stats?.totalRhythmSyncs || 0} limit={GOAL_LIMITS.totalRhythmSyncs} colorClass="text-orange-400" />
        <GoalRow label="Memory King" current={stats?.totalMemoryLevels || 0} limit={GOAL_LIMITS.totalMemoryLevels} colorClass="text-emerald-400" />
        <GoalRow label="Dopamin Boost" current={stats?.totalTurboTaps || 0} limit={GOAL_LIMITS.totalTurboTaps} colorClass="text-yellow-500" />
        <GoalRow label="Turbo Math" current={stats?.totalMathPoints || 0} limit={GOAL_LIMITS.totalMathPoints} colorClass="text-blue-500" />
      </div>
      <p className="text-[10px] text-gray-500 font-mono text-center pt-2 italic">Zusammen sind wir unbesiegbar.</p>
    </div>
  );
};

const LandingPage = ({ onLogin }: { onLogin: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12 p-6">
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-20 bg-emerald-500/20 rounded-full blur-[100px]"
        />
        <Brain size={120} className="text-emerald-400 relative z-10" />
      </div>
      
      <div className="space-y-4 max-w-2xl relative z-10">
        <h1 className="text-6xl md:text-8xl font-black italic uppercase tracking-tighter leading-none">
          Focus<span className="text-emerald-400">Flow</span>
        </h1>
        <p className="text-xl md:text-2xl text-gray-500 font-mono italic">
          Maximiere deine Kognition. Melde dich an, um dein Training zu starten und Teil der Community zu werden.
        </p>
      </div>

      <button 
        onClick={onLogin}
        className="group relative px-12 py-6 bg-white text-black font-black text-2xl uppercase italic rounded-3xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_50px_rgba(255,255,255,0.2)] overflow-hidden"
      >
        <span className="relative z-10 flex items-center gap-3">
          <LogIn size={28} /> JETZT STARTEN
        </span>
        <motion.div 
          initial={{ x: "-100%" }}
          whileHover={{ x: "100%" }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0 bg-emerald-400"
        />
      </button>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl pt-12">
        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-left">
           <Zap className="text-yellow-400 mb-2" size={24} />
           <p className="text-xs font-black uppercase tracking-widest">Speed</p>
           <p className="text-[10px] text-gray-500 font-mono mt-1">Reflex-Optimierung</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-left">
           <Target className="text-orange-400 mb-2" size={24} />
           <p className="text-xs font-black uppercase tracking-widest">Timing</p>
           <p className="text-[10px] text-gray-500 font-mono mt-1">Flow-Detection</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-left">
           <UsersIcon className="text-purple-400 mb-2" size={24} />
           <p className="text-xs font-black uppercase tracking-widest">Social</p>
           <p className="text-[10px] text-gray-500 font-mono mt-1">Echtzeit-Chat</p>
        </div>
        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] text-left">
           <Trophy className="text-emerald-400 mb-2" size={24} />
           <p className="text-xs font-black uppercase tracking-widest">Global</p>
           <p className="text-[10px] text-gray-500 font-mono mt-1">Community-Ziele</p>
        </div>
      </div>
    </div>
  );
};
const CommunityChat = ({ user }: { user: User }) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).reverse();
      setMessages(msgs);
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });
    return () => unsub();
  }, []);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        userId: user.uid,
        userName: user.displayName || 'Anonym',
        userPhoto: user.photoURL,
        createdAt: serverTimestamp()
      });
      setNewMessage('');
    } catch (error) {
       handleFirestoreError(error, OperationType.CREATE, 'messages');
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center gap-2">
         <UsersIcon size={16} className="text-purple-400" />
         <h3 className="text-xs font-black uppercase tracking-widest text-purple-400">Community Chat</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-1">
               {msg.userId !== user.uid && (
                 <img src={msg.userPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId}`} alt={msg.userName} className="w-5 h-5 rounded-full" referrerPolicy="no-referrer" />
               )}
               <span className="text-[10px] text-gray-500 font-mono">{msg.userName}</span>
            </div>
            <div className={`px-3 py-2 rounded-2xl text-xs max-w-[80%] ${msg.userId === user.uid ? 'bg-purple-500 text-white rounded-tr-none' : 'bg-white/10 text-gray-200 rounded-tl-none'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-4 bg-black/20 flex gap-2">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Nachricht schreiben..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-purple-400/50 transition-colors"
        />
        <button type="submit" className="p-2 bg-purple-500 text-white rounded-xl hover:scale-105 active:scale-95 transition-transform">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};

/**
 * DOPAMINE TAP
 * Rapidly tap to fill the dopamine meter.
 */
const DopamineTap: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const progress = Math.min(100, (score / 100) * 100);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleTap = () => {
    if (!isPlaying) return;
    setScore(s => s + 1);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10">
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Zap className="w-16 h-16 text-yellow-400 mx-auto" />
          <h2 className="text-3xl font-bold text-white uppercase italic">Turbo-Tap</h2>
          <p className="text-gray-400">Tippe so schnell du kannst! 10 Sekunden pure Action.</p>
          <button onClick={() => setIsPlaying(true)} className="px-10 py-4 bg-yellow-400 text-black font-black uppercase rounded-2xl text-xl">Start</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-8 text-center">
          <div className="text-6xl font-black italic text-yellow-400 font-mono">{timeLeft}s</div>
          <div className="h-4 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
            <motion.div animate={{ width: `${progress}%` }} className="h-full bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.5)]" />
          </div>
          <button 
            onPointerDown={handleTap}
            className="w-48 h-48 bg-yellow-400 rounded-full mx-auto shadow-[0_0_50px_rgba(250,204,21,0.4)] active:scale-90 transition-transform flex items-center justify-center text-black"
          >
            <Zap size={64} fill="currentColor" />
          </button>
          <div className="text-4xl font-black italic">{score}</div>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Dopamine Hit!</h2>
          <div className="text-8xl font-black text-yellow-400">{score}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setScore(0); setTimeLeft(10); setIsPlaying(true); setGameOver(false); }} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
            <button onClick={onBack} className="px-8 py-4 bg-yellow-400 text-black font-black rounded-2xl uppercase text-sm">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * FOCUS BREATHING
 * A persistence task: hold for target duration.
 */
const FocusBreathing: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [isPressing, setIsPressing] = useState(false);
  const pressStartTime = useRef<number | null>(null);
  const [targetTime, setTargetTime] = useState(3.0);
  const [currentHoldTime, setCurrentHoldTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (isPressing) {
      interval = setInterval(() => {
        if (pressStartTime.current) {
          setCurrentHoldTime((Date.now() - pressStartTime.current) / 1000);
        }
      }, 50);
    } else {
      setCurrentHoldTime(0);
    }
    return () => clearInterval(interval);
  }, [isPressing]);

  const handleStart = () => {
    setScore(0);
    setTargetTime(3.0);
    setIsPlaying(true);
    setGameOver(false);
  };

  const onPointerDown = () => {
    if (!isPlaying) return;
    setIsPressing(true);
    pressStartTime.current = Date.now();
  };

  const onPointerUp = () => {
    if (!isPressing) return;
    setIsPressing(false);
    const holdTime = (Date.now() - pressStartTime.current!) / 1000;
    pressStartTime.current = null;

    const diff = Math.abs(holdTime - targetTime);
    if (diff < 0.25) {
      setScore(s => s + 1);
      setTargetTime(Number((2 + Math.random() * 5).toFixed(1)));
    } else {
      updateHighScore(score);
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10">
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Brain className="w-16 h-16 text-emerald-400 mx-auto" />
          <h2 className="text-3xl font-bold text-white uppercase italic">Focus-Hold</h2>
          <p className="text-gray-400">Halte den Button für genau die vorgegebene Zeit gedrückt. Präzision ist alles.</p>
          <button onClick={handleStart} className="px-10 py-4 bg-emerald-500 text-white font-black uppercase rounded-2xl text-xl">Start</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <div className="space-y-2">
             <p className="text-gray-500 uppercase tracking-widest text-xs font-mono">Ziel-Dauer</p>
             <div className="text-6xl font-black italic text-emerald-400 font-mono">{targetTime}s</div>
          </div>

          <div className="relative w-64 h-64 mx-auto">
             <svg className="w-full h-full -rotate-90">
               <circle cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-white/5" />
               <motion.circle 
                 cx="128" cy="128" r="120" stroke="currentColor" strokeWidth="8" fill="transparent" 
                 className="text-emerald-400"
                 strokeDasharray="754"
                 strokeDashoffset={754 - (754 * Math.min(1, currentHoldTime / targetTime))}
               />
             </svg>
             <button 
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`absolute inset-4 rounded-full transition-all flex items-center justify-center text-4xl font-black ${isPressing ? 'bg-emerald-500 scale-95 shadow-[0_0_50px_rgba(52,211,153,0.4)]' : 'bg-white/10'}`}
            >
              HALTEN
            </button>
          </div>
          <div className="text-2xl font-black">Score: {score}</div>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Fokus Verloren</h2>
          <div className="text-8xl font-black text-emerald-400">{score}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
            <button onClick={onBack} className="px-8 py-4 bg-emerald-500 text-white font-black rounded-2xl uppercase text-sm">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * TURBO MATH
 * Simple arithmetic under intense time pressure.
 */
const TurboMath: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [problem, setProblem] = useState({ a: 0, b: 0, op: '+', answer: 0, options: [0, 0, 0] });
  const [timeLeft, setTimeLeft] = useState(5);

  const generateProblem = useCallback(() => {
    const ops = ['+', '-', '*'];
    const op = ops[Math.floor(Math.random() * (score > 10 ? 3 : 2))];
    let a, b, ans;
    
    if (op === '+') { a = Math.floor(Math.random() * 20 + 5); b = Math.floor(Math.random() * 20 + 5); ans = a + b; }
    else if (op === '-') { a = Math.floor(Math.random() * 30 + 10); b = Math.floor(Math.random() * (a - 1) + 1); ans = a - b; }
    else { a = Math.floor(Math.random() * 10 + 2); b = Math.floor(Math.random() * 10 + 2); ans = a * b; }

    const options = [ans, ans + Math.floor(Math.random() * 5 + 1), ans - Math.floor(Math.random() * 5 + 1)].sort(() => Math.random() - 0.5);
    setProblem({ a, b, op, answer: ans, options });
    setTimeLeft(5);
  }, [score]);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    } else if (timeLeft === 0 && isPlaying) {
      updateHighScore(score);
      setGameOver(true);
      setIsPlaying(false);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft, score, updateHighScore]);

  const handleAnswer = (val: number) => {
    if (val === problem.answer) {
      setScore(s => s + 1);
      generateProblem();
    } else {
      updateHighScore(score);
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  const handleStart = () => {
    setScore(0);
    setIsPlaying(true);
    setGameOver(false);
    generateProblem();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] w-full max-w-lg mx-auto p-6 bg-white/5 rounded-3xl backdrop-blur-md border border-white/10">
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-6">
          <Zap className="w-16 h-16 text-blue-400 mx-auto" />
          <h2 className="text-3xl font-bold text-white uppercase italic">Turbo-Math</h2>
          <p className="text-gray-400">Rechne schnell! Du hast nur 5 Sekunden pro Aufgabe.</p>
          <button onClick={handleStart} className="px-10 py-4 bg-blue-500 text-white font-black uppercase rounded-2xl text-xl">Start</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
             <motion.div key={score} initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: 'linear' }} className="h-full bg-blue-400" />
          </div>
          <div className="text-7xl font-black italic tracking-widest font-mono">
            {problem.a} {problem.op === '*' ? '×' : problem.op} {problem.b}
          </div>
          <div className="grid grid-cols-3 gap-4">
            {problem.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(opt)} className="py-6 bg-white/5 rounded-2xl text-3xl font-black hover:bg-white/10 transition-colors border border-white/10">
                {opt}
              </button>
            ))}
          </div>
          <div className="text-xl font-black text-blue-400">Score: {score}</div>
        </div>
      ) : (
        <div className="text-center space-y-8 animate-in zoom-in-95">
          <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase">Zeit Abgelaufen</h2>
          <div className="text-8xl font-black text-blue-400">{score}</div>
          <div className="flex gap-4 justify-center">
            <button onClick={handleStart} className="p-4 bg-white/10 rounded-2xl text-white"><RotateCcw size={24} /></button>
            <button onClick={onBack} className="px-8 py-4 bg-blue-500 text-white font-black rounded-2xl uppercase text-sm">MENÜ</button>
          </div>
        </div>
      )}
    </div>
  );
};
const NoiseGenerator = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const toggleNoise = () => {
    if (isPlaying) {
      sourceRef.current?.stop();
      setIsPlaying(false);
    } else {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      const ctx = audioCtxRef.current;
      const bufferSize = 2 * ctx.sampleRate;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      
      // Brown Noise (Lower frequency, like a deep hum/waterfall)
      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        output[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = output[i];
        output[i] *= 3.5; // Gain
      }
      
      const source = ctx.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      source.connect(ctx.destination);
      source.start();
      sourceRef.current = source;
      setIsPlaying(true);
    }
  };

  return (
    <button 
      onClick={toggleNoise}
      className={`flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all ${
        isPlaying 
          ? 'bg-orange-500/20 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.2)]' 
          : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
      }`}
    >
      {isPlaying ? <Volume2 size={20} className="animate-pulse" /> : <VolumeX size={20} />}
      <div className="text-left">
        <p className="text-xs font-black uppercase tracking-widest">Brown Noise</p>
        <p className="text-[10px] opacity-60">Focus Aid: {isPlaying ? 'An' : 'Aus'}</p>
      </div>
    </button>
  );
};

// --- Main App Component ---

export default function App() {
  const [activeGame, setActiveGame] = useState<GameType>('NONE');
  const [highScores, setHighScores] = useState({ SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0 });
  const [streak, setStreak] = useState({ count: 0, lastDate: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [ambientPulse, setAmbientPulse] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Sync with Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        // Load from Firestore
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            setHighScores(data.highScores || { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0 });
            setStreak(data.streak || { count: 0, lastDate: '' });
          } else {
            // New user, push local data if exists
            const localScores = getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0 });
            const localStreak = getStorage('focus_streak', { count: 0, lastDate: '' });
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              highScores: localScores,
              streak: localStreak,
              updatedAt: serverTimestamp()
            });
            setHighScores(localScores);
            setStreak(localStreak);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        // Fallback to local storage
        setHighScores(getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0 }));
        setStreak(getStorage('focus_streak', { count: 0, lastDate: '' }));
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize data (Only if not logged in or during initial mount)
  useEffect(() => {
    if (!user && !authLoading) {
      setHighScores(getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0 }));
      
      // Streak logic
      const savedStreak = getStorage('focus_streak', { count: 0, lastDate: '' });
      const today = new Date().toDateString();
      
      if (savedStreak.lastDate === today) {
        setStreak(savedStreak);
      } else {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (savedStreak.lastDate === yesterday.toDateString()) {
          const newStreak = { count: savedStreak.count + 1, lastDate: today };
          setStreak(newStreak);
          setStorage('focus_streak', newStreak);
        } else if (savedStreak.lastDate === '') {
          const newStreak = { count: 1, lastDate: today };
          setStreak(newStreak);
          setStorage('focus_streak', newStreak);
        } else {
          // Streak broken
          const newStreak = { count: 1, lastDate: today };
          setStreak(newStreak);
          setStorage('focus_streak', newStreak);
        }
      }
    }
  }, [user, authLoading]);

  const updateHighScore = async (game: GameType, score: number) => {
    if (game === 'NONE') return;
    const newScores = { ...highScores, [game]: Math.max(highScores[game], score) };
    setHighScores(newScores);
    setStorage('focus_highscores', newScores);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          highScores: newScores,
          streak: streak,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Update community stats atomically
        const fieldName = {
          SPEED: 'totalSpeedPoints',
          STROOP: 'totalStroopPoints',
          MEMORY: 'totalMemoryLevels',
          SEARCH: 'totalSearchPoints',
          RHYTHM: 'totalRhythmSyncs',
          TAP: 'totalTurboTaps',
          BREATH: 'totalHoldScore',
          MATH: 'totalMathPoints',
        }[game as string];

        if (fieldName) {
          await updateDoc(doc(db, 'stats', 'community'), {
            [fieldName]: increment(score)
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
      }
    }
  };

  const handleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020202] text-white flex flex-col font-sans selection:bg-yellow-400 selection:text-black relative overflow-hidden">
      
      {/* Ambient Visual Focus Helper */}
      {ambientPulse && activeGame === 'NONE' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.03, 0.08, 0.03]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white rounded-full blur-[120px]"
          />
        </div>
      )}

      {/* Header */}
      <header className="p-6 md:p-10 flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ rotate: 15 }}
            className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-black shadow-lg"
          >
            <Zap size={28} fill="currentColor" />
          </motion.div>
          <div>
            <h1 className="text-2xl font-black tracking-tighter uppercase italic line-height-1">FocusFlow</h1>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400 font-mono tracking-widest uppercase">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              ADHD Cognitive Suite 2.0
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
            <Flame size={16} className="text-orange-500" fill="currentColor" />
            <span className="text-sm font-black italic">{streak.count} Tage Serie</span>
          </div>

          <div className="flex items-center gap-3">
            {user ? (
               <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-1.5 rounded-full pl-3 pr-4">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-white/20">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={20} className="m-1.5" />
                    )}
                  </div>
                  <button onClick={handleLogout} className="text-xs font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors">Abmelden</button>
               </div>
            ) : (
               <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)]"
               >
                 <LogIn size={16} /> Login
               </button>
            )}
          </div>
          
          {activeGame === 'NONE' ? (
            <>
              <NoiseGenerator />
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors"
              >
                <Settings size={20} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setActiveGame('NONE')}
              className="group flex items-center gap-3 text-sm font-bold uppercase tracking-wider text-gray-400 hover:text-white bg-white/5 px-6 py-3 rounded-xl border border-white/5 hover:border-white/10 transition-all"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> Menü
            </button>
          )}
        </div>
      </header>

      {/* Settings Modal (Simplified) */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-xl"
          >
            <div className="bg-[#111] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md space-y-8">
              <h2 className="text-3xl font-black italic uppercase">Einstellungen</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                     <p className="font-bold">Ambient Fokus-Puls</p>
                     <p className="text-xs text-gray-500">Subtile Hintergrund-Animation zur Beruhigung</p>
                  </div>
                  <button 
                    onClick={() => setAmbientPulse(!ambientPulse)}
                    className={`w-14 h-8 rounded-full relative transition-colors ${ambientPulse ? 'bg-emerald-500' : 'bg-white/10'}`}
                  >
                    <motion.div 
                      animate={{ x: ambientPulse ? 24 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                    />
                  </button>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl space-y-2">
                   <p className="text-xs uppercase tracking-widest text-gray-500 font-bold">Deine Stats</p>
                   <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <p className="text-yellow-400">Speed</p>
                        <p className="text-lg font-bold">{highScores.SPEED}</p>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <p className="text-blue-400">Stroop</p>
                        <p className="text-lg font-bold">{highScores.STROOP}</p>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <p className="text-emerald-400">Memory</p>
                        <p className="text-lg font-bold">{highScores.MEMORY}</p>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <p className="text-purple-400">Search</p>
                        <p className="text-lg font-bold">{highScores.SEARCH}</p>
                      </div>
                      <div className="bg-black/40 p-2 rounded-lg border border-white/5">
                        <p className="text-orange-400">Rhythm</p>
                        <p className="text-lg font-bold">{highScores.RHYTHM}</p>
                      </div>
                   </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-white text-black font-black uppercase rounded-2xl tracking-widest hover:scale-105 active:scale-95 transition-all"
              >
                Fertig
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20 z-10">
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LandingPage onLogin={handleLogin} />
            </motion.div>
          ) : activeGame === 'NONE' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="md:col-span-3 space-y-2 mb-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full w-fit mb-2">
                  <Info size={12} className="text-blue-400" />
                  <span className="text-[10px] font-mono tracking-widest uppercase">Bereit für deine tägliche Session?</span>
                </div>
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter uppercase italic leading-[0.9]">Deep Focus.</h2>
                <p className="text-gray-500 text-lg md:text-xl font-mono max-w-xl">Wähle ein Modul aus, um deinen präfrontalen Kortex zu stimulieren.</p>
              </div>

              <div className="md:col-span-1 space-y-6">
                <CommunityGoals />
                <CommunityChat user={user} />
                <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl">
                   <div className="flex items-center gap-3 mb-2 text-emerald-400">
                     <Flame size={18} fill="currentColor" />
                     <h3 className="text-sm font-black italic uppercase tracking-widest leading-none">Dein Streak</h3>
                   </div>
                   <div className="text-4xl font-black italic">{streak.count} TAGE</div>
                   <p className="text-xs text-emerald-400/60 font-mono mt-1">Bleib am Ball.</p>
                </div>
                <div className="p-6 bg-orange-500/10 border border-orange-500/20 rounded-3xl">
                   <div className="flex items-center gap-3 mb-2 text-orange-400">
                     <Volume2 size={18} />
                     <h3 className="text-sm font-black italic uppercase tracking-widest leading-none">Audio-Aid</h3>
                   </div>
                   <NoiseGenerator />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Speedy */}
                <button 
                  onClick={() => setActiveGame('SPEED')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-yellow-400/30 hover:bg-[#0E0E0E] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-yellow-400 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Zap size={80} fill="currentColor" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <h3 className="text-2xl font-black italic uppercase leading-none">Speed-Reaction</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic shadow-lg">Reflex-Training.</p>
                  </div>
                </button>

                {/* Stroop */}
                <button 
                  onClick={() => setActiveGame('STROOP')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-blue-400/30 hover:bg-[#0E0E0E] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-blue-400 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Palette size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <h3 className="text-2xl font-black italic uppercase leading-none">Farben-Fokus</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Impulskontrolle.</p>
                  </div>
                </button>

                {/* Memory */}
                <button 
                  onClick={() => setActiveGame('MEMORY')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-emerald-400/30 hover:bg-[#0E0E0E] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-emerald-400 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Brain size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <h3 className="text-2xl font-black italic uppercase leading-none">Memo-Sequenz</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Arbeitsgedächtnis.</p>
                  </div>
                </button>

                {/* Search */}
                <button 
                  onClick={() => setActiveGame('SEARCH')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-purple-400/30 hover:bg-[#0E0E0E] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-purple-400 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Search size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-mono bg-purple-400/20 text-purple-400 px-2 py-0.5 rounded border border-purple-400/30 font-black">NEU</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">Such-Fokus</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Detail-Aufmerksamkeit.</p>
                  </div>
                </button>

                {/* Rhythm */}
                <button 
                  onClick={() => setActiveGame('RHYTHM')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-orange-400/30 hover:bg-[#0E0E0E] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-orange-400 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Target size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-mono bg-orange-400/20 text-orange-400 px-2 py-0.5 rounded border border-orange-400/30 font-black">NEU</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">Rhythm-Sync</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Timing & Flow.</p>
                  </div>
                </button>

                {/* Turbo Tap */}
                <button 
                  onClick={() => setActiveGame('TAP')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-yellow-500/30 hover:bg-[#111] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-yellow-500 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Zap size={80} fill="currentColor" />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-mono bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded border border-yellow-500/30 font-black">NEU</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">Turbo-Tap</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Dopamin-Flash.</p>
                  </div>
                </button>

                {/* Focus Breath */}
                <button 
                  onClick={() => setActiveGame('BREATH')}
                  className="group relative h-[280px] bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-emerald-500/30 hover:bg-[#111] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-emerald-500 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Brain size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/30 font-black">NEU</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">Focus-Hold</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Gedulds-Ausdauer.</p>
                  </div>
                </button>
                
                {/* Math */}
                <button 
                  onClick={() => setActiveGame('MATH')}
                  className="group relative h-[280px] md:col-span-2 bg-[#0A0A0A] border border-white/5 rounded-[2.5rem] p-8 flex flex-col justify-end overflow-hidden hover:border-blue-500/30 hover:bg-[#111] transition-all duration-500 text-left"
                >
                  <div className="absolute top-0 right-0 p-8 text-blue-500 opacity-10 group-hover:opacity-100 group-hover:scale-110 transition-all duration-700">
                    <Timer size={80} />
                  </div>
                  <div className="relative z-10 flex flex-col gap-1">
                     <div className="flex items-center gap-2 mb-2">
                       <span className="text-[10px] font-mono bg-blue-500/20 text-blue-500 px-2 py-0.5 rounded border border-blue-500/30 font-black">NEU</span>
                    </div>
                    <h3 className="text-2xl font-black italic uppercase leading-none">Turbo-Math</h3>
                    <p className="text-gray-500 text-xs font-mono mt-2 italic">Cognitive Load Test.</p>
                  </div>
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="game-view"
              initial={{ opacity: 0, scale: 1.1, filter: 'blur(20px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(20px)' }}
              className="w-full"
            >
              {activeGame === 'SPEED' && (
                <SpeedChallenge 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.SPEED}
                  updateHighScore={(s) => updateHighScore('SPEED', s)}
                />
              )}
              {activeGame === 'STROOP' && (
                <StroopTest 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.STROOP}
                  updateHighScore={(s) => updateHighScore('STROOP', s)}
                />
              )}
              {activeGame === 'MEMORY' && (
                <SequenceMemory 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.MEMORY}
                  updateHighScore={(s) => updateHighScore('MEMORY', s)}
                />
              )}
              {activeGame === 'SEARCH' && (
                <SelectiveSearch 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.SEARCH}
                  updateHighScore={(s) => updateHighScore('SEARCH', s)}
                />
              )}
              {activeGame === 'RHYTHM' && (
                <RhythmicSync 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.RHYTHM}
                  updateHighScore={(s) => updateHighScore('RHYTHM', s)}
                />
              )}
              {activeGame === 'MATH' && (
                <TurboMath 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.MATH}
                  updateHighScore={(s) => updateHighScore('MATH', s)}
                />
              )}
              {activeGame === 'TAP' && (
                <DopamineTap 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.TAP}
                  updateHighScore={(s) => updateHighScore('TAP', s)}
                />
              )}
              {activeGame === 'BREATH' && (
                <FocusBreathing 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.BREATH}
                  updateHighScore={(s) => updateHighScore('BREATH', s)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-10 border-t border-white/5 text-center text-xs text-gray-700 font-mono uppercase tracking-[0.4em] bg-black/80 backdrop-blur-md z-10">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto gap-4">
           <div>FocusFlow Protocol v2.5.0</div>
           <div className="flex gap-8">
              <span className="hover:text-emerald-400 transition-colors cursor-help">Deep Focus Active</span>
              <span className="hover:text-yellow-400 transition-colors cursor-help">Dopamine Balanced</span>
           </div>
        </div>
      </footer>
    </div>
  );
}

