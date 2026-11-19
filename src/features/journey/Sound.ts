import type { SoundName } from "./route";

export type SoundFiles = Readonly<Record<SoundName, string>>;

/**
 * The game's music and sounds on one Web Audio context. Files are fetched from this site once and
 * kept in memory, so nothing more is loaded during the lesson.
 */
export class Sound {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly buffers = new Map<SoundName, AudioBuffer>();
  private loop: { name: SoundName; source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wantedLoop: { name: SoundName; volume: number } | null = null;
  private muted = false;
  private disposed = false;

  constructor(private readonly files: SoundFiles) {}

  /** Call from a click or key press: browsers allow sound only after one. */
  wake(): void {
    if (this.disposed) return;
    if (!this.context) {
      this.context = new AudioContext();
      this.master = this.context.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.context.destination);
      void this.load();
    } else if (this.context.state === "suspended") {
      void this.context.resume();
    }
  }

  play(name: SoundName, volume = 0.7): void {
    const buffer = this.buffers.get(name);
    if (!this.context || !this.master || !buffer) return;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    gain.connect(this.master);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.connect(gain);
    source.onended = () => gain.disconnect();
    source.start();
  }

  /** Starts a looping track, replacing the one playing. Waits for it to load if needed. */
  playLoop(name: SoundName, volume: number): void {
    this.wantedLoop = { name, volume };
    if (this.loop?.name === name) return;
    this.stopSource();
    const buffer = this.buffers.get(name);
    if (!this.context || !this.master || !buffer) return;
    const gain = this.context.createGain();
    gain.gain.value = volume;
    gain.connect(this.master);
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain);
    source.start();
    this.loop = { name, source, gain };
  }

  stopLoop(): void {
    this.wantedLoop = null;
    this.stopSource();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 1;
  }

  setPaused(paused: boolean): void {
    if (!this.context) return;
    void (paused ? this.context.suspend() : this.context.resume());
  }

  dispose(): void {
    this.disposed = true;
    this.stopSource();
    this.buffers.clear();
    void this.context?.close();
    this.context = null;
  }

  private stopSource() {
    if (!this.loop) return;
    this.loop.source.stop();
    this.loop.gain.disconnect();
    this.loop = null;
  }

  private async load() {
    const context = this.context;
    if (!context) return;
    await Promise.all(
      (Object.entries(this.files) as [SoundName, string][]).map(async ([name, url]) => {
        try {
          const response = await fetch(url);
          const data = await response.arrayBuffer();
          if (this.disposed) return;
          this.buffers.set(name, await context.decodeAudioData(data));
        } catch {
          // A missing sound is skipped; the game plays on without it.
        }
      }),
    );
    if (this.disposed) return;
    if (this.wantedLoop) this.playLoop(this.wantedLoop.name, this.wantedLoop.volume);
  }
}
