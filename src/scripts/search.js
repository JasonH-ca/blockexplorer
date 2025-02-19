bitcoin = require('bitcoinjs-lib');
document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    let root = true;
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified

    try {
        let response = await fetch('./config/environment.json');
        root = false;
        if (!response.ok) {
            root = true;
            response = await fetch('./src/config/environment.json');
        }
        const config = await response.json();
        const environment = config.environment; // Get the current environment (debug or production)
        apiUrl = config.apiServers[environment][blockchainNetwork];
        if (!apiUrl) {
            throw new Error(`API server not configured for ${blockchainNetwork}`);
        }
    } catch (error) {
        console.error('Error loading configuration:', error);
        return;
    }

    // Function to fetch blockchain data
    async function fetchBlockchainData(endpoint) {
        try {
            const response = await fetch(`${apiUrl}${blockchainNetwork}/${endpoint}`);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    }

    // Function to handle search input
    function handleSearch() {
        const searchField = document.getElementById('search-field');
        const searchButton = document.getElementById('search-button');

        const performSearch = async () => {
            let query = searchField.value.trim();
            if (query.startsWith('0x')) {
                query = query.slice(2);
            }
            if (query) {
                const prefix = root ? 'src/' : '';
                const networkParam = `&network=${blockchainNetwork}`;
                if (query.length < 16 && (blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST')) {
                    window.location.href = `${prefix}smartcontracts.html?symbol=${query}${networkParam}`;
                } else if (/^\d+$/.test(query)) {
                    // Block number
                    window.location.href = `${prefix}block.html?blockNumber=${query}${networkParam}`;
                } else if (/^[a-fA-F0-9]{64}$/.test(query)) {
                    // Block hash or transaction hash
                    try {
                        const data = await fetchBlockchainData(`block/${query}`);
                        if (data) {
                            window.location.href = `${prefix}block.html?blockHash=${query}${networkParam}`;
                        } else {
                            window.location.href = `${prefix}transaction.html?txid=${query}${networkParam}`;
                        }
                    } catch {
                        window.location.href = `${prefix}transaction.html?txid=${query}${networkParam}`;
                    }
                } else if (/^[a-fA-F0-9]+$/.test(query)) {
                    // Hex address
                    if (blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST') {
                        try {
                            const hexBuffer = Buffer.from(query, 'hex');
                            const version = blockchainNetwork === 'FAB' ? bitcoin.networks.bitcoin.pubKeyHash : 0x6F;
                            const base58Address = bitcoin.address.toBase58Check(hexBuffer, version);
                            window.location.href = `${prefix}address.html?address=${base58Address}${networkParam}`;
                        } catch (error) {
                            console.error('Error converting hex to base58:', error);
                        }
                    } else {
                        // Address
                        window.location.href = `${prefix}address.html?address=${query}${networkParam}`;
                    }
                } else {
                    // Address
                    window.location.href = `${prefix}address.html?address=${query}${networkParam}`;
                }
            }
        };

        searchButton.addEventListener('click', performSearch);
        searchField.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
    }

    // Initialize search handling
    handleSearch();
});