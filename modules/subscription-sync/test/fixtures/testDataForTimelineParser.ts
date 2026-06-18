import type { ListOrderOrders } from '@modules/zuora/orders/listOrdersBySubscriptionNumber';
import type { ReplayOrder } from '../../src/buildOrder/unflattenOrder';
import type { FlattenedAction } from '../../src/flattenOrder';
import type { SubscriptionEvent } from '../../src/relativeConverter';
import type { OptionalFlattenedAction } from '../../src/removeDefaults';
import type { ResolvedSubscriptionEvent } from '../../src/resolveProductIds';
import { testDataWithProductSwitch } from './orderWithProductSwitchTestData';

export type TestDataForTimelineParser = (isInput: boolean) => {
	parsed: ListOrderOrders;
	flattened?: FlattenedAction[];
	withRelativeDates: SubscriptionEvent[];
	withoutDefaults?: OptionalFlattenedAction[];
	withProductIds?: ResolvedSubscriptionEvent[];
	readyForOrder?: ReplayOrder;
};

export const allTests = { testDataWithProductSwitch }; //, testDataWithManyRenewals };
