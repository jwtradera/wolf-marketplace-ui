import React, { FC, useState, useEffect } from 'react';
import * as anchor from "@project-serum/anchor";
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';

import {
    Button,
    Box,
    Typography,
    Container
} from '@mui/material';
import styled from 'styled-components'
import { PublicKey, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

import { MARKETPLACE_PROGRAM_PUBKEY, LIST_PRICE, ADMIN_PUBKEY, TOKEN_DIGITS } from '../constants';
import Header from '../components/Header';
import { useMarketplaceProgram } from '../hooks';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { getNfts, NftType } from '../utils';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const NftList = styled.div`
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    column-gap: 24px;
    row-gap: 24px;
`

const NftItem = styled.div`
    border: 1px solid gray;
    border-radius: 4px;
    padding: 16px;
    text-align: center;

    a {
        display: block;
        margin-bottom: 24px;
    }
`

const Listing: FC = () => {

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const anchorWallet = useAnchorWallet();

    const program = useMarketplaceProgram(connection, anchorWallet);

    const [adminPubkey, setAdminPubkey] = useState<PublicKey>();
    const [nfts, setNfts] = useState<Array<NftType>>([]);
    const [pending, setPending] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);


    useEffect(() => {
        const loadMarketplace = async () => {
            if (publicKey && !loaded) {

                if (program) {

                    const pdaMarketplace = await findProgramAddressSync([Buffer.from("marketplace"), ADMIN_PUBKEY.toBuffer()], MARKETPLACE_PROGRAM_PUBKEY);

                    try {
                        const ret = await program.account.marketplaceAccount.fetch(pdaMarketplace[0]);
                        console.log(ret);
                        if (ret !== null) {
                            setAdminPubkey(ret.authority);
                        }
                        else {
                        }
                    }
                    catch (ex) {
                        console.log(ex);
                    }
                }

                let _nfts = await getNfts(publicKey, connection);
                setNfts(_nfts);

                setLoaded(true);
            }
        }

        loadMarketplace();
    }, [
        connection,
        publicKey,
        program,
        loaded
    ]);

    const handleList = (nft: NftType) => {
        const listingNft = async () => {

            if (publicKey && program) {

                if (adminPubkey?.toString() !== publicKey.toString()) {
                    alert("You are not admin of marketplace.");
                    return;
                }

                setPending(true);

                try {
                    const mint = new PublicKey(nft.metadata.mint);

                    const pdaMarketplace = findProgramAddressSync([
                        Buffer.from("marketplace"), ADMIN_PUBKEY.toBuffer()],
                        MARKETPLACE_PROGRAM_PUBKEY);
                    const pdaListing = findProgramAddressSync([
                        Buffer.from("listing"), mint.toBuffer()],
                        MARKETPLACE_PROGRAM_PUBKEY);

                    const pdaNftAccount = await getAssociatedTokenAddress(mint, pdaMarketplace[0], true);
                    console.log(pdaMarketplace[0].toString(), pdaListing[0].toString(), pdaNftAccount.toString(), nft.tokenAccount.toString(), mint.toString());

                    const tx = new Transaction();

                    const pdaNftAccountInfo = await connection.getAccountInfo(pdaNftAccount);
                    if (!pdaNftAccountInfo) {
                        tx.add(createAssociatedTokenAccountInstruction(
                            publicKey,
                            pdaNftAccount,
                            pdaMarketplace[0],
                            mint
                        ));
                    }

                    tx.add(program.transaction.addListing(
                        pdaMarketplace[1],
                        pdaListing[1],
                        new anchor.BN(LIST_PRICE * Math.pow(10, TOKEN_DIGITS)), {
                        accounts: {
                            marketplaceAccount: pdaMarketplace[0],
                            listingAccount: pdaListing[0],
                            nftVaultAccount: pdaNftAccount,
                            nftUserAccount: nft.tokenAccount,
                            mint: mint,
                            authority: publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            tokenProgram: TOKEN_PROGRAM_ID,
                            rent: anchor.web3.SYSVAR_RENT_PUBKEY
                        }
                    }));

                    const ret = await sendTransaction(tx, connection);

                    setTimeout(() => {
                        setLoaded(false);
                    }, 3000);
                }
                catch (ex) {
                    console.log(ex);
                }

                setPending(false);
            }
        }

        listingNft();
    }

    return (
        <Container maxWidth="lg">

            <Header />

            <Box flexDirection='column' justifyContent='center' display='flex' height='600px' gap='24px'>

                <Typography variant="h5" component="h1">
                    Listing price is {LIST_PRICE} TEK
                </Typography>

                <Typography variant="h5" component="h1">
                    My NFTs:
                </Typography>

                {
                    !loaded ? <>
                        Loading nfts...
                    </> : <NftList>
                        {
                            nfts.map((nft, idx) =>
                                <NftItem key={idx}>
                                    <h3> {nft.metadata.data?.name}</h3>
                                    <h4>{nft.metadata.data?.symbol}</h4>
                                    <a href={"https://explorer.solana.com/address/" + nft.metadata.mint + "?cluster=devnet"} target="_blank">
                                        {nft.metadata.mint.substring(0, 6) + "..." + nft.metadata.mint.substring(nft.metadata.mint.length - 6)}
                                    </a>
                                    <Button variant='contained' onClick={() => handleList(nft)} disabled={pending}>List</Button>
                                </NftItem>
                            )
                        }
                    </NftList>
                }

            </Box>

        </Container>

    );
};

export default Listing;
