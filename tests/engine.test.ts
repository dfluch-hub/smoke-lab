import { PatternEngine } from '../src/services/behavior/PatternEngine';
import { NextBestActionEngine } from '../src/services/behavior/NextBestActionEngine';
import { BehaviorInterventionEngine } from '../src/services/behavior/BehaviorInterventionEngine';
import type { CravingEvent, UserProfile } from '../src/types';

const profile: UserProfile = {
  id: 'u', version: 1,
  baseline: { typicalCigarettesPerDay: 12, yearsSmoking: 7 },
  goal: 'pattern', automaticSituations: ['Coffee'], onboardingCompleted: true,
  createdAt: '2026-09-01T08:00:00.000Z', updatedAt: '2026-09-01T08:00:00.000Z', preferredLanguage: 'de'
};
const makeC=(i:number, trigger:string, place='Arbeit', interventionId='COFFEE_SEPARATION', outcome:CravingEvent['outcome']='weaker'):CravingEvent => ({
 id:'c'+i,timestamp:`2026-09-0${1 + (i%3)}T0${8+(i%2)}:00:00.000Z`,trigger,place,initialIntensity:7,
 interventionId,interventionStartedAt:`2026-09-01T08:00:00.000Z`,outcome,elapsedSeconds:90
});
const assert=(cond:unknown,msg:string)=>{ if(!cond) throw new Error(msg); };

let rec=NextBestActionEngine.generate(profile,[],[],'de');
assert(rec.kind==='observe','new user should observe');

const early=[makeC(1,'Kaffee'),makeC(2,'Coffee'),makeC(3,'Kaffee')];
let analysis=PatternEngine.analyze([],early);
assert(analysis.topTriggers[0].name==='Coffee' && analysis.topTriggers[0].count===3,'DE/EN trigger normalization failed');
rec=NextBestActionEngine.generate(profile,[],early,'de');
assert(rec.targetTrigger==='Coffee','early coffee recommendation missing');
assert(rec.interventionId==='COFFEE_SEPARATION','coffee should recommend separation');

const stronger=[...early,makeC(4,'Coffee'),makeC(5,'Kaffee')];
analysis=PatternEngine.analyze([],stronger);
assert(analysis.strongestTrigger?.name==='Coffee','strongest coffee missing');


const comboEvents: CravingEvent[] = [
  { ...makeC(21,'Kaffee','Arbeit','COFFEE_SEPARATION','weaker'), outcome: undefined, timestamp:'2026-09-01T08:10:00.000Z' },
  { ...makeC(22,'Coffee','Work','COFFEE_SEPARATION','weaker'), outcome: undefined, timestamp:'2026-09-02T08:20:00.000Z' },
  { ...makeC(23,'Kaffee','Arbeit','COFFEE_SEPARATION','weaker'), outcome: undefined, timestamp:'2026-09-03T08:30:00.000Z' },
];
analysis=PatternEngine.analyze([],comboEvents);
assert(analysis.combinations[0]?.place==='Work' && analysis.combinations[0]?.timeWindow==='morning','specific trigger+place+time combination missing');
rec=NextBestActionEngine.generate(profile,[],comboEvents,'de');
assert(rec.kind==='context_experiment' && rec.targetPlace==='Work','context-specific next action missing');

const personal=[
 makeC(10,'Kaffee','Arbeit','THREE_MINUTE_DELAY','weaker'),
 makeC(11,'Coffee','Work','THREE_MINUTE_DELAY','gone'),
 makeC(12,'Kaffee','Arbeit','THREE_MINUTE_DELAY','weaker')
];
const sel=BehaviorInterventionEngine.selectIntervention('Coffee','Work',personal);
assert(sel.intervention.id==='THREE_MINUTE_DELAY' && sel.isAdaptiveRecommendation,'adaptive selection did not override default');
rec=NextBestActionEngine.generate(profile,[],personal,'de');
assert(rec.kind==='repeat_effective','personal helpful intervention should be repeated');

console.log('Smoke Lab engine tests: OK');
