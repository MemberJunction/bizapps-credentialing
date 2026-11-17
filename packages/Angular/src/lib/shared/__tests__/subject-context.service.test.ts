import '@angular/compiler';
import { describe, expect, it } from 'vitest';
import { SUBJECT_ID_PARAM, SubjectContext } from '../subject-context.service';

const SUBJECT_1 = '11111111-1111-1111-1111-111111111111';
const SUBJECT_2 = '22222222-2222-2222-2222-222222222222';
const FOREIGN_SUBJECT = '33333333-3333-3333-3333-333333333333';

describe('SubjectContext', () => {
    it('uses subjectId as the URL query parameter name', () => {
        expect(SUBJECT_ID_PARAM).toBe('subjectId');
    });

    it('holds a readonly SubjectID signal updated by Choose and Clear', () => {
        const ctx = new SubjectContext();
        expect(ctx.SubjectID()).toBeNull();
        ctx.Choose(SUBJECT_1);
        expect(ctx.SubjectID()).toBe(SUBJECT_1);
        ctx.Clear();
        expect(ctx.SubjectID()).toBeNull();
    });

    describe('FromUrl', () => {
        it('returns null when the user has zero subjects', () => {
            expect(SubjectContext.FromUrl({}, [])).toBeNull();
            expect(SubjectContext.FromUrl({ subjectId: SUBJECT_1 }, [])).toBeNull();
        });

        it('automatically selects the single subject when the URL carries no subjectId', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }];
            expect(SubjectContext.FromUrl({}, subjects)).toBe(SUBJECT_1);
            expect(SubjectContext.FromUrl({ subjectId: '   ' }, subjects)).toBe(SUBJECT_1);
        });

        it('returns null when the user has multiple subjects and no subjectId is in the URL', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }, { SubjectID: SUBJECT_2 }];
            expect(SubjectContext.FromUrl({}, subjects)).toBeNull();
            expect(SubjectContext.FromUrl({ subjectId: '' }, subjects)).toBeNull();
        });

        it('resolves a matching subjectId from the URL regardless of UUID case or surrounding spaces', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }, { SubjectID: SUBJECT_2 }];
            expect(SubjectContext.FromUrl({ subjectId: ` ${SUBJECT_2.toUpperCase()} ` }, subjects)).toBe(SUBJECT_2);
        });

        it('returns null when subjectId in the URL belongs to no subject of the user', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }, { SubjectID: SUBJECT_2 }];
            expect(SubjectContext.FromUrl({ subjectId: FOREIGN_SUBJECT }, subjects)).toBeNull();
            expect(SubjectContext.FromUrl({ subjectId: 'not-a-uuid' }, subjects)).toBeNull();
        });
    });

    describe('HasDeniedSubject', () => {
        it('is false when subjectId is absent or matches one of the user subjects', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }, { SubjectID: SUBJECT_2 }];
            expect(SubjectContext.HasDeniedSubject({}, subjects)).toBe(false);
            expect(SubjectContext.HasDeniedSubject({ subjectId: '  ' }, subjects)).toBe(false);
            expect(SubjectContext.HasDeniedSubject({ subjectId: SUBJECT_2.toUpperCase() }, subjects)).toBe(false);
        });

        it('is true when subjectId is present and matches no contact row of the user', () => {
            const subjects = [{ SubjectID: SUBJECT_1 }];
            expect(SubjectContext.HasDeniedSubject({ subjectId: FOREIGN_SUBJECT }, subjects)).toBe(true);
            expect(SubjectContext.HasDeniedSubject({ subjectId: 'not-a-uuid' }, subjects)).toBe(true);
            expect(SubjectContext.HasDeniedSubject({ subjectId: SUBJECT_1 }, [])).toBe(true);
        });
    });
});
