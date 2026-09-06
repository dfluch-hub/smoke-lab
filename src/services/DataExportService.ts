import { UserProfile } from '../types';
import {
  CravingEventRepository,
  ExperimentRepository,
  JourneyRepository,
  SmokingEventRepository,
  QuitSupportRepository,
  LapseRecoveryRepository,
} from '../storage/repositories';
import { PersonalControlModelEngine } from './behavior/PersonalControlModelEngine';
import { WeeklyReviewEngine } from './behavior/WeeklyReviewEngine';
import { MaintenanceEngine } from './behavior/MaintenanceEngine';
import { ControlPlanEngine } from './behavior/ControlPlanEngine';
import { CURRENT_STORAGE_SCHEMA_VERSION } from './StorageMigrationService';

export class DataExportService {
  static buildExport(profile: UserProfile) {
    const smokingEvents = SmokingEventRepository.getAll();
    const cravingEvents = CravingEventRepository.getAll();
    const experiments = ExperimentRepository.getAll();
    const journey = JourneyRepository.get();
    const quitSupport = QuitSupportRepository.get();
    const lapseRecovery = LapseRecoveryRepository.getAll();
    const controlModel = PersonalControlModelEngine.build(profile, smokingEvents, cravingEvents, experiments);
    const weeklyReview = WeeklyReviewEngine.build(profile, smokingEvents, cravingEvents);
    const maintenance = MaintenanceEngine.build(profile, journey, smokingEvents, cravingEvents, experiments);
    const controlPlanV2 = ControlPlanEngine.build(profile, journey, smokingEvents, cravingEvents, experiments, quitSupport);

    return {
      product: 'SMOKE LAB',
      exportVersion: 2,
      storageSchemaVersion: CURRENT_STORAGE_SCHEMA_VERSION,
      exportedAt: new Date().toISOString(),
      notice: 'Personal self-management data export. Control Model fields are descriptive summaries of the user\'s own logs and are not clinical conclusions.',
      profile,
      journey,
      smokingEvents,
      cravingEvents,
      personalExperiments: experiments,
      currentControlModel: controlModel,
      currentControlPlan: controlPlanV2,
      currentWeeklyReview: weeklyReview,
      currentMaintenancePlan: maintenance,
      quitSupport,
      lapseRecovery,
    };
  }

  static downloadJson(profile: UserProfile): void {
    const data = this.buildExport(profile);
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `smoke-lab-export-${date}.json`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}
