import { describe, expect, it } from 'vitest';
import { RemoveEachCandidate, RemoveEvidenceFile, type EvidenceObjectDriver } from '../StorageEvidenceStore.js';

interface Candidate {
    ID: string;
    Key: string;
}

/** A driver whose answers per object key come from a table; a key that is not in it deletes normally. */
class TableDriver implements EvidenceObjectDriver {
    public readonly Objects = new Set<string>();
    public constructor(private readonly behaviour: Record<string, 'Refuse' | 'Throw'> = {}) {}

    public async DeleteObject(objectName: string): Promise<boolean> {
        const behaviour = this.behaviour[objectName];
        if (behaviour === 'Throw') throw new Error('storage unreachable');
        if (behaviour === 'Refuse') return false;
        this.Objects.delete(objectName);
        return true;
    }

    public async ObjectExists(objectName: string): Promise<boolean> {
        return this.Objects.has(objectName);
    }
}

const A: Candidate = { ID: 'F-A', Key: 'credentialing-evidence/a.pdf' };
const B: Candidate = { ID: 'F-B', Key: 'credentialing-evidence/b.pdf' };

/** Removes the candidates over `driver`, deleting a row from `rows` only when the store says the object is gone. */
function removeAll(driver: TableDriver, rows: Set<string>): Promise<number> {
    return RemoveEachCandidate([A, B], (file) =>
        RemoveEvidenceFile(driver, file.Key, async () => {
            rows.delete(file.ID);
        }),
    );
}

describe('StorageEvidenceStore orphan removal', () => {
    it('keeps the row of an object the driver would not delete and removes the other', async () => {
        const driver = new TableDriver({ [A.Key]: 'Refuse' });
        driver.Objects.add(A.Key);
        driver.Objects.add(B.Key);
        const rows = new Set([A.ID, B.ID]);
        expect(await removeAll(driver, rows)).toBe(1);
        expect([...rows]).toEqual([A.ID]);
        expect(driver.Objects.has(A.Key)).toBe(true);
        expect(driver.Objects.has(B.Key)).toBe(false);
    });

    it('a driver that throws on one object still removes the other', async () => {
        const driver = new TableDriver({ [A.Key]: 'Throw' });
        driver.Objects.add(A.Key);
        driver.Objects.add(B.Key);
        const rows = new Set([A.ID, B.ID]);
        expect(await removeAll(driver, rows)).toBe(1);
        expect([...rows]).toEqual([A.ID]);
    });

    it('an object that is already gone (DeleteObject false, ObjectExists false) does not keep its row forever', async () => {
        const driver = new TableDriver({ [A.Key]: 'Refuse' });
        driver.Objects.add(B.Key);
        const rows = new Set([A.ID, B.ID]);
        expect(await removeAll(driver, rows)).toBe(2);
        expect(rows.size).toBe(0);
    });

    it('a row whose deletion throws is counted as not removed, and the next is still processed', async () => {
        const driver = new TableDriver();
        driver.Objects.add(A.Key);
        driver.Objects.add(B.Key);
        const rows = new Set([A.ID, B.ID]);
        const removed = await RemoveEachCandidate([A, B], (file) =>
            RemoveEvidenceFile(driver, file.Key, async () => {
                if (file.ID === A.ID) throw new Error('row delete failed');
                rows.delete(file.ID);
            }),
        );
        expect(removed).toBe(1);
        expect([...rows]).toEqual([A.ID]);
    });
});
