import * as anchor from '@project-serum/anchor';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { AnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';

import { useState, useEffect, useMemo } from 'react';
import { WOLF_TOKEN_PUBKEY, MARKETPLACE_PROGRAM_PUBKEY } from '../constants';
import { IDL as wolfStakingIdl } from '../constants/idl';

export function useMarketplaceProgram(connection: anchor.web3.Connection, anchorWallet: AnchorWallet | undefined) {

    const program = useMemo(() => {
        if (anchorWallet) {
            const provider = new anchor.AnchorProvider(connection, anchorWallet, anchor.AnchorProvider.defaultOptions());
            return new anchor.Program(wolfStakingIdl, MARKETPLACE_PROGRAM_PUBKEY, provider);
        }
    }, [
        connection,
        anchorWallet
    ])

    return program;
}
