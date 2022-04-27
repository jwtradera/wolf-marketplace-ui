import React from "react";
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { NavLink } from 'react-router-dom'
import styled from 'styled-components'

const Wrapper = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 32px;
`

const LinksWrapper = styled.div`
    display: flex;
    gap: 24px;
`

const Header = () => {
    return (
        <Wrapper>

            <LinksWrapper>
                <NavLink to='/'>Home</NavLink>
                <NavLink to='/listing'>Listing</NavLink>
                <NavLink to='/deposit'>Deposit</NavLink>
                <NavLink to='/withdraw'>Withdraw</NavLink>
            </LinksWrapper>

            <WalletMultiButton />
        </Wrapper>
    );
}

export default Header;