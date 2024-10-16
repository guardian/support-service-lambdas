import { Lazy } from '../src/lazy';

test('it should only call the function when its used', async () => {
	let log = 0;
	const sut = new Lazy<string>(() => {
		log++;
		return Promise.resolve('hi');
	}, 'testing');
	expect(log).toEqual(0);
	expect(sut.get()).resolves.toEqual('hi');
	expect(log).toEqual(1);
	expect(sut.get()).resolves.toEqual('hi');
	expect(log).toEqual(1);
});

test('it should handle failed promises', async () => {
	let log = 0;
	const sut = new Lazy<string>(() => {
		log++;
		return Promise.reject('boom');
	}, 'testing');
	expect(log).toEqual(0);
	expect(sut.get()).rejects.toEqual('boom');
	expect(log).toEqual(1);
	expect(sut.get()).rejects.toEqual('boom');
	expect(log).toEqual(1);
});

test('it should only call the function when its used even if its mapped', async () => {
	let log = 0;
	const sut = new Lazy<string>(() => {
		log++;
		return Promise.resolve('hi');
	}, 'testing').then((value) => value);
	expect(log).toEqual(0);
	expect(sut.get()).resolves.toEqual('hi');
	expect(log).toEqual(1);
	expect(sut.get()).resolves.toEqual('hi');
	expect(log).toEqual(1);
});
