bitcoin = require('bitcoinjs-lib');
document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    let root = true;
    const urlParams = new URLSearchParams(window.location.search);
    let blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified

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
        //console.error('Error loading configuration:', error);
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
            const network = document.getElementById('search-network').value;
            blockchainNetwork = network || blockchainNetwork;
            let pageprefix = '';
            console.log('blockchainNetwork:', blockchainNetwork);
            let checkquery = query;
            if (blockchainNetwork === 'KANBAN') {
                pageprefix = 'kb';
            } else if (query.startsWith('0x')) {
                query = query.slice(2);
            }
            if (checkquery.startsWith('0x')) {
                checkquery = checkquery.slice(2);
            }
            if (checkquery) {
                const prefix = root ? 'src/' : '';
                const networkParam = `&network=${blockchainNetwork}`;
                if (checkquery.length < 16 && isNaN(checkquery) && (blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST' || blockchainNetwork === 'KANBAN')) {
                    window.location.href = `${prefix}${pageprefix}smartcontracts.html?symbol=${query}${networkParam}`;
                } else if (/^\d+$/.test(checkquery)) {
                    // Block number
                    window.location.href = `${prefix}${pageprefix}block.html?blockNumber=${query}${networkParam}`;
                } else if (/^[a-fA-F0-9]{64}$/.test(checkquery)) {
                    if (blockchainNetwork === 'KANBAN' && !query.startsWith('0x')) {
                        query = '0x' + query;
                    }
                    // Block hash or transaction hash
                    try {
                        const data = await fetchBlockchainData(`block/${query}`);
                        if (data) {
                            window.location.href = `${prefix}${pageprefix}block.html?blockHash=${query}${networkParam}`;
                        } else {
                            window.location.href = `${prefix}${pageprefix}transaction.html?txid=${query}${networkParam}`;
                        }
                    } catch {
                        window.location.href = `${prefix}${pageprefix}transaction.html?txid=${query}${networkParam}`;
                    }
                } else if (/^[a-fA-F0-9]+$/.test(checkquery)) {
                    if (blockchainNetwork === 'KANBAN' && !query.startsWith('0x')) {
                        query = '0x' + query;
                    }
                    // Hex address
                    if (blockchainNetwork === 'FAB' || blockchainNetwork === 'FABTEST') {
                        try {
                            const hexBuffer = Buffer.from(query, 'hex');
                            const version = blockchainNetwork === 'FAB' ? bitcoin.networks.bitcoin.pubKeyHash : 0x6F;
                            const base58Address = bitcoin.address.toBase58Check(hexBuffer, version);
                            window.location.href = `${prefix}${pageprefix}address.html?address=${base58Address}${networkParam}`;
                        } catch (error) {
                            console.error('Error converting hex to base58:', error);
                        }
                    } else {
                        // Address
                        window.location.href = `${prefix}${pageprefix}address.html?address=${query}${networkParam}`;
                    }
                } else {
                    if (blockchainNetwork === 'KANBAN' && !query.startsWith('0x')) {
                        query = '0x' + query;
                    }
                    // Address
                    window.location.href = `${prefix}${pageprefix}address.html?address=${query}${networkParam}`;
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