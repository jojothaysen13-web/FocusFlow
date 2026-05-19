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
  Send,
  BrainCircuit,
  LayoutGrid,
  UserRound,
  X
} from 'lucide-react';
import { 
  auth, 
  loginWithGoogle, 
  db, 
  handleFirestoreError, 
  OperationType, 
  increment, 
  onSnapshot, 
  updateDoc, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateUserProfile
} from './lib/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// --- Types ---

type GameType = 'SPEED' | 'STROOP' | 'MEMORY' | 'SEARCH' | 'RHYTHM' | 'TAP' | 'BREATH' | 'MATH' | 'NBACK' | 'SCHULTE' | 'NONE';

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

  const [combo, setCombo] = useState(1);
  const [lastHitTime, setLastHitTime] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const moveTarget = useCallback((currentScore: number) => {
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
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

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
    playSound('CLICK');
    const now = Date.now();
    const timeSinceLast = now - lastHitTime;
    
    let newCombo = combo;
    if (timeSinceLast < 600) {
      newCombo = Math.min(5, combo + 1);
    } else {
      newCombo = 1;
    }
    setCombo(newCombo);
    setLastHitTime(now);

    const nextScore = score + (1 * newCombo);
    setScore(nextScore);
    moveTarget(nextScore);
    if (nextScore > highScore && nextScore % 10 === 0) playSound('LEVEL_UP');
  };

  const handleMiss = () => {
    if (!isPlaying) return;
    shake();
    setScore(s => Math.max(0, s - 1));
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <div className="relative">
            <Zap className="w-20 h-20 text-yellow-600 mx-auto drop-shadow-[0_0_20px_rgba(202,138,4,0.1)]" />
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.05, 0.15, 0.05] }} transition={{ duration: 3, repeat: Infinity }} className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl -z-10" />
          </div>
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Speed Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Initiiere Reflex-Test. Eliminiere gelbe Entitäten. Präzision ist für die Datenintegrität erforderlich.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-yellow-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button 
            onClick={handleStart}
            className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl"
          >
            INITIALIZE
          </button>
        </div>
      ) : isPlaying ? (
        <>
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <motion.div 
            onClick={handleMiss}
            onMouseMove={handleMouseMove}
            animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="w-full h-[450px] relative cursor-crosshair overflow-hidden rounded-[2.5rem] bg-stone-900 border border-stone-800 shadow-inner"
          >
          <div className="absolute top-0 left-0 right-0 flex justify-between p-8 text-white font-mono z-10 pointer-events-none">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none">Score</span>
              <div className="text-2xl font-black italic text-yellow-500 flex items-center gap-2">
                {score} 
                {combo > 1 && <motion.span key={combo} initial={{ scale: 1.5 }} animate={{ scale: 1 }} className="text-xs bg-yellow-600 text-white px-1.5 rounded">x{combo}</motion.span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-white/40 uppercase tracking-widest leading-none">Time Remaining</span>
              <div className="text-2xl font-black italic text-white/90">{timeLeft}s</div>
            </div>
          </div>
          
          <motion.div
            key={`${target.x}-${target.y}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="absolute bg-yellow-600 rounded-full cursor-pointer shadow-[0_0_40px_rgba(202,138,4,0.15)] flex items-center justify-center group"
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
            <div className="w-full h-full border-4 border-white/30 rounded-full scale-100 group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-1/2 h-0.5 bg-white/60 rounded-full" />
              <div className="absolute w-0.5 h-1/2 bg-white/60 rounded-full" />
            </div>
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          </motion.div>
        </motion.div>
        </>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-yellow-600 uppercase tracking-[0.4em] mb-4">Protocol Terminated</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-yellow-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
               <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
             </div>
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Efficiency</p>
               <p className="text-2xl font-display font-black text-stone-900">{((score/30) * 10).toFixed(1)}%</p>
             </div>
          </div>
          
          <div className="flex gap-4 justify-center">
            <button 
              onClick={handleStart}
              className="p-6 bg-stone-100 border border-stone-200 rounded-3xl hover:bg-stone-200 text-stone-400 transition-all group"
            >
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button 
              onClick={onBack}
              className="flex-1 py-6 bg-yellow-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl"
            >
              DATA MENU
            </button>
          </div>
        </div>
      )}
    </motion.div>
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
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(32);
    setGameOver(false);
    setIsPlaying(true);
    nextChallenge();
  };

  const handleAnswer = (colorValue: string) => {
    if (colorValue === colors[currentChallenge.colorIdx].value) {
      playSound('SUCCESS');
      setScore(s => s + 1);
    } else {
      playSound('ERROR');
      shake();
      setScore(s => Math.max(0, s - 1));
    }
    nextChallenge();
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Palette className="w-20 h-20 text-blue-600 mx-auto drop-shadow-[0_0_20px_rgba(37,99,235,0.1)]" strokeWidth={1.5} />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Color Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Interferenz-Vermeidungstest. Identifiziere die Farb-Wellenlänge, nicht die Wort-Semantik.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-blue-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <>
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <motion.div 
            animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="w-full space-y-12"
          >
          <div className="flex justify-between text-stone-900 font-mono p-4">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Cognition Score</span>
              <div className="text-2xl font-black italic text-blue-600">{score}</div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Time Remaining</span>
              <div className="text-2xl font-black italic">{timeLeft}s</div>
            </div>
          </div>

          <div className="text-center py-12 relative">
            <AnimatePresence mode="wait">
              <motion.h1 
                key={`${currentChallenge.textIdx}-${currentChallenge.colorIdx}`}
                initial={{ y: 20, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -20, opacity: 0, scale: 1.2 }}
                className="text-8xl md:text-9xl font-display font-black uppercase tracking-tighter italic"
                style={{ color: colors[currentChallenge.colorIdx].value }}
              >
                {colors[currentChallenge.textIdx].name}
              </motion.h1>
            </AnimatePresence>
          </div>
          <div className="grid grid-cols-5 gap-4 max-w-md mx-auto">
            {shuffledOptions.map((c) => (
              <button
                key={c.value}
                onClick={() => handleAnswer(c.value)}
                className="h-20 rounded-2xl border border-white/10 hover:scale-105 active:scale-90 transition-all shadow-xl hover:shadow-blue-500/10"
                style={{ backgroundColor: c.value }}
              />
            ))}
          </div>
        </motion.div>
      </>
    ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-blue-600 uppercase tracking-[0.4em] mb-4">Interference Resolved</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
               <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
             </div>
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Accuracy</p>
               <p className="text-2xl font-display font-black text-stone-900">{((score / (score + (isRefreshing ? 1 : 0))) * 100 || 0).toFixed(0)}%</p>
             </div>
          </div>
          
          <div className="flex gap-4 justify-center">
             <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
               <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
             </button>
             <button onClick={onBack} className="flex-1 py-6 bg-blue-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
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
      playSound('ERROR');
      shake();
      setStatus('FAILED');
      updateHighScore(score);
      return;
    }

    playSound('CLICK');
    if (newUserSeq.length === sequence.length) {
      playSound('SUCCESS');
      setScore(sequence.length);
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
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[650px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {status === 'IDLE' ? (
        <div className="text-center space-y-8 max-w-md">
          <Brain className="w-20 h-20 text-emerald-600 mx-auto drop-shadow-[0_0_20px_rgba(5,150,105,0.1)]" strokeWidth={1.5} />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Memory Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Neuraler Retentionstest. Die Belastung steigt exponentiell an.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-emerald-600 uppercase tracking-widest">Best Level: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : (
        <>
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <motion.div 
            animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
            className="w-full space-y-10"
          >
           <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Retention Level</span>
               <div className="text-2xl font-black italic text-emerald-600">{sequence.length}</div>
             </div>
             <div className="text-[10px] uppercase tracking-widest font-black flex flex-col items-end gap-1">
               <span className="text-stone-400">Status</span>
               <div className="flex items-center gap-2">
                 <div className={`w-2 h-2 rounded-full ${status === 'SHOWING' ? 'bg-blue-600 animate-pulse' : 'bg-emerald-600'}`} />
                 <span className={status === 'SHOWING' ? 'text-blue-600' : 'text-emerald-600'}>
                   {status === 'SHOWING' ? 'Muster einprägen' : status === 'FAILED' ? 'Fehler!' : 'Wiederhole!'}
                 </span>
               </div>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 max-w-sm mx-auto p-4">
            {Array.from({ length: 9 }).map((_, i) => (
              <motion.button
                key={i}
                whileHover={status === 'INPUT' ? { scale: 1.05 } : {}}
                whileTap={status === 'INPUT' ? { scale: 0.95 } : {}}
                onClick={() => handleTileClick(i)}
                className={`aspect-square rounded-[2rem] transition-all duration-300 border border-stone-200 ${
                  activeIdx === i 
                    ? 'bg-emerald-600 shadow-[0_0_50px_rgba(5,150,105,0.3)] scale-110 z-10' 
                    : 'bg-stone-50 hover:bg-stone-100'
                }`}
              />
            ))}
          </div>

          {status === 'FAILED' && (
            <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full pt-10 border-t border-stone-200">
              <div className="space-y-2">
                <h2 className="text-[10px] font-mono text-emerald-600 uppercase tracking-[0.4em] mb-4">Neural Capacity Limit</h2>
                <div className="relative inline-block text-stone-900">
                  <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
                  <div className="absolute -top-4 -right-8 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Level</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                  <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Best Level</p>
                  <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
                </div>
                <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                  <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Capacity</p>
                  <p className="text-2xl font-display font-black text-stone-900">{Math.min(100, score * 10)}%</p>
                </div>
              </div>

              <div className="flex gap-4 justify-center max-w-md mx-auto">
                <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
                  <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
                </button>
                <button onClick={onBack} className="flex-1 py-6 bg-emerald-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
              </div>
            </div>
          )}
        </motion.div>
      </>
      )}
    </motion.div>
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
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

  const handleStart = () => {
    setScore(0);
    setTimeLeft(30);
    setIsPlaying(true);
    setGameOver(false);
    setupLevel(0);
  };

  const handleTileClick = (idx: number) => {
    if (idx === targetIdx) {
      playSound('SUCCESS');
      const nextScore = score + 1;
      setScore(nextScore);
      setupLevel(nextScore);
    } else {
      playSound('ERROR');
      shake();
      setScore(s => Math.max(0, s - 1));
    }
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Search className="w-20 h-20 text-indigo-600 mx-auto drop-shadow-[0_0_20px_rgba(79,70,229,0.1)]" strokeWidth={1.5} />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Search Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Visual-Scan-Test. Identifiziere die Anomalie in der Matrix. Schnelligkeit ist entscheidend für die Synchronisation.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-indigo-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
           <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Anomalies Detected</span>
               <div className="text-2xl font-black italic text-indigo-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Time Remaining</span>
               <div className="text-2xl font-black italic">{timeLeft}s</div>
             </div>
          </div>
          <div 
            className="grid gap-3 mx-auto" 
            style={{ 
              gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
              maxWidth: '400px'
            }}
          >
            {Array.from({ length: gridSize * gridSize }).map((_, i) => (
              <button
                key={i}
                onClick={() => handleTileClick(i)}
                className={`aspect-square rounded-2xl transition-all border border-stone-200 flex items-center justify-center ${
                  i === targetIdx 
                    ? 'bg-indigo-600/10 text-indigo-600 shadow-[inset_0_0_20px_rgba(79,70,229,0.05)]' 
                    : 'bg-stone-50 text-stone-200 hover:bg-stone-100'
                }`}
              >
                {i === targetIdx ? <Target size={32} strokeWidth={2.5} /> : <div className="w-2 h-2 rounded-full bg-current opacity-20" />}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-indigo-600 uppercase tracking-[0.4em] mb-4">Matrix Scan Complete</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
               <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
             </div>
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Efficiency</p>
               <p className="text-2xl font-display font-black text-stone-900">{((score/30) * 100).toFixed(0)}%</p>
             </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
            <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-indigo-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
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
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

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
      playSound('SUCCESS');
      setScore(s => s + 1);
      speed.current = Math.min(6, 2 + (score / 10)); // Speed increases
    } else {
      playSound('ERROR');
      shake();
      setScore(s => Math.max(0, s - 1));
    }
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Target className="w-20 h-20 text-orange-600 mx-auto drop-shadow-[0_0_20px_rgba(234,88,12,0.1)]" strokeWidth={1.5} />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Sync Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Temporal-Auditiver-Test. Synchronisiere kognitive Pulse mit der Basis-Frequenz. Abweichungen führen zur De-Synchronisation.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-orange-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
           <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Sync Cycles</span>
               <div className="text-2xl font-black italic text-orange-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Time Remaining</span>
               <div className="text-2xl font-black italic">{timeLeft}s</div>
             </div>
          </div>
          
          <div className="h-32 bg-stone-50 rounded-[2.5rem] relative border border-stone-200 overflow-hidden flex items-center justify-center">
            {/* Target Zone */}
            <div className="absolute w-[16%] h-full bg-orange-600/10 border-x border-orange-600/20 z-0" />
            
            {/* Moving Bar */}
            <motion.div 
               className="absolute w-3 h-full bg-orange-600 shadow-[0_0_20px_rgba(234,88,12,0.5)] z-10 rounded-full"
               style={{ left: `${renderPos}%` }}
            />
          </div>

          <button 
            onPointerDown={handleSync}
            className="w-full py-12 bg-stone-50 border border-stone-200 rounded-[2.5rem] text-4xl font-display font-black uppercase italic tracking-[0.2em] hover:bg-stone-100 hover:border-orange-600/30 active:scale-[0.98] active:bg-orange-600/10 transition-all font-mono text-stone-900 shadow-sm"
          >
            SYNC
          </button>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-orange-600 uppercase tracking-[0.4em] mb-4">Synchronization Established</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-orange-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
               <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
             </div>
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Precision</p>
               <p className="text-2xl font-display font-black text-stone-900">{((score/30) * 100).toFixed(0)}%</p>
             </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
            <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-orange-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
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
  totalNBackPoints: 2000,
  totalSchultePoints: 5000,
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
          totalMathPoints: 0,
          totalNBackPoints: 0,
          totalSchultePoints: 0
        }, { merge: true }).catch(err => console.warn("Seed failed", err));
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const GoalRow = ({ label, current, limit, colorClass }: { label: string, current: number, limit: number, colorClass: string }) => {
    const progress = Math.min(100, (current / limit) * 100);
    return (
      <div className="space-y-2">
        <div className="flex justify-between text-[9px] font-mono uppercase tracking-[0.2em]">
          <span className="text-stone-500">{label}</span>
          <span className={colorClass}>{loading ? '...' : `${Math.floor(progress)}%`}</span>
        </div>
        <div className="h-1 w-full bg-stone-200 rounded-full overflow-hidden">
          <motion.div 
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            className={`h-full ${colorClass.replace('text-', 'bg-')} shadow-[0_0_8px_rgba(0,0,0,0.05)]`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 bg-white border border-stone-200 rounded-[2.5rem] space-y-6 shadow-xl text-stone-900">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <UsersIcon size={18} className="text-emerald-600" />
          <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-emerald-600">Global Protocol</h3>
        </div>
        <div className="text-[10px] font-mono text-stone-400 uppercase">Live</div>
      </div>
      <div className="space-y-5">
        <GoalRow label="Speed Protocol" current={stats?.totalSpeedPoints || 0} limit={GOAL_LIMITS.totalSpeedPoints} colorClass="text-yellow-600" />
        <GoalRow label="Timing Precision" current={stats?.totalRhythmSyncs || 0} limit={GOAL_LIMITS.totalRhythmSyncs} colorClass="text-orange-600" />
        <GoalRow label="Memory Retention" current={stats?.totalMemoryLevels || 0} limit={GOAL_LIMITS.totalMemoryLevels} colorClass="text-emerald-600" />
        <GoalRow label="Logic Matrix" current={stats?.totalMathPoints || 0} limit={GOAL_LIMITS.totalMathPoints} colorClass="text-blue-600" />
      </div>
      <div className="pt-4 border-t border-stone-200">
        <p className="text-[9px] text-stone-400 font-mono text-center uppercase tracking-widest leading-relaxed italic">
          Kollaborative Kognition aktiv.
        </p>
      </div>
    </div>
  );
};

const ProfileEditor = ({ user, onClose }: { user: User, onClose: () => void }) => {
  const [name, setName] = useState(user.displayName || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUserProfile(name);
      setMessage('Profile Synchronized');
      setTimeout(onClose, 1000);
    } catch (err: any) {
      setMessage('Sync Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-10 bg-white border border-stone-200 rounded-[3rem] space-y-8 shadow-2xl w-full max-w-md relative"
    >
      <button onClick={onClose} className="absolute top-8 right-8 text-stone-400 hover:text-stone-900 transition-colors">
        <X size={24} />
      </button>
      
      <div className="space-y-2 text-center">
        <h2 className="text-3xl font-display font-black italic uppercase italic tracking-tighter">Edit Identity</h2>
        <p className="text-stone-500 font-mono text-xs uppercase tracking-widest">Personal Protocol Configuration</p>
      </div>

      <form onSubmit={handleUpdate} className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 ml-2">Display Name</label>
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
            required
          />
        </div>

        {message && <p className={`text-[10px] font-mono text-center uppercase tracking-widest ${message.includes('Error') ? 'text-rose-500' : 'text-emerald-500'}`}>{message}</p>}

        <button 
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-stone-900 text-white font-display font-black uppercase text-xl rounded-2xl hover:bg-stone-800 active:scale-95 transition-all shadow-xl disabled:opacity-50"
        >
          {loading ? 'SYNCING...' : 'UPDATE PROTOCOL'}
        </button>
      </form>
    </motion.div>
  );
};

const LandingPage = ({ onGoogleLogin }: { onGoogleLogin: () => void }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err: any) {
      console.error("Auth error", err);
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[90vh] text-center space-y-12 p-6 overflow-hidden">
      <div className="relative">
        <motion.div 
          animate={{ scale: [1, 1.3, 1], opacity: [0.1, 0.2, 0.1] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -inset-40 bg-emerald-500/20 rounded-full blur-[120px]"
        />
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="relative z-10"
        >
          <Brain size={100} className="text-emerald-600 drop-shadow-[0_0_30px_rgba(52,211,153,0.1)]" strokeWidth={1} />
        </motion.div>
      </div>
      
      <div className="space-y-4 max-w-4xl relative z-10">
        <motion.h1 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-[12vw] md:text-[8vw] font-display font-black italic uppercase tracking-tighter text-stone-900 leading-[0.8] mb-2"
        >
          Focus<span className="text-emerald-600">Flow</span>
        </motion.h1>
        <motion.p 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-base md:text-xl text-stone-500 font-mono italic max-w-2xl mx-auto"
        >
          Scientific Grade Performance Driven Protocol.
        </motion.p>
      </div>

      <motion.div 
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-sm bg-white border border-stone-200 rounded-[2.5rem] p-8 shadow-2xl relative z-10 space-y-6"
      >
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 ml-2">Secure Identifier</label>
            <input 
              type="email" 
              placeholder="E-MAIL ADDRESS"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <div className="space-y-2 text-left">
            <label className="text-[10px] font-mono uppercase tracking-[0.2em] text-stone-400 ml-2">Access Key</label>
            <input 
              type="password" 
              placeholder="PASSWORD"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-stone-50 border border-stone-200 rounded-2xl px-5 py-3 text-sm font-mono focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>

          {error && <p className="text-[10px] font-mono text-rose-500 uppercase">{error}</p>}

          <button 
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-stone-900 text-white font-display font-black uppercase text-xl rounded-2xl hover:bg-stone-800 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {loading ? "PROCESSING..." : isSignUp ? "INITIALIZE ACCOUNT" : "START PROTOCOL"}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-stone-100"></div>
          </div>
          <div className="relative flex justify-center text-[10px] font-mono uppercase tracking-widest">
            <span className="bg-white px-4 text-stone-300">Synchronize</span>
          </div>
        </div>

        <button 
          type="button"
          onClick={onGoogleLogin}
          className="w-full py-3 bg-white border border-stone-200 text-stone-900 font-display font-black uppercase text-sm rounded-2xl hover:bg-stone-50 active:scale-95 transition-all flex items-center justify-center gap-3"
        >
          <LogIn size={18} /> Google Login
        </button>

        <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest pt-2">
          {isSignUp ? "Already initialized?" : "New user detected?"}{" "}
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-emerald-600 hover:underline font-black outline-none"
          >
            {isSignUp ? "LOG IN" : "SIGN UP"}
          </button>
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-5xl pt-20 border-t border-stone-200">
        {[
          { icon: Zap, label: 'Speed', sub: 'Reflex-Opt', color: 'text-yellow-600' },
          { icon: Target, label: 'Timing', sub: 'Flow-State', color: 'text-orange-600' },
          { icon: UsersIcon, label: 'Social', sub: 'Global Chat', color: 'text-purple-600' },
          { icon: Trophy, label: 'Legacy', sub: 'Leaderboards', color: 'text-emerald-600' }
        ].map((feat, i) => (
          <motion.div 
            key={feat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 + (i * 0.1) }}
            className="p-8 bg-white border border-stone-200 rounded-[2.5rem] text-left hover:bg-stone-50 transition-colors group cursor-default shadow-sm"
          >
             <feat.icon className={`${feat.color} mb-4 group-hover:scale-110 transition-transform`} size={32} strokeWidth={1.5} />
             <p className="text-sm font-display font-black uppercase tracking-widest text-stone-900">{feat.label}</p>
             <p className="text-[10px] text-stone-400 font-mono mt-2 uppercase tracking-wider">{feat.sub}</p>
          </motion.div>
        ))}
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
    <div className="flex flex-col h-[500px] bg-white border border-stone-200 rounded-[2.5rem] overflow-hidden shadow-xl text-stone-900">
      <div className="p-6 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
         <div className="flex items-center gap-3">
           <UsersIcon size={16} className="text-purple-600" />
           <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-purple-600">Secure Comms</h3>
         </div>
         <div className="text-[9px] font-mono text-stone-400 uppercase">{messages.length} Active</div>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.userId === user.uid ? 'items-end' : 'items-start'}`}>
            <div className="flex items-center gap-2 mb-2">
               {msg.userId !== user.uid && (
                 <img src={msg.userPhoto || `https://api.dicebear.com/7.x/bottts/svg?seed=${msg.userId}`} alt={msg.userName} className="w-5 h-5 rounded-full ring-1 ring-stone-200" referrerPolicy="no-referrer" />
               )}
               <span className="text-[9px] text-stone-400 font-mono uppercase tracking-tighter">{msg.userName}</span>
            </div>
            <div className={`px-4 py-3 rounded-2xl text-xs leading-relaxed max-w-[85%] ${msg.userId === user.uid ? 'bg-purple-600 text-white rounded-tr-none shadow-[0_4px_20px_rgba(168,85,247,0.1)]' : 'bg-stone-100 text-stone-600 rounded-tl-none border border-stone-200'}`}>
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="p-6 bg-stone-50 border-t border-stone-200 flex gap-3">
        <input 
          type="text" 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="TERMINAL INPUT..."
          className="flex-1 bg-white border border-stone-200 rounded-xl px-5 py-3 text-[10px] font-mono focus:outline-none focus:border-purple-600/30 transition-all placeholder:text-stone-300"
        />
        <button type="submit" className="p-3 bg-purple-600 text-white rounded-xl hover:scale-105 active:scale-95 transition-all shadow-lg hover:shadow-purple-600/20">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

// --- Sound Engine ---
const playSound = (type: 'CLICK' | 'SUCCESS' | 'ERROR' | 'LEVEL_UP') => {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  
  osc.connect(gain);
  gain.connect(ctx.destination);
  
  const now = ctx.currentTime;
  
  if (type === 'CLICK') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'SUCCESS') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(990, now + 0.2);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
  } else if (type === 'ERROR') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(110, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'LEVEL_UP') {
    [0, 0.1, 0.2].forEach(d => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.setValueAtTime(523.25 + (d * 500), now + d);
      g.gain.setValueAtTime(0.1, now + d);
      g.gain.exponentialRampToValueAtTime(0.01, now + d + 0.3);
      o.start(now + d);
      o.stop(now + d + 0.3);
    });
  }
};

const NeuralBackground = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-20">
      <svg className="w-full h-full">
        <defs>
          <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" style={{ stopColor: 'rgb(5,150,105)', stopOpacity: 0.15 }} />
            <stop offset="100%" style={{ stopColor: 'rgb(251,251,249)', stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        {[...Array(30)].map((_, i) => (
          <motion.circle
            key={i}
            cx={`${Math.random() * 100}%`}
            cy={`${Math.random() * 100}%`}
            r={Math.random() * 3 + 1}
            fill="#a8a29e"
            initial={{ opacity: 0.1 }}
            animate={{ 
              opacity: [0.05, 0.25, 0.05],
              scale: [1, 1.4, 1],
              x: [0, Math.random() * 60 - 30],
              y: [0, Math.random() * 60 - 30]
            }}
            transition={{ 
              duration: 8 + Math.random() * 12, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        ))}
      </svg>
    </div>
  );
};

const GlobalLeaderboard = () => {
  const [leaders, setLeaders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaders = async () => {
      try {
        const q = query(collection(db, 'users'), orderBy('totalScore', 'desc'), limit(5));
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => {
          const d = doc.data();
          return { id: doc.id, name: d.userName || 'Anonymous', score: d.totalScore || 0, photo: d.userPhoto };
        });
        setLeaders(data);
      } catch (e) {
        console.error(e);
        // Fallback or handle error
      } finally {
        setLoading(false);
      }
    };
    fetchLeaders();
  }, []);

  return (
    <div className="p-8 bg-white border border-stone-200 rounded-[2.5rem] space-y-6 shadow-xl text-stone-900">
      <div className="flex items-center gap-3 mb-2">
        <Trophy size={18} className="text-yellow-600" />
        <h3 className="text-xs font-display font-black uppercase tracking-[0.2em] text-yellow-600">Global High-Performers</h3>
      </div>
      <div className="space-y-4">
        {loading ? (
          [...Array(3)].map((_, i) => <div key={i} className="h-10 bg-stone-100 animate-pulse rounded-xl" />)
        ) : (
          leaders.map((l, i) => (
            <div key={l.id} className="flex items-center justify-between group">
              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-stone-400 w-4">0{i+1}</span>
                <img src={l.photo || `https://api.dicebear.com/7.x/identicon/svg?seed=${l.id}`} alt="" className="w-6 h-6 rounded-full opacity-50 group-hover:opacity-100 transition-opacity border border-stone-100" />
                <span className="text-xs font-display font-black uppercase tracking-tight truncate max-w-[120px]">{l.name}</span>
              </div>
              <span className="text-xs font-mono text-emerald-600 font-bold">{l.score.toLocaleString()} XP</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
const DopamineTap: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const { isRefreshing, shake } = useScreenShake();
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const progress = Math.min(100, (score / 100) * 100);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
      updateHighScore(score);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

  const handleTap = () => {
    if (!isPlaying) return;
    playSound('CLICK');
    setScore(s => s + 1);
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Zap className="w-20 h-20 text-yellow-600 mx-auto drop-shadow-[0_0_20px_rgba(202,138,4,0.1)]" />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Dopamine Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Motorische-Reaktionseinheit. Maximale Frequenzstimulation erforderlich. Deintegriere die physische Barriere.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-yellow-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={() => setIsPlaying(true)} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Tap Frequency</span>
               <div className="text-2xl font-black italic text-yellow-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Time Remaining</span>
               <div className="text-2xl font-black italic">{timeLeft}s</div>
             </div>
          </div>
          <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200">
            <motion.div animate={{ width: `${progress}%` }} className="h-full bg-yellow-600 shadow-[0_0_20px_rgba(202,138,4,0.2)]" />
          </div>
          <button 
            onPointerDown={handleTap}
            className="w-56 h-56 bg-yellow-600 rounded-full mx-auto shadow-[0_0_60px_rgba(202,138,4,0.1)] active:scale-90 transition-all flex items-center justify-center text-white group relative"
          >
            <Zap size={80} fill="currentColor" className="group-hover:scale-110 transition-transform" />
            <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          </button>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-yellow-600 uppercase tracking-[0.4em] mb-4">Neural Overload Reached</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-yellow-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
               <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
             </div>
             <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
               <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Intensity</p>
               <p className="text-2xl font-display font-black text-stone-900">{(score/10).toFixed(1)} T/s</p>
             </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
            <button 
              onClick={() => { setScore(0); setTimeLeft(10); setIsPlaying(true); setGameOver(false); }} 
              className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group"
            >
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-yellow-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * FOCUS BREATHING
 * A persistence task: hold for target duration.
 */
const FocusBreathing: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const { isRefreshing, shake } = useScreenShake();
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
    playSound('LEVEL_UP');
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
      playSound('SUCCESS');
      setScore(s => s + 1);
      setTargetTime(Number((2 + Math.random() * 5).toFixed(1)));
    } else {
      playSound('ERROR');
      shake();
      updateHighScore(score);
      setGameOver(true);
      setIsPlaying(false);
    }
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Brain className="w-20 h-20 text-emerald-600 mx-auto drop-shadow-[0_0_20px_rgba(52,211,153,0.1)]" />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Breath Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Persistenz-Audit. Halte die neuronale Spannung für die exakt berechnete Dauer. Abweichungen führen zur Fragmentierung.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-emerald-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Stability Rounds</span>
               <div className="text-2xl font-black italic text-emerald-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Hold Goal</span>
               <div className="text-2xl font-black italic">{targetTime}s</div>
             </div>
          </div>

          <div className="relative w-72 h-72 mx-auto">
             <svg className="w-full h-full -rotate-90">
               <circle cx="144" cy="144" r="130" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-stone-100" />
               <motion.circle 
                 cx="144" cy="144" r="130" stroke="currentColor" strokeWidth="12" fill="transparent" 
                 className="text-emerald-600 drop-shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                 strokeDasharray="816"
                 strokeDashoffset={816 - (816 * Math.min(1, currentHoldTime / targetTime))}
                 transition={{ ease: "linear" }}
               />
             </svg>
             <button 
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              className={`absolute inset-6 rounded-full transition-all flex items-center justify-center text-3xl font-display font-black italic tracking-widest uppercase ${isPressing ? 'bg-emerald-600 scale-95 shadow-[0_0_60px_rgba(16,185,129,0.2)] text-white' : 'bg-stone-50 text-stone-900 border border-stone-200 hover:bg-stone-100'}`}
            >
              HOLD
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-emerald-600 uppercase tracking-[0.4em] mb-4">Neural Stability Lost</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-emerald-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
                <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
              </div>
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Stability</p>
                <p className="text-2xl font-display font-black text-stone-900">{(score * 100 / (score + 1) || 0).toFixed(0)}%</p>
              </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
            <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-emerald-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * TURBO MATH
 * Simple arithmetic under intense time pressure.
 */
const TurboMath: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const { isRefreshing, shake } = useScreenShake();
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
    }
    return () => clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      updateHighScore(score);
      setGameOver(true);
      setIsPlaying(false);
    }
  }, [timeLeft, isPlaying, score, updateHighScore]);

  const handleAnswer = (val: number) => {
    if (val === problem.answer) {
      playSound('SUCCESS');
      setScore(s => s + 1);
      generateProblem();
    } else {
      playSound('ERROR');
      shake();
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
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[600px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <Zap className="w-20 h-20 text-blue-600 mx-auto drop-shadow-[0_0_20px_rgba(37,99,235,0.1)]" />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Math Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Arithmetische Fluiditätseinheit. Löse die Gleichungen unter extremem Zeitdruck. Neuronale Überlastung droht.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-blue-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={handleStart} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
           <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Logic Resolved</span>
               <div className="text-2xl font-black italic text-blue-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Stability Window</span>
               <div className="text-2xl font-black italic">ACTIVE</div>
             </div>
          </div>
          <div className="h-4 w-full bg-stone-100 rounded-full overflow-hidden border border-stone-200">
             <motion.div key={score} initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 5, ease: 'linear' }} className="h-full bg-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)]" />
          </div>
          <div className="text-8xl font-display font-black italic tracking-tighter text-stone-900 py-10">
            {problem.a} <span className="text-blue-600">{problem.op === '*' ? '×' : problem.op}</span> {problem.b}
          </div>
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {problem.options.map((opt, i) => (
              <button key={i} onClick={() => handleAnswer(opt)} className="py-8 bg-stone-50 rounded-[2rem] text-4xl font-display font-black italic text-stone-900 hover:bg-stone-100 hover:scale-105 active:scale-95 transition-all border border-stone-200 shadow-sm">
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-blue-600 uppercase tracking-[0.4em] mb-4">Arithmetic Overload</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-1">Best Accuracy</p>
                <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
              </div>
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mb-1">Stability</p>
                <p className="text-2xl font-display font-black text-stone-900">{((score/5) * 100).toFixed(0)}%</p>
              </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
            <button onClick={handleStart} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-blue-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};
/**
 * N-BACK TRAINING
 * Scientific gold standard for working memory.
 */
const NBackGame: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const { isRefreshing, shake } = useScreenShake();
  const [sequence, setSequence] = useState<number[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [n] = useState(2); // 2-Back
  const [feedback, setFeedback] = useState<'CORRECT' | 'WRONG' | null>(null);
  const timerRef = useRef<any>(null);

  const startNextStep = useCallback(() => {
    setFeedback(null);
    setCurrentStep(s => {
      const next = s + 1;
      const nextPos = Math.floor(Math.random() * 9);
      setSequence(seq => [...seq, nextPos]);
      return next;
    });
  }, []);

  useEffect(() => {
    if (isPlaying && !gameOver) {
      timerRef.current = setInterval(startNextStep, 2000);
      startNextStep();
    }
    return () => clearInterval(timerRef.current);
  }, [isPlaying, gameOver, startNextStep]);

  const handleMatch = () => {
    if (currentStep < n) return;
    const currentPos = sequence[currentStep];
    const nBackPos = sequence[currentStep - n];
    
    if (currentPos === nBackPos) {
      playSound('SUCCESS');
      setScore(s => s + 1);
      setFeedback('CORRECT');
    } else {
      playSound('ERROR');
      shake();
      setFeedback('WRONG');
      setGameOver(true);
      setIsPlaying(false);
      updateHighScore(score);
    }
  };

  const currentPos = sequence[currentStep] ?? -1;

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[650px] w-full max-w-2xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <BrainCircuit className="w-20 h-20 text-indigo-600 mx-auto drop-shadow-[0_0_20px_rgba(79,70,229,0.1)]" />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">N-Back Protocol</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Arbeitsgedächtnis-Test. Goldstandard für fluide Intelligenz. Vergleiche den aktuellen Status mit T-{n}.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-indigo-600 uppercase tracking-widest">Best: {highScore}</div>
            </div>
          </div>
          <button onClick={() => setIsPlaying(true)} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
           <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Cycles Match</span>
               <div className="text-2xl font-black italic text-indigo-600">{score}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Protocol Type</span>
               <div className="text-xl font-black italic">{n}-BACK</div>
             </div>
          </div>
          
          <div className="grid grid-cols-3 gap-6 w-72 h-72 mx-auto p-4 bg-stone-50 border border-stone-200 rounded-[2.5rem] shadow-inner">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="relative aspect-square bg-stone-100 rounded-2xl overflow-hidden border border-stone-200">
                {currentPos === i && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute inset-2 bg-indigo-600 rounded-xl shadow-[0_0_25px_rgba(79,70,229,0.3)]"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-6 max-w-sm mx-auto">
            <button 
              onPointerDown={handleMatch}
              className={`w-full py-8 rounded-[2rem] font-display font-black text-3xl uppercase transition-all shadow-xl ${feedback === 'CORRECT' ? 'bg-emerald-600 text-white' : feedback === 'WRONG' ? 'bg-rose-600 text-white' : 'bg-stone-900 text-white hover:scale-105 active:scale-95'}`}
            >
              MATCH
            </button>
            <div className="h-1 w-full bg-stone-100 rounded-full overflow-hidden">
               <motion.div key={currentStep} initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: 2, ease: 'linear' }} className="h-full bg-indigo-600/50" />
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-indigo-600 uppercase tracking-[0.4em] mb-4">Memory Loop Broken</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{score}</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Score</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">High Score</p>
                <p className="text-2xl font-display font-black text-stone-900">{Math.max(score, highScore)}</p>
              </div>
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Stability</p>
                <p className="text-2xl font-display font-black text-stone-900">{Math.min(100, score * 5)}%</p>
              </div>
          </div>

          <div className="flex gap-4 justify-center max-w-md mx-auto">
             <button onClick={() => { setSequence([]); setCurrentStep(-1); setScore(0); setIsPlaying(true); setGameOver(false); }} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
               <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
             </button>
             <button onClick={onBack} className="flex-1 py-6 bg-indigo-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

/**
 * SCHULTE TABLE
 * Peripheral vision and visual search speed.
 */
const SchulteTable: React.FC<GameProps> = ({ onBack, updateHighScore, highScore }) => {
  const { isRefreshing, shake } = useScreenShake();
  const [numbers, setNumbers] = useState<number[]>([]);
  const [nextExpected, setNextExpected] = useState(1);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [timeResult, setTimeResult] = useState(0);

  const initGame = () => {
    const nums = Array.from({ length: 25 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    setNumbers(nums);
    setNextExpected(1);
    setStartTime(Date.now());
    setIsPlaying(true);
    setGameOver(false);
  };

  const handleNumClick = (num: number) => {
    if (!isPlaying) return;
    if (num === nextExpected) {
      playSound('CLICK');
      if (num === 25) {
        playSound('LEVEL_UP');
        const time = (Date.now() - startTime!) / 1000;
        setTimeResult(time);
        setIsPlaying(false);
        setGameOver(true);
        // Highscore for Schulte is better if time is LOWER. 
        // But our system usually wants HIGHER scores. We'll store a "Score" as (120 - time) * 10
        const scoreValue = Math.max(0, Math.floor((120 - time) * 10));
        updateHighScore(scoreValue);
      } else {
        setNextExpected(prev => prev + 1);
      }
    }
  };

  return (
    <motion.div 
      animate={isRefreshing ? { x: [-10, 10, -10, 10, 0] } : {}}
      className="flex flex-col items-center justify-center min-h-[650px] w-full max-w-3xl mx-auto p-10 bg-white rounded-[3rem] border border-stone-200 relative overflow-hidden shadow-xl transition-all"
    >
      {!isPlaying && !gameOver ? (
        <div className="text-center space-y-8 max-w-md">
          <LayoutGrid className="w-20 h-20 text-rose-600 mx-auto drop-shadow-[0_0_20px_rgba(225,29,72,0.1)]" />
          <div className="space-y-4 text-stone-900">
            <h2 className="text-5xl font-display font-black italic uppercase tracking-tighter">Schulte Matrix</h2>
            <p className="text-stone-500 font-mono text-sm leading-relaxed">Visuelle Scan-Optimierung. Identifiziere die Sequenz 1-25. Nutze peripheres Sehen zur Steigerung der Verarbeitungsgeschwindigkeit.</p>
            <div className="flex items-center justify-center gap-4 pt-4">
               <div className="px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-[10px] font-mono text-rose-600 uppercase tracking-widest">Best: {highScore > 0 ? (120 - highScore / 10).toFixed(1) : '--'}s</div>
            </div>
          </div>
          <button onClick={initGame} className="w-full py-6 bg-stone-900 text-white font-display font-black uppercase text-2xl rounded-2xl hover:scale-105 transition-all shadow-xl">INITIALIZE</button>
        </div>
      ) : isPlaying ? (
        <div className="w-full space-y-12 text-center">
          <button 
            onClick={onBack}
            className="absolute top-8 left-8 p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-400 hover:text-stone-900 hover:bg-stone-100 transition-all z-50 group"
          >
            <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div className="flex justify-between items-center text-stone-900 font-mono p-4">
             <div className="flex flex-col gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Next Target</span>
               <div className="text-4xl font-black italic text-rose-600">{nextExpected}</div>
             </div>
             <div className="flex flex-col items-end gap-1">
               <span className="text-[9px] text-stone-400 uppercase tracking-widest leading-none">Chronometer</span>
               <div className="text-2xl font-black italic">ACTIVE</div>
             </div>
          </div>
          
          <div className="grid grid-cols-5 gap-4 w-full aspect-square max-w-[550px] mx-auto p-6 bg-stone-50 border border-stone-200 rounded-[2.5rem] shadow-sm">
            {numbers.map((num) => (
              <button 
                key={num}
                onClick={() => handleNumClick(num)}
                className={`aspect-square flex items-center justify-center text-2xl md:text-3xl font-display font-black italic rounded-2xl border transition-all ${num < nextExpected ? 'bg-rose-50 text-rose-200 border-rose-100 cursor-default' : 'bg-white text-stone-900 border-stone-200 hover:bg-stone-50 hover:border-rose-300 active:scale-95'}`}
              >
                {num}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-10 animate-in zoom-in-95 duration-500 w-full">
          <div className="space-y-2">
            <h2 className="text-[10px] font-mono text-rose-600 uppercase tracking-[0.4em] mb-4">Scanning Protocol Complete</h2>
            <div className="relative inline-block text-stone-900">
              <div className="text-[12rem] font-display font-black italic leading-none">{timeResult.toFixed(1)}s</div>
              <div className="absolute -top-4 -right-8 px-3 py-1 bg-rose-600 text-white text-[10px] font-black uppercase tracking-tighter rounded-full shadow-lg">Time</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Best Protocol</p>
                <p className="text-2xl font-display font-black text-stone-900">{highScore > 0 ? (120 - highScore / 10).toFixed(1) : '--'}s</p>
              </div>
              <div className="p-6 bg-stone-50 border border-stone-200 rounded-3xl text-left">
                <p className="text-[9px] text-stone-400 uppercase tracking-widest mb-1">Efficiency</p>
                <p className="text-2xl font-display font-black text-stone-900">{(1000 / timeResult).toFixed(1)}%</p>
              </div>
          </div>
          <div className="flex gap-4 justify-center max-w-sm mx-auto">
            <button onClick={initGame} className="p-6 bg-stone-50 border border-stone-200 rounded-3xl hover:bg-stone-100 text-stone-400 transition-all group">
              <RotateCcw size={28} className="group-hover:rotate-[-45deg] transition-transform" />
            </button>
            <button onClick={onBack} className="flex-1 py-6 bg-rose-600 text-white font-display font-black rounded-3xl hover:scale-[1.02] transition-transform text-2xl uppercase italic shadow-xl">DATA MENU</button>
          </div>
        </div>
      )}
    </motion.div>
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
          ? 'bg-orange-500/20 border-orange-500 text-orange-600 shadow-[0_10px_20px_rgba(249,115,22,0.1)]' 
          : 'bg-stone-100 border-stone-200 text-stone-400 hover:bg-stone-200'
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
  const [highScores, setHighScores] = useState({ SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0, NBACK: 0, SCHULTE: 0 });
  const [streak, setStreak] = useState({ count: 0, lastDate: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [ambientPulse, setAmbientPulse] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

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
            setHighScores(data.highScores || { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0, NBACK: 0, SCHULTE: 0 });
            setStreak(data.streak || { count: 0, lastDate: '' });
            
            // Check if profile fields are missing (for existing users)
            if (!data.userName || !data.userPhoto) {
               await setDoc(doc(db, 'users', firebaseUser.uid), {
                 userName: firebaseUser.displayName || 'Anonymous',
                 userPhoto: firebaseUser.photoURL || '',
                 totalScore: (Object.values(data.highScores || {}) as number[]).reduce((a, b) => a + b, 0),
                 updatedAt: serverTimestamp()
               }, { merge: true });
            }
          } else {
            // New user, push local data if exists
            const localScores = getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0, NBACK: 0, SCHULTE: 0 });
            const localStreak = getStorage('focus_streak', { count: 0, lastDate: '' });
            await setDoc(doc(db, 'users', firebaseUser.uid), {
              userName: firebaseUser.displayName || 'Anonymous',
              userPhoto: firebaseUser.photoURL || '',
              highScores: localScores,
              totalScore: Object.values(localScores).reduce((a: number, b: number) => a + b, 0),
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
        setHighScores(getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0, NBACK: 0, SCHULTE: 0 }));
        setStreak(getStorage('focus_streak', { count: 0, lastDate: '' }));
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initialize data (Only if not logged in or during initial mount)
  useEffect(() => {
    if (!user && !authLoading) {
      setHighScores(getStorage('focus_highscores', { SPEED: 0, STROOP: 0, MEMORY: 0, SEARCH: 0, RHYTHM: 0, TAP: 0, BREATH: 0, MATH: 0, NBACK: 0, SCHULTE: 0 }));
      
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
    const totalScore = (Object.values(newScores) as number[]).reduce((a, b) => a + b, 0);
    
    setHighScores(newScores);
    setStorage('focus_highscores', newScores);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          highScores: newScores,
          totalScore: totalScore,
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
          NBACK: 'totalNBackPoints',
          SCHULTE: 'totalSchultePoints',
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
    <div className="min-h-screen bg-[#FBFBF9] text-stone-900 flex flex-col font-sans selection:bg-yellow-200 selection:text-black relative overflow-hidden">
      
      {/* Ambient Visual Focus Helper */}
      {ambientPulse && activeGame === 'NONE' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <motion.div 
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.05, 0.1, 0.05]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500 rounded-full blur-[120px]"
          />
        </div>
      )}

      {/* Header */}
      <header className="p-6 md:px-12 md:py-8 flex justify-between items-center z-20 sticky top-0 bg-[#FBFBF9]/70 backdrop-blur-md border-b border-stone-200 shrink-0">
        <div className="flex items-center gap-6">
          <motion.div 
            whileHover={{ rotate: 15, scale: 1.1 }}
            className="w-10 h-10 bg-stone-900 rounded-lg flex items-center justify-center text-white shadow-lg"
          >
            <Zap size={24} fill="currentColor" />
          </motion.div>
          <div>
            <h1 className="text-xl font-display font-black tracking-tighter uppercase italic line-height-1 text-stone-900">FocusFlow</h1>
            <div className="flex items-center gap-2 text-[9px] text-emerald-600 font-mono tracking-[0.2em] uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              Cognitive Stack 2.5
            </div>
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="hidden lg:flex items-center gap-4 bg-stone-100 border border-stone-200 px-6 py-2 rounded-full font-mono text-[10px] uppercase tracking-widest text-stone-600">
            <div className="flex items-center gap-2 border-r border-stone-200 pr-4">
              <Flame size={14} className="text-orange-500" fill="currentColor" />
              <span className="font-black italic text-stone-900">{streak.count} DAYS</span>
            </div>
            <div className="flex items-center gap-2 pl-2">
               <Trophy size={14} className="text-yellow-600" />
               <span className="text-stone-400">RANK: ALPHA</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {user ? (
               <div className="flex items-center gap-3 bg-stone-100 border border-stone-200 p-1 rounded-full pl-3 pr-4 group">
                  <div className="w-8 h-8 rounded-full overflow-hidden border border-stone-200 group-hover:border-emerald-500 transition-colors">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt="Avatar" referrerPolicy="no-referrer" />
                    ) : (
                      <UserIcon size={20} className="m-1.5 text-stone-400" />
                    )}
                  </div>
                  <button 
                    onClick={() => setIsEditingProfile(true)}
                    className="text-[10px] font-display font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-500 transition-colors"
                  >
                    Profil
                  </button>
                  <button onClick={handleLogout} className="text-[10px] font-display font-black uppercase tracking-widest text-stone-500 hover:text-stone-900 transition-colors">Exit</button>
               </div>
            ) : (
               <button 
                onClick={handleLogin}
                className="flex items-center gap-2 bg-stone-900 text-white px-5 py-2.5 rounded-full font-display font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg"
               >
                 <LogIn size={14} /> System Login
               </button>
            )}
          </div>
          
          {activeGame === 'NONE' && (
            <div className="flex items-center gap-3 border-l border-stone-200 ml-4 pl-8">
              <NoiseGenerator />
              <button 
                onClick={() => setShowSettings(!showSettings)}
                className="p-2.5 bg-stone-100 rounded-xl border border-stone-200 hover:bg-stone-200 hover:border-stone-300 transition-all text-stone-400 hover:text-stone-900"
              >
                <Settings size={20} />
              </button>
            </div>
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
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-stone-900/40 backdrop-blur-xl"
          >
            <div className="bg-white border border-stone-200 p-10 rounded-[2.5rem] w-full max-w-md space-y-8 shadow-2xl">
              <h2 className="text-3xl font-black italic uppercase text-stone-900">Einstellungen</h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                     <p className="font-bold text-stone-900">Ambient Fokus-Puls</p>
                     <p className="text-xs text-stone-500">Subtile Hintergrund-Animation zur Beruhigung</p>
                  </div>
                  <button 
                    onClick={() => setAmbientPulse(!ambientPulse)}
                    className={`w-14 h-8 rounded-full relative transition-colors ${ambientPulse ? 'bg-emerald-500' : 'bg-stone-200'}`}
                  >
                    <motion.div 
                      animate={{ x: ambientPulse ? 24 : 4 }}
                      className="absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg" 
                    />
                  </button>
                </div>

                <div className="p-4 bg-stone-50 border border-stone-100 rounded-2xl space-y-2">
                   <p className="text-xs uppercase tracking-widest text-stone-400 font-bold">Deine Stats</p>
                   <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono">
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <p className="text-yellow-600">Speed</p>
                        <p className="text-lg font-bold text-stone-900">{highScores.SPEED}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <p className="text-blue-600">Stroop</p>
                        <p className="text-lg font-bold text-stone-900">{highScores.STROOP}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <p className="text-emerald-600">Memory</p>
                        <p className="text-lg font-bold text-stone-900">{highScores.MEMORY}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <p className="text-purple-600">Search</p>
                        <p className="text-lg font-bold text-stone-900">{highScores.SEARCH}</p>
                      </div>
                      <div className="bg-white p-2 rounded-lg border border-stone-200">
                        <p className="text-orange-600">Rhythm</p>
                        <p className="text-lg font-bold text-stone-900">{highScores.RHYTHM}</p>
                      </div>
                   </div>
                </div>
              </div>

              <button 
                onClick={() => setShowSettings(false)}
                className="w-full py-4 bg-stone-900 text-white font-black uppercase rounded-2xl tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl"
              >
                Fertig
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 flex flex-col items-center justify-center p-6 pb-20 z-10 relative">
        <NeuralBackground />
        <AnimatePresence mode="wait">
          {!user ? (
            <motion.div key="landing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LandingPage onGoogleLogin={handleLogin} />
            </motion.div>
          ) : isEditingProfile ? (
            <motion.div key="profile" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex items-center justify-center min-h-[90vh]">
              <ProfileEditor user={user} onClose={() => setIsEditingProfile(false)} />
            </motion.div>
          ) : activeGame === 'NONE' ? (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9, filter: 'blur(10px)' }}
              className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-3 gap-8"
            >
              <div className="md:col-span-3 space-y-4 mb-12">
                <div className="flex items-center gap-3 px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit mb-4 text-emerald-600">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-[10px] font-mono tracking-[0.2em] uppercase">Biometric Synch Verified</span>
                </div>
                <h2 className="text-7xl md:text-[10vw] font-display font-black tracking-tighter uppercase italic leading-[0.8] text-stone-900">
                  Deep <span className="text-emerald-500">Focus.</span>
                </h2>
                <div className="flex flex-col md:flex-row md:items-end gap-6 pt-4 text-stone-600">
                  <p className="text-stone-500 text-lg md:text-2xl font-mono max-w-xl leading-snug">
                    Protokoll wird ausgeführt. Wähle ein kognitives Modul zur Stimulation.
                  </p>
                  <div className="h-[2px] flex-1 bg-stone-200 hidden md:block mb-4" />
                </div>
              </div>

              <div className="md:col-span-1 space-y-6">
                <div className="p-8 bg-emerald-600 text-white rounded-[2.5rem] flex flex-col gap-2 shadow-xl">
                  <div className="text-[10px] font-mono font-black uppercase tracking-widest opacity-60">Neural XP Level</div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-display font-black italic">LVL {Math.floor((Object.values(highScores) as number[]).reduce((a, b) => a + b, 0) / 1000) + 1}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/20 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-white" style={{ width: `${((Object.values(highScores) as number[]).reduce((a, b) => a + b, 0) % 1000) / 10}%` }} />
                  </div>
                </div>
                <CommunityGoals />
                <GlobalLeaderboard />
                <CommunityChat user={user} />
                <div className="p-6 bg-emerald-50 border border-emerald-100 rounded-3xl">
                   <div className="flex items-center gap-3 mb-2 text-emerald-600">
                     <Flame size={18} fill="currentColor" />
                     <h3 className="text-sm font-black italic uppercase tracking-widest leading-none">Dein Streak</h3>
                   </div>
                   <div className="text-4xl font-black italic text-stone-900">{streak.count} TAGE</div>
                   <p className="text-xs text-emerald-600/60 font-mono mt-1">Bleib am Ball.</p>
                </div>
                <div className="p-6 bg-orange-50 border border-orange-100 rounded-3xl">
                   <div className="flex items-center gap-3 mb-2 text-orange-600">
                     <Volume2 size={18} />
                     <h3 className="text-sm font-black italic uppercase tracking-widest leading-none">Audio-Aid</h3>
                   </div>
                   <NoiseGenerator />
                </div>
              </div>

              <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Speedy */}
                <button 
                  onClick={() => setActiveGame('SPEED')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-yellow-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-yellow-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 group-hover:rotate-12 transition-all duration-1000">
                    <Zap size={140} fill="currentColor" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-yellow-600 text-white px-2 py-0.5 rounded font-black uppercase">Stim</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.2</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Speed<br/>React</h3>
                    <div className="h-0.5 w-12 bg-yellow-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Reflex-Optimierung & Hand-Auge-Synch.</p>
                  </div>
                </button>

                {/* Stroop */}
                <button 
                  onClick={() => setActiveGame('STROOP')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-blue-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-blue-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 group-hover:-rotate-12 transition-all duration-1000">
                    <Palette size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase">Cog</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v2.0</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Color<br/>Focus</h3>
                    <div className="h-0.5 w-12 bg-blue-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Inhibitorische Kontrolle & Fokus-Switch.</p>
                  </div>
                </button>

                {/* Memory */}
                <button 
                  onClick={() => setActiveGame('MEMORY')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-emerald-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-emerald-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <Brain size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded font-black uppercase">Mem</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.5</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Memo<br/>Sequence</h3>
                    <div className="h-0.5 w-12 bg-emerald-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Arbeitsgedächtnis & Mustererkennung.</p>
                  </div>
                </button>

                {/* Search */}
                <button 
                  onClick={() => setActiveGame('SEARCH')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-purple-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-purple-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 group-hover:rotate-6 transition-all duration-1000">
                    <Search size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-purple-600 text-white px-2 py-0.5 rounded font-black uppercase">Search</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.0</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Search<br/>Focus</h3>
                    <div className="h-0.5 w-12 bg-purple-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Detail-Aufmerksamkeit & Scan-Speed.</p>
                  </div>
                </button>

                {/* Rhythm */}
                <button 
                  onClick={() => setActiveGame('RHYTHM')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-orange-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-orange-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <Target size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-orange-600 text-white px-2 py-0.5 rounded font-black uppercase">Sync</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.1</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Rhythm<br/>Sync</h3>
                    <div className="h-0.5 w-12 bg-orange-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Timing-Präzision & Flow-Detection.</p>
                  </div>
                </button>

                {/* Turbo Tap */}
                <button 
                  onClick={() => setActiveGame('TAP')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-yellow-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-yellow-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-yellow-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <Zap size={140} fill="currentColor" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-yellow-600 text-white px-2 py-0.5 rounded font-black uppercase">Dopamine</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.0</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Turbo<br/>Tap</h3>
                    <div className="h-0.5 w-12 bg-yellow-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Neurotransmitter-Boost & Rapid Motor Response.</p>
                  </div>
                </button>

                {/* Focus Breath */}
                <button 
                  onClick={() => setActiveGame('BREATH')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-emerald-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-emerald-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <Brain size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-emerald-600 text-white px-2 py-0.5 rounded font-black uppercase">Persistence</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.0</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Focus<br/>Hold</h3>
                    <div className="h-0.5 w-12 bg-emerald-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Inhibitorische Ausdauer & Zeitwahrnehmung.</p>
                  </div>
                </button>
                
                {/* Math */}
                <button 
                  onClick={() => setActiveGame('MATH')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-blue-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-blue-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <Timer size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-blue-600 text-white px-2 py-0.5 rounded font-black uppercase">Logic</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.0</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Turbo<br/>Math</h3>
                    <div className="h-0.5 w-12 bg-blue-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Kognitive Last & Arithmetische Fluidität.</p>
                  </div>
                </button>

                {/* N-Back */}
                <button 
                  onClick={() => setActiveGame('NBACK')}
                  className="group relative h-[320px] bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-indigo-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-indigo-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <BrainCircuit size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-indigo-600 text-white px-2 py-0.5 rounded font-black uppercase">Mastery</span>
                       <span className="text-[10px] font-mono text-indigo-400/60 uppercase tracking-widest">Hardcore</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">N-Back<br/>Master</h3>
                    <div className="h-0.5 w-12 bg-indigo-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Intelligenz-Boost & Arbeitsgedächtnis-Max.</p>
                  </div>
                </button>

                {/* Schulte */}
                <button 
                  onClick={() => setActiveGame('SCHULTE')}
                  className="group relative h-[320px] md:col-span-2 bg-white border border-stone-200 rounded-[3rem] p-10 flex flex-col justify-end overflow-hidden hover:border-rose-600/30 hover:bg-stone-50 transition-all duration-500 text-left shadow-xl"
                >
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="absolute top-0 right-0 p-10 text-rose-600 opacity-5 group-hover:opacity-10 group-hover:scale-125 transition-all duration-1000">
                    <LayoutGrid size={140} />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] font-mono bg-rose-600 text-white px-2 py-0.5 rounded font-black uppercase">Search</span>
                       <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">v1.1</span>
                    </div>
                    <h3 className="text-4xl font-display font-black italic uppercase leading-none text-stone-900">Schulte<br/>Grid Protocol</h3>
                    <div className="h-0.5 w-12 bg-rose-600/30 group-hover:w-full transition-all duration-700" />
                    <p className="text-stone-500 text-xs font-mono italic">Peripheres Sehen & Visuelle Suchstrategien.</p>
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
              {activeGame === 'NBACK' && (
                <NBackGame 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.NBACK}
                  updateHighScore={(s) => updateHighScore('NBACK', s)}
                />
              )}
              {activeGame === 'SCHULTE' && (
                <SchulteTable 
                  onBack={() => setActiveGame('NONE')} 
                  highScore={highScores.SCHULTE}
                  updateHighScore={(s) => updateHighScore('SCHULTE', s)}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-10 border-t border-stone-200 text-center text-xs text-stone-400 font-mono uppercase tracking-[0.4em] bg-stone-50 backdrop-blur-md z-10">
        <div className="flex flex-col md:flex-row justify-between items-center max-w-6xl mx-auto gap-4">
           <div>FocusFlow Protocol v2.5.0</div>
           <div className="flex gap-8">
              <span className="hover:text-emerald-600 transition-colors cursor-help">Deep Focus Active</span>
              <span className="hover:text-yellow-600 transition-colors cursor-help">Dopamine Balanced</span>
           </div>
        </div>
      </footer>
    </div>
  );
}

