import { describe, it, expect } from 'vitest';
import * as Core from '../index';
describe('credentialing-core', () => {
    it('loads its barrel', () => { expect(Core).toBeDefined(); });
});
