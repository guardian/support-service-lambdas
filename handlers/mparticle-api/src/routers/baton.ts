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
        // Initiate properties
        initiationReference: string;
        message?: string;
    }
    | {
        requestType: "RER";
        action: "status";
        status: "pending" | "completed" | "failed";
        // Status properties
        message?: string;
    };