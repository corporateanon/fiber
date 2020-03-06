class Cache<Args extends any[], Result> {
    private hashToValue: Map<string, Result> = new Map();

    private argsToHash(args: Args, callNumber: number) {
        return JSON.stringify([callNumber, ...args]);
    }

    public has(args: Args, callNumber: number): boolean {
        return this.hashToValue.has(this.argsToHash(args, callNumber));
    }

    public get(args: Args, callNumber: number): Result | undefined {
        const hash = this.argsToHash(args, callNumber);
        return this.hashToValue.get(hash);
    }

    public set(args: Args, value: Result, callNumber: number): void {
        this.hashToValue.set(this.argsToHash(args, callNumber), value);
    }
}

function sleep() {
    return new Promise(res => setImmediate(res));
}

export function fun<Result, Args extends any[]>(
    f: (...args: Args) => Result | Promise<Result>,
    _logName: string
) {
    const evaluationCache = new Cache<Args, Result>();

    let callNumberInCurrentStack = 0;
    const resetCallNumber = () => {
        callNumberInCurrentStack = 0;
    };
    let timer = setImmediate(resetCallNumber);

    const callableFunc = (...args: Args) => {
        clearImmediate(timer);
        timer = setImmediate(resetCallNumber, 0);

        callNumberInCurrentStack++;

        if (evaluationCache.has(args, callNumberInCurrentStack)) {
            return evaluationCache.get(
                args,
                callNumberInCurrentStack
            ) as Result;
        }
        const callNumberOfThisEvaluation = callNumberInCurrentStack;
        const pms = new Promise<Result>((res, rej) => {
            try {
                // console.log(
                //     `${callNumberInCurrentStack}. Evaluating ${logName}(${args})`
                // );
                Promise.resolve(f(...args)).then(res, rej);
            } catch (e) {
                rej(e);
            }
        });
        throw pms.then(result => {
            evaluationCache.set(args, result, callNumberOfThisEvaluation);
        });
    };
    return callableFunc;
}

export async function wait(func: () => any) {
    let pms: Promise<any> | null = Promise.resolve();

    // let i = 0;
    while (pms) {
        // console.log(`Iteration: ${i}`);
        // i++;
        await pms;
        try {
            func();
            pms = null;
        } catch (e) {
            if (e instanceof Promise) {
                pms = e;
                await sleep();
            } else {
                throw e;
            }
        }
    }
}
