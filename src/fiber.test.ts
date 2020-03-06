import axios from 'axios';
import { fun, wait } from './fiber';

describe('Fiber', () => {
    it('should run', async () => {
        const get = fun(axios.get);

        await wait(() => {
            const httpBinResponse = get(
                `https://httpbin.org/get?q=${get('https://example.com').status}`
            );
            expect(httpBinResponse.data.args).toEqual({ q: '200' });
        });
    });
    it('should fail', () => {
        const get = fun(axios.get);

        expect(
            wait(() => {
                const res = get('https://aaaa-never-existed.aaaa');
                console.log(res);
            })
        ).rejects.toMatchObject({ code: 'ENOTFOUND' });
    });
    it.only('should log', async () => {
        const get = fun(axios.get);
        const log = fun(data => {
            console.log(data);
        });

        await wait(() => {
            log(get('https://example.com').status);

            log(
                get('https://example.com/non-existent', {
                    validateStatus: s => s < 500
                }).status
            );
            log(get('https://example.com').status);
        });
    });
});
