import { Lazy } from '@modules/lazy';

test('it should only call the function when its used', async () => {
	let log = 0;
	const sut = new Lazy<string>(() => {
		log++;
		return Promise.resolve('hi');
	}, 'testing');
	expect(log).toEqual(0);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(1);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(1);
});

test('it should handle failed promises by trying again', async () => {
	let log = 0;
	const sut = new Lazy<string>(() => {
		log++;
		if (log === 1) {
			return Promise.reject(new Error('boom'));
		} else {
			return Promise.resolve('hi');
		}
	}, 'testing');
	expect(log).toEqual(0);
	await expect(sut.get()).rejects.toThrow('boom');
	expect(log).toEqual(1);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);
});

test('it should handle failed promises on the "then" by trying again', async () => {
	let log = 0;
	const sut = new Lazy(
		() => Promise.resolve('always working value'),
		'testing',
	).then(() => {
		log++;
		if (log === 1) {
			return Promise.reject(new Error('boom'));
		} else {
			return Promise.resolve('hi');
		}
	});
	expect(log).toEqual(0);
	await expect(sut.get()).rejects.toThrow('boom');
	expect(log).toEqual(1);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);
	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);
});

test('it should handle failed promises initially and on the "then" by trying again', async () => {
	let logFirst = 0;
	let logThen = 0;
	const sut = new Lazy(() => {
		logFirst++;
		if (logFirst === 1) {
			return Promise.reject(new Error('boom'));
		} else {
			return Promise.resolve('hi');
		}
	}, 'testing').then(() => {
		logThen++;
		if (logThen === 1) {
			return Promise.reject(new Error('boom'));
		} else {
			return Promise.resolve('hi');
		}
	});
	expect(logFirst).toEqual(0);
	expect(logThen).toEqual(0);
	await expect(sut.get()).rejects.toThrow('boom');
	expect(logFirst).toEqual(1);
	expect(logThen).toEqual(0);
	await expect(sut.get()).rejects.toThrow('boom');
	expect(logFirst).toEqual(2);
	expect(logThen).toEqual(1);
	expect(await sut.get()).toEqual('hi');
	expect(logFirst).toEqual(2);
	expect(logThen).toEqual(2);
	expect(await sut.get()).toEqual('hi');
	expect(logFirst).toEqual(2);
	expect(logThen).toEqual(2);
});

test('it should only call the function twice if get is called while promise is unresolved and first rejects', async () => {
	let log = 0;
	let triggerRejection: (() => void) | undefined;

	const sut = new Lazy<string>(() => {
		log++;
		if (log === 1) {
			return new Promise((resolve, reject) => {
				triggerRejection = () => reject(new Error('boom'));
			});
		} else {
			return Promise.resolve('hi');
		}
	}, 'testing');

	expect(log).toEqual(0);

	// Call get twice while promise is unresolved
	const firstCall = sut.get();
	const secondCall = sut.get();
	expect(log).toEqual(1);

	triggerRejection!();
	await expect(firstCall).rejects.toThrow('boom');
	await expect(secondCall).rejects.toThrow('boom');
	expect(log).toEqual(1);

	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);

	expect(await sut.get()).toEqual('hi');
	expect(log).toEqual(2);
});

test('it should only call the function when its used even if its mapped', async () => {
	let log = 0;
	const original = new Lazy<string>(() => {
		log++;
		return Promise.resolve('hi');
	}, 'testing');
	const mapped = original.then((value) => `${value} bye`);
	const hiThen = original.then((value) => `${value} then`);
	const hiThenAnother = hiThen.then((value) => `${value} another`);
	expect(log).toEqual(0);
	expect(await original.get()).toEqual('hi');
	expect(log).toEqual(1);
	expect(await mapped.get()).toEqual('hi bye');
	expect(log).toEqual(1);
	expect(await hiThen.get()).toEqual('hi then');
	expect(log).toEqual(1);
	expect(await hiThenAnother.get()).toEqual('hi then another');
	expect(log).toEqual(1);
});
