const MangoPay = require('mangopay2-nodejs-sdk');

const mangoPayClient = new MangoPay({
    clientId: 'dmo_655a599f5216e',
    clientApiKey: '0XfCyQ2oz5VaCQFoh0rxixjPpgWy92JFY05H8qDO5uzDsdhYOy',
    baseUrl: 'https://api.sandbox.mangopay.com', // Use the sandbox environment for testing
});

const createUser = async (req, res) => {
    try {
        const user = await mangoPayApi.Users.create({
            FirstName: "John",
            LastName: "Doe",
            Birthday: 121271,
            Nationality: "FR",
            CountryOfResidence: "FR",
            Email: "john.doe@example.com",
            PersonType: "NATURAL" 
        });
        res.json(user);
    } catch (error) {
        res.status(500).send(error.message);
    }
};
const createWallet = async (req, res) => {
    try {
        const wallet = await mangoPayApi.Wallets.create({
            Owners: [req.body.userId],
            Description: "Wallet description",
            Currency: "USD"
        });
        res.json(wallet);
    } catch (error) {
        res.status(500).send(error.message);
    }
};

const createPayIn = async (req, res) => {
    try {
        const payIn = await mangoPayApi.PayIns.create({
            // Fill in the PayIn details
            AuthorId: req.body.userId,
            DebitedWalletId: req.body.walletId,
            DebitedFunds: {
                Currency: "USD",
                Amount: 1000
            },
            Fees: {
                Currency: "USD",
                Amount: 100
            },
        });
        res.json(payIn);
    } catch (error) {
        res.status(500).send(error.message);
    }
};


const transferToCompanyWallet = async (req, res) => {
    // Implement your logic here
};

// Function to pay out to a developer's wallet
const payoutToDeveloper = async (req, res) => {
    // Implement your logic here
};

// Function to handle disputes
const handleDispute = async (req, res) => {
    // Implement your logic here
};

module.exports = {
    createUser,
    createWallet,
    createPayIn,
    transferToCompanyWallet,
    payoutToDeveloper,
    handleDispute
};
