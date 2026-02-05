export function buildCloudWatchSummaryMessage(
	teamTotal: number,
	alarmsList: Array<{
		readonly alarmName: string;
		alarmUrl: string;
		readonly count: number;
	}>,
) {
	return {
		cardsV2: [
			{
				cardId: 'alarm-summary',
				card: {
					header: { title: 'Alarm Summary for Past 7 Days' },
					sections: [
						buildTotalRow(teamTotal),
						buildBreakdownSection(alarmsList),
					],
				},
			},
		],
	};
}

function buildTotalRow(teamTotal: number) {
	return {
		widgets: [
			{
				textParagraph: {
					text: `<b>Total ALARM notifications: ${teamTotal}</b>`,
				},
			},
		],
	};
}
function buildBreakdownSection(
	alarmsList: Array<{
		readonly alarmUrl: string;
		alarmName: string;
		readonly count: number;
	}>,
) {
	return {
		header: 'Breakdown by alarm',
		widgets: [
			buildRow('<b>Alarm Name</b>', '<b>Count</b>'),
			...alarmsList.map(({ alarmUrl, alarmName, count }) => {
				return buildRow(
					`<a href="${alarmUrl}">${alarmName}</a>`,
					count.toString(),
				);
			}),
		],
	};
}

function buildRow(cell1: string, cell2: string) {
	return {
		columns: {
			columnItems: [
				{
					horizontalSizeStyle: 'FILL_AVAILABLE_SPACE',
					widgets: [{ textParagraph: { text: cell1 } }],
				},
				{
					horizontalSizeStyle: 'FILL_MINIMUM_SPACE',
					widgets: [{ textParagraph: { text: cell2 } }],
				},
			],
		},
	};
}
