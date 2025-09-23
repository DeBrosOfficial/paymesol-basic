// ==========================================================================
// React Core Imports
// ==========================================================================
import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// ==========================================================================
// Solana Wallet Adapter Imports
// ==========================================================================
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider, WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';

// ==========================================================================
// Solana Pay and Web3 Imports
// ==========================================================================
import { encodeURL } from '@solana/pay';
import { PublicKey } from '@solana/web3.js';

// ==========================================================================
// Utility Libraries
// ==========================================================================
import QRCode from 'qrcode';
import BigNumber from 'bignumber.js';

// ==========================================================================
// Image Imports
// ==========================================================================
import eurcIcon from './images/eurc-icon.png';
import solIcon from './images/solana2-logo.png';
import usdcIcon from './images/usdc-icon.png';
import logoIcon from './images/paymesol.png';
import phantomIcon from './images/phantom.png';
import helpIcon from './images/help.png';
import debrosIcon from './images/debros.png';
import historyIcon from './images/history.png';

// ==========================================================================
// Constants
// ==========================================================================
const tokenMints = {
    EURC: new PublicKey('HzwqbKZw8HxMN6bF2yFZNrht3c2iXXzpKcFu7uBEDKtr'),
    USDC: new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'),
    SOL: null
};

const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3/simple/price';

// ==========================================================================
// Main App Component
// ==========================================================================
function App() {
    const wallet = useWallet();
    const [eurAmount, setEurAmount] = useState('');
    const [convertedAmount, setConvertedAmount] = useState('');
    const [selectedToken, setSelectedToken] = useState('EURC');
    const [menuOpen, setMenuOpen] = useState(false);
    const [showConversion, setShowConversion] = useState(false);
    const [debounceTimeout, setDebounceTimeout] = useState(null);

    const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

    // ==========================================================================
    // Keyboard Functions
    // ==========================================================================
    const formatEuro = (value) => {
        if (!value) return '0,00';
        
        const num = parseFloat(value.replace(/[^0-9.]/g, '')).toString().slice(0, 9);
        const [integerPart, decimalPortion = ''] = num.split('.');
        
        const formattedInteger = parseInt(integerPart || '0').toLocaleString('el-GR', { 
            minimumFractionDigits: 0 
        });
        const formattedDecimal = decimalPortion.padEnd(2, '0').slice(0, 2);
        
        return `${formattedInteger},${formattedDecimal}`;
    };

    // Format crypto with European style, max 4 decimals
    const formatCrypto = (value) => {
        if (!value) return '0,0000';
        const num = parseFloat(value);
        const [integerPart, decimalPart] = num.toFixed(4).split('.');
        
        const formattedInteger = parseInt(integerPart).toLocaleString('el-GR', { 
            minimumFractionDigits: 0 
        });
        const formattedDecimal = decimalPart.slice(0, 4);
        
        return `${formattedInteger},${formattedDecimal}`;
    };

    // Handle keypad input
    const handleKeypadInput = (value) => {
        if (value === '.' && eurAmount.includes('.')) return;
        if (value === '.' && eurAmount === '') setEurAmount('0.');
        else {
            const newValue = eurAmount === '0' ? value : eurAmount + value;
            if (newValue.replace('.', '').length <= 9) {
                setEurAmount(newValue);
            }
        }
    };

    const clearInput = () => setEurAmount('');

    // Debounced conversion effect
    useEffect(() => {
        if (!eurAmount || !selectedToken) {
            setConvertedAmount('');
            setShowConversion(false);
            return;
        }

        if (debounceTimeout) {
            clearTimeout(debounceTimeout);
        }

        const timeout = setTimeout(async () => {
            const cryptoIdMap = {
                EURC: 'euro-coin',
                USDC: 'usd-coin',
                SOL: 'solana'
            };
            const cryptoId = cryptoIdMap[selectedToken];

            try {
                const response = await fetch(`${COINGECKO_API_URL}?ids=${cryptoId}&vs_currencies=eur`);
                const data = await response.json();
                const conversionRate = data[cryptoId].eur;
                const amount = parseFloat(eurAmount) / conversionRate;
                
                setConvertedAmount(amount.toFixed(4));
                setShowConversion(true);
            } catch (error) {
                console.error("Failed to fetch conversion rate:", error);
                setShowConversion(false);
            }
        }, 800);

        setDebounceTimeout(timeout);

        return () => clearTimeout(timeout);
    }, [eurAmount, selectedToken]);

    // ==========================================================================
    // Transaction History Functions
    // ==========================================================================
    const handleHistoryButtonClick = () => {
        if (!wallet.connected || !wallet.publicKey) {
            alert("Please connect your wallet to view transaction history.");
            return;
        }
    
        const walletAddress = wallet.publicKey.toString();
        window.open(`https://solscan.io/account/${walletAddress}`, '_blank');
    };

    // ==========================================================================
    // QR Code Functions
    // ==========================================================================
    const generatePaymentURL = async (recipientAddress) => {
        const recipient = new PublicKey(recipientAddress);
        if (!convertedAmount || isNaN(convertedAmount)) {
            alert("Please enter a valid EUR amount to convert.");
            return null;
        }

        const amount = new BigNumber(convertedAmount);
        const tokenMint = tokenMints[selectedToken];

        return encodeURL({
            recipient,
            amount,
            splToken: tokenMint,
            label: "Paymesol POS",
            message: "Thank you for your payment!",
        });
    };

    const displayQRCode = async () => {
        if (!wallet.connected || !wallet.publicKey) {
            alert("Please connect your wallet before generating the QR code.");
            return;
        }

        const paymentURL = await generatePaymentURL(wallet.publicKey.toString());
        if (!paymentURL) return;

        QRCode.toCanvas(document.getElementById('qr-canvas'), paymentURL, (error) => {
            if (error) console.error(error);
            else document.getElementById('qr-modal').style.display = 'flex';
        });
    };

    // ==========================================================================
    // Menu Toggle
    // ==========================================================================
    
    const toggleMenu = () => {
        const menuButton = document.getElementById('menu-button');
        const menuDropdown = document.querySelector('.menu-dropdown');
    
        if (menuOpen) {
            menuDropdown.classList.add('closing');
            menuButton.classList.remove('active');
            setTimeout(() => {
                menuDropdown.classList.remove('active', 'closing');
                setMenuOpen(false);
            }, 300);
        } else {
            menuButton.classList.add('active');
            setMenuOpen(true);
        }
    };
    
    const handleModalOpen = (modalAction) => {
        const menuButton = document.getElementById('menu-button');
        const menuDropdown = document.querySelector('.menu-dropdown');
    
        if (menuOpen) {
            menuDropdown.classList.add('closing');
            menuButton.classList.remove('active');
            setTimeout(() => {
                menuDropdown.classList.remove('active', 'closing');
                setMenuOpen(false);
                modalAction();
            }, 300);
        } else {
            modalAction();
        }
    };

    // ==========================================================================
    // Render
    // ==========================================================================
    return (
        <div className="app-container">
            <div className="logo-container">
                <img 
                    src={logoIcon} 
                    alt="payme.sol logo" 
                    className="logo" 
                    onClick={() => window.open('https://paymesol.app', '_blank')} 
                    style={{ cursor: 'pointer' }} 
                />
            </div>

            <div className="header-container">
                <WalletMultiButton style={{ flex: 1, justifyContent: 'center', backgroundColor: '#ab9ff2', height: '35px' }} />
                <button id="menu-button" onClick={toggleMenu}>
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>

            <div className={`menu-dropdown ${menuOpen ? 'active' : ''}`}>
                <button onClick={() => handleModalOpen(handleHistoryButtonClick)}>
                    <img src={historyIcon} alt="History" /> Transaction History
                </button>
                <a href="https://paymesol.app/docs/" target="_blank" rel="noopener noreferrer">
                    <img src={helpIcon} alt="Help" /> Documentation
                </a>
                <a href="https://debros.io" target="_blank" rel="noopener noreferrer">
                    <img src={debrosIcon} alt="DeBros" /> DeBros
                </a>
                <a href="https://phantom.com" target="_blank" rel="noopener noreferrer">
                    <img src={phantomIcon} alt="Phantom" /> Phantom
                </a>
            </div>

            <label htmlFor="radio-dropdown" style={{ color: 'white', fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif' }}>Choose Cryptocurrency</label>
            <div className="radio-dropdown">
                <input type="radio" id="eurc" name="token" value="EURC" checked={selectedToken === 'EURC'} onChange={() => setSelectedToken('EURC')} />
                <label htmlFor="eurc"><img src={eurcIcon} alt="EURC Icon" className="icon" /> EURC</label>
                <input type="radio" id="sol" name="token" value="SOL" checked={selectedToken === 'SOL'} onChange={() => setSelectedToken('SOL')} />
                <label htmlFor="sol"><img src={solIcon} alt="SOL Icon" className="icon" /> SOL</label>
                <input type="radio" id="usdc" name="token" value="USDC" checked={selectedToken === 'USDC'} onChange={() => setSelectedToken('USDC')} />
                <label htmlFor="usdc"><img src={usdcIcon} alt="USDC Icon" className="icon" /> USDC</label>
            </div>

            <div className="amount-container">
                <div className="amount-wrapper">
                    <div className="currency-row">
                        <span className="currency-label crypto-label">{selectedToken}</span>
                        <div className="crypto-row">
                            <span className={`crypto-display ${showConversion ? 'show' : ''}`}>
                                {formatCrypto(convertedAmount)}
                            </span>
                        </div>
                    </div>
                    <div className="currency-row">
                        <span className="currency-label" style={{ color: '#ffffff' }}>EURO</span>
                        <input
                            type="text"
                            className="euro-display"
                            value={formatEuro(eurAmount)} // Formatted value live
                            readOnly
                            placeholder="0,00"
                        />
                    </div>
                </div>
            </div>

            <div className="keypad">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '.', 0].map((key) => (
                    <button key={key} onClick={() => handleKeypadInput(key.toString())}>{key}</button>
                ))}
                <button onClick={clearInput} className="clear">Clear</button>
            </div>

            <div className="payment-buttons">
                <button onClick={displayQRCode} id="generate-qr">Generate QR Code</button>
            </div>

            <div id="qr-modal" className="modal">
                <div className="modal-content">
                    <h3>Payment QR Code</h3>
                    <canvas id="qr-canvas"></canvas>
                    <button onClick={() => document.getElementById('qr-modal').style.display = 'none'} className="close-button">CLOSE</button>
                </div>
            </div>
        </div>
    );
}

// ==========================================================================
// Render Application
// ==========================================================================
const container = document.getElementById('root');
const root = createRoot(container);
root.render(
    <ConnectionProvider endpoint="https://api.mainnet-beta.solana.com">
        <WalletProvider wallets={[new PhantomWalletAdapter()]} autoConnect>
            <WalletModalProvider>
                <App />
            </WalletModalProvider>
        </WalletProvider>
    </ConnectionProvider>
);