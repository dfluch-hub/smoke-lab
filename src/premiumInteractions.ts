const SVG_NS = 'http://www.w3.org/2000/svg';
const enhancedTimers = new WeakMap<HTMLElement, PremiumTimerController>();
const rewardedButtons = new WeakSet<Element>();

const safeVibrate = (pattern: number | number[]) => {
  try {
    if ('vibrate' in navigator) navigator.vibrate(pattern);
  } catch {
    // Haptics are progressive enhancement only.
  }
};

const parseTimer = (value: string) => {
  const match = value.trim().match(/^(\d+):(\d{2})$/);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className?: string) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

const svgEl = <K extends keyof SVGElementTagNameMap>(tag: K) => document.createElementNS(SVG_NS, tag);

const isBreathingProtocol = (root: HTMLElement) => {
  const text = root.textContent?.toLowerCase() || '';
  return /4\s*[-–]\s*7\s*[-–]\s*8|atem|breath/.test(text);
};

class PremiumTimerController {
  private host: HTMLElement;
  private source: HTMLElement;
  private root: HTMLElement;
  private total: number;
  private breathing: boolean;
  private circle: SVGCircleElement;
  private seconds: HTMLElement;
  private phase: HTMLElement;
  private breathCore: HTMLElement;
  private waveDot?: SVGCircleElement;
  private waveNote?: HTMLElement;
  private lastPhase = '';
  private observer: MutationObserver;
  private circumference = 2 * Math.PI * 58;

  constructor(source: HTMLElement, root: HTMLElement, initialSeconds: number) {
    this.source = source;
    this.root = root;
    this.total = Math.max(1, initialSeconds);
    this.breathing = isBreathingProtocol(root) && this.total <= 90;
    this.host = el('div', 'premium-timer-shell');

    const ringWrap = el('div', 'premium-ring-wrap');
    const svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 132 132');
    svg.setAttribute('class', 'premium-ring-svg');

    const track = svgEl('circle');
    track.setAttribute('cx', '66');
    track.setAttribute('cy', '66');
    track.setAttribute('r', '58');
    track.setAttribute('class', 'premium-ring-track');

    this.circle = svgEl('circle');
    this.circle.setAttribute('cx', '66');
    this.circle.setAttribute('cy', '66');
    this.circle.setAttribute('r', '58');
    this.circle.setAttribute('class', 'premium-ring-progress');
    this.circle.style.strokeDasharray = `${this.circumference}`;
    this.circle.style.strokeDashoffset = '0';

    svg.append(track, this.circle);

    this.breathCore = el('div', 'premium-breath-core');
    this.seconds = el('strong', 'premium-seconds');
    this.phase = el('span', 'premium-phase');
    this.breathCore.append(this.seconds, this.phase);
    ringWrap.append(svg, this.breathCore);
    this.host.append(ringWrap);

    if (this.total >= 150) this.host.append(this.createWave());

    source.style.display = 'none';
    source.parentElement?.insertBefore(this.host, source);

    this.update(initialSeconds, true);
    this.observer = new MutationObserver(() => {
      const next = parseTimer(this.source.textContent || '');
      if (next !== null) this.update(next);
    });
    this.observer.observe(this.source, { childList: true, characterData: true, subtree: true });
  }

  private createWave() {
    const wrap = el('div', 'premium-wave-wrap');
    const svg = svgEl('svg');
    svg.setAttribute('viewBox', '0 0 320 92');
    svg.setAttribute('class', 'premium-wave-svg');

    const path = svgEl('path');
    path.setAttribute('d', 'M12 76 C48 75 65 66 88 47 C112 27 137 18 160 18 C184 18 208 29 232 50 C254 69 278 75 308 76');
    path.setAttribute('class', 'premium-wave-path');

    const fill = svgEl('path');
    fill.setAttribute('d', 'M12 76 C48 75 65 66 88 47 C112 27 137 18 160 18 C184 18 208 29 232 50 C254 69 278 75 308 76 L308 86 L12 86 Z');
    fill.setAttribute('class', 'premium-wave-fill');

    this.waveDot = svgEl('circle');
    this.waveDot.setAttribute('r', '5');
    this.waveDot.setAttribute('class', 'premium-wave-dot');

    svg.append(fill, path, this.waveDot);
    this.waveNote = el('span', 'premium-wave-note');
    wrap.append(svg, this.waveNote);
    return wrap;
  }

  private waveY(progress: number) {
    const x = progress;
    const gaussian = Math.exp(-Math.pow((x - 0.5) / 0.235, 2));
    return 76 - gaussian * 58;
  }

  private getBreathPhase(remaining: number) {
    const elapsed = Math.max(0, this.total - remaining);
    const phaseSecond = elapsed % 19;
    if (phaseSecond < 4) return { key: 'inhale', label: 'Einatmen…', className: 'is-inhale' };
    if (phaseSecond < 11) return { key: 'hold', label: 'Halten…', className: 'is-hold' };
    return { key: 'exhale', label: 'Ausatmen…', className: 'is-exhale' };
  }

  private update(remaining: number, initial = false) {
    remaining = Math.max(0, Math.min(this.total, remaining));
    const ratio = remaining / this.total;
    this.circle.style.strokeDashoffset = `${this.circumference * (1 - ratio)}`;
    this.seconds.textContent = String(remaining);

    if (this.breathing) {
      const next = this.getBreathPhase(remaining);
      this.phase.textContent = next.label;
      this.breathCore.classList.remove('is-inhale', 'is-hold', 'is-exhale');
      this.breathCore.classList.add(next.className);
      if (!initial && next.key !== this.lastPhase) safeVibrate(30);
      this.lastPhase = next.key;
    } else {
      this.phase.textContent = remaining === 0 ? 'Geschafft.' : 'Bleib bei der Welle';
    }

    if (this.waveDot) {
      const progress = 1 - ratio;
      const x = 12 + progress * 296;
      const y = this.waveY(progress);
      this.waveDot.setAttribute('cx', x.toFixed(1));
      this.waveDot.setAttribute('cy', y.toFixed(1));
      if (this.waveNote) {
        this.waveNote.textContent = progress >= 0.5
          ? 'Der Peak ist überschritten – der Drang flaut jetzt ab.'
          : 'Die Welle steigt an. Du musst ihr nicht folgen.';
      }
    }
  }
}

const findTimerSource = (root: HTMLElement) => {
  const candidates = Array.from(root.querySelectorAll<HTMLElement>('div'));
  return candidates.find((node) => {
    const text = node.textContent?.trim() || '';
    return /^\d+:\d{2}$/.test(text) && /tabular-nums/.test(node.className);
  }) || null;
};

const enhanceCravingTimer = () => {
  const reassess = document.getElementById('btn-reassess-early');
  if (!reassess) return;
  const root = reassess.closest('[role="dialog"]') as HTMLElement | null;
  if (!root) return;
  const source = findTimerSource(root);
  if (!source || enhancedTimers.has(source)) return;
  const initial = parseTimer(source.textContent || '');
  if (initial === null) return;
  enhancedTimers.set(source, new PremiumTimerController(source, root, initial));
};

const wireCompletionHaptic = () => {
  const button = document.getElementById('btn-craving-finish');
  if (!button || rewardedButtons.has(button)) return;
  rewardedButtons.add(button);
  button.addEventListener('click', () => {
    const root = button.closest('[role="dialog"]');
    const text = root?.textContent?.toLowerCase() || '';
    if (!/zigarette erfasst|cigarette recorded/.test(text)) safeVibrate([50, 60, 50]);
  }, { once: true });
};

const scan = () => {
  enhanceCravingTimer();
  wireCompletionHaptic();
};

let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(() => {
    scheduled = false;
    scan();
  });
});

export const installPremiumInteractions = () => {
  if (typeof document === 'undefined') return;
  observer.observe(document.body, { childList: true, subtree: true });
  scan();
};
