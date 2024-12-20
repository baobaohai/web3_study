const { task } = require("hardhat/config")
//里面使用了fundMe这个合约，需要传入进来，参数addr ，
task("interact-fundMe" ,"使用合约")
    .addParam("addr", "合约地址")
    .setAction(async (taskArgs, hre) => {
        //创建合约工厂 --await等这条语句执行完成之后才能执行下一条语句
        const fundMeFactory = await ethers.getContractFactory("FundMe")
        //将地址贴在合约上
        const fundMe = fundMeFactory.attach(taskArgs.addr)
        //-----使用 fundMe
        //初始化2个账户， owner 和非owner --  hardhat.config.js 中的accounts: [PRIVATE_KEY,PRIVATE_KEY_1],
        const [firstAccount, secondAccount] = await ethers.getSigners()
        //调用合约中的Fund函数 ，通过第一个账户转一些ETH到合约中， 查看合约的Banlance 是否有变化。
        const fundTx = await fundMe.fundMe({ value: ethers.parseEther("0.5") })  //标识交易成功，但不代表已经写入区块链
        await fundTx.wait()  //等待成功
        //查看合约的Banlance 是否有变化。 ethers.provider 相当于EtherScan的浏览器 ,fundMe.target 合约的地址
        const banlanceContract = await ethers.provider.getBalance(fundMe.target)
        console.log('balance of the contract is ${banlanceContract}')

        //用第二个账户转fundMe.connect(secondAccount)，查看是否 成功， 查看合约的Banlance 是否有变化。
        const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fundMe({ value: ethers.parseEther("0.0012") })  //标识交易成功，但不代表已经写入区块链
        await fundTxWithSecondAccount.wait()  //等待成功
        //查看合约的Banlance 是否有变化。 ethers.provider 相当于EtherScan的浏览器 ,fundMe.target 合约的地址
        const banlanceContractAfterSecondFud = await ethers.provider.getBalance(fundMe.target)
        console.log('合约的余额 ${banlanceContractAfterSecondFud}')

        // 每次有新的地址给这个合约进行转账的时候，fundersToAmount --数据就会更新  
        const firstAccountBanlanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
        const secondAccountBanlanceInFundMe = await fundMe.fundersToAmount(secondAccount.address)
        console.log('合约的第1个账户 ${firstAccount.address} 是 ${firstAccountBanlanceInFundMe}')
        console.log('合约的第2个账户 ${secondAccount.address} 是 ${secondAccountBanlanceInFundMe}')
    })
module.exports = {

}