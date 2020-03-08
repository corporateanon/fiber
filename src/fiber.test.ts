import axios from "axios";
import { fun, wait } from "./fiber";

describe("Fiber", () => {
    it("should run", async () => {
        const get = fun(axios.get, "axios.get");

        await wait(() => {
            const httpBinResponse = get(
                `https://httpbin.org/get?q=${get("https://example.com").status}`
            );
            expect(httpBinResponse.data.args).toEqual({ q: "200" });
        });
    });

    it("should fail", () => {
        const get = fun(axios.get, "axios.get");

        expect(
            wait(() => {
                get("https://aaaa-never-existed.aaaa");
            })
        ).rejects.toMatchObject({ code: "ENOTFOUND" });
    });

    it("should fail on regular promises thrown", () => {
        const throwNormalPromise = fun(() => {
            throw new Promise(res => res(1));
        }, "throwNormalPromise");

        expect(
            wait(() => {
                throwNormalPromise();
            })
        ).rejects.toBeInstanceOf(Promise);
    });

    it("should re-evaluate idempotent function if it is called multiple times in wait", async () => {
        const get = fun(axios.get, "axios.get");

        const logSpy = jest.fn();
        const log = fun(data => {
            logSpy(data);
        }, "console.log");

        await wait(() => {
            log(get("https://example.com").status);
            log(get("https://example.com").status);
            log("foo");
            log("foo");
        });

        expect(logSpy.mock.calls).toMatchInlineSnapshot(`
            Array [
              Array [
                200,
              ],
              Array [
                200,
              ],
              Array [
                "foo",
              ],
              Array [
                "foo",
              ],
            ]
        `);
    });

    it("should return correct values", async () => {
        const square = fun((x: number): number => {
            return x * x;
        }, "square");
        let results: number[] = [];
        await wait(() => {
            const a = square(2);
            const b = square(5);
            results = [a, b];
        });
        expect(results).toMatchInlineSnapshot(`
Array [
  4,
  25,
]
`);
    });

    it("should run in parallel without a mess", async () => {
        const sleepAndReturn = fun(<T>(delay: number, value: T) => {
            return new Promise(res => setTimeout(() => res(value), delay));
        }, "sleepAndReturn");

        const fib1 = () => {
            return [sleepAndReturn(100, 1), sleepAndReturn(50, 2)];
        };
        const fib2 = () => {
            return [sleepAndReturn(50, 3), sleepAndReturn(100, 4)];
        };

        expect(await Promise.all([wait(fib1), wait(fib2)]))
            .toMatchInlineSnapshot(`
Array [
  Array [
    1,
    2,
  ],
  Array [
    3,
    4,
  ],
]
`);
    });
});
