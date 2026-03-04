import React, { useState, useEffect, useCallback } from 'react';
import { geminiProxy, uploadFile } from '../lib/apiClient';
import { GeneratedVoice } from '../types';
import { useGeneratedContent } from '../hooks/useGeneratedContent';
import toast from 'react-hot-toast';

// Helper to wrap raw PCM data in a valid standard WAV RIFF header
function addWavHeader(pcmData: Uint8Array, sampleRate = 24000, numChannels = 1): Uint8Array {
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = pcmData.length;
  
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true); // File size - 8
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bytesPerSample * 8, true); // BitsPerSample
  writeString(36, 'data');
  view.setUint32(40, dataSize, true); // Subchunk2Size
  
  // Write PCM audio data
  const out = new Uint8Array(buffer);
  out.set(pcmData, 44);
  
  return out;
}

export const VoiceStudio: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [aiModel, setAiModel] = useState<'gemini-2.5-flash-preview-tts' | 'gemini-2.5-pro-preview-tts'>('gemini-2.5-flash-preview-tts');
  const [voice1, setVoice1] = useState('Puck');
  const [voice2, setVoice2] = useState('Charon');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedVoice[]>([]);
  
  const voiceOptions = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Aoede', 'Aoede'];

  const { saveVoice, loadHistory, deleteContent, loading } = useGeneratedContent();

  const loadVoices = async () => {
    const result = await loadHistory('voice', 50);
    if (result.success && result.data) {
      setHistory(result.data as GeneratedVoice[]);
    }
  };

  useEffect(() => {
    loadVoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error('Bitte gib einen Text ein.');
      return;
    }

    setIsGenerating(true);
    setCurrentAudio(null);
    let finalAudioUrl = '';

    try {
      // Do NOT wrap the prompt with instructions like "You are a TTS engine, don't generate text", 
      // because that ironically causes the model to try and reply with text ("Okay, I will read it")!
      // Just send the raw prompt directly.
      const parts = [{ text: prompt }];

      const response = await geminiProxy({
        action: 'generateContent',
        model: aiModel,
        contents: [{ role: 'user', parts: parts }],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: voice1
              }
            }
          }
        }
      }) as any;

      if (response?.error) {
        throw new Error(response.error.message || JSON.stringify(response.error));
      }

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error("Die KI hat keine Audio-Daten geliefert.");
      }

      const candidate = response.candidates[0];
      const respParts = candidate.content?.parts;
      let foundAudio = false;

      if (respParts) {
        for (const part of respParts) {
          if (part.inlineData) {
            let mimeType = part.inlineData.mimeType || 'audio/wav';
            const base64Data = part.inlineData.data;

            // Convert base64 to Uint8Array
            const binaryString = atob(base64Data);
            const pcmData = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              pcmData[i] = binaryString.charCodeAt(i);
            }

            // Check if the file already starts with 'RIFF'
            const isRiff = pcmData.length > 4 && 
                           pcmData[0] === 82 && // R
                           pcmData[1] === 73 && // I
                           pcmData[2] === 70 && // F
                           pcmData[3] === 70;   // F

            // Gemini TTS returns raw PCM (audio/pcm). Browser needs a WAV header.
            let audioBuffer: BlobPart = pcmData as any;
            if (!isRiff) {
               audioBuffer = addWavHeader(pcmData, 24000) as any; // Gemini 2.5 returns 24kHz PCM
               mimeType = 'audio/wav';
            }

            const audioBlob = new Blob([audioBuffer], { type: mimeType });

            const fileName = `${Date.now()}_voice_${Math.random().toString(36).substr(2, 6)}.wav`;
            const audioFile = new File([audioBlob], fileName, { type: mimeType });

            finalAudioUrl = await uploadFile(audioFile, 'voices'); // Upload to R2 under voices/
            foundAudio = true;
            break;
          }
        }

        if (!foundAudio) {
          throw new Error("Es wurde kein Audio generiert.");
        }
      } else {
        throw new Error("Ungültige Antwort von Gemini (fehlende Daten).");
      }

      setCurrentAudio(finalAudioUrl);
      
      // Save generating state to Database
      await saveVoice({
        prompt: prompt,
        audio_url: finalAudioUrl,
        config: { model: aiModel, voice1, voice2 }
      });

      await loadVoices();
      toast.success('Sprachaufnahme generiert!');

    } catch (err: any) {
      console.error(err);
      toast.error('Fehler bei der Audio-Generierung: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRestore = (item: GeneratedVoice) => {
    setCurrentAudio(item.audio_url);
    setPrompt(item.prompt);
    if (item.config?.model) {
      setAiModel(item.config.model);
    }
    if (item.config?.voice1) setVoice1(item.config.voice1);
    if (item.config?.voice2) setVoice2(item.config.voice2);
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm("Bist du sicher, dass du diese Voice löschen möchtest?")) return;
    const res = await deleteContent(id, 'voice');
    if (res.success) {
      toast.success('Gelöscht');
      loadVoices();
      if (history.find(h => h.id === id)?.audio_url === currentAudio) {
        setCurrentAudio(null);
      }
    } else {
      toast.error(res.error || 'Fehler beim Löschen');
    }
  };

  return (
    <div className="flex h-full w-full bg-[#101622]">
      {/* Sidebar for Controls */}
      <div className="w-96 border-r border-[#1e293b] flex flex-col hide-scrollbar overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-primary/20 text-primary rounded-xl flex items-center justify-center neon-glow">
              <span className="material-icons-round">record_voice_over</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Voice Studio</h2>
              <p className="text-xs text-slate-400">Gemini 2.5 Text-to-Speech</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Model Selection */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">KI Modell</label>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setAiModel('gemini-2.5-flash-preview-tts')}
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-all flex flex-col gap-1 ${aiModel === 'gemini-2.5-flash-preview-tts' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-icons-round text-sm">bolt</span> Gemini 2.5 Flash
                  </span>
                  <span className={`text-[10px] ${aiModel === 'gemini-2.5-flash-preview-tts' ? 'text-white/80' : 'text-slate-500'}`}>Schnell und günstig</span>
                </button>
                <button
                  onClick={() => setAiModel('gemini-2.5-pro-preview-tts')}
                  className={`w-full py-3 px-4 rounded-xl text-left text-sm font-medium transition-all flex flex-col gap-1 ${aiModel === 'gemini-2.5-pro-preview-tts' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                >
                  <span className="flex items-center gap-2">
                    <span className="material-icons-round text-sm">star</span> Gemini 2.5 Pro
                  </span>
                  <span className={`text-[10px] ${aiModel === 'gemini-2.5-pro-preview-tts' ? 'text-white/80' : 'text-slate-500'}`}>Höchste Qualität</span>
                </button>
              </div>
            </div>

            {/* Voice Selection */}
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block">Voice 1</label>
                <select
                  value={voice1}
                  onChange={(e) => setVoice1(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  {voiceOptions.map(v => <option key={v} value={v} className="bg-[#101622] text-white">{v}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 block opacity-50">Voice 2 (Dialog)</label>
                <select
                  value={voice2}
                  onChange={(e) => setVoice2(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-primary appearance-none cursor-pointer"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='white'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
                >
                  {voiceOptions.map(v => <option key={v} value={v} className="bg-[#101622] text-white">{v}</option>)}
                </select>
              </div>
            </div>

            <div className="w-full h-px bg-white/10 my-6"></div>

            {/* Hint Box for Dialogue */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-300">
              <p className="flex items-start gap-2">
                <span className="material-icons-round text-primary text-lg">lightbulb</span>
                <span>
                  <strong>Tipp für Dialoge:</strong> Schreibe einfach <code className="bg-black/50 px-1 py-0.5 rounded text-xs">Speaker 1: Hallo!</code> und <code className="bg-black/50 px-1 py-0.5 rounded text-xs">Speaker 2: Hi!</code> in das Textfeld. Die KI weist den Sprechern automatisch verschiedene Stimmen zu.
                </span>
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-[#0a0f18] relative flex flex-col h-full min-w-0">
        
        {/* Top Area: Current Audio & Input */}
        <div className="p-8 flex-shrink-0 flex flex-col items-center justify-center border-b border-white/10 bg-gradient-to-b from-transparent to-black/20" style={{ minHeight: '400px' }}>
          
          <div className="w-full max-w-3xl mb-8 relative">
              <label className="text-sm font-medium text-slate-300 mb-2 block">Text oder Skript eingeben</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Schreibe einen Dialog oder Text, der gesprochen werden soll..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none shadow-inner"
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt}
                className="absolute bottom-4 right-4 bg-primary text-white px-6 py-2 rounded-xl font-bold hover:bg-primary-hover transition-colors shadow-lg disabled:opacity-50 flex items-center gap-2"
              >
                {isGenerating ? (
                  <><span className="material-icons-round animate-spin">refresh</span> Generiere...</>
                ) : (
                  <><span className="material-icons-round">play_arrow</span> Audio Erstellen</>
                )}
              </button>
          </div>

          {currentAudio && (
            <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-2xl p-6 shadow-xl backdrop-blur flex flex-col gap-4 animate-fade-in text-center">
              <h3 className="text-lg font-bold text-white">Generiertes Audio</h3>
              <audio controls src={currentAudio} className="w-full outline-none" autoPlay />
              <div className="flex justify-center gap-3 mt-2">
                <button
                  onClick={() => window.open(currentAudio, '_blank')}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition flex items-center gap-2"
                >
                  <span className="material-icons-round text-[18px]">download</span> Herunterladen
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Area: History */}
        <div className="flex-1 overflow-y-auto p-8 bg-[#0a0f18]">
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <span className="material-icons-round">history</span> Deine Vocals
          </h3>
          
          {loading && history.length === 0 ? (
            <div className="text-center text-slate-500 py-10">Lade Vocals...</div>
          ) : history.length === 0 ? (
            <div className="text-center text-slate-500 py-10 border border-dashed border-white/10 rounded-xl bg-white/5">Noch keine Sprachclips vorhanden.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="bg-white/5 border border-white/10 hover:border-primary/50 transition-colors rounded-xl p-4 flex flex-col gap-3 group cursor-pointer" onClick={() => handleRestore(item)}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2 text-primary">
                      <span className="material-icons-round bg-primary/20 p-1.5 rounded-lg text-sm">record_voice_over</span>
                      <span className="text-xs font-bold">{new Date(item.created_at).toLocaleDateString()}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDelete(item.id, e)}
                      className="text-slate-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <span className="material-icons-round text-[18px]">delete</span>
                    </button>
                  </div>
                  <p className="text-sm text-slate-300 line-clamp-2 italic">"{item.prompt}"</p>
                  <audio controls src={item.audio_url} className="w-full h-8 mt-auto" onClick={e => e.stopPropagation()} />
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
