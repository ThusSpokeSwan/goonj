'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, CheckCircle2, ChevronRight, ChevronLeft, RotateCcw, ShieldCheck, Loader2, Sparkles, Building, Landmark, Settings } from 'lucide-react';

interface EligibilityResult {
  schemeId: string;
  title: string;
  ministry: string;
  whyEligible: string;
  benefits: string;
  stepsToApply: string[];
}

interface UserProfile {
  state: string;
  age: number;
  gender: string;
  casteCategory: string;
  annualIncome: number;
  occupation: string;
  disabilityStatus: string;
  disabilityPercentage: number;
}

const QUESTIONS = [
  {
    id: 1,
    question: "What state do you live in?",
    voicePrompt: "What state do you live in? For example, Maharashtra, Uttar Pradesh, or Central.",
    placeholder: "Speak or type your state name...",
  },
  {
    id: 2,
    question: "How old are you?",
    voicePrompt: "How old are you? Please speak your age in years.",
    placeholder: "Speak or type your age (e.g. 45)...",
  },
  {
    id: 3,
    question: "What is your gender?",
    voicePrompt: "What is your gender? Male, Female, or other.",
    placeholder: "Speak or type your gender...",
  },
  {
    id: 4,
    question: "What is your caste category?",
    voicePrompt: "What is your caste category? General, OBC, SC, or ST.",
    placeholder: "Speak or type General, OBC, SC, or ST...",
  },
  {
    id: 5,
    question: "What is your family's annual income?",
    voicePrompt: "What is your family's total annual household income in rupees?",
    placeholder: "Speak or type your annual income (e.g. 1,50,000)...",
  },
  {
    id: 6,
    question: "What is your occupation?",
    voicePrompt: "What is your occupation or job? For example: farmer, student, unemployed, or merchant.",
    placeholder: "Speak or type your occupation...",
  },
  {
    id: 7,
    question: "Do you have any disability?",
    voicePrompt: "Do you have any physical disability? Say No, or say Yes with the percentage if you know it.",
    placeholder: "Speak or type 'No' or 'Yes, 40%'...",
  },
  {
    id: 8,
    question: "What specific assistance or scheme are you looking for?",
    voicePrompt: "What help do you need? For example: farming seeds, a house, business capital, or school scholarship.",
    placeholder: "Tell us what you are looking for...",
  }
];

export default function CheckerPage() {
  const [appState, setAppState] = useState<'intro' | 'interview' | 'loading' | 'results'>('intro');
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<string[]>(Array(8).fill(''));
  const [isRecording, setIsRecording] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speakingSchemeId, setSpeakingSchemeId] = useState<string | null>(null);

  // Results from backend
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [detectedLanguage, setDetectedLanguage] = useState('en');
  const [matchedSchemes, setMatchedSchemes] = useState<EligibilityResult[]>([]);
  const [message, setMessage] = useState('');

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        setSpeechSupported(true);
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = 'en-IN'; // defaults to English-India, LLM will handle translation auto-detection
        
        rec.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          updateAnswer(currentStep, transcript);
          setIsRecording(false);
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = rec;
      }
      synthesisRef.current = window.speechSynthesis;
    }
  }, [currentStep]);

  // Handle Question audio guidance when step shifts
  useEffect(() => {
    if (appState === 'interview' && autoSpeak) {
      speakText(QUESTIONS[currentStep].voicePrompt);
    }
  }, [currentStep, appState, autoSpeak]);

  const speakText = (text: string, lang = 'en-IN') => {
    if (!synthesisRef.current) return;
    synthesisRef.current.cancel(); // Cancel current readouts
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Choose appropriate voice language if regional
    if (lang.startsWith('hi')) utterance.lang = 'hi-IN';
    else if (lang.startsWith('mr')) utterance.lang = 'mr-IN';
    else if (lang.startsWith('te')) utterance.lang = 'te-IN';
    else utterance.lang = lang;

    utterance.onend = () => {
      setSpeakingSchemeId(null);
    };
    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setSpeakingSchemeId(null);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      stopSpeaking();
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const updateAnswer = (index: number, text: string) => {
    const updated = [...answers];
    updated[index] = text;
    setAnswers(updated);
  };

  const handleNext = () => {
    stopSpeaking();
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmit();
    }
  };

  const handleBack = () => {
    stopSpeaking();
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const startInterview = () => {
    setAppState('interview');
    setCurrentStep(0);
    setAnswers(Array(8).fill(''));
  };

  const handleSubmit = async () => {
    stopSpeaking();
    setAppState('loading');
    
    try {
      const res = await fetch('/api/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setProfile(data.profile);
        setDetectedLanguage(data.detectedLanguage);
        setMatchedSchemes(data.schemes || []);
        setMessage(data.message || '');
        setAppState('results');
        
        // Welcome text readout
        if (data.schemes?.length > 0) {
          const countText = data.schemes.length === 1 ? 'one scheme' : `${data.schemes.length} schemes`;
          speakText(`Assessment complete. We found ${countText} that you qualify for.`, data.detectedLanguage);
        } else {
          speakText(`Assessment complete. Unfortunately, we did not find matching schemes for your demographics.`, data.detectedLanguage);
        }
      } else {
        alert(data.error || 'Failed to match eligibility. Please try again.');
        setAppState('interview');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred. Check backend console.');
      setAppState('interview');
    }
  };

  const handlePlayScheme = (scheme: EligibilityResult) => {
    if (speakingSchemeId === scheme.schemeId) {
      stopSpeaking();
    } else {
      setSpeakingSchemeId(scheme.schemeId);
      const textToRead = `${scheme.title}. Ministry: ${scheme.ministry}. Why you qualify: ${scheme.whyEligible}. Benefit: ${scheme.benefits}. Steps to apply: ${scheme.stepsToApply.join('. ')}`;
      speakText(textToRead, detectedLanguage);
    }
  };

  return (
    <div className="flex-1 flex flex-col max-w-4xl mx-auto w-full px-4 py-8 md:py-16 justify-center">
      {/* Header bar */}
      <div className="flex justify-between items-center mb-10">
        <div className="flex items-center gap-2">
          <Sparkles className="text-purple-400" size={24} />
          <span className="font-extrabold text-xl tracking-tight text-white">Goonj</span>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title={autoSpeak ? "Disable voice prompt auto-play" : "Enable voice prompt auto-play"}
          >
            {autoSpeak ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
          <a
            href="/admin"
            className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
            title="Admin Dashboard"
          >
            <Settings size={16} />
          </a>
        </div>
      </div>

      {/* Screen 1: Introduction */}
      {appState === 'intro' && (
        <div className="text-center py-12 md:py-20 glass-panel rounded-3xl p-8 border border-zinc-800">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/50 border border-purple-800/50 text-purple-300 mb-6">
            <Sparkles size={12} /> AI Entitlement Agent
          </span>
          
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-6 leading-tight max-w-xl mx-auto">
            Discover Government Schemes You Qualify For
          </h1>
          
          <p className="text-zinc-400 text-md md:text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Answer 8 simple voice questions in any language. Our RAG engine scans hundreds of state and central directives to build your custom timeline.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={startInterview}
              className="px-8 py-3.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg shadow-purple-900/30 transition-all transform hover:-translate-y-0.5 text-md"
            >
              Start Spoken Assessment
            </button>
            <a
              href="/admin"
              className="px-8 py-3.5 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 font-semibold rounded-xl transition-all text-md"
            >
              Admin Feed Panel
            </a>
          </div>

          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16 pt-8 border-t border-zinc-800 text-zinc-400 text-xs">
            <div>
              <div className="font-extrabold text-white text-lg mb-1">8 Questions</div>
              <div>Short Interview</div>
            </div>
            <div>
              <div className="font-extrabold text-white text-lg mb-1">100+ Dialects</div>
              <div>Multilingual Search</div>
            </div>
            <div>
              <div className="font-extrabold text-white text-lg mb-1">1-Click Read</div>
              <div>Voice Playback</div>
            </div>
          </div>
        </div>
      )}

      {/* Screen 2: The Interview Flow */}
      {appState === 'interview' && (
        <div className="glass-panel rounded-3xl p-6 md:p-10 border border-zinc-800 flex flex-col min-h-[420px] justify-between">
          {/* Progress Indicators */}
          <div className="mb-6">
            <div className="flex justify-between items-center text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              <span>Question {currentStep + 1} of 8</span>
              <span className="text-purple-400">{Math.round(((currentStep + 1) / 8) * 100)}% Complete</span>
            </div>
            {/* Custom bar */}
            <div className="w-full bg-zinc-950 h-2 rounded-full overflow-hidden flex gap-0.5 p-0.5 border border-zinc-800">
              {Array(8).fill(0).map((_, idx) => (
                <div
                  key={idx}
                  className={`h-full flex-1 rounded-full transition-all duration-300 ${
                    idx <= currentStep ? 'bg-purple-500 shadow-md shadow-purple-500/30' : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Question Core */}
          <div className="flex-1 flex flex-col justify-center text-center max-w-xl mx-auto w-full my-6">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 leading-snug">
              {QUESTIONS[currentStep].question}
            </h2>
            <p className="text-zinc-500 text-xs mb-8 italic">
              Speak clearly into your microphone in your preferred language
            </p>

            {/* Answer Display Area */}
            <div className="relative mb-6">
              <textarea
                value={answers[currentStep]}
                onChange={e => updateAnswer(currentStep, e.target.value)}
                placeholder={QUESTIONS[currentStep].placeholder}
                rows={3}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-4 pr-10 text-white font-medium placeholder-zinc-600 focus:outline-none focus:border-purple-500 text-sm md:text-md leading-relaxed resize-none"
              />
              <button
                onClick={() => speakText(QUESTIONS[currentStep].voicePrompt)}
                className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400"
                title="Hear question again"
              >
                <Volume2 size={16} />
              </button>
            </div>

            {/* Pulsing Mic Visualizer */}
            <div className="flex justify-center items-center gap-4 mb-4">
              <button
                onClick={toggleRecording}
                disabled={!speechSupported}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                  isRecording 
                    ? 'bg-teal-500 text-white animate-voice-pulse shadow-lg shadow-teal-500/20' 
                    : 'bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
              >
                {isRecording ? <MicOff size={24} /> : <Mic size={24} />}
              </button>
            </div>
            {!speechSupported && (
              <span className="text-[10px] text-red-400">Speech recognition not supported in this browser. Please type.</span>
            )}
            {isRecording && (
              <span className="text-xs text-teal-400 font-semibold animate-pulse tracking-wide">Listening... Speak now</span>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex justify-between items-center border-t border-zinc-850 pt-6 mt-6">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900/50 rounded-lg transition-all disabled:opacity-30 disabled:hover:text-zinc-400"
            >
              <ChevronLeft size={16} /> Back
            </button>

            <button
              onClick={handleNext}
              disabled={!answers[currentStep].trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all shadow-md shadow-purple-900/10 disabled:opacity-40"
            >
              {currentStep === 7 ? 'Check Entitlements' : 'Next'} <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Screen 3: Loader */}
      {appState === 'loading' && (
        <div className="text-center py-20 glass-panel rounded-3xl p-8 border border-zinc-800 max-w-xl mx-auto w-full">
          <Loader2 className="animate-spin text-purple-400 mx-auto mb-6" size={48} />
          <h2 className="text-2xl font-bold text-white mb-2">Analyzing Demographics</h2>
          <p className="text-zinc-400 text-sm max-w-xs mx-auto leading-relaxed">
            Parsing answers, filtering state criteria, and fetching official scheme chunks...
          </p>
        </div>
      )}

      {/* Screen 4: Results Dashboard */}
      {appState === 'results' && (
        <div className="space-y-8">
          {/* User profile recap */}
          {profile && (
            <div className="glass-panel rounded-2xl p-5 border border-zinc-800 flex flex-wrap gap-4 text-xs text-zinc-400 items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex px-2 py-0.5 bg-purple-950/40 text-purple-300 font-bold rounded border border-purple-800/30">
                  Target Profile
                </span>
                <span className="font-semibold text-white">{profile.state}</span>
                <span className="text-zinc-600">|</span>
                <span className="font-semibold text-white">{profile.age} Years</span>
                <span className="text-zinc-600">|</span>
                <span className="font-semibold text-white">{profile.gender}</span>
                <span className="text-zinc-600">|</span>
                <span className="font-semibold text-white">{profile.occupation}</span>
              </div>
              <div className="text-zinc-500">
                Income: <span className="font-bold text-white">₹{profile.annualIncome.toLocaleString()}</span> | Lang: <span className="uppercase text-white font-bold">{detectedLanguage}</span>
              </div>
            </div>
          )}

          {/* Scheme display core */}
          {matchedSchemes.length === 0 ? (
            <div className="text-center py-20 glass-panel rounded-3xl p-8 border border-zinc-800">
              <Landmark size={48} className="text-zinc-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-zinc-400 mb-2">No Matching Entitlements</h2>
              <p className="text-zinc-500 text-sm max-w-xs mx-auto mb-8 leading-relaxed">
                {message || "We analyzed the catalog but could not find schemes matching your profile filters."}
              </p>
              <button
                onClick={startInterview}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-sm transition-all"
              >
                <RotateCcw size={14} /> Retry Spoken Check
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <ShieldCheck size={20} className="text-teal-400" />
                  Your Qualified Entitlements ({matchedSchemes.length})
                </h2>
                <button
                  onClick={startInterview}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors"
                >
                  <RotateCcw size={12} /> Restart
                </button>
              </div>

              {matchedSchemes.map((scheme, idx) => (
                <div key={scheme.schemeId || idx} className="glass-panel rounded-2xl p-6 border border-zinc-800 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-purple-500" />
                  
                  {/* Top line metadata */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-purple-300 bg-purple-950/40 border border-purple-800/20 px-2 py-0.5 rounded mb-2">
                        <Building size={10} /> {scheme.ministry || 'Government Department'}
                      </span>
                      <h3 className="text-xl font-bold text-white leading-snug">
                        {scheme.title}
                      </h3>
                    </div>

                    <button
                      onClick={() => handlePlayScheme(scheme)}
                      className={`p-2.5 rounded-xl border transition-all ${
                        speakingSchemeId === scheme.schemeId
                          ? 'bg-teal-500 border-teal-400 text-white animate-pulse'
                          : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800'
                      }`}
                      title={speakingSchemeId === scheme.schemeId ? "Stop readout" : "Listen to details aloud"}
                    >
                      <Volume2 size={18} />
                    </button>
                  </div>

                  {/* Why eligible card */}
                  <div className="bg-zinc-950/50 border border-zinc-900 rounded-xl p-4 mb-6 text-xs text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white text-[10px] uppercase block tracking-wider mb-1">
                      Why You Qualify
                    </span>
                    {scheme.whyEligible}
                  </div>

                  {/* Benefit highlights */}
                  <div className="bg-zinc-950/30 border border-zinc-900 rounded-xl p-4 mb-6 text-xs text-zinc-300 leading-relaxed">
                    <span className="font-extrabold text-white text-[10px] uppercase block tracking-wider mb-1">
                      Benefit Details
                    </span>
                    {scheme.benefits}
                  </div>

                  {/* Step by step checklist timeline */}
                  <div>
                    <span className="font-extrabold text-white text-xs uppercase block tracking-wider mb-3">
                      Application Steps Checklist
                    </span>
                    
                    <div className="space-y-2.5">
                      {scheme.stepsToApply.map((step, sIdx) => (
                        <div key={sIdx} className="flex items-start gap-3 bg-zinc-950/20 border border-zinc-900/60 p-3 rounded-lg hover:border-zinc-800/80 transition-colors">
                          <input
                            type="checkbox"
                            className="mt-0.5 w-4 h-4 rounded border-zinc-800 text-purple-600 focus:ring-0 focus:ring-offset-0 bg-zinc-900 cursor-pointer"
                          />
                          <span className="text-xs text-zinc-300 font-medium leading-relaxed">
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
