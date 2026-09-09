import { getCurrentIsoTime } from '../helpers';
import type { RuntimeDeps } from '../types';
import { getBrazeUuidFromIdapi } from './getBrazeUuidFromIdapi';
import { sendPaymentFailureExitEvent } from './sendPaymentFailureExitEvent';

export const defaultDeps: RuntimeDeps = {
	getBrazeUuidFromIdapi,
	sendPaymentFailureExitEvent,
	now: getCurrentIsoTime,
};
