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
});
