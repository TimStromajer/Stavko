export class User {
    id: string;
    name: string;
    value: number;

    constructor(userId: string, name: string, value: number) {
        this.id = userId;
        this.name = name;
        this.value = value;
    }
}
