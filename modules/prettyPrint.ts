import util from 'node:util';

export const prettyPrint = (object: any) => {
	return util.inspect(object, { depth: null, colors: true });
};

export const prettyLog = (object: any) => {
	console.log(prettyPrint(object));
};
