export function buildText(text: string) {
	return {
		textParagraph: {
			text,
		},
	};
}

export function buildRow(
	label: string,
	value: string,
	maximise: 'left' | 'right',
) {
	return {
		columns: {
			columnItems: [
				{
					horizontalSizeStyle:
						maximise === 'left' ? 'FILL_AVAILABLE_SPACE' : 'FILL_MINIMUM_SPACE',
					widgets: [{ textParagraph: { text: label } }],
				},
				{
					horizontalSizeStyle:
						maximise === 'right'
							? 'FILL_AVAILABLE_SPACE'
							: 'FILL_MINIMUM_SPACE',
					widgets: [{ textParagraph: { text: value } }],
				},
			],
		},
	};
}

export function buildAlarmUrl(alarmName: string) {
	const alarmUrl =
		'https://console.aws.amazon.com/cloudwatch/home?region=eu-west-1#alarmsV2:alarm/' +
		encodeURIComponent(alarmName).replaceAll('.', '%2E');
	return alarmUrl;
}
