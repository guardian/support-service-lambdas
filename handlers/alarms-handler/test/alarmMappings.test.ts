import { prodAppToTeams } from '../src/alarmMappings';

describe('getTeam', () => {
	it('returns the correct team for a given app', () => {
		const app = 'apps-metering';

		const team = prodAppToTeams(app);

		expect(team).toEqual(['GROWTH']);
	});

	it('returns SRE if the app does not have a team owner', () => {
		const app = 'foo';

		const team = prodAppToTeams(app);

		expect(team).toEqual(['SRE']);
	});

	it('returns SRE if there is no app tag', () => {
		const app = undefined;

		const team = prodAppToTeams(app);

		expect(team).toEqual(['SRE']);
	});
});
