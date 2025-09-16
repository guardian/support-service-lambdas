import type { ZuoraResponse } from '../types';

export const isZuoraRequestSuccess = (response: ZuoraResponse) => {
	if (response.success !== undefined && response.success) {
		return true;
	}
	if (response.Success !== undefined && response.Success) {
		return true;
	}
	return false;
};
