// https://github.com/guardian/baton/blob/1037c63c9bd782aed514bf6aaa38a54dabf699eb/README.md
export type BatonRerEventRequest =
    | {
        requestType: "RER";
        action: "initiate";
        // Initiate properties
        subjectId: string;
        subjectEmail?: string;
        dataProvider: "mparticlerer";
    }
    | {
        requestType: "RER";
        action: "status";
        // Status properties
        initiationReference: string;
    };

export type BatonRerEventResponse =
    | {
        requestType: "RER";
        action: "initiate";
        status: "pending" | "completed" | "failed";
        message?: string;
        // Initiate properties
        initiationReference: string;
    }
    | {
        requestType: "RER";
        action: "status";
        status: "pending" | "completed" | "failed";
        message?: string;
    };

export const batonRerRouter = {
    routeRequest: async (event: BatonRerEventRequest): Promise<BatonRerEventResponse> => {
        await Promise.resolve(true);
        console.log(event);
        return {
            requestType: "RER",
            action: "initiate",
            status: 'pending',
            initiationReference: '123'
        };
    }
}