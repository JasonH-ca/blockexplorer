document.addEventListener('DOMContentLoaded', async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const blockchainNetwork = urlParams.get('network') || 'FAB'; // Default to 'FAB' if not specified

    let apiUrl;

    try {
        const response = await fetch('./config/environment.json');
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

    // Function to get query parameter by name
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Load block details
    async function loadBlockDetails() {
        const blockNumber = getQueryParam('blockNumber');
        const blockHash = getQueryParam('blockHash');
        let blockData;

        if (blockNumber) {
            blockData = await fetchBlockchainData(`block/${blockNumber}`);
        } else if (blockHash) {
            blockData = await fetchBlockchainData(`block/${blockHash}`);
        }

        if (blockData) {
            const blockInfoDiv = document.getElementById('block-info');
            const previousBlockExists = blockData.height > 0;
            const nextBlockExists = await fetchBlockchainData(`block/${blockData.height + 1}`);
            blockInfoDiv.innerHTML = `
                <div id="block-navigation">
                    ${previousBlockExists ? `<a href="block.html?blockNumber=${blockData.height - 1}&network=${blockchainNetwork}">${(blockData.height - 1).toLocaleString()}</a>` : ''} |
                    ${nextBlockExists ? `<a href="block.html?blockNumber=${blockData.height + 1}&network=${blockchainNetwork}">${(blockData.height + 1).toLocaleString()}</a>` : ''}
                </div>
                <table id="block-info-table">
                    <tr>
                        <th>Height</th>
                        <td>${blockData.height.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Confirmations</th>
                        <td>${blockData.confirmations.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Hash</th>
                        <td>
                            <span class="block-hash">
                                ${blockData.hash}
                                <button id="copy-button"><i class="fas fa-copy"></i></button>
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <th>Time</th>
                        <td>${new Date(blockData.time * 1000).toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Transactions</th>
                        <td>${blockData.tx.length.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Size</th>
                        <td>${blockData.size.toLocaleString()} bytes</td>
                    </tr>
                    <tr>
                        <th>Difficulty</th>
                        <td>${parseFloat(blockData.difficulty).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                </table>
                <h3>Transactions</h3>
                <ul id="transaction-list">
                    ${blockData.tx.map(txid => `<li><a href="transaction.html?txid=${txid}&network=${blockchainNetwork}">${txid}</a></li>`).join('')}
                </ul>
            `;

            // Add event listener to copy button
            document.getElementById('copy-button').addEventListener('click', function() {
                navigator.clipboard.writeText(blockData.hash).then(() => {
                    alert('Block hash copied to clipboard');
                }).catch(err => {
                    console.error('Failed to copy block hash: ', err);
                });
            });
        } else {
            console.error('Failed to load block data');
        }
    }

    document.getElementById('logo-link').href = `../index.html?network=${blockchainNetwork}`;

    // Load block details on the block detail page
    loadBlockDetails();
});