import { describe, expect, it } from 'vitest';
import { EngineStaffNotifier } from '../EngineStaffNotifier.js';

describe('EngineStaffNotifier.SubmittedMessage', () => {
    it('reads correctly for a person and for an organization (no "its")', () => {
        expect(
            EngineStaffNotifier.SubmittedMessage({ SubjectName: 'Sample Applicant Three', ProgramName: 'Sample Field Inspector', VersionLabel: '2027' }),
        ).toBe('Sample Applicant Three submitted the Sample Field Inspector 2027 application.');
        expect(
            EngineStaffNotifier.SubmittedMessage({ SubjectName: 'Sample Member Organization', ProgramName: 'Sample Organization Review', VersionLabel: '2027' }),
        ).toBe('Sample Member Organization submitted the Sample Organization Review 2027 application.');
    });
});
