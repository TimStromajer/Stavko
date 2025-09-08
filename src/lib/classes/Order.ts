import { type OrderType, type OrderAction, type OrderStatus } from './Enums';
import { type FirestoreTimestamp } from "./FireStoreTimestamp";

export class Order {
    id: string;
    marketId: string;
    type: OrderType;
    action: OrderAction;
    amount: number;
    price: number;
    userId: string;
    placedDate: FirestoreTimestamp;
    lastChangeDate?: FirestoreTimestamp;
    status: OrderStatus;
    acceptorUserId?: number;

    constructor(
        id: string,
        marketId: string,
        type: OrderType,
        action: OrderAction,
        amount: number,
        price: number,
        userId: string,
        placedDate: FirestoreTimestamp,
        status: OrderStatus = 'PENDING',
        lastChangeDate?: FirestoreTimestamp,
        acceptorUserId?: number
    ) {
        this.id = id;
        this.marketId = marketId;
        this.type = type;
        this.action = action;
        this.amount = amount;
        this.price = price;
        this.userId = userId;
        this.placedDate = placedDate;
        this.status = status;
        this.lastChangeDate = lastChangeDate;
        this.acceptorUserId = acceptorUserId;
    }
}
