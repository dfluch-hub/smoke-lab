import React, { useRef, useState } from 'react';
import { AlertTriangle, Check, Download, FileJson, Upload } from 'lucide-react';
import { UserProfile } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { DataExportService } from '../../services/DataExportService';
import { BackupRestoreService, BackupValidationResult } from '../../services/BackupRestoreService';
import { ModalSheet } from '../common/ModalSheet';

const errorText = (codes: string[], de: boolean) => {
  if (codes.includes('invalid_json')) return de ? 'Die Datei ist kein gültiges JSON-Backup.' : 'The file is not a valid JSON backup.';
  if (codes.includes('wrong_product')) return de ? 'Diese Datei ist kein Smoke-Lab-Backup.' : 'This file is not a Smoke Lab backup.';
  if (codes.includes('future_storage_schema')) return de ? 'Das Backup stammt aus einer neueren Smoke-Lab-Version. Aktualisiere zuerst die App.' : 'This backup comes from a newer Smoke Lab version. Update the app first.';
  if (codes.includes('backup_too_large')) return de ? 'Die Backup-Datei ist ungewöhnlich groß und wurde nicht geöffnet.' : 'The backup file is unusually large and was not opened.';
  return de ? 'Das Backup ist unvollständig oder enthält ungültige Daten. Es wurde nichts verändert.' : 'The backup is incomplete or contains invalid data. Nothing was changed.';
};

export const DataPortabilityPanel: React.FC<{ userProfile: UserProfile }> = ({ userProfile }) => {
  const { locale } = useLanguage();
  const de = locale === 'de';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [validation, setValidation] = useState<BackupValidationResult | null>(null);
  const [restoreError, setRestoreError] = useState('');
  const [restored, setRestored] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const restoringRef = useRef(false);

  const resetModal = () => {
    setOpen(false);
    setFileName('');
    setValidation(null);
    setRestoreError('');
    setRestored(false);
    setRestoring(false);
    restoringRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setRestoreError('');
    setRestored(false);
    try {
      const text = await file.text();
      setValidation(BackupRestoreService.parse(text));
    } catch {
      setValidation({ ok: false, errors: ['file_read_failed'], warnings: [] });
    }
    setOpen(true);
  };

  const handleRestore = () => {
    if (!validation?.ok || restoringRef.current) return;
    restoringRef.current = true;
    setRestoring(true);
    const result = BackupRestoreService.restore(validation);
    if (!result.ok) {
      setRestoreError(de
        ? 'Wiederherstellung fehlgeschlagen. Der vorherige lokale Stand wurde beibehalten bzw. zurückgerollt.'
        : 'Restore failed. The previous local state was kept or rolled back.');
      restoringRef.current = false;
      setRestoring(false);
      return;
    }
    setRestored(true);
    restoringRef.current = false;
    setRestoring(false);
  };

  const preview = validation?.preview;

  return (
    <>
      <section aria-label={de ? 'Datensicherung und Wiederherstellung' : 'Backup and restore'} className="pt-3 border-t border-[#D9D9D4] space-y-3">
        <div className="space-y-0.5">
          <span className="font-ui text-xs font-medium text-[#191B1C] block">
            {de ? 'Deine Daten mitnehmen' : 'Take your data with you'}
          </span>
          <span className="font-ui text-[11px] text-[#747779] block leading-relaxed">
            {de
              ? 'Backup und Restore bleiben lokal im Browser. Die Datei wird nicht an Smoke Lab hochgeladen.'
              : 'Backup and restore stay local in your browser. The file is not uploaded to Smoke Lab.'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => DataExportService.downloadJson(userProfile)}
            className="btn-tactile min-h-[48px] rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] px-3 py-2.5 text-xs font-medium text-[#191B1C] hover:bg-[#E7E7E3] transition flex items-center justify-center gap-2"
          >
            <Download aria-hidden="true" className="w-4 h-4 stroke-[1.6]" />
            {de ? 'Backup exportieren' : 'Export backup'}
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-tactile min-h-[48px] rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] px-3 py-2.5 text-xs font-medium text-[#191B1C] hover:bg-[#E7E7E3] transition flex items-center justify-center gap-2"
          >
            <Upload aria-hidden="true" className="w-4 h-4 stroke-[1.6]" />
            {de ? 'Backup einspielen' : 'Restore backup'}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={handleFile}
          aria-label={de ? 'Smoke-Lab-Backup auswählen' : 'Choose Smoke Lab backup'}
        />
        <p className="font-ui text-[10.5px] text-[#747779] leading-relaxed">
          {de
            ? 'Restore ersetzt erst nach deiner Bestätigung den aktuellen lokalen Stand. Exportiere ihn vorher, wenn du ihn behalten möchtest.'
            : 'Restore replaces the current local state only after your confirmation. Export it first if you want to keep it.'}
        </p>
      </section>

      <ModalSheet
        isOpen={open}
        onClose={resetModal}
        badge="BACKUP"
        title={de ? 'Backup prüfen' : 'Review backup'}
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] p-3.5">
            <FileJson aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0">
              <div className="truncate text-xs font-medium">{fileName || (de ? 'Backup-Datei' : 'Backup file')}</div>
              <div className="mt-0.5 text-[10.5px] text-[#747779]">{de ? 'Wird ausschließlich lokal geprüft.' : 'Validated locally only.'}</div>
            </div>
          </div>

          {validation && !validation.ok && (
            <div role="alert" className="rounded-xl border border-[#C8BEB1] bg-[#EEE8DE] p-3.5 flex gap-2.5">
              <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
              <p className="text-xs leading-relaxed">{errorText(validation.errors, de)}</p>
            </div>
          )}

          {validation?.ok && preview && !restored && (
            <>
              <div className="rounded-xl border border-[#D9D9D4] divide-y divide-[#D9D9D4] text-xs">
                <div className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-[#747779]">{de ? 'Journey' : 'Journey'}</span><span>{de ? `Tag ${preview.journeyDay}` : `Day ${preview.journeyDay}`}</span></div>
                <div className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-[#747779]">{de ? 'Zigaretten-Logs' : 'Smoking logs'}</span><span>{preview.smokingEvents}</span></div>
                <div className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-[#747779]">{de ? 'Drang-Logs' : 'Craving logs'}</span><span>{preview.cravingEvents}</span></div>
                <div className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-[#747779]">{de ? 'Experimente' : 'Experiments'}</span><span>{preview.experiments}</span></div>
                <div className="flex justify-between gap-4 px-3.5 py-2.5"><span className="text-[#747779]">{de ? 'Recovery-Einträge' : 'Recovery records'}</span><span>{preview.recoveries}</span></div>
              </div>

              {validation.warnings.length > 0 && (
                <p className="text-[10.5px] text-[#747779] leading-relaxed">
                  {de
                    ? 'Ältere oder strukturell doppelte Daten werden beim Restore vorsichtig auf das aktuelle Format normalisiert. Es werden keine Verhaltensereignisse erfunden.'
                    : 'Older or structurally duplicated data will be conservatively normalized to the current format during restore. No behavioral events are invented.'}
                </p>
              )}

              <div className="rounded-xl bg-[#E7E7E3] p-3.5">
                <p className="text-xs leading-relaxed">
                  <strong>{de ? 'Wichtig:' : 'Important:'}</strong>{' '}
                  {de
                    ? 'Mit „Wiederherstellen“ ersetzt dieses Backup deine derzeit lokal gespeicherten Smoke-Lab-Daten.'
                    : 'Choosing “Restore” replaces the Smoke Lab data currently stored on this device.'}
                </p>
              </div>

              {restoreError && <p role="alert" className="text-xs leading-relaxed">{restoreError}</p>}

              <div className="flex gap-2">
                <button type="button" onClick={resetModal} className="flex-1 rounded-xl border border-[#D9D9D4] px-4 py-3 text-xs font-medium">
                  {de ? 'Abbrechen' : 'Cancel'}
                </button>
                <button type="button" onClick={handleRestore} disabled={restoring} className="flex-1 rounded-xl bg-[#191B1C] px-4 py-3 text-xs font-semibold text-[#F2F1ED] disabled:opacity-60 disabled:cursor-not-allowed">
                  {restoring ? (de ? 'Wird wiederhergestellt …' : 'Restoring …') : (de ? 'Wiederherstellen' : 'Restore')}
                </button>
              </div>
            </>
          )}

          {restored && (
            <div role="status" className="space-y-4">
              <div className="rounded-xl border border-[#D9D9D4] bg-[#F8F7F3] p-4 flex gap-3">
                <Check aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <p className="text-xs leading-relaxed">
                  {de
                    ? 'Backup wurde wiederhergestellt. Lade Smoke Lab jetzt neu, damit alle Ansichten den wiederhergestellten Stand verwenden.'
                    : 'Backup restored. Reload Smoke Lab now so every view uses the restored state.'}
                </p>
              </div>
              <button type="button" onClick={() => window.location.reload()} className="w-full rounded-xl bg-[#191B1C] px-4 py-3 text-xs font-semibold text-[#F2F1ED]">
                {de ? 'Smoke Lab neu laden' : 'Reload Smoke Lab'}
              </button>
            </div>
          )}
        </div>
      </ModalSheet>
    </>
  );
};
