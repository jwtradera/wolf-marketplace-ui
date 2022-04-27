import { Route, Switch, BrowserRouter } from 'react-router-dom'
import { WalletConnectProvider } from './components/WalletConnectProvider';

import React, { Suspense } from 'react';
import Deposit from './pages/Deposit';
import Listing from './pages/Listing';
import Home from './pages/Home';
import Withdraw from './pages/Withdraw';


require('./App.css');
require('@solana/wallet-adapter-react-ui/styles.css');

export default function App() {
    return (
        <Suspense fallback={null}>
            <BrowserRouter>
                <WalletConnectProvider>
                    <Switch>
                        <Route exact path="/" component={Home} />
                        <Route exact path="/listing" component={Listing} />
                        <Route exact path="/deposit" component={Deposit} />
                        <Route exact path="/withdraw" component={Withdraw} />
                    </Switch>
                </WalletConnectProvider>
            </BrowserRouter>
        </Suspense>
    );
};