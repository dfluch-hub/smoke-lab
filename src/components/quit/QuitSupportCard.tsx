import React, { useState } from 'react';
import { CalendarDays, Check, Shield } from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { SmokingEventRepository, CravingEventRepository, QuitSupportRepository, LapseRecoveryRepository } from '../../storage/repositories';
import { QuitRecoveryEngine } from '../../services/behavior/QuitRecoveryEngine';
import { formatPlace, formatSituation } from '../../i18n/translations';
import { PatternEngine } from '../../services/behavior/PatternEngine';

export const QuitSupportCard: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const [revision, setRevision] = useState(0);
  const [plan, setPlan] = useState(() => QuitSupportRepository.get());
  const [editingSignature, setEditingSignature] = useState<string | null>(null);
  const [draftText, setDraftText] = useState('');
  const smokes = SmokingEventRepository.getAll();
  const cravings = CravingEventRepository.getAll();
  void revision;
  const signals = QuitRecoveryEngine.identifyHighRiskSignals(smokes, cravings);
  const recoveries = LapseRecoveryRepository.getAll();
  if (userProfile.goal !== 'quit') return null;

  const status = QuitRecoveryEngine.status(plan);
  const statusText = status === 'not_set'
    ? (de ? 'Optional – kein Datum nötig' : 'Optional — no date required')
    : status === 'preparing'
    ? (de ? `Vorbereitung bis ${new Date(`${plan.quitDate}T12:00:00`).toLocaleDateString('de-DE')}` : `Preparing until ${new Date(`${plan.quitDate}T12:00:00`).toLocaleDateString('en-US')}`)
    : status === 'quit_day'
    ? (de ? 'Dein gewählter Start ist heute' : 'Your chosen start is today')
    : (de ? 'Dein Aufhörplan ist aktiv' : 'Your quit plan is active');

  const updateDate = (value: string) => {
    const next = QuitSupportRepository.update({ quitDate: value || undefined, enabled: true });
    setPlan(next); setRevision((x)=>x+1);
  };
  const acceptSignal = (signal: typeof signals[number]) => {
    const suggestion = QuitRecoveryEngine.suggestedPlan(signal, locale);
    const next = QuitSupportRepository.addHighRiskPlan(suggestion);
    setPlan(next); setRevision((x)=>x+1);
  };
  const saveEdit = (signature: string) => {
    const existing = plan.highRiskPlans.find((p)=>p.signature===signature); if (!existing || !draftText.trim()) return;
    const nextPlans = plan.highRiskPlans.map((p)=>p.signature===signature ? { ...p, planText:draftText.trim(), updatedAt:new Date().toISOString(), source:'user' as const } : p);
    const next = QuitSupportRepository.update({ highRiskPlans: nextPlans }); setPlan(next); setEditingSignature(null); setRevision((x)=>x+1);
  };

  return (
    <section className="rounded-xl bg-[#191B1C] text-[#F2F1ED] p-4 space-y-4" aria-label={de ? 'Schutzplan zum Aufhören' : 'Quit support plan'}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2"><Shield aria-hidden="true" className="w-3.5 h-3.5 text-[#B9BCBE]"/><span className="font-ui text-xs font-medium">{de ? 'Dein Schutzplan' : 'Your protection plan'}</span></div>
          <p className="font-ui text-[10.5px] text-[#8F9394] mt-1 leading-relaxed">{de ? 'Aufhören wird vorbereitet, nicht als Streak überwacht.' : 'Quitting is prepared, not monitored as a streak.'}</p>
        </div>
        <span className="font-mono text-[9px] text-[#B9BCBE] text-right">{statusText}</span>
      </div>

      <div className="rounded-xl border border-[#313536] p-3 space-y-2">
        <div className="flex items-center gap-2 text-[10px] text-[#B9BCBE]"><CalendarDays aria-hidden="true" className="w-3.5 h-3.5" />{de ? 'Optionales Aufhördatum' : 'Optional quit date'}</div>
        <input aria-label={de ? 'Optionales Aufhördatum' : 'Optional quit date'} type="date" value={plan.quitDate || ''} onChange={(e)=>updateDate(e.target.value)} className="w-full rounded-lg bg-[#232627] border border-[#3A3E40] px-3 py-2 text-xs text-[#F2F1ED] [color-scheme:dark]" />
        <p className="text-[9.5px] text-[#8F9394] leading-relaxed">{de ? 'Kein Countdown, kein Reset. Das Datum schaltet nur passende Vorbereitungs- und Recovery-Hilfen frei.' : 'No countdown, no reset. The date only activates relevant preparation and recovery support.'}</p>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between"><span className="font-ui text-[11px] font-medium">{de ? 'Schwierige Situationen vorbereiten' : 'Prepare difficult situations'}</span><span className="font-mono text-[9px] text-[#8F9394]">{plan.highRiskPlans.length}/3</span></div>
        {signals.length === 0 ? (
          <p className="text-[10.5px] text-[#8F9394] leading-relaxed">{de ? 'Noch kein wiederkehrendes Hochrisiko-Signal. Smoke Lab wartet auf echte Wiederholungen über mehrere Tage.' : 'No recurring high-risk signal yet. Smoke Lab waits for real repetitions across multiple days.'}</p>
        ) : signals.map((signal) => {
          const existing = plan.highRiskPlans.find((p)=>p.signature===signal.signature);
          const time = signal.timeWindow ? PatternEngine.getTimeWindowLabel(signal.timeWindow, locale) : null;
          return <div key={signal.signature} className="rounded-xl bg-[#232627] p-3 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div><div className="text-xs font-medium">{formatSituation(signal.trigger, locale)}{signal.place ? ` · ${formatPlace(signal.place, locale)}` : ''}</div><div className="text-[9.5px] text-[#8F9394] mt-0.5">{signal.observations} {de?'Beobachtungen':'observations'} · Ø {signal.averageCraving || '—'}/10{time ? ` · ${time}` : ''}</div></div>
              {existing ? <Check aria-hidden="true" className="w-4 h-4 text-[#6F8D7E] shrink-0"/> : <button onClick={()=>acceptSignal(signal)} className="rounded-lg border border-[#4A4E50] px-2.5 py-1.5 text-[10px] text-[#F2F1ED]">{de?'Plan anlegen':'Create plan'}</button>}
            </div>
            {existing && (editingSignature===signal.signature ? <div className="space-y-2"><textarea value={draftText} onChange={(e)=>setDraftText(e.target.value)} rows={3} className="w-full rounded-lg bg-[#191B1C] border border-[#3A3E40] p-2.5 text-[10.5px] text-[#F2F1ED]"/><button onClick={()=>saveEdit(signal.signature)} className="text-[10px] underline underline-offset-2">{de?'Speichern':'Save'}</button></div> : <button onClick={()=>{setEditingSignature(signal.signature);setDraftText(existing.planText)}} className="text-left text-[10.5px] text-[#B9BCBE] leading-relaxed hover:text-[#F2F1ED]">{existing.planText} <span className="text-[#6F8D7E]">{de?'· bearbeiten':'· edit'}</span></button>)}
          </div>;
        })}
      </div>

      {status === 'post_quit' || status === 'quit_day' ? (
        <div className="border-t border-[#313536] pt-3 text-[10.5px] text-[#B9BCBE] leading-relaxed">
          {recoveries.length > 0 ? (de ? `${recoveries.length} Situation${recoveries.length===1?'':'en'} nach deinem Start wurden ohne Reset ausgewertet.` : `${recoveries.length} situation${recoveries.length===1?'':'s'} after your start were reviewed without a reset.`) : (de ? 'Wenn du eine Zigarette loggst, wird nichts zurückgesetzt. Smoke Lab bietet dir stattdessen direkt eine kurze Recovery-Auswertung an.' : 'If you log a cigarette, nothing resets. Smoke Lab offers a short recovery review instead.')}
        </div>
      ) : null}
    </section>
  );
};
