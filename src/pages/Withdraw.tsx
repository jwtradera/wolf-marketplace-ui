import React, { FC, useState, useEffect } from 'react';
import * as anchor from "@project-serum/anchor";
import { useConnection, useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { PublicKey, ParsedAccountData, Transaction } from '@solana/web3.js';
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';

import {
    Button,
    Box,
    Typography,
    Container,
    TextField
} from '@mui/material';

import { WOLF_TOKEN_PUBKEY, TOKEN_DIGITS, MARKETPLACE_PROGRAM_PUBKEY } from '../constants';
import Header from '../components/Header';
import { useMarketplaceProgram } from '../hooks';
import { findProgramAddressSync } from '@project-serum/anchor/dist/cjs/utils/pubkey';

const Withdraw: FC = () => {

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const anchorWallet = useAnchorWallet();

    const program = useMarketplaceProgram(connection, anchorWallet);

    const [tokenAmount, setTokenAmount] = useState<number>(0);
    const [inputAmount, setInputAmount] = useState<number>(0);
    const [pending, setPending] = useState<boolean>(false);


    useEffect(() => {
        const getTokenBalance = async () => {
            if (publicKey && !pending) {
                try {
                    const tokenAccount = await getAssociatedTokenAddress(WOLF_TOKEN_PUBKEY, publicKey);
                    const ret = await connection.getTokenAccountBalance(tokenAccount);
                    setTokenAmount(ret.value.uiAmount ?? 0);
                }
                catch (ex) {
                    console.log(ex);
                    setTokenAmount(0);
                }
            }
        }

        getTokenBalance();
    }, [
        connection,
        publicKey,
        pending
    ]);

    const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputAmount(parseFloat(value));
    }

    const handleWithdraw = () => {

        const withdrawToken = async () => {

            if (publicKey && program) {

                setPending(true);

                try {
                    const pdaVault = findProgramAddressSync([Buffer.from("vault"), WOLF_TOKEN_PUBKEY.toBuffer()], MARKETPLACE_PROGRAM_PUBKEY);

                    const tx = new Transaction();

                    const tokenAccount = await getAssociatedTokenAddress(WOLF_TOKEN_PUBKEY, publicKey);
                    const tokenAccountInfo = await connection.getAccountInfo(tokenAccount);
                    if (!tokenAccountInfo) {
                        tx.add(createAssociatedTokenAccountInstruction(
                            publicKey,
                            tokenAccount,
                            publicKey,
                            WOLF_TOKEN_PUBKEY
                        ));
                    }

                    tx.add(program.transaction.withdraw(
                        pdaVault[1],
                        new anchor.BN(inputAmount * Math.pow(10, TOKEN_DIGITS)),
                        {
                            accounts: {
                                vaultAccount: pdaVault[0],
                                tokenAccount: tokenAccount,
                                user: publicKey,
                                tokenProgram: TOKEN_PROGRAM_ID
                            }
                        }));

                    await sendTransaction(tx, connection);

                }
                catch (ex) {
                    console.log(ex);
                }


                setTimeout(() => {
                    setPending(false);
                }, 3000);
            }

        }

        withdrawToken();
    }

    return (
        <Container maxWidth="lg">

            <Header />

            <Box flexDirection='column' justifyContent='center' alignItems='center' display='flex' height='600px' textAlign='center' gap='24px'>

                <Typography variant="h5" component="h1">
                    Owned token amount: {tokenAmount}
                </Typography>

                <Box>
                    <TextField value={inputAmount} onChange={handleAmount} placeholder="Input claim amount..." />
                </Box>

                <Box width='120px'>
                    <Button variant='contained' onClick={handleWithdraw} disabled={pending} size='large'>Withdraw</Button>
                </Box>

            </Box>

        </Container>

    );
};

export default Withdraw;
