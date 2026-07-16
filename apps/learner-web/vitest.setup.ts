import "@testing-library/jest-dom/vitest";

const values = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return values.size;
  },
  clear() {
    values.clear();
  },
  getItem(key) {
    return values.get(key) ?? null;
  },
  key(index) {
    return Array.from(values.keys())[index] ?? null;
  },
  removeItem(key) {
    values.delete(key);
  },
  setItem(key, value) {
    values.set(key, value);
  },
};

Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: localStorageStub,
});
