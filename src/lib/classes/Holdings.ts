import { type OrderType } from './Enums';

export class Holdings {
    id: string;
    userId: string;
    marketId: string;
    type: OrderType;
    amount: number;

    constructor(
        id: string,
        userId: string,
        marketId: string,
        type: OrderType,
        amount: number
    ) {
        this.id = id;
        this.userId = userId;
        this.marketId = marketId;
        this.type = type;
        this.amount = amount;
    }
}
