import { type FirestoreTimestamp } from "./FireStoreTimestamp";

export class Market {
    id: string;
    title: string;
    openDate: FirestoreTimestamp;
    closeDate: FirestoreTimestamp;

    constructor(id: string, title: string, openDate: FirestoreTimestamp, closeDate: FirestoreTimestamp) {
        this.id = id;
        this.title = title;
        this.openDate = openDate;
        this.closeDate = closeDate;
    }
}
