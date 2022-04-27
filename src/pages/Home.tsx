import React, { FC, useState, useEffect, useMemo } from 'react';
import * as anchor from "@project-serum/anchor";
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';

import {
    Button,
    Box,
    Typography,
    Container,
    TextField
} from '@mui/material';
import styled from 'styled-components'
import { PublicKey, ParsedAccountData, Transaction } from '@solana/web3.js';

import { WOLF_TOKEN_PUBKEY, TOKEN_DIGITS, METADATA_PUBKEY, MARKETPLACE_PROGRAM_PUBKEY, LIST_PRICE, ADMIN_PUBKEY } from '../constants';
import Header from '../components/Header';
import { useMarketplaceProgram } from '../hooks';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';
import { decodeMetadata, getNfts, Metadata, NftType } from '../utils';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

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


const Home: FC = () => {

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const anchorWallet = useAnchorWallet();

    const program = useMarketplaceProgram(connection, anchorWallet);

    const [nfts, setNfts] = useState<Array<NftType>>([]);
    const [pending, setPending] = useState<boolean>(false);
    const [loaded, setLoaded] = useState<boolean>(false);


    useEffect(() => {
        const loadMarketplace = async () => {
            if (program && !loaded) {

                const pdaMarketplace = findProgramAddressSync([
                    Buffer.from("marketplace"), ADMIN_PUBKEY.toBuffer()],
                    MARKETPLACE_PROGRAM_PUBKEY);

                let _nfts = await getNfts(pdaMarketplace[0], connection);
                setNfts(_nfts);

                setLoaded(true);
            }
        }

        loadMarketplace();
    }, [
        connection,
        program,
        loaded
    ]);

    const handleBuy = (nft: NftType) => {
        const buyNft = async () => {

            if (publicKey && program) {

                setPending(true);

                try {
                    const mint = new PublicKey(nft.metadata.mint);

                    const pdaVault = findProgramAddressSync([
                        Buffer.from("vault"), WOLF_TOKEN_PUBKEY.toBuffer()],
                        MARKETPLACE_PROGRAM_PUBKEY);
                    const pdaMarketplace = findProgramAddressSync([
                        Buffer.from("marketplace"), ADMIN_PUBKEY.toBuffer()],
                        MARKETPLACE_PROGRAM_PUBKEY);
                    const pdaListing = findProgramAddressSync([
                        Buffer.from("listing"), mint.toBuffer()],
                        MARKETPLACE_PROGRAM_PUBKEY);

                    const pdaNftAccount = await getAssociatedTokenAddress(mint, pdaMarketplace[0], true);

                    const userNftAccount = await getAssociatedTokenAddress(mint, publicKey);

                    const userRewardAccount = await getAssociatedTokenAddress(WOLF_TOKEN_PUBKEY, publicKey);

                    console.log(pdaVault[0].toString(), pdaMarketplace[0].toString(), pdaListing[0].toString(), pdaNftAccount.toString(), userNftAccount.toString(), mint.toString());
                    const tx = new Transaction();

                    const userNftAccountInfo = await connection.getAccountInfo(userNftAccount);
                    if (!userNftAccountInfo) {
                        tx.add(createAssociatedTokenAccountInstruction(
                            publicKey,
                            userNftAccount,
                            publicKey,
                            mint
                        ));
                    }

                    const userRewardAccountInfo = await connection.getAccountInfo(userRewardAccount);
                    if (!userRewardAccountInfo) {
                        tx.add(createAssociatedTokenAccountInstruction(
                            publicKey,
                            userRewardAccount,
                            publicKey,
                            WOLF_TOKEN_PUBKEY
                        ));
                    }

                    let inputAmount = 10;

                    tx.add(program.instruction.buy(
                        pdaVault[1],
                        pdaMarketplace[1],
                        pdaListing[1],
                        TOKEN_DIGITS.muln(inputAmount), {
                        accounts: {
                            vaultAccount: pdaVault[0],
                            marketplaceAccount: pdaMarketplace[0],
                            listingAccount: pdaListing[0],
                            authority: publicKey,
                            mint: mint,
                            nftVaultAccount: pdaNftAccount,
                            nftUserAccount: userNftAccount,
                            rewardUserAccount: userRewardAccount,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            tokenProgram: TOKEN_PROGRAM_ID,
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

        buyNft();
    }

    return (
        <Container maxWidth="lg">

            <Header />

            <Box flexDirection='column' justifyContent='center' display='flex' height='600px' gap='24px'>

                <Typography variant="h5" component="h1">
                    Listing NFTs:
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
                                    <Button variant='contained' disabled={pending} onClick={() => handleBuy(nft)}>Buy</Button>
                                </NftItem>
                            )
                        }
                    </NftList>
                }

            </Box>

        </Container >

    );
};

export default Home;
