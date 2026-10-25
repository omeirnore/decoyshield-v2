import type { FingerprintProfile } from '@/shared/types';

// Wraps createOscillator to chain a GainNode with a micro-offset.
// This changes the processed waveform hash used by audio fingerprinting,
// since fingerprinters hash the full rendered waveform, not just frequency.
export function apply(
  getProfile: () => FingerprintProfile,
  isEnabled: () => boolean,
): void {
  if (typeof AudioContext === 'undefined') return;

  const originalCreate = AudioContext.prototype.createOscillator;

  AudioContext.prototype.createOscillator = function (this: AudioContext) {
    const oscillator = originalCreate.call(this);
    if (!isEnabled()) return oscillator;

    const gainNode = this.createGain();
    gainNode.gain.value = 1.0 + getProfile().audio.noiseOffset;

    const originalConnect = oscillator.connect.bind(oscillator);
    oscillator.connect = function (
      destination: AudioNode,
      outputIndex?: number,
      inputIndex?: number,
    ): AudioNode {
      originalConnect(gainNode);
      gainNode.connect(destination, outputIndex, inputIndex);
      return destination;
    } as typeof oscillator.connect;

    return oscillator;
  };
}
