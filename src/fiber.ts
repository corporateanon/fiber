class Cache<Args extends any[], Result> {
    private hashToValue: Map<string, Result> = new Map();

    private argsToHash(args: Args) {
        return JSON.stringify(args);
    }

    public has(args: Args): boolean {
        return this.hashToValue.has(this.argsToHash(args));
    }

    public get(args: Args): Result | undefined {
        const hash = this.argsToHash(args);
        return this.hashToValue.get(hash);
    }

    public set(args: Args, value: Result): void {
        this.hashToValue.set(this.argsToHash(args), value);
    }
}

export function fun<Result, Args extends any[]>(
    f: (...args: Args) => Result | Promise<Result>
) {
    const memo = new Cache<Args, Result>();
    const callableFunc = (...args: Args) => {
        if (memo.has(args)) {
            return memo.get(args) as Result;
        }
        const pms = new Promise<Result>((res, rej) => {
            try {
                Promise.resolve(f(...args)).then(res, rej);
            } catch (e) {
                rej(e);
            }
        });
        throw pms.then(result => {
            memo.set(args, result);
        });
    };
    return callableFunc;
}

export async function wait(func: () => any) {
    let pms: Promise<any> | null = Promise.resolve();

    while (pms) {
        await pms;
        try {
            func();
            pms = null;
        } catch (e) {
            if (e instanceof Promise) {
                pms = e;
            } else {
                throw e;
            }
        }
    }
}
