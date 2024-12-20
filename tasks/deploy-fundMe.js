const { task } = require("hardhat/config")
//
task("deploy-fundMe", "部署 fundMe 合约").setAction(async (taskArgs, hre) => {
    //创建合约工厂 --await等这条语句执行完成之后才能执行下一条语句
    const fundMeFactory = await ethers.getContractFactory("FundMe")
    console.log("合约正在部署")
    // 通过工厂部署 合约 --await 等到部署成功之后再执行下一条语句
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
})

//验证部署的合约。fundMeAddress 合约地址 ， 
async function verifyFundMe(fundMeAddress, args) {

    //利用脚本自动验证 --通过 HardHat
    await hre.run("verify:verify", {
        address: fundMeAddress,
        constructorArguments: [args],
    });
}
module.exports = {

}