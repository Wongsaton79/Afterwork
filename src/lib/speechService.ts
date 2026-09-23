// Speech Synthesis & Voice Announcement Service
// Provides robust Thai Text-to-Speech across browsers (Chrome, Safari, iOS, Android, Edge, inside AI Studio iframe)
// Handles audio autoplay policies, voice list async loading, and sound chimes.

let thaiVoice: SpeechSynthesisVoice | null = null;
let voicesLoaded = false;
let isAudioUnlocked = false;

// Audio context for notification chime & audio synthesis
let audioCtx: AudioContext | null = null;

export const playChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    // Friendly Ding-dong chime (D5 587.33Hz -> A5 880Hz)
    osc.frequency.setValueAtTime(587.33, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(now);
    osc.stop(now + 0.6);
  } catch (e) {
    console.debug('Chime error:', e);
  }
};

/**
 * Play a double chime sequence (used for order completion / change prompt)
 */
export const playSuccessChime = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;
    [
      { freq: 523.25, time: 0 },    // C5
      { freq: 659.25, time: 0.12 }, // E5
      { freq: 783.99, time: 0.24 }, // G5
      { freq: 1046.50, time: 0.36 } // C6
    ].forEach(({ freq, time }) => {
      const osc = audioCtx!.createOscillator();
      const gain = audioCtx!.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);
      gain.gain.setValueAtTime(0.2, now + time);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx!.destination);
      osc.start(now + time);
      osc.stop(now + time + 0.35);
    });
  } catch (e) {
    console.debug('Success chime error:', e);
  }
};

// Force voice discovery
export const getAvailableVoices = (): SpeechSynthesisVoice[] => {
  if (typeof window === 'undefined') return [];
  try {
    const win = window as any;
    if ('speechSynthesis' in win && win.speechSynthesis) {
      const voices = win.speechSynthesis.getVoices();
      if (voices && voices.length > 0) return voices;
    }
    // Also try top window if in iframe
    if (win.parent && win.parent !== win && 'speechSynthesis' in win.parent && win.parent.speechSynthesis) {
      const parentVoices = win.parent.speechSynthesis.getVoices();
      if (parentVoices && parentVoices.length > 0) return parentVoices;
    }
  } catch (e) {
    // Cross-origin iframe fallback
  }
  return [];
};

// Find the best voice for Thai speech
export const findBestThaiVoice = (): SpeechSynthesisVoice | null => {
  const voices = getAvailableVoices();
  if (voices.length === 0) return null;

  // 1. First priority: Exact Thai voices (th-TH, Narisa, Kanya, Premwadee, Niwat, etc.)
  const exactThai = voices.find(v => 
    v.lang.toLowerCase() === 'th-th' || 
    v.lang.toLowerCase() === 'th_th' || 
    v.lang.toLowerCase().startsWith('th') ||
    v.name.toLowerCase().includes('thai') ||
    v.name.includes('ภาษาไทย') ||
    v.name.includes('Kanya') ||
    v.name.includes('Narisa') ||
    v.name.includes('Premwadee') ||
    v.name.includes('Niwat')
  );
  if (exactThai) return exactThai;

  // 2. Default voice
  const defaultVoice = voices.find(v => v.default);
  if (defaultVoice) return defaultVoice;

  return voices[0] || null;
};

// Initialize voices and listen for voice list loading
export const initSpeechSystem = () => {
  if (typeof window === 'undefined') return;

  const updateVoices = () => {
    const voices = getAvailableVoices();
    if (voices.length > 0) {
      thaiVoice = findBestThaiVoice();
      voicesLoaded = true;
    }
  };

  updateVoices();
  if ('speechSynthesis' in window && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
};

// Immediately initialize
if (typeof window !== 'undefined') {
  initSpeechSystem();
}

/**
 * Unlock browser speech synthesis and AudioContext upon user tap/click
 */
export const unlockAudio = () => {
  if (typeof window === 'undefined') return;
  try {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const silent = new SpeechSynthesisUtterance(' ');
      silent.volume = 0.01;
      silent.rate = 2.0;
      window.speechSynthesis.speak(silent);
    }

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }
    isAudioUnlocked = true;
  } catch (e) {
    console.debug('Audio unlock error:', e);
  }
};

/**
 * Play Thai Speech announcement
 * In browser iframe environments, window.speechSynthesis is the only permitted audio output.
 * If exact Thai voice is missing on the client OS, we speak with available voice configured for Thai language,
 * and we display the clear announcement banner with audio cues!
 */
export const speakOrderAnnouncement = async (text: string): Promise<boolean> => {
  if (typeof window === 'undefined') return false;

  return new Promise((resolve) => {
    try {
      // Find synthesis instance (prefer local window, fallback to parent if available)
      const win = window as any;
      let synth: SpeechSynthesis | null = null;
      if ('speechSynthesis' in win && win.speechSynthesis) {
        synth = win.speechSynthesis;
      } else if (win.parent && win.parent !== win && 'speechSynthesis' in win.parent && win.parent.speechSynthesis) {
        synth = win.parent.speechSynthesis;
      }

      if (!synth) {
        resolve(false);
        return;
      }

      // Resume synthesis if browser paused it (known Chrome/WebKit bug)
      if (synth.paused) {
        synth.resume();
      }
      synth.cancel(); // cancel pending

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.text = text;
      utterance.lang = 'th-TH';
      utterance.volume = 1.0;  // max volume
      utterance.rate = 0.92;   // natural clear pacing
      utterance.pitch = 1.0;

      // Select voice
      const currentThaiVoice = findBestThaiVoice();
      if (currentThaiVoice) {
        utterance.voice = currentThaiVoice;
        // If the voice has a lang property, keep it aligned
        if (currentThaiVoice.lang) {
          utterance.lang = currentThaiVoice.lang.startsWith('th') ? 'th-TH' : currentThaiVoice.lang;
        }
      }

      let hasEnded = false;
      utterance.onend = () => {
        hasEnded = true;
        resolve(true);
      };

      utterance.onerror = (e) => {
        console.warn('SpeechSynthesis utterance event:', e);
        hasEnded = true;
        resolve(false);
      };

      // Speak
      synth.speak(utterance);

      // WebKit Chrome bug fix: sometimes speechSynthesis freezes
      setTimeout(() => {
        if (!hasEnded) {
          if (synth?.speaking && synth?.paused) {
            synth.resume();
          }
        }
      }, 300);

      // Fallback timeout to ensure resolve
      setTimeout(() => {
        if (!hasEnded) {
          hasEnded = true;
          resolve(true);
        }
      }, 4000);

    } catch (err) {
      console.warn('Speech synthesis call failed:', err);
      resolve(false);
    }
  });
};

/**
 * Format a natural Thai announcement strictly for customer name (No tables)
 * e.g. "มีออเดอร์ใหม่ ของคุณ มัด"
 */
export const formatOrderSpeechText = (customerName?: string): string => {
  const cleanName = (customerName || '').trim();
  
  if (!cleanName || cleanName === 'ลูกค้าทั่วไป' || cleanName === 'ลูกค้าหน้าร้าน') {
    return 'มีออเดอร์ใหม่เข้ามาครับ';
  }

  // If already starts with "คุณ" or "พี่" or "น้อง"
  if (cleanName.startsWith('คุณ') || cleanName.startsWith('พี่') || cleanName.startsWith('น้อง') || cleanName.startsWith('น้า') || cleanName.startsWith('ป้า') || cleanName.startsWith('ลุง')) {
    return `มีออเดอร์ใหม่ ของ${cleanName}`;
  }

  return `มีออเดอร์ใหม่ ของคุณ ${cleanName}`;
};
