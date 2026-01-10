// IndexedDB wrapper tests

import { IndexedDBWrapper } from '../src/storage/indexeddb-wrapper';

describe('IndexedDBWrapper', () => {
  let wrapper: IndexedDBWrapper;

  beforeEach(() => {
    wrapper = new IndexedDBWrapper();
  });

  describe('Initialization', () => {
    test('should create wrapper instance', () => {
      expect(wrapper).toBeInstanceOf(IndexedDBWrapper);
    });

    test('should have initialize method', () => {
      expect(typeof wrapper.initialize).toBe('function');
    });
  });

  describe('Storage methods', () => {
    test('should have all required storage methods', () => {
      expect(typeof wrapper.saveSession).toBe('function');
      expect(typeof wrapper.getSession).toBe('function');
      expect(typeof wrapper.getSessionsByUser).toBe('function');
      expect(typeof wrapper.deleteSession).toBe('function');
      expect(typeof wrapper.savePreferences).toBe('function');
      expect(typeof wrapper.getPreferences).toBe('function');
      expect(typeof wrapper.saveAudioFile).toBe('function');
      expect(typeof wrapper.getAudioFile).toBe('function');
      expect(typeof wrapper.getStorageEstimate).toBe('function');
    });
  });

  describe('Storage estimate', () => {
    test('should return storage estimate structure', async () => {
      const estimate = await wrapper.getStorageEstimate();
      expect(estimate).toHaveProperty('usage');
      expect(estimate).toHaveProperty('quota');
      expect(typeof estimate.usage).toBe('number');
      expect(typeof estimate.quota).toBe('number');
    });
  });
});