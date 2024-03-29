var express = require("express");
var router = express.Router();
var multer = require('multer');
var User = require("../models/user");
var util = require("../util");
var Wallet = require("../models/wallet")
var Hash = require("../models/hash")
const web3 = require('web3');
const Tx = require('ethereumjs-tx');
var fs = require("fs")

const myAccount = "0xdee5F53B29FDB3996fb546026fDdf49adc6D4a89"
//Infura HttpProvider Endpoint
var Web3 = new web3(new web3.providers.HttpProvider("https://ropsten.infura.io/v3/66f5bc220371494cb3465fca20893eb4"));

//var newAccount = Web3.eth.accounts.create('')

// function newAccount() {
//     var newAccount = Web3.eth.accounts.create('')    
//     newAccount;
//     console.log(newAccount)
//     newAddress = console.log(newAccount.address)
//     newprivateKey = console.log(newAccount.privateKey)
// }

// newAccount();


//var newAddress = console.log(Web3.eth.accounts.create('').address)
//var newprivateKey = console.log(Web3.eth.accounts.create('').privateKey)


router.get("/", util.isLoggedin, function (req, res) {
    Wallet.find({})
        .populate("owner")
        .sort("-createdAt")
        .exec(function (err, wallet) {
            if (err) return res.json(err);
            res.render("wallet/index", { wallet: wallet });
        });
});

router.get("/:username/history", util.isLoggedin, function (req, res) {
    Hash.find({ sender: req.session.passport.user })
    .populate("sender")
    .sort("-createdAt")            // 1
    .exec(function(err, hashes){    // 1
    if(err) return res.json(err);
    // let length = hashes.length
    res.render("wallet/dit", {hashes:hashes});
    });
});


// router.get("/:username/history", util.isLoggedin, function (req, res) {
//     req.body.sender = req.user._id;
//     User.findOne({ _id: req.user._id }, function (err, user) {
//         if (err) {
//             return res.json(err);
//         } else {
//             Wallet.findOne(req.body)
//                 .populate("owner")
//                 .exec(function (err, wallet) {
//                     if (err) {
//                         res.redirect('/wallet/:username/new')
//                     } else {
//                         Hash.find(req.body, async function (err, hash) {
//                             if(err) return res.status(500).json({error: err});
//                             if(!hash) return res.status(404).json({error: 'Hash not found'});
//                             // console.log(hash[0].hashes)
//                             let length = hash.length;
//                             res.render("wallet/txhistory", {
//                                 user: user,
//                                 wallet: wallet,
//                                 hash:hash,
//                                 length
//                         })
//                     });
//                 }
//             })
//         }
//     })
// });

router.get("/:username", util.isLoggedin, function (req, res) {
    req.body.owner = req.user._id;
    User.findOne({ _id: req.user._id }, function (err, user) {
        if (err) {
            return res.json(err);
        } else {
            Wallet.findOne(req.body)
                .populate("owner")
                .exec(async function (err, wallet) {
                    if (!wallet) {
                        res.redirect('/wallet/:username/new')
                    } else {
                        console.log(req.body)
                        await Web3.eth.getBalance(`${wallet.address}`, function (err, wei) {
                            balanceEth = Web3.utils.fromWei(wei, 'ether')
                            res.render("wallet/wallet", {
                                user: user,
                                wallet: wallet,
                                balanceEth
                            });
                        })
                    }
                })
        }
    })
});

//account.signTransaction
router.get("/:username/sendTx", util.isLoggedin, function (req, res) {
    req.body.owner = req.user._id;
    var hash = req.flash("hash")[0] || {};
    var errors = req.flash("errors")[0] || {};
    User.findOne({ _id: req.user._id }, function (err, user) {
        if (err) {
            return res.json(err);
        } else {
        var sender = req.user.username;
        var toAcc = req.query.toAcc;
        var fromAcc = req.query.fromAcc;
        var amount = req.query.amount;
        var data = req.query.data;
        var passForKey = req.query.passForKey;
        var jsonKey = req.query.jsonKey;
        Wallet.findOne(req.body)
            .populate("owner")
            .exec(function (err, wallet) {
                res.render("wallet/sendTx", {
                    user: user, wallet: wallet, myAccount, toAcc, fromAcc, amount, 
                    data, hash, sender, passForKey, jsonKey,
                    method: "get"
                });
            });
        }
    })
});

router.post("/:username/sendTx", util.isLoggedin, function (req, res) {
    // req.body.owner = req.user._id;
    // console.log(req.body)
    User.findOne({ _id: req.user._id }, function (err, user) {
        if (err) return res.json(err);
        var toAcc = req.body.toAcc;
        var fromAcc = req.body.fromAcc;
        var amount = req.body.amount;
        var data = req.body.data;
        let jsonKey = req.body.jsonKey
        var passForKey = req.body.passForKey;
        // console.log(req.body);
        var pKey = Web3.eth.accounts.decrypt(jsonKey, passForKey).privateKey;
        // console.log(pKey)
        Wallet.findOne(req.body)
            .populate("owner")
            .exec(async function (err, wallet) {
                if (err) return res.json(err);
                let sendTx = await Web3.eth.accounts.signTransaction({
                    to: toAcc,
                    value: amount,
                    gas: 210000,
                    data: '0x'+ Buffer.from(`${data}`).toString('hex')
                }, pKey, async function (err, result) {
                    if (err) {
                        console.error(err);
                        return;
                    }
                    // console.log(`rawTransaction ${result.rawTransaction}`);
                    // console.log(result);
                    let result2 = result
                    await Web3.eth.sendSignedTransaction(result.rawTransaction, function (err, result3) {
                        if (err) {
                            console.error(err);
                            return;
                        } else {
                            // console.log(result3);
                        let result4 = result3;
                        let hash = new Hash({
                            hashes: result4,
                            sender: user._id,
                            sendername: user.username
                        });
                        hash.save(async function (err, hash) {
                            if (err) {
                                req.flash("hash", req.body);
                                req.flash("errors", util.parseError(err));
                                return console.error(err);
                            }
                            res.render("wallet/sendTx2", {
                                user: user, myAccount, toAcc, fromAcc, amount, data, pKey, result2, result4,
                                balance: await Web3.eth.getBalance(`${fromAcc}`),
                                method: "post"
                            });
                        })
                    }
                });  
            });
        });
    })
});

router.get("/:username/new", util.isLoggedin, function (req, res) {
    var wallet = req.flash("wallet")[0] || {};
    var errors = req.flash("errors")[0] || {};
    let newAccount = Web3.eth.accounts.create('')
    let { address, privateKey } = newAccount
    console.log(req.session)
    // console.log(newAccount)
    // console.log(address)
    // console.log(privateKey)
    User.findOne({ username: req.params.username }, async function (err, user) {
        if (err) return res.json(err);
        return res.render("wallet/new", {
            user: user,
            address,
            privateKey,
            wallet: wallet,
            errors: errors,
        });
    });
});

router.post("/",util.isLoggedin, function (req, res){
    console.log("file!")
    let privateKey = req.body.privateKey;
    let passForKey = req.body.passForKey;
    let keystore = JSON.stringify(Web3.eth.accounts.encrypt(privateKey, passForKey));
    res.setHeader('Content-disposition', `attachment; filename=${req.session.passport.user}_keystore.json`);
    res.setHeader('Content-type', 'application/json');
    req.body.owner = req.user._id;
    console.log(req.body);
    User.findOne({ _id: req.user._id }, function (err, user) {
        if (err) return res.json(err);
        Wallet.create(req.body, function (err, wallet) {
            if (err) {
                req.flash("wallet", req.body)
            } else {
                res.write(keystore, function (err) {
                    res.end();
                })
            }
        })
    })
})

// router.post("/", util.isLoggedin, function (req, res) {
//     req.body.owner = req.user._id;
//     console.log(req.body);
//     User.findOne({ _id: req.user._id }, function (err, user) {
//         if (err) return res.json(err);
//         Wallet.create(req.body, function (err, wallet) {
//             if (err) {
//                 req.flash("wallet", req.body);
//                 req.flash("errors", util.parseError(err));
//                 return res.redirect(`/wallet/${user.username}`);
//             }
//             res.redirect(`/wallet/${user.username}`);
//         });
//     });
// });




    //Web3.eth.getBalance(myAddress).then(console.log) //잔액조회

    //console.log(Web3.eth.getBalance(myAddress)) // 잔액조회

    //Web3.eth.getAccounts().then(console.log); //계좌조회

    //console.log(Web3.eth.accounts.create('',function(password){'123'})); // 계정생성

    //app.listen(3000, () => console.log('Example app listening on port 3000!'))

    //console.log(Web3.eth.accounts.encrypt('0x42f0ac9a647fabdb1e12685f2bf0cc186868b1cca1edeeffca2e89ebd9f240d4','123'))

    //Web3.eth.personal.unlockAccount('0x3E8f4390728643ce0a3675a3AAEA6439A275827E','123', 600).then(console.log('Account unlocked!'));

    //console.log(Web3.eth.personal.unlockAccount('0xb3bd0Cb1567EF9De5AB16A24E6233F0A6c7aB03F','123', 600))

    module.exports = router;

//Functions
function parseError(errors) {
    var parsed = {};
    if (errors.name == 'ValidationError') {
        for (var name in errors.errors) {
            var validationError = errors.errors[name];
            parsed[name] = { message: validationError.message }
        }
    } else if (errors.code == "11000" && errors.errmsg.indexOf("username") > 0) {
        parsed.username = { message: "This username already exists!" };
    } else {
        parsed.unhandled = JSON.stringify(errors);
    }
    return parsed;
}

// private function 
function checkPermission(req, res, next) {
    User.findOne({ username: req.params.username }, function (err, user) {
        if (err) return res.json(err);
        if (user.id != req.user.id) return util.noPermission(req, res);
        next();
    });
}