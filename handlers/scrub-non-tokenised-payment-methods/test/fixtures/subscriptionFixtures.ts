const daysFromToday = (days: number) =>
	new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const cancelledSubscription = {
	status: 'Cancelled',
	termEndDate: daysFromToday(-30),
};

/** Cancelled, but dated to the end of the term, so still being billed. */
export const cancelledAtEndOfTermSubscription = {
	status: 'Cancelled',
	termEndDate: daysFromToday(30),
};

export const activeSubscription = {
	status: 'Active',
	termEndDate: daysFromToday(30),
};
