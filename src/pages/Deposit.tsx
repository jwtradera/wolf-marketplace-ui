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

const Deposit: FC = () => {

    const { connection } = useConnection();
    const { publicKey, sendTransaction } = useWallet();
    const anchorWallet = useAnchorWallet();

    const program = useMarketplaceProgram(connection, anchorWallet);

    const [vaultAmount, setVaultAmount] = useState<number>(0);
    const [inputAmount, setInputAmount] = useState<number>(0);
    const [initialized, setInitialized] = useState<boolean>(false);
    const [pending, setPending] = useState<boolean>(false);


    useEffect(() => {
        const getTokenBalance = async () => {
            if (anchorWallet && !pending) {

                if (program) {
                    try {
                        const pdaVault = await findProgramAddressSync([Buffer.from("vault"), WOLF_TOKEN_PUBKEY.toBuffer()], MARKETPLACE_PROGRAM_PUBKEY);
                        const ret = await connection.getParsedAccountInfo(pdaVault[0]);
                        if (ret.value) {
                            const vaultBalance = (ret.value?.data as ParsedAccountData).parsed.info.tokenAmount;
                            setVaultAmount(vaultBalance.uiAmount);
                            setInitialized(true);
                        }
                        else {
                            setVaultAmount(0);
                            setInitialized(false);
                        }
                    }
                    catch (ex) {
                        console.log(ex);
                        setVaultAmount(0);
                        setInitialized(false);
                    }
                }
            }
        }

        getTokenBalance();
    }, [
        connection,
        anchorWallet,
        program,
        pending
    ]);

    const handleAmount = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setInputAmount(parseFloat(value));
    }

    const handleInitialize = () => {

        const initializeVault = async () => {

            if (publicKey && program) {

                setPending(true);

                try {
                    const pdaVault = findProgramAddressSync([Buffer.from("vault"), WOLF_TOKEN_PUBKEY.toBuffer()], MARKETPLACE_PROGRAM_PUBKEY);
                    const pdaMarketplace = findProgramAddressSync([Buffer.from("marketplace"), publicKey.toBuffer()], MARKETPLACE_PROGRAM_PUBKEY);

                    // Initialize vault
                    const tx = await connection.confirmTransaction(await program.rpc.initialize(pdaVault[1], pdaMarketplace[1], {
                        accounts: {
                            vaultAccount: pdaVault[0],
                            marketplaceAccount: pdaMarketplace[0],
                            mint: WOLF_TOKEN_PUBKEY,
                            authority: publicKey,
                            systemProgram: anchor.web3.SystemProgram.programId,
                            tokenProgram: TOKEN_PROGRAM_ID,
                            rent: anchor.web3.SYSVAR_RENT_PUBKEY
                        }
                    }));
                }
                catch (ex) {
                    console.log(ex);
                }

                setTimeout(() => {
                    setPending(false);
                }, 3000);
            }
        }

        initializeVault();
    }

    const handleDeposit = () => {

        const depositToken = async () => {

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

                    tx.add(program.transaction.deposit(
                        pdaVault[1],
                        TOKEN_DIGITS.mul(new anchor.BN(inputAmount)),
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

                setPending(false);
            }

        }

        depositToken();
    }

    return (
        <Container maxWidth="lg">

            <Header />

            <Box flexDirection='column' justifyContent='center' alignItems='center' display='flex' height='600px' textAlign='center' gap='24px'>

                <Typography variant="h5" component="h1">
                    Deposited token amount: {vaultAmount}
                </Typography>

                <Box>
                    <TextField value={inputAmount} onChange={handleAmount} placeholder="Input deposit amount..." />
                </Box>

                <Box width='120px'>
                    {
                        initialized
                            ? <Button variant='contained' onClick={handleDeposit} disabled={pending} size='large'>Deposit</Button>
                            : <Button variant='contained' onClick={handleInitialize} disabled={pending} size='large'>Initialize</Button>
                    }
                </Box>

            </Box>

        </Container>

    );
};

export default Deposit;
