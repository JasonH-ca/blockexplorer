bitcoin = require('bitcoinjs-lib');
window.test = function() {
    console.log('Function from file1.js called!');
};

window.convertAddressFormat = function (address, useBase58 = true) {
    console.log('Function from file1.js called!');
    if (!useBase58) {
        const decoded = bitcoin.address.fromBase58Check(address);
        return decoded.hash.toString('hex');
    } else {
        return address;
    }
}