// composables/use-sound.ts
// 🔊 Sound Notification System

export const useSound = () => {
  const isEnabled = ref(true);
  const volume = ref(0.5);

  // Audio context for generating tones
  let audioContext: AudioContext | null = null;

  const getAudioContext = (): AudioContext => {
    if (!audioContext && typeof window !== 'undefined') {
      audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContext!;
  };

  // Play a simple beep/tone
  const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!isEnabled.value || typeof window === 'undefined') return;

    try {
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;
      
      gainNode.gain.setValueAtTime(volume.value, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    } catch (e) {
      console.error('Failed to play tone:', e);
    }
  };

  // Play multiple tones in sequence (melody)
  const playMelody = async (notes: { freq: number; duration: number }[]) => {
    for (const note of notes) {
      playTone(note.freq, note.duration);
      await new Promise(resolve => setTimeout(resolve, note.duration * 1000));
    }
  };

  // ============================================
  // 🎵 PRESET SOUNDS
  // ============================================

  // Success - Payment received! 🎉
  const playSuccess = () => {
    if (!isEnabled.value) return;
    
    // Happy ascending arpeggio
    playMelody([
      { freq: 523.25, duration: 0.1 },  // C5
      { freq: 659.25, duration: 0.1 },  // E5
      { freq: 783.99, duration: 0.1 },  // G5
      { freq: 1046.50, duration: 0.2 }, // C6
    ]);
  };

  // Error - Something went wrong ❌
  const playError = () => {
    if (!isEnabled.value) return;
    
    // Low warning tones
    playMelody([
      { freq: 200, duration: 0.15 },
      { freq: 150, duration: 0.2 },
    ]);
  };

  // Warning - Attention needed ⚠️
  const playWarning = () => {
    if (!isEnabled.value) return;
    
    playMelody([
      { freq: 440, duration: 0.1 },
      { freq: 440, duration: 0.1 },
    ]);
  };

  // Notification - New event 🔔
  const playNotification = () => {
    if (!isEnabled.value) return;
    
    playMelody([
      { freq: 880, duration: 0.1 },
      { freq: 1108.73, duration: 0.15 },
    ]);
  };

  // Cash register - Cha-ching! 💰
  const playCashRegister = () => {
    if (!isEnabled.value) return;
    
    // Classic cash register sound
    playMelody([
      { freq: 1200, duration: 0.05 },
      { freq: 1400, duration: 0.05 },
      { freq: 1600, duration: 0.1 },
    ]);
  };

  // Scan beep - Item scanned 📦
  const playScanBeep = () => {
    if (!isEnabled.value) return;
    
    playTone(1000, 0.1, 'square');
  };

  // Lightning zap ⚡
  const playLightningZap = () => {
    if (!isEnabled.value) return;
    
    // Quick ascending zap
    playMelody([
      { freq: 400, duration: 0.05 },
      { freq: 800, duration: 0.05 },
      { freq: 1600, duration: 0.1 },
    ]);
  };

  // Countdown tick ⏱️
  const playTick = () => {
    if (!isEnabled.value) return;
    
    playTone(800, 0.05, 'square');
  };

  // Order complete 🎊
  const playOrderComplete = () => {
    if (!isEnabled.value) return;
    
    // Celebratory fanfare
    playMelody([
      { freq: 523.25, duration: 0.1 },  // C5
      { freq: 523.25, duration: 0.1 },  // C5
      { freq: 523.25, duration: 0.1 },  // C5
      { freq: 698.46, duration: 0.15 }, // F5
      { freq: 783.99, duration: 0.15 }, // G5
      { freq: 698.46, duration: 0.1 },  // F5
      { freq: 783.99, duration: 0.3 },  // G5
    ]);
  };

  // Low stock alert 📉
  const playLowStockAlert = () => {
    if (!isEnabled.value) return;
    
    playMelody([
      { freq: 300, duration: 0.2 },
      { freq: 300, duration: 0.2 },
      { freq: 300, duration: 0.2 },
    ]);
  };

  // Toggle sounds on/off
  const toggleSound = () => {
    isEnabled.value = !isEnabled.value;
    if (isEnabled.value) {
      playNotification();
    }
    // Save preference
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bitspace_sound_enabled', String(isEnabled.value));
    }
  };

  // Set volume
  const setVolume = (v: number) => {
    volume.value = Math.max(0, Math.min(1, v));
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('bitspace_sound_volume', String(volume.value));
    }
  };

  // Load saved preferences
  const loadPreferences = () => {
    if (typeof localStorage === 'undefined') return;
    
    const savedEnabled = localStorage.getItem('bitspace_sound_enabled');
    if (savedEnabled !== null) {
      isEnabled.value = savedEnabled === 'true';
    }
    
    const savedVolume = localStorage.getItem('bitspace_sound_volume');
    if (savedVolume !== null) {
      volume.value = parseFloat(savedVolume);
    }
  };

  // Initialize on mount
  if (typeof window !== 'undefined') {
    loadPreferences();
  }

  return {
    // State
    isEnabled,
    volume,

    // Controls
    toggleSound,
    setVolume,

    // Preset sounds
    playSuccess,
    playError,
    playWarning,
    playNotification,
    playCashRegister,
    playScanBeep,
    playLightningZap,
    playTick,
    playOrderComplete,
    playLowStockAlert,

    // Custom
    playTone,
    playMelody,
  };
};
