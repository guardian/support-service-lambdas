import { getCurrentIsoTime } from '../helpers/getCurrentIsoTime';
import type { RuntimeDeps } from '../types/runtimeDeps';
import { getBrazeUuidFromIdapi } from './getBrazeUuidFromIdapi';
import { sendPaymentFailureExitEvent } from './sendPaymentFailureExitEvent';

export const defaultDeps: RuntimeDeps = {
	getBrazeUuidFromIdapi,
	sendPaymentFailureExitEvent,
	now: getCurrentIsoTime,
};
