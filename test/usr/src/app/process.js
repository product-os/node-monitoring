const fs = require('fs');

// take 2 seconds to start returning true
const healthCheck = (() => {
    let healthy = false;
    setTimeout(() => { healthy = true }, 2 * 1000);
    return () => Promise.resolve(healthy);
})();

// take 2 seconds to "graceful shutdown"
const handleSIGTERM = () => {
    return new Promise((resolve, reject) => {
        setTimeout(resolve, 2 * 1000);
    });
};

module.exports = {
    healthCheck,
    handleSIGTERM,
};
