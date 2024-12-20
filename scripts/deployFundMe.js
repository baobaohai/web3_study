//第一步骤 ：import ethers.js ,引入hardhat中的ethers
const { ethers } = require("hardhat")
//第二步骤：创建一个函数通过 ethers.js获取合约在进行部署
async function main12() {
    //创建合约工厂 --await等这条语句执行完成之后才能执行下一条语句
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    console.log("合约正在部署")
    // 通过工厂部署合约 --await 等到部署成功之后再执行下一条语句
    const fundMe = await fundMeFactory.deploy(1)
    //等到入块才是真正部署完成  
    await fundMe.waitForDeployment()
    console.log(`合约已经部署成功，合约地址  ${fundMe.target}`);
    //通过运行时环境获取,判断是否部署在测试网络 ,key存在 
    if (hre.network.config.chainId == 11155111 && process.env.ETHERSCAN_API_KEY) {
        //验证合约
        //等5个区块 ，等到数据写入到sepolia.etherscan.io 数据库在执行验证
        console.log(`合约正在入块到数据库`);
        await fundMe.deploymentTransaction().wait(5)
        await verifyFundMe(fundMe.target, [1])
    } else {
        console.log(`测试网络验证跳过，属于本地测试`);
    }
    //初始化2个账户， owner 和非owner --  hardhat.config.js 中的accounts: [PRIVATE_KEY,PRIVATE_KEY_1],
    const [firstAccount, secondAccount] = await ethers.getSigners()
    //调用合约中的Fund函数 ，通过第一个账户转一些ETH到合约中， 查看合约的Banlance 是否有变化。
    const fundTx = await fundMe.fundMe({ value: ethers.parseEther("0.5") })  //标识交易成功，但不代表已经写入区块链
    await fundTx.wait()  //等待成功
    //查看合约的Banlance 是否有变化。 ethers.provider 相当于EtherScan的浏览器 ,fundMe.target 合约的地址
    const banlanceContract = await ethers.provider.getBalance(fundMe.target)
    console.log('balance of the contract is ${banlanceContract}')

    //用第二个账户转fundMe.connect(secondAccount)，查看是否 成功， 查看合约的Banlance 是否有变化。
    const fundTxWithSecondAccount = await fundMe.connect(secondAccount).fundMe({ value: ethers.parseEther("0.5") })  //标识交易成功，但不代表已经写入区块链
    await fundTxWithSecondAccount.wait()  //等待成功
    //查看合约的Banlance 是否有变化。 ethers.provider 相当于EtherScan的浏览器 ,fundMe.target 合约的地址
    const banlanceContractAfterSecondFud = await ethers.provider.getBalance(fundMe.target)
    console.log('合约的余额 ${banlanceContractAfterSecondFud}')

    // 每次有新的地址给这个合约进行转账的时候，fundersToAmount --数据就会更新  
    const firstAccountBanlanceInFundMe = await fundMe.fundersToAmount(firstAccount.address)
    const secondAccountBanlanceInFundMe = await fundMe.fundersToAmount(secondAccount.address)
    console.log('合约的第1个账户 ${firstAccount.address} 是 ${firstAccountBanlanceInFundMe}')
    console.log('合约的第2个账户 ${secondAccount.address} 是 ${secondAccountBanlanceInFundMe}')


  


}
//第三步骤： 执行函数--捕获异常
main12().then().catch((error) => {
    console.error(error)
    //正常退出
    process.exit(1)
})
//验证部署的合约。fundMeAddress 合约地址 ， 
async function verifyFundMe(fundMeAddress, args) {

    //利用脚本自动验证 --通过 HardHat
    await hre.run("verify:verify", {
        address: fundMeAddress,
        constructorArguments: [args],
    });
}
