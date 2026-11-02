let audio

function tone(frequency, delay, duration) {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)()
    if (audio.state === 'suspended') void audio.resume()
    const oscillator = audio.createOscillator(),
      gain = audio.createGain(),
      start = audio.currentTime + delay
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.15, start + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain).connect(audio.destination)
    oscillator.start(start)
    oscillator.stop(start + duration + 0.02)
  } catch (error) {
    console.warn(error)
  }
}

export function playSound(type) {
  if (type === 'off') return
  const notes = {
    triple: [
      [900, 0],
      [900, 0.22],
      [900, 0.44],
    ],
    double: [
      [520, 0],
      [520, 0.33],
    ],
    long: [[780, 0]],
    victory: [
      [620, 0],
      [780, 0.19],
      [980, 0.38],
      [1250, 0.57],
    ],
    urgent: [
      [1150, 0],
      [1150, 0.16],
      [1150, 0.32],
      [1150, 0.48],
    ],
    bell: [
      [950, 0],
      [1450, 0],
      [950, 0.5],
      [1450, 0.5],
    ],
    rising: [
      [520, 0],
      [700, 0.16],
      [900, 0.32],
      [1200, 0.48],
    ],
    alarm: [
      [850, 0],
      [850, 0.2],
      [850, 0.6],
      [850, 0.8],
    ],
  }
  for (const [frequency, delay] of notes[type] || notes.triple)
    tone(frequency, delay, type === 'long' ? 0.85 : 0.2)
}
