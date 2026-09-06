import {
  CravingEventRepository,
  ExperimentRepository,
  JourneyRepository,
  LapseRecoveryRepository,
  QuitSupportRepository,
  SmokingEventRepository,
} from '../storage/repositories';
import { StateIntegrityEngine } from './behavior/StateIntegrityEngine';

export interface StorageIntegrityReport {
  repaired: boolean;
  repairCodes: string[];
}

/** Runs a deterministic, non-destructive structural repair of local app state. */
export class StorageIntegrityService {
  static run(): StorageIntegrityReport {
    const current = {
      smokingEvents: SmokingEventRepository.getAll(),
      cravingEvents: CravingEventRepository.getAll(),
      journey: JourneyRepository.get(),
      experiments: ExperimentRepository.getAll(),
      quitSupport: QuitSupportRepository.get(),
      recoveries: LapseRecoveryRepository.getAll(),
    };
    const result = StateIntegrityEngine.repair(current);
    if (result.repairCodes.length > 0) {
      SmokingEventRepository.replaceAll(result.state.smokingEvents);
      CravingEventRepository.replaceAll(result.state.cravingEvents);
      JourneyRepository.save(result.state.journey);
      ExperimentRepository.replaceAll(result.state.experiments);
      QuitSupportRepository.save(result.state.quitSupport);
      LapseRecoveryRepository.replaceAll(result.state.recoveries);
    }
    return { repaired: result.repairCodes.length > 0, repairCodes: result.repairCodes };
  }
}
