/** Fake controlable de firebase/database con una base en memoria.
 *  Soporta ref/query(orderByChild+equalTo)/onValue/get/set/remove,
 *  que es todo lo que usa src/storage.ts. */

type AnyObj = Record<string, any>;

const store: { data: AnyObj } = { data: {} };

function getNode(path: string): any {
  if (!path) return store.data;
  return path
    .split("/")
    .reduce<any>((acc, seg) => (acc == null ? acc : acc[seg]), store.data);
}

function setNode(path: string, value: any) {
  const segs = path.split("/");
  let cur = store.data;
  for (let i = 0; i < segs.length - 1; i++) {
    cur[segs[i]] ??= {};
    cur = cur[segs[i]];
  }
  cur[segs[segs.length - 1]] = value;
}

function removeNode(path: string) {
  const segs = path.split("/");
  let cur: any = store.data;
  for (let i = 0; i < segs.length - 1; i++) {
    cur = cur?.[segs[i]];
    if (cur == null) return;
  }
  delete cur[segs[segs.length - 1]];
}

interface FakeRef {
  __path: string;
  __query?: { orderByChild?: string; equalTo?: unknown };
}

function makeSnapshot(refObj: FakeRef) {
  let node = getNode(refObj.__path);
  const q = refObj.__query;
  if (q?.orderByChild !== undefined && node && typeof node === "object") {
    const filtered: AnyObj = {};
    for (const [k, v] of Object.entries(node as AnyObj)) {
      if (v && typeof v === "object" && v[q.orderByChild] === q.equalTo)
        filtered[k] = v;
    }
    node = Object.keys(filtered).length > 0 ? filtered : null;
  }
  return {
    val: () => node ?? null,
    exists: () => node != null,
  };
}

export const __fakeDb = {
  setData(obj: AnyObj) {
    store.data = obj ?? {};
  },
  getData(): AnyObj {
    return store.data;
  },
  reset() {
    store.data = {};
  },
};

export const ref = jest.fn((_db: unknown, path: string): FakeRef => ({
  __path: path,
}));

export const query = jest.fn(
  (refObj: FakeRef, ...parts: AnyObj[]): FakeRef => ({
    __path: refObj.__path,
    __query: Object.assign({}, ...parts),
  }),
);

export const orderByChild = jest.fn((child: string) => ({ orderByChild: child }));
export const equalTo = jest.fn((value: unknown) => ({ equalTo: value }));

export const onValue = jest.fn((refObj: FakeRef, cb: (snap: any) => void) => {
  cb(makeSnapshot(refObj));
  return () => {};
});

export const get = jest.fn(async (refObj: FakeRef) => makeSnapshot(refObj));

export const set = jest.fn(async (refObj: FakeRef, value: unknown) => {
  setNode(refObj.__path, value);
});

export const remove = jest.fn(async (refObj: FakeRef) => {
  removeNode(refObj.__path);
});

export type Unsubscribe = () => void;
