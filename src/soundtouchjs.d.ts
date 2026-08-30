declare module "soundtouchjs" {
  export class SoundTouch {
    constructor();
    tempo: number;
    pitch: number;
    clear(): void;
    clone(): SoundTouch;
    get inputBuffer(): {
      clear(): void;
      putSamples(samples: Float32Array, position?: number, numFrames?: number): void;
    };
    get outputBuffer(): {
      clear(): void;
      receiveSamples(output: Float32Array, numFrames?: number): number;
    };
  }

  export class PitchShifter {
    constructor(context: AudioContext, buffer: AudioBuffer, bufferSize?: number);
    tempo: number;
    pitch: number;
    readonly duration: number;
    readonly timePlayed: number;
    readonly source: { position: number };
    connect(node: AudioNode): void;
    disconnect(): void;
    on(event: "play" | "end" | "timeupdate", cb: (detail?: any) => void): void;
    off(eventName: string): void;
  }
}
