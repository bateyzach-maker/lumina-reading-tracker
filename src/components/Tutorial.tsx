import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  TrendingUp, 
  Sparkles, 
  Zap, 
  Layers, 
  RefreshCw, 
  HelpCircle,
  X,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface TutorialProps {
  onClose: () => void;
  isModal?: boolean;
}

const steps = [
  {
    title: "Welcome to The Archive",
    description: "A minimalist space designed for tracking your literary journey. Let's walk through how to cultivate your personal collection.",
    icon: <BookOpen className="w-8 h-8 text-white" />,
    color: "from-neutral-900 to-neutral-800"
  },
  {
    title: "Populating Your Shelves",
    description: "Archiving your books is effortless. Add them manually, scan ISBNs for instant data, or bulk import your existing library via CSV.",
    icon: <Layers className="w-6 h-6 text-yellow-500" />,
    color: "from-yellow-900/20 to-neutral-900"
  },
  {
    title: "Visual Resonance",
    description: "Our system automatically fetches high-quality cover art. Use 'Synchronize Gallery' to find missing covers or manually trigger a search for specific entries.",
    icon: <RefreshCw className="w-6 h-6 text-blue-500" />,
    color: "from-blue-900/20 to-neutral-900"
  },
  {
    title: "Deep Insights",
    description: "Visit the 'Insights' tab to visualize your reading habits. Track your depth through page counts, genre distributions, and library state analytics.",
    icon: <TrendingUp className="w-6 h-6 text-green-500" />,
    color: "from-green-900/20 to-neutral-900"
  },
  {
    title: "Intelligent Discovery",
    description: "The 'Resonance' feature uses AI to recommend your next masterwork based on your unique collection and preferences.",
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
    color: "from-purple-900/20 to-neutral-900"
  },
  {
    title: "Fluid Management",
    description: "Select multiple books to update their status or resonance concurrently. Filter by genre, author, or reading state to find exactly what you seek.",
    icon: <Zap className="w-6 h-6 text-orange-500" />,
    color: "from-orange-900/20 to-neutral-900"
  }
];

export default function Tutorial({ onClose, isModal = true }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const next = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(s => s + 1);
    } else {
      onClose();
    }
  };

  const prev = () => {
    if (currentStep > 0) {
      setCurrentStep(s => s - 1);
    }
  };

  const Content = (
    <div className={`relative overflow-hidden ${isModal ? 'max-w-xl w-full mac-card bg-[#0A0A0A] border-neutral-800 shadow-2xl' : 'w-full h-full'}`}>
      {/* Background Glow */}
      <div className={`absolute inset-0 bg-gradient-to-br ${steps[currentStep].color} opacity-40 transition-all duration-1000`} />
      
      <div className="relative p-12 flex flex-col items-center text-center">
        {isModal && (
          <button 
            onClick={onClose}
            className="absolute top-6 right-6 p-2 text-neutral-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="mb-10 p-5 bg-white/5 rounded-3xl border border-white/5 shadow-inner">
          {steps[currentStep].icon}
        </div>

        <h2 className="serif-italic text-4xl text-white mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {steps[currentStep].title}
        </h2>
        
        <p className="text-neutral-400 text-sm leading-relaxed mb-12 max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
          {steps[currentStep].description}
        </p>

        <div className="flex items-center justify-between w-full mt-auto">
          <button
            onClick={prev}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${
              currentStep === 0 ? 'text-neutral-800 cursor-not-allowed' : 'text-neutral-500 hover:text-white'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex gap-1.5">
            {steps.map((_, i) => (
              <div 
                key={i}
                className={`h-1 rounded-full transition-all duration-500 ${
                  i === currentStep ? 'w-6 bg-white' : 'w-1 bg-neutral-800'
                }`}
              />
            ))}
          </div>

          <button
            onClick={next}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white hover:text-neutral-300 transition-colors"
          >
            {currentStep === steps.length - 1 ? 'Finish Archive Setup' : 'Next Insight'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  if (!isModal) return Content;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
      >
        {Content}
      </motion.div>
    </div>
  );
}
