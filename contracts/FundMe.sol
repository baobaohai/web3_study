// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;
import {AggregatorV3Interface} from "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

// 1.创建一个收款函数
// 2.记录投资人并且查看
// 3.在锁定期内，达到目标值生产商可以提款
// 4.在锁定期内，没达到目标值，投资人可以在锁定期以后可以退款
contract FundMe {
    //2.记录投资人并且查看 , key :发送合约的人  value :  token
    mapping(address => uint256) public fundersToAmount;
    uint256 constant MINIMUM_VALUE = 100 * 10**18; //wei ==1eth  --100美元
    //合约AggregatorV3Interface
    AggregatorV3Interface internal dataFeed;

    //达到目标值
    uint256 constant TARGET = 1000 * 10**18;
    //合约拥有者 ，谁可以把合约的余额转移到自己的余额里面
    address public owner;

    //从合约部署的时间开始 从1970年 一月一号开始 到 目前为止，经过了多少秒。   （众筹开始时间点  ）
    uint256 deploymentTimestamp;
    //锁定多久 --由部署者确定 秒为单位
    uint256 lockTime;
    address erc20Address;
    bool public getFundSuccess = false;

    //构造函数在合约部署的时候被一次性调用
    constructor(uint256 _lockTime) {
        //喂价地址--转换成美元   --Sepolia 测试网
        dataFeed = AggregatorV3Interface(
            0x694AA1769357215DE4FAC081bf1f309aDC325306
        );
        //部署合约的人（地址）就是这个合约的ower
        owner = msg.sender;
        //部署区块的当前时间
        deploymentTimestamp = block.timestamp;
        //用户指定的时长
        lockTime = _lockTime;
    }

    //1.创建一个收款函数 ,payable标识可以接收链上的原生token
    function fund() external payable {
        //require是判断,如果条件不成立，则报异常
        require(convertEthToUsd(msg.value) >= MINIMUM_VALUE, "send more eth");
        //大于deploymentTimestamp 并且小于deploymentTimestamp+ lockTime 这个范围
        //block.timestamp --当前区块的当前时间，以秒为单位
        //wei的9次方==gwei ,gwei的6次方==finney  , finney的3次方==ether
        fundersToAmount[msg.sender] = msg.value;
    }

    /**
     * Returns the latest answer.
       eth 对应的 USD  价格  
     */
    function getChainlinkDataFeedLatestAnswer() public view returns (int256) {
        // prettier-ignore
        (
            /* uint80 roundID */, 
            int answer,
            /*uint startedAt*/,
            /*uint timeStamp*/,
            /*uint80 answeredInRound*/
        ) = dataFeed.latestRoundData();
        return answer;
    }

    /**
       ETH 转成美元
    * Returns the latest USD value.
     */
    function convertEthToUsd(uint256 ethAmount)
        internal
        view
        returns (uint256)
    {
        //eth数量 * ETH价格 = ETH value
        uint256 ethPrice = uint256(getChainlinkDataFeedLatestAnswer());
        return (ethAmount * ethPrice) / (10**8);
        //eth --usd 的精度
    }

    //提款: 把智能合约里面的balance  tranfer 给调用函数的人
    /**
       转账函数
       transfer --纯转账：从一个地址到另外一个地址 。transfer ETH  and revert  if tranction failed
       send -----纯转账：从一个地址到另外一个地址  。成功返回true ,失败返回 false 
       call ---纯转账+ 数据（例如函数调用）  

    **/
    function getFud() external windowClosed onlyOwer {
        //获取当前合地址里面的余额  ETH 转成美元
        require(
            convertEthToUsd(address(this).balance) >= TARGET,
            "target not reach !!"
        );
        //getFu函数只能被owner调用
        //require(msg.sender == owner, "this function can only call by owners");
        //window is  not closed 此时只能做fund ，不能做getFund
        // require(
        //     block.timestamp >= deploymentTimestamp + lockTime,
        //     "window is  not closed "
        // );

        //  转账
        payable(msg.sender).transfer(
            //当前合约地址中的余额
            address(this).balance
        );

        // bool  succcess =    payable(msg.sender).send(
        //     //当前合约地址中的余额
        //     address(this).balance
        // );
        // require(succcess,"tx failed ");
        bool succcess;
        (succcess, ) = payable(msg.sender).call{value: address(this).balance}(
            ""
        );
        //后记录清零
        fundersToAmount[msg.sender] = 0;
        //执行成功之后 修改状态
        getFundSuccess = true;
    }

    //  修改合约的owner ，合约的所有权从一个地址转移到到另外一个地址
    function transferOwerShip(address newOwner) public onlyOwer {
        //require(msg.sender == owner, "this function can only call by owner");
        owner = newOwner;
    }

    //退款
    function refund() external windowClosed {
        //没达到目标值.可以退款
        require(
            convertEthToUsd(address(this).balance) < TARGET,
            "target is reach"
        );
        /**
         当时投资了多少就退回多少 ，
         监测这个人有没有进行投资。 监测当前发送人地址是否存在   
         **/
        uint256 amount = fundersToAmount[msg.sender];
        require(amount != 0, "there is no fund for you ");

        bool succcess;
        (succcess, ) = payable(msg.sender).call{value: amount}("");
        require(succcess, "transfer tx failed ");
        //退还之后记录地址对应的 value值清零
        fundersToAmount[msg.sender] = 0;
    }

    //只有erc20 才能修改
    function setFunderToAmount(address funder, uint256 amountToUpdate)
        external
    {
        require(
            msg.sender == erc20Address,
            "you do not have permission to call this function "
        );

        fundersToAmount[funder] = amountToUpdate;
    }

    //只有 owner才能设置值
    function setErc20Addr(address _erc20Address) public onlyOwer {
        erc20Address = _erc20Address;
    }

    //过了锁定期间才可以
    modifier windowClosed() {
        //window is  not closed 此时只能做fund ，不能做refund ，只有过了锁定期间才可以
        require(
            block.timestamp >= deploymentTimestamp + lockTime,
            "window is  not closed "
        );
        _; //下划线代表当合约用了这个windowClosed 需要先执行 下划线上的逻辑， 然后在执行调用windowClosed 函数的内的逻辑
    }

    modifier onlyOwer() {
        require(msg.sender == owner, "this function can only call by owners");
        _;
    }
}
