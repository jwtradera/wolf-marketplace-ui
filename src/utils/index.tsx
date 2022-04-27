import { findProgramAddressSync } from "@project-serum/anchor/dist/cjs/utils/pubkey";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Connection, PublicKey } from "@solana/web3.js";
import { deserializeUnchecked } from "borsh";
import { METADATA_PUBKEY } from "../constants";

export type StringPublicKey = string;

export enum MetadataKey {
    Uninitialized = 0,
    MetadataV1 = 4,
    EditionV1 = 1,
    MasterEditionV1 = 2,
    MasterEditionV2 = 6,
    EditionMarker = 7,
}

class Creator {
    address: StringPublicKey;
    verified: boolean;
    share: number;

    constructor(args: {
        address: StringPublicKey;
        verified: boolean;
        share: number;
    }) {
        this.address = args.address;
        this.verified = args.verified;
        this.share = args.share;
    }
}

class Data {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
    constructor(args: {
        name: string;
        symbol: string;
        uri: string;
        sellerFeeBasisPoints: number;
        creators: Creator[] | null;
    }) {
        this.name = args.name;
        this.symbol = args.symbol;
        this.uri = args.uri;
        this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
        this.creators = args.creators;
    }
}

export class Metadata {
    key: MetadataKey;
    updateAuthority: StringPublicKey;
    mint: StringPublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;

    // set lazy
    masterEdition?: StringPublicKey;
    edition?: StringPublicKey;

    constructor(args: {
        updateAuthority: StringPublicKey;
        mint: StringPublicKey;
        data: Data;
        primarySaleHappened: boolean;
        isMutable: boolean;
        editionNonce: number | null;
    }) {
        this.key = MetadataKey.MetadataV1;
        this.updateAuthority = args.updateAuthority;
        this.mint = args.mint;
        this.data = args.data;
        this.primarySaleHappened = args.primarySaleHappened;
        this.isMutable = args.isMutable;
        this.editionNonce = args.editionNonce;
    }
}

const METADATA_SCHEMA = new Map<any, any>([
    [
        Data,
        {
            kind: "struct",
            fields: [
                ["name", "string"],
                ["symbol", "string"],
                ["uri", "string"],
                ["sellerFeeBasisPoints", "u16"],
                ["creators", { kind: "option", type: [Creator] }],
            ],
        },
    ],
    [
        Creator,
        {
            kind: "struct",
            fields: [
                ["address", "pubkeyAsString"],
                ["verified", "u8"],
                ["share", "u8"],
            ],
        },
    ],
    [
        Metadata,
        {
            kind: "struct",
            fields: [
                ["key", "u8"],
                ["updateAuthority", "pubkeyAsString"],
                ["mint", "pubkeyAsString"],
                ["data", Data],
                ["primarySaleHappened", "u8"], // bool
                ["isMutable", "u8"], // bool
            ],
        },
    ],
]);
const METADATA_REPLACE = new RegExp("\u0000", "g");

export const decodeMetadata = (buffer: Buffer) => {
    try {
        const metadata = deserializeUnchecked(
            METADATA_SCHEMA,
            Metadata,
            buffer
        ) as Metadata;

        metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, "");
        metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, "");
        metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, "");
        return metadata;
    } catch (e) {
        console.log(e);
    }
};

export interface NftType {
    metadata: Metadata,
    tokenAccount: PublicKey
}


export async function getNfts(publicKey: PublicKey, connection: Connection) {

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: new PublicKey(TOKEN_PROGRAM_ID)
    });
    const tokenOwners = tokenAccounts.value.filter((item) => {
        return item.account.data.parsed.info.tokenAmount.amount !== "0";
    });

    const metadataAccounts = tokenOwners.map((item) => {
        const mintPubkey = new PublicKey(item.account.data.parsed.info.mint);
        const metadataAccount = findProgramAddressSync([
            Buffer.from("metadata"),
            METADATA_PUBKEY.toBuffer(),
            mintPubkey.toBuffer()
        ], METADATA_PUBKEY);
        return metadataAccount[0];
    })

    const tokenInfos = await connection.getMultipleAccountsInfo(metadataAccounts, 'single');

    let _nfts: Array<NftType> = [];
    tokenInfos.map((tokenInfo, idx) => {
        if (tokenInfo) {
            const metadata = decodeMetadata(tokenInfo.data);
            if (metadata) {
                _nfts.push({
                    metadata: metadata,
                    tokenAccount: tokenOwners[idx].pubkey
                });
            }
        }
    })
    _nfts.sort((a, b) => {
        return a.metadata.data.name.localeCompare(b.metadata.data.name);
    })

    return _nfts;
}

export * from './borsh';