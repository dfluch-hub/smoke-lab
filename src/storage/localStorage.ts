import { UserProfile, JourneyProgress, SmokingEvent, CravingEvent } from '../types';
import {
  SmokingEventRepository,
  CravingEventRepository,
  ProfileRepository,
  JourneyRepository,
  ExperimentRepository,
  resetAllData,
  defaultJourneyProgress,
  QuitSupportRepository,
  LapseRecoveryRepository,
} from './repositories';

export {
  SmokingEventRepository,
  CravingEventRepository,
  ProfileRepository,
  JourneyRepository,
  ExperimentRepository,
  defaultJourneyProgress,
  QuitSupportRepository,
  LapseRecoveryRepository,
};

export function getUserProfile(): UserProfile | null {
  return ProfileRepository.get();
}

export function saveUserProfile(profile: UserProfile): void {
  ProfileRepository.save(profile);
}

export function updateUserProfile(partial: Partial<UserProfile>): UserProfile | null {
  return ProfileRepository.update(partial);
}

export function getSmokingEvents(): SmokingEvent[] {
  return SmokingEventRepository.getAll();
}

export function getCravingEvents(): CravingEvent[] {
  return CravingEventRepository.getAll();
}

export function getTodaySmokingEvents(): SmokingEvent[] {
  return SmokingEventRepository.getToday();
}

export function getJourneyProgress(): JourneyProgress {
  return JourneyRepository.get();
}

export function resetAllUserData(): void {
  resetAllData();
}

