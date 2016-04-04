
export interface Equatable<T> {
    equals(other: T): boolean;
}

export class Helper {
    public static without<T extends Equatable<T>>(arr: T[], t: T|T[]): T[] {
        if (t instanceof Array)
            return arr.filter(v => (<T[]>t).every(t2 => !t2.equals(v)));
        else
            return arr.filter(v => !v.equals(<T>t));
    }  
    
    public static unique<T>(arr: T[], hashFunc?: (x:T) => string): T[] {
        var hm = HashMap.create(arr, x => x, hashFunc);
        return hm.getKeys();
    }
    
    public static first<T>(arr: T[], predicate: (x:T) => boolean): T|undefined {
        for (var item of arr) {
            if (predicate(item))
                return item;
        }
        
        return undefined;
    }
}


export interface Map<TKey, TValue> {
    get(key: TKey): TValue;
    has(key: TKey): boolean;
}

export interface FiniteMap<TKey, TValue> extends Map<TKey, TValue> {
    getKeys(): TKey[];
}

export class HierarchyMap<TKey, TValue> implements Map<TKey, TValue> {
    
    public readonly localMap: Map<TKey, TValue>;
    public readonly parentMap: Map<TKey, TValue>|null;
    
    constructor(localMap: Map<TKey, TValue>, parentMap: Map<TKey, TValue>|null) {
        this.localMap = localMap;
        this.parentMap = parentMap;
    }
    
    public get(key: TKey): TValue {
        if (this.localMap.has(key) || this.parentMap === null)
            return this.localMap.get(key);
        return this.parentMap.get(key);
    }
    
    public has(key: TKey): boolean {
        if (this.localMap.has(key))
            return true;
        return this.parentMap != null && this.parentMap.has(key);
    }
}

export class FiniteHierarchyMap<TKey, TValue> extends HierarchyMap<TKey, TValue> implements FiniteMap<TKey, TValue> {
    
    constructor(localMap: FiniteMap<TKey, TValue>, parentMap: FiniteMap<TKey, TValue>|null) {
        super(localMap, parentMap);
    }
    
    public getKeys(): TKey[] {
        const lm = <FiniteMap<TKey, TValue>>this.localMap;
        const pm = <FiniteMap<TKey, TValue>>this.parentMap;
        
        return lm.getKeys().concat(pm.getKeys().filter(k => !lm.has(k)));
    }
}



export class HashMap<TKey, TValue> implements FiniteMap<TKey, TValue> {
    
    private static id = 0;
    
    public static create<TKey, TValue>(values: TValue[], keySelector: (TValue) => TKey, hashFunc?: (TKey) => string): HashMap<TKey, TValue> {
        return new HashMap<TKey, TValue>(values.map(v => { return { value : v, key : keySelector(v) } }), hashFunc);
    }
    
    private values: { [hashedKey: string]: { key: TKey, val: TValue } };
    private hashFunc: (TKey) => string;
    
    constructor(values?: { key: TKey, value: TValue }[], hashFunc?: (TKey) => string) {
        
        if (hashFunc != undefined)
            this.hashFunc = hashFunc;
        else {
            this.hashFunc = (x) => {
                if (typeof x === "object") {
                    if (x === null)
                        return "__null";
                    if (x["hediet.de/hash"] == undefined)
                        x["hediet.de/hash"] = "obj#" + HashMap.id++;
                    return x["hediet.de/hash"];
                }
                return JSON.stringify(x);
            };
        }
        
        this.values = {};
        if (values != undefined)
            for (var v of values)
                this.set(v.key, v.value);
    }
    
    public get(key: TKey): TValue {
        return this.values[this.hashFunc(key)].val;
    }
    
    public has(key: TKey): boolean {
        return this.values[this.hashFunc(key)] != undefined;
    }
    
    public set(key: TKey, value: TValue) {
        this.values[this.hashFunc(key)] = { key: key, val: value };
    }
    
    public getKeys(): TKey[] {
        return Object.getOwnPropertyNames(this.values).map(n => this.values[n].key);
    }
}


