// Test setup for Jest and fast-check

import "jest-environment-jsdom";

// Mock IDB classes
class MockIDBRequest {
	result: unknown = null;
	error: DOMException | null = null;
	onsuccess: ((event: Event) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	readyState: string = "done";
	transaction: IDBTransaction | null = null;
	source: IDBObjectStore | IDBIndex | IDBCursor | null = null;
}

class MockIDBDatabase {
	close = jest.fn();
	createObjectStore = jest.fn().mockReturnValue({
		createIndex: jest.fn(),
	});
	deleteObjectStore = jest.fn();
	transaction = jest.fn();
	version = 1;
	name = "test-db";
	objectStoreNames: string[] = [];
	onabort: ((event: Event) => void) | null = null;
	onclose: ((event: Event) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
	onversionchange: ((event: Event) => void) | null = null;
}

class MockIDBObjectStore {
	add = jest.fn().mockReturnValue(new MockIDBRequest());
	clear = jest.fn().mockReturnValue(new MockIDBRequest());
	count = jest.fn().mockReturnValue(new MockIDBRequest());
	createIndex = jest.fn();
	delete = jest.fn().mockReturnValue(new MockIDBRequest());
	deleteIndex = jest.fn();
	get = jest.fn().mockReturnValue(new MockIDBRequest());
	getAll = jest.fn().mockReturnValue(new MockIDBRequest());
	getAllKeys = jest.fn().mockReturnValue(new MockIDBRequest());
	getKey = jest.fn().mockReturnValue(new MockIDBRequest());
	index = jest.fn();
	openCursor = jest.fn().mockReturnValue(new MockIDBRequest());
	openKeyCursor = jest.fn().mockReturnValue(new MockIDBRequest());
	put = jest.fn().mockReturnValue(new MockIDBRequest());
}

class MockIDBTransaction {
	abort = jest.fn();
	commit = jest.fn();
	objectStore = jest.fn().mockReturnValue(new MockIDBObjectStore());
	db = new MockIDBDatabase();
	durability = "default";
	mode = "readonly";
	objectStoreNames: string[] = [];
	onabort: ((event: Event) => void) | null = null;
	oncomplete: ((event: Event) => void) | null = null;
	onerror: ((event: Event) => void) | null = null;
}

// Set up global IDB classes
interface GlobalWithIDB {
	IDBRequest: typeof MockIDBRequest;
	IDBDatabase: typeof MockIDBDatabase;
	IDBObjectStore: typeof MockIDBObjectStore;
	IDBTransaction: typeof MockIDBTransaction;
}

(global as unknown as GlobalWithIDB).IDBRequest = MockIDBRequest;
(global as unknown as GlobalWithIDB).IDBDatabase = MockIDBDatabase;
(global as unknown as GlobalWithIDB).IDBObjectStore = MockIDBObjectStore;
(global as unknown as GlobalWithIDB).IDBTransaction = MockIDBTransaction;

// Mock indexedDB
Object.defineProperty(global, "indexedDB", {
	value: {
		open: jest.fn().mockImplementation(() => {
			const request = new MockIDBRequest();
			setTimeout(() => {
				request.result = new MockIDBDatabase();
				if (request.onsuccess) {
					request.onsuccess({ target: request } as any);
				}
			}, 0);
			return request;
		}),
		deleteDatabase: jest.fn().mockReturnValue(new MockIDBRequest()),
		databases: jest.fn().mockResolvedValue([]),
		cmp: jest.fn(),
	},
	writable: true,
});

// Mock idb library
jest.mock("idb", () => ({
	openDB: jest.fn().mockResolvedValue({
		put: jest.fn().mockResolvedValue(undefined),
		get: jest.fn().mockResolvedValue(undefined),
		getAllFromIndex: jest.fn().mockResolvedValue([]),
		delete: jest.fn().mockResolvedValue(undefined),
		transaction: jest.fn().mockReturnValue({
			objectStore: jest.fn().mockReturnValue({
				clear: jest.fn().mockResolvedValue(undefined),
			}),
		}),
		close: jest.fn(),
	}),
}));

// Mock Web Speech API
Object.defineProperty(window, "SpeechRecognition", {
	value: jest.fn().mockImplementation(() => ({
		continuous: false,
		interimResults: false,
		lang: "en-US",
		maxAlternatives: 1,
		serviceURI: "",
		grammars: null,
		start: jest.fn(),
		stop: jest.fn(),
		abort: jest.fn(),
		onaudiostart: null,
		onaudioend: null,
		onend: null,
		onerror: null,
		onnomatch: null,
		onresult: null,
		onsoundstart: null,
		onsoundend: null,
		onspeechstart: null,
		onspeechend: null,
		onstart: null,
	})),
	writable: true,
});

Object.defineProperty(window, "webkitSpeechRecognition", {
	value: (window as typeof window & { SpeechRecognition: unknown })
		.SpeechRecognition,
	writable: true,
});

// Mock MediaRecorder
Object.defineProperty(window, "MediaRecorder", {
	value: jest.fn().mockImplementation(() => ({
		start: jest.fn(),
		stop: jest.fn(),
		pause: jest.fn(),
		resume: jest.fn(),
		requestData: jest.fn(),
		state: "inactive",
		stream: null,
		mimeType: "audio/webm",
		audioBitsPerSecond: 0,
		videoBitsPerSecond: 0,
		ondataavailable: null,
		onerror: null,
		onpause: null,
		onresume: null,
		onstart: null,
		onstop: null,
	})),
	writable: true,
});

// Mock navigator.mediaDevices
Object.defineProperty(navigator, "mediaDevices", {
	value: {
		getUserMedia: jest.fn().mockResolvedValue({
			getTracks: jest.fn().mockReturnValue([]),
			getAudioTracks: jest.fn().mockReturnValue([]),
			getVideoTracks: jest.fn().mockReturnValue([]),
		}),
		enumerateDevices: jest.fn().mockResolvedValue([]),
	},
	writable: true,
});

// Mock storage estimate
Object.defineProperty(navigator, "storage", {
	value: {
		estimate: jest.fn().mockResolvedValue({
			usage: 1000000,
			quota: 100000000,
		}),
	},
	writable: true,
});
