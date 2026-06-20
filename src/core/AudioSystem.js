// AudioSystem — 素材ファイルを使わず、Web Audio で環境音を合成する。
// 雨・波・風・低いドローン・時計の音などをノイズとフィルタから生成する。

export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.layers = {}; // name -> { gain, nodes:[], target }
    this.clockTimer = null;
    this.started = false;
  }

  // ユーザー操作後に呼ぶ（自動再生制限の回避）
  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.started = true;
  }

  // ピンクっぽいノイズのループバッファ
  _noiseBuffer(seconds = 2) {
    const len = this.ctx.sampleRate * seconds;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099;
      b1 = 0.963 * b1 + white * 0.2965;
      b2 = 0.57 * b2 + white * 1.0526;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
    }
    return buf;
  }

  _src(buffer, loop = true) {
    const s = this.ctx.createBufferSource();
    s.buffer = buffer;
    s.loop = loop;
    return s;
  }

  // 雨：高めにフィルタしたノイズ
  _buildRain(gain) {
    const noise = this._src(this._noiseBuffer());
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 800;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 7000;
    noise.connect(hp).connect(lp).connect(gain);
    noise.start();
    return [noise];
  }

  // 波：低くフィルタしたノイズを LFO でゆっくり寄せては返す
  _buildWaves(gain) {
    const noise = this._src(this._noiseBuffer(4));
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    const swell = this.ctx.createGain();
    swell.gain.value = 0.5;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.12; // 8秒周期
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 0.45;
    lfo.connect(lfoGain).connect(swell.gain);
    noise.connect(lp).connect(swell).connect(gain);
    noise.start();
    lfo.start();
    return [noise, lfo];
  }

  // 風：ごく低い帯域のノイズ
  _buildWind(gain) {
    const noise = this._src(this._noiseBuffer(4));
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 320;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.08;
    const lfoGain = this.ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    noise.connect(lp).connect(gain);
    noise.start();
    lfo.start();
    return [noise, lfo];
  }

  // 低いドローン（喪失感のあるパッド）
  _buildDrone(gain) {
    const freqs = [55, 82.4, 110]; // A1, E2, A2
    const nodes = [];
    freqs.forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = f;
      const og = this.ctx.createGain();
      og.gain.value = i === 0 ? 0.5 : 0.22;
      // ゆらぎ
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.013;
      const lfoG = this.ctx.createGain();
      lfoG.gain.value = 0.06;
      lfo.connect(lfoG).connect(og.gain);
      osc.connect(og).connect(gain);
      osc.start();
      lfo.start();
      nodes.push(osc, lfo);
    });
    return nodes;
  }

  // 名前付き環境レイヤーをフェードインで開始
  start(name, targetVol = 0.5, fade = 3) {
    this.init();
    if (this.layers[name]) {
      this.fade(name, targetVol, fade);
      return;
    }
    const gain = this.ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(this.master);
    let nodes = [];
    if (name === "rain") nodes = this._buildRain(gain);
    else if (name === "waves") nodes = this._buildWaves(gain);
    else if (name === "wind") nodes = this._buildWind(gain);
    else if (name === "drone") nodes = this._buildDrone(gain);
    this.layers[name] = { gain, nodes, target: targetVol };
    this.fade(name, targetVol, fade);
  }

  fade(name, target, time = 2) {
    const l = this.layers[name];
    if (!l) return;
    const now = this.ctx.currentTime;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setValueAtTime(Math.max(l.gain.gain.value, 0.0001), now);
    l.gain.gain.exponentialRampToValueAtTime(Math.max(target, 0.0001), now + time);
    l.target = target;
  }

  stop(name, time = 2) {
    const l = this.layers[name];
    if (!l) return;
    const now = this.ctx.currentTime;
    l.gain.gain.cancelScheduledValues(now);
    l.gain.gain.setValueAtTime(Math.max(l.gain.gain.value, 0.0001), now);
    l.gain.gain.exponentialRampToValueAtTime(0.0001, now + time);
    setTimeout(() => {
      try {
        l.nodes.forEach((n) => n.stop && n.stop());
      } catch (e) {}
      try {
        l.gain.disconnect();
      } catch (e) {}
      delete this.layers[name];
    }, time * 1000 + 100);
  }

  stopAll(time = 2) {
    Object.keys(this.layers).forEach((n) => this.stop(n, time));
    this.stopClock();
  }

  // 時計の秒針（静けさの演出）
  startClock(vol = 0.12) {
    this.init();
    if (this.clockTimer) return;
    const tick = () => {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      osc.type = "square";
      osc.frequency.value = 1400;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(vol, now + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      const bp = this.ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = 2000;
      osc.connect(bp).connect(g).connect(this.master);
      osc.start(now);
      osc.stop(now + 0.05);
    };
    tick();
    this.clockTimer = setInterval(tick, 1000);
  }

  stopClock() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  }

  // 単発：柔らかいUI/インタラクト音
  blip(freq = 520, vol = 0.12, type = "sine") {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(vol, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    osc.connect(g).connect(this.master);
    osc.start(now);
    osc.stop(now + 0.55);
  }

  // 単発：余韻のあるピアノ風の一音（感情の節目に）
  note(freq = 392, vol = 0.18) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [1, 2, 3].forEach((h, i) => {
      const osc = this.ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq * h;
      const g = this.ctx.createGain();
      const v = vol / (h * 1.6);
      g.gain.setValueAtTime(0.0001, now);
      g.gain.exponentialRampToValueAtTime(v, now + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      osc.connect(g).connect(this.master);
      osc.start(now);
      osc.stop(now + 3.3);
    });
  }
}
