const fibers: { [id: string]: FiberState } = {};
let currentFiberId: string | null = null;

const uid = (): string => {
    return Math.floor(Math.random() * 1e9).toString(36);
};

class FiberState {
    protected cache: Map<string, any>;
    protected positionCounters: Map<string, number>;
    protected hash(functionId: string, position: number): string {
        return `${functionId}.${position}`;
    }
    protected getPosition(functionId: string): number {
        if (this.positionCounters.has(functionId)) {
            return this.positionCounters.get(functionId) as number;
        } else {
            return 0;
        }
    }
    constructor() {
        this.cache = new Map();
        this.positionCounters = new Map();
    }
    public rewind() {
        this.positionCounters.clear();
    }
    public incrementPosition(functionId: string): number {
        const newPosition = this.getPosition(functionId) + 1;
        this.positionCounters.set(functionId, newPosition);
        return newPosition;
    }
    public hasCachedResult(functionId: string, position: number): boolean {
        return this.cache.has(this.hash(functionId, position));
    }
    public getCachedResult(functionId: string, position: number): any {
        return this.cache.get(this.hash(functionId, position));
    }
    public setCachedResult(
        functionId: string,
        position: number,
        value: any
    ): void {
        this.cache.set(this.hash(functionId, position), value);
    }
}

// tslint:disable-next-line:max-classes-per-file
class InterruptionPromise<T> extends Promise<T> {}

export function fun<Result, Args extends any[]>(
    f: (...args: Args) => Result | Promise<Result>
) {
    const functionId = uid();

    const callableFunc = (...args: Args) => {
        if (currentFiberId === null) {
            throw new Error("Cannot be called outside of a fiber");
        }

        const currentFiber = fibers[currentFiberId];
        if (!currentFiber) {
            throw new Error(
                `Current fiber with id="${currentFiberId}" not found`
            );
        }

        const position = currentFiber.incrementPosition(functionId);

        if (currentFiber.hasCachedResult(functionId, position)) {
            return currentFiber.getCachedResult(functionId, position);
        }

        const pms = new InterruptionPromise<Result>((res, rej) => {
            try {
                Promise.resolve(f(...args)).then(res, rej);
            } catch (e) {
                rej(e);
            }
        });

        throw pms.then(result => {
            currentFiber.setCachedResult(functionId, position, result);
        });
    };
    return callableFunc;
}

export async function wait<Result>(func: () => Result): Promise<Result> {
    const id = uid();
    const thisFiber = new FiberState();
    fibers[id] = thisFiber;
    let res: Result;
    while (true) {
        try {
            currentFiberId = id;
            thisFiber.rewind();
            res = func();
            break;
        } catch (e) {
            if (e instanceof InterruptionPromise) {
                currentFiberId = null;
                await e;
                continue;
            } else {
                delete fibers[id];
                throw e;
            }
        } finally {
            currentFiberId = null;
        }
    }
    delete fibers[id];
    return res;
}
