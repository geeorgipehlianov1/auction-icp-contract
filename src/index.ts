import { $query, $update, Record, StableBTreeMap, Vec, match, Result, nat64, ic } from 'azle';
import { v4 as uuidv4 } from 'uuid';

type Auction = Record<{
    id: string;
    assetType: string;
    assetDescription: string;
    ownerName: string;
    ownerId: string;
    startDate: nat64;
    endDate: nat64;
    status: string;
}>;

type AuctionPayload = Record<{
    assetType: string;
    assetDescription: string;
    ownerName: string;
    status: string;
}>;
// one day in nanoseconds
const fixedEndDate = 86400000000000;

const auctionStorage = new StableBTreeMap<string, Auction>(1, 44, 1024);

/**
 * Retrieves all auctions from the system.
 * @returns A Result containing a list of auctions or an error message.
 */
$query;
export function getAllAuctions(): Result<Vec<Auction>, string> {
    try {
        return Result.Ok(auctionStorage.values());
    } catch (error) {
        return Result.Err('Failed to get auctions');
    }
}

/**
 * Retrieves a specific auction by ID.
 * @param auctionId - The ID of the auction to retrieve.
 * @returns A Result containing the auction or an error message.
 */
$query;
export function getAuctionById(auctionId: string): Result<Auction, string> {
    // Validate ID
    if (!isValidUUID(auctionId)) {
        return Result.Err<Auction, string>('Invalid auction ID');
    }

    return match(auctionStorage.get(auctionId), {
        Some: (auction) => Result.Ok<Auction, string>(auction),
        None: () => Result.Err<Auction, string>(`Auction with the provided id: ${auctionId} has not been found!`),
    });
}

/**
 * Retrieves all auctions owned by a specific owner.
 * @param ownerId - The ID of the owner.
 * @returns A Result containing a list of auctions or an error message.
 */
$query;
export function getOwnersAuctions(ownerId: string): Result<Vec<Auction>, string> {
    // Validate ID
    if (!isValidUUID(ownerId)) {
        return Result.Err<Vec<Auction>, string>('Invalid owner ID');
    }

    try {
        return Result.Ok(auctionStorage.values().filter((auction) => auction.ownerId === ownerId));
    } catch (error) {
        return Result.Err(`Failed to retrieve auctions for owner with ID ${ownerId}!`);
    }
}

/**
 * Retrieves auctions based on their status.
 * @param status - The status to filter auctions.
 * @returns A Result containing a list of auctions or an error message.
 */
$query;
export function getAuctionsByStatus(status: string): Result<Vec<Auction>, string> {
    try {
        // Validate status
        if (!isAuctionStatusValid(status)) {
            return Result.Err(`Invalid auction status: ${status}`);
        }

        const auctions: Vec<Auction> = auctionStorage.values().filter((auction) => {
            return auction.status == status;
        });

        return Result.Ok(auctions);
    } catch (error) {
        return Result.Err('Failed to retrieve auctions!');
    }
}

/**
 * Creates a new auction.
 * @param payload - Information about the auction.
 * @returns A Result containing the new auction or an error message.
 */
$update;
export function createAuction(payload: AuctionPayload): Result<Auction, string> {
    try {
        // Validate payload
        if (isInvalidString(payload.assetType) || isInvalidString(payload.assetDescription) || isInvalidString(payload.ownerName) || !isAuctionStatusValid(payload.status)) {
            return Result.Err<Auction, string>('Incomplete input data!');
        }

        // Generate a unique ID for the auction
        const auctionId = uuidv4();
        // Set each property for better performance
        const newAuction: Auction = {
            id: auctionId,
            assetType: payload.assetType,
            assetDescription: payload.assetDescription,
            ownerName: payload.ownerName,
            ownerId: ic.caller().toString(), // Generate a unique owner ID
            startDate: ic.time(),
            endDate: ic.time() + BigInt(fixedEndDate),
            status: payload.status,
        };

        // Add the auction to auctionStorage
        auctionStorage.insert(newAuction.id, newAuction);

        return Result.Ok(newAuction);
    } catch (error) {
        return Result.Err<Auction, string>('Failed to create auction!');
    }
}

/**
 * Updates information for a specific auction.
 * @param auctionId - The ID of the auction to update.
 * @param ownerId - The ID of the owner making the update.
 * @param payload - Updated information about the auction.
 * @returns A Result containing the updated auction or an error message.
 */
$update;
export function updateAuction(auctionId: string, payload: AuctionPayload): Result<Auction, string> {
    // Validate IDs
    if (!isValidUUID(auctionId) ) {
        return Result.Err<Auction, string>('Invalid auction ID for updating an auction.');
    }

    // Validate payload
    if (isInvalidString(payload.assetType) || isInvalidString(payload.assetDescription) || isInvalidString(payload.ownerName)) {
        return Result.Err<Auction, string>('Incomplete input data!');
    }

    return match(auctionStorage.get(auctionId), {
        Some: (auction) => {
            // Validate ownership
            if (auction.ownerId !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only the owner can update this auction!');
            }
            if (ic.time() >= auction.endDate){
                return Result.Err<Auction, string>("Cannot modify the details of auction that has ended.");
            }

            // Set each property for better performance
            const updatedAuction: Auction = {
                id: auction.id,
                assetType: payload.assetType || auction.assetType,
                assetDescription: payload.assetDescription || auction.assetDescription,
                ownerName: payload.ownerName || auction.ownerName,
                ownerId: auction.ownerId,
                startDate: auction.startDate,
                endDate: auction.endDate,
                status: auction.status,
            };

            // Update the auction in auctionStorage
            auctionStorage.insert(auction.id, updatedAuction);

            return Result.Ok<Auction, string>(updatedAuction);
        },
        None: () => Result.Err<Auction, string>(`Failed to update auction with id: ${auctionId}!`),
    });
}

/**
 * Ends a specific auction.
 * @param auctionId - The ID of the auction to end.
 * @param ownerId - The ID of the owner ending the auction.
 * @returns A Result containing the ended auction or an error message.
 */
$update;
export function endAuction(auctionId: string): Result<Auction, string> {
    // Validate IDs
    if (!isValidUUID(auctionId)) {
        return Result.Err<Auction, string>('Invalid auction ID for ending an auction.');
    }

    return match(auctionStorage.get(auctionId), {
        Some: (auction) => {
            // Validate ownership
            if (auction.ownerId !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only the owner can end this auction!');
            }

            // Validate if the auction has already ended
            if (auction.status === "inactive") {
                return Result.Err<Auction, string>('Auction has already ended!');
            }

            if (auction.endDate >= ic.time()){
                return Result.Err<Auction, string>("There is still time left before auction can be ended.");
            }

            // Set each property for better performance
            const endedAuction: Auction = {
                id: auction.id,
                assetType: auction.assetType,
                assetDescription: auction.assetDescription,
                ownerName: auction.ownerName,
                ownerId: auction.ownerId,
                startDate: auction.startDate,
                endDate: ic.time(),
                status: 'inactive',
            };

            // Update the auction in auctionStorage
            auctionStorage.insert(auction.id, endedAuction);

            return Result.Ok<Auction, string>(endedAuction);
        },
        None: () => Result.Err<Auction, string>(`Failed to end auction with id: ${auctionId}!`),
    });
}

/**
 * Deletes a specific auction.
 * @param auctionId - The ID of the auction to delete.
 * @param ownerId - The ID of the owner deleting the auction.
 * @returns A Result containing the deleted auction or an error message.
 */
$update;
export function deleteAuction(auctionId: string): Result<Auction, string> {
    // Validate IDs
    if (!isValidUUID(auctionId)) {
        return Result.Err<Auction, string>('Invalid auction or owner ID for deleting an auction.');
    }

    return match(auctionStorage.get(auctionId), {
        Some: (auction) => {
            // Validate ownership
            if (auction.ownerId !== ic.caller().toString()) {
                return Result.Err<Auction, string>('Only the owner can delete this auction!');
            }

            auctionStorage.remove(auctionId);

            return Result.Ok<Auction, string>(auction);
        },
        None: () => Result.Err<Auction, string>(`Failed to delete auction with id: ${auctionId}`),
    });
}

/**
 * Checks if an auction status is valid.
 * @param status - The auction status to validate.
 * @returns True if the status is valid, otherwise false.
 */
function isAuctionStatusValid(status: string): boolean {
    return status === 'active' || status === 'inactive';
}


/**
 * Validates whether a given string is a valid UUID.
 * @param id - The string to validate as a UUID.
 * @returns True if the string is a valid UUID, otherwise false.
 */
function isValidUUID(id: string): boolean {
    // Validate if the provided ID is a valid UUID
    return /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi.test(id);
}


// Helper function that trims the input string and then checks the length
// The string is empty if true is returned, otherwise, string is a valid value
function isInvalidString(str: string): boolean {
    return str.trim().length == 0
  }

// A workaround to make the uuid package work with Azle
globalThis.crypto = {
    // @ts-ignore
    getRandomValues: () => {
        let array = new Uint8Array(32);

        for (let i = 0; i < array.length; i++) {
            array[i] = Math.floor(Math.random() * 256);
        }

        return array;
    },
};
