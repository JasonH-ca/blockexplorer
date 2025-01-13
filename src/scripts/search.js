document.addEventListener('DOMContentLoaded', async function() {
    let apiUrl;
    const blockchainNetwork = 'FAB'; // Change this value based on the selected blockchain network

    try {
        const response = await fetch('/config/environment.json');
        const config = await response.json();
        apiUrl = config.apiServers[blockchainNetwork];
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
            const response = await fetch(apiUrl + endpoint);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            const data = await response.json();
            console.log(`Data fetched from ${endpoint}:`, data); // Debug statement
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
            const query = searchField.value.trim();
            if (query) {
                if (/^\d+$/.test(query)) {
                    // Block number
                    window.location.href = `block.html?blockNumber=${query}`;
                } else if (/^[a-fA-F0-9]{64}$/.test(query)) {
                    // Block hash or transaction hash
                    try {
                        const data = await fetchBlockchainData(`block/${query}`);
                        if (data) {
                            window.location.href = `block.html?blockHash=${query}`;
                        } else {
                            window.location.href = `transaction.html?txid=${query}`;
                        }
                    } catch {
                        window.location.href = `transaction.html?txid=${query}`;
                    }
                } else {
                    // Address
                    window.location.href = `address.html?address=${query}`;
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