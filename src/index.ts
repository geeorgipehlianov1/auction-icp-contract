import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic, Opt, Principal } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Auction = Record<{
    id: string;
    assetType: string;
    assetDescription: string;
    ownerName: string;
    owner: Principal;
    startDate: nat64;
    endDate: nat64;
    status: AuctionStatus
}>

type AuctionPayload = Record<{
    assetType: string;
    assetDescription: string;
    ownerName: string;
    status: AuctionStatus
}>

enum AuctionStatus {
    active = 'active', 
    inactive = 'inactive'   
}

const fixedEndDate = 86400000;

const auctionStorage = new StableBTreeMap<string, Auction>(0, 44, 1024);

$query
export function getAllAuctions(): Result<Vec<Auction>, string>
{
    try {
        return Result.Ok(auctionStorage.values());
    } catch (error) {
        return Result.Err('Failed to get auctions')
    }
}

$query
export function getAuctionById(auctionId: string): Result<Auction, string> {
    return match(auctionStorage.get(auctionId), {
        Some: (auction) => Result.Ok<Auction, string>(auction),
        None: () => Result.Err<Auction, string>(`Auction with the provided id: ${auctionId} has not been found!`)
    })
}

$query
export function getOwnersAuctions(): Result<Vec<Auction>, string> {
    try {
        return Result.Ok(auctionStorage.values().filter((auction) => auction.owner.toString() === ic.caller.toString()));   
    } catch (error) {
        return Result.Err(`Failed to retrieve your auctions!`)
    }
}

$query
export function getAuctionsByStatus(status: AuctionStatus): Result<Vec<Auction>, string> {
    try {
        if (!isAuctionStatusValid(status)) {
            return Result.Err(`Invalid auction status: ${status}`)
        }

        const auctions: Vec<Auction> = auctionStorage.values().filter((auction) => {
            return auction.status == status;
        });

        return Result.Ok(auctions);    
    } catch (error) { 
        return Result.Err('Failed to retrieve auction!')
    }
  
}

$query
export function getActiveAuctions(): Result<Vec<Auction>, string>
{ 
    try {
        return Result.Ok<Vec<Auction>, string>(auctionStorage.values().filter((auction) => auction.status === AuctionStatus.active))
    } catch (error) {
        return Result.Err(`Failed to retrieve auctions with ${AuctionStatus.active} status`)
    }
}

$query
export function getExpiredAuctions(): Result<Vec<Auction>, string> {
    try {
        return Result.Ok<Vec<Auction>, string>(auctionStorage.values().filter((auction) => auction.status === AuctionStatus.inactive))
    } catch (error) {
        return Result.Err(`Failed to retrieve auctions with ${AuctionStatus.inactive} status`)
    }
}

$update
export function createAuction(payload: AuctionPayload): Result<Auction, string> {
    try {
        if (!payload.assetType || !payload.assetDescription || !payload.ownerName || !payload.status) {
            return Result.Err<Auction, string>('Incomplete input data!');
        } 

        const auction: Auction = { id: uuidv4(), startDate: ic.time(), owner: ic.caller(), endDate: ic.time() + BigInt(fixedEndDate), ...payload };
        auctionStorage.insert(auction.id, auction);
        return Result.Ok(auction);   
    } catch (error) {
        return Result.Err<Auction, string>('Failed to create auction!');
    }
}

$update
export function updateAuction(auctionId: string, payload: AuctionPayload): Result<Auction, string> {
    return match(auctionStorage.get(auctionId), {
        Some: (auction) => {
            if (auction.owner.toString() !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only the owner can update this auction!');
            }
            const updatedAuction: Auction = { ...auction, ...payload };
            auctionStorage.insert(auction.id, updatedAuction);
            return Result.Ok<Auction, string>(updatedAuction);
        },
        None: () => Result.Err<Auction, string>(`Failed to update auction with id: ${auctionId}!`),
    });
}

$update
export function endAuction(auctionId: string): Result<Auction, string> { 
    return match(auctionStorage.get(auctionId), {
        Some: (auction) => {
            if (auction.owner.toString() !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only the owner can end this auction!');
            }

            if (auction.endDate >= ic.time()) {
                return Result.Err<Auction, string>('Auction already ended!')
            }

            const endedAuction: Auction = { ...auction, endDate: ic.time(), status: AuctionStatus.inactive };
            auctionStorage.insert(auction.id, endedAuction);
            return Result.Ok<Auction, string>(endedAuction);
        },
        None: () => Result.Err<Auction, string>(`Failed to end auction with id: ${auctionId}!`),
    });
}

$update
export function deleteAuction(auctionId: string): Result<Auction, string> { 
    return match(auctionStorage.remove(auctionId), {
        Some: (auction) => {
            if (auction.owner.toString() !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only owner can delete auction!');
            }
            return Result.Ok<Auction, string>(auction);
        },
        None: () => Result.Err<Auction, string>(`Failed to delete auction with id: ${auctionId}`),
    });
}

export function isAuctionStatusValid(status: AuctionStatus) {
    return status === AuctionStatus.active || status !== AuctionStatus.inactive
}

globalThis.crypto = {
     // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    }
};
