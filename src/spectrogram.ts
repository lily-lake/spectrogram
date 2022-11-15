import {resize, initializeCanvas, drawColumn, CanvasConfig} from './canvas.js';
interface Spectrogram {
    volume: HTMLInputElement;
    analyserNode: AnalyserNode;
    context: AudioContext;
    gainNode: GainNode;
    config: SpectrogramConfig;
}

interface SpectrogramConfig {
    fftSize: number;
    sampleRate: number;
}

interface SpectralTimeSeries {
    frequencyBinCount: number;
    maxFrequency: number;
    maxSampleCount: number;
    analyserNode: AnalyserNode;
    getFrequencies: (frequencyBinCount: number, maxFrequency: number) => number[];
    decibelValues: number[][];
    pushDecibelValues: (decibelValues: number[][], analyserNode: AnalyserNode, maxSampleCount: number) => number[][];
}

function createSpectralTimeSeries(maxFrequency: number, maxSampleCount: number, frequencyBinCount: number, analyserNode: AnalyserNode): SpectralTimeSeries {
    const decibelValues: number[][] = [[]];
    const timeSeries = {
        frequencyBinCount,
        maxFrequency,
        maxSampleCount,
        analyserNode,
        getFrequencies: () => getFrequencies(frequencyBinCount, maxFrequency),
        decibelValues,
        pushDecibelValues: (decibelValues: number[][], analyserNode: AnalyserNode, maxSampleCount: number) => pushDecibelValues(decibelValues, analyserNode, maxSampleCount),
    }
    return timeSeries;
}

function getFrequencies(frequencyBinCount: number, maxFrequency: number): number[] {  
    const frequencies = new Array<number>(frequencyBinCount);
    for (let i = 0; i < frequencyBinCount; i++) {
        frequencies[i] = ((i+1)/frequencyBinCount) * maxFrequency;
    }
    return frequencies;
  }

// Todo: get most recent decibel values and push them onto array
// only fill up to max sample count
function pushDecibelValues(decibelValues: number[][], analyserNode: AnalyserNode, maxSampleCount: number): number[][] {
    const newDecibalValues = new Uint8Array(analyserNode.frequencyBinCount)
    analyserNode.getByteFrequencyData(newDecibalValues)
    decibelValues.push(new Array<number>(...newDecibalValues));
    if (decibelValues.length > maxSampleCount) {
        decibelValues.shift();
    }
    return decibelValues;
}

const getUserMic = (): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
        audio: true,
    })
}

async function setupContext(spectrogram: Spectrogram) {
    const {context, analyserNode, volume, gainNode} = spectrogram;
    const mic = await getUserMic();
    if (context.state === 'suspended') {
        await context.resume()
    }
    const source = context.createMediaStreamSource(mic)
    source
    .connect(gainNode)
    .connect(analyserNode)
    .connect(context.destination)
}

function setupEventListeners(spectrogram: Spectrogram) {
    const {volume, gainNode, context} = spectrogram;
    volume.addEventListener('input', e => {
        if (e.target != null) {
            const value = parseFloat((e.target as HTMLInputElement).value)
            gainNode.gain.setTargetAtTime(value, context.currentTime, .01)
        }
      })
  }

function initializeSpectrogram(config: SpectrogramConfig, canvasConfig: CanvasConfig): Spectrogram {
    const {sampleRate, fftSize} = config;
    
    const context = new AudioContext({sampleRate});
    const analyserNode = new AnalyserNode(context, { fftSize })
    const volume = <HTMLInputElement>document.getElementById('volume')
    const gainNode = new GainNode(context, {gain: Number(volume.value)})

    const spectrogram = {
        analyserNode,
        context,
        volume,
        gainNode,
        config,
    }
    setupEventListeners(spectrogram);
    setupContext(spectrogram);

    return spectrogram;
}

  export {Spectrogram, resize, initializeCanvas, initializeSpectrogram, getFrequencies, createSpectralTimeSeries, SpectralTimeSeries}