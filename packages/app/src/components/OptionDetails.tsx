import {
    Accordion,
    AccordionButton,
    AccordionIcon,
    AccordionItem,
    AccordionPanel,
    Alert,
    AlertDialog,
    AlertDialogBody,
    AlertDialogCloseButton,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogOverlay,
    AlertIcon,
    Box,
    Button,
    Divider,
    Flex,
    FormLabel,
    HStack,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Popover,
    PopoverArrow,
    PopoverBody,
    PopoverContent,
    PopoverTrigger,
    SlideFade,
    Stack,
    Table,
    Tag,
    TagLabel,
    Tbody,
    Td,
    Text,
    Th,
    Thead,
    Tooltip,
    Tr,
    useColorModeValue,
    useDisclosure,
    useRadioGroup,
    useToast
} from '@chakra-ui/react';
import {Icon, QuestionOutlineIcon} from '@chakra-ui/icons';
import {
    FiShoppingCart,
    GiMoneyStack,
    MdArrowDownward,
    MdArrowUpward,
    MdDateRange,
    RiHandCoinLine
} from "react-icons/all";
import RadioCard from "./Radio";
import {
    getAddressFromSignedOrder,
    getUserNonce,
    optionTypeToNumber,
    signOrder,
    toEthDate,
    getAvailableBalance,
    matchOrders,
    optionActionToIsBuy,
    transformOrderAppChain,
    validateOrderAddress,
    formatDate,
    getSymbolFor,
    announceOrder,
    iOrderToCommon,
    getAnnouncedEvent,
    fromEthDate,
    hashOrderCommon, formatTime, getBigWalletBalance,
} from '../utils/ethMethods'
import { BigNumber, ethers } from 'ethers'
import {useWeb3React} from "@web3-react/core";
import React, { useContext, useEffect, useRef, useState } from 'react'
import {
    AppCommon, AppOrderSigned,
    IOrder, OptionData,
    OrderBook,
    OrderCommon,
    OrderType,
    SellBuy,
    UnsignedOrder,
} from '../types'
import {TxContext} from "./Store";
import {ToastDescription} from "./TxMonitoring";
import {handleErrorMessagesFactory} from '../utils/handleErrorMessages';
import {ConnectWalletModal, getErrorMessage} from './ConnectWallet';
import {isMobile} from "react-device-detect";
import { useLazyQuery, useQuery } from '@apollo/client'
import { OPTION_POSITION_QUERY, ORDER_DETAILS_QUERY } from '../constants/queries'

const { Zero } = ethers.constants;

function OptionDetails({ appCommon, sellBuy, hooks, optionData, positionHash }: {
    appCommon: AppCommon,
    sellBuy: SellBuy,
    hooks: {approving: any, setApproving: any, activeHash: any, setActiveHash: any},
    optionData: OptionData,
    positionHash: string
}) {

    const { isOpen: isOpenConfirmDialog, onOpen: onOpenConfirmDialog, onClose: onCloseConfirmDialog } = useDisclosure();
    const cancelRef = useRef();

    const [localError, setLocalError] = useState('');
    const {
        isOpen: isOpenConnectModal,
        onClose: onCloseConnectModal
    } = useDisclosure();

    const { approving, setApproving, setActiveHash } = hooks;
    const {active, library, account, error: web3Error, chainId} = useWeb3React();
    const alertColor = useColorModeValue("gray.100", "shrub.300")
    const { pendingTxs } = useContext(TxContext);
    const [pendingTxsState, pendingTxsDispatch] = pendingTxs;
    const {formattedStrike, formattedExpiry, baseAsset, quoteAsset, expiry, optionType, strike} = appCommon
    // Hooks
    const [amount, setAmount] = useState(1);
    const [price, setPrice] = useState('');
    const [optionPosition, setOptionPosition] = useState(0);
    const [balances, setBalances] = useState<{shrub: {baseAsset: BigNumber, quoteAsset: BigNumber}, wallet: {baseAsset: BigNumber, quoteAsset: BigNumber}}>()
    const [marketPrice, setMarketPrice] = useState('');
    const [orderBook, setOrderBook] = useState<OrderBook>({buyOrders: [], sellOrders: []})
    // Radio logic
    const radioOptions = ['BUY', 'SELL']
    const radioOrderTypes = ['Market', 'Limit']
    const [radioOption, setRadioOption] = useState<SellBuy>(sellBuy);
    const [radioOrderType, setRadioOrderType] = useState<OrderType>('Market');
    const toast = useToast();
    const {
        getRootProps: getOptionRootProps,
        getRadioProps: getOptionRadioProps,
    } = useRadioGroup({
        name: "option",
        defaultValue: sellBuy,
        onChange: (nextValue: SellBuy) => setRadioOption(nextValue),
    });

    const orderBookColorMobile = useColorModeValue("gray.500", "black");
    const orderBookBgColorMobile = useColorModeValue("gray.100", "gray.400");
    const orderBookColor = useColorModeValue("gray.600", "gray.200");

    const {
        loading: orderDetailsLoading,
        error: orderDetailsError,
        data: orderDetailsData
    } = useQuery(ORDER_DETAILS_QUERY, {
        variables: {
            positionHash,
            offerExpire: toEthDate(new Date()),
        },
        pollInterval: 5000  // Poll every five seconds
    });

    const [ getOptionPositionQuery, {
        loading: optionPositionLoading,
        error: optionPositionError,
        data: optionPositionData
    }] = useLazyQuery(OPTION_POSITION_QUERY, {
        variables: {id: `${account && account.toLowerCase()}-${positionHash}`}
    })

    useEffect(() => {
        // console.log('useEffect - 1 - construct order book')
        if (!orderDetailsData) {
            return
        }
        const {
            strike: decimalStrike,
            lastPrice,
            sellOrders,
            buyOrders,
            id,
        } = orderDetailsData && orderDetailsData.option

        const buyOrdersBook = buyOrders.map((order: any) => {
            return {
                unitPrice: Number(order.pricePerContract),
                formattedSize: order.size,
                positionHash,
                user: order.userOption.user.id,
                blockHeight: order.block,
            }
        }).sort((a: any, b: any) => b.unitPrice - a.unitPrice)
        const sellOrdersBook = sellOrders.map((order: any) => {
            return {
                unitPrice: Number(order.pricePerContract),
                formattedSize: order.size,
                positionHash,
                user: order.userOption.user.id,
                blockHeight: order.block,
            }
        }).sort((a: any, b: any) => a.unitPrice - b.unitPrice)

        setOrderBook({ sellOrders: sellOrdersBook, buyOrders: buyOrdersBook })
    }, [orderDetailsData])

    useEffect(() => {
        // console.log('useEffect - 2 - set market price')
        if (!price) {
            setPrice(radioOption === 'BUY' ? orderBook.sellOrders[0]?.unitPrice.toFixed(4) : orderBook.buyOrders[0]?.unitPrice.toFixed(4));
        }
        if (radioOrderType !== 'Market') {
            return;
        }
        setMarketPrice(radioOption === 'BUY' ? orderBook.sellOrders[0]?.unitPrice.toFixed(4) : orderBook.buyOrders[0]?.unitPrice.toFixed(4));
    }, [radioOrderType, orderBook])

    // Get balances
    useEffect(() => {
        // console.log('useEffect - 3 - get balances');
        async function main() {
            if (!account) {
                return;
            }
            // Run the option position query
            getOptionPositionQuery();
            const bigQuoteAssetBalanceShrub = await getAvailableBalance({
                address: account,
                tokenContractAddress: quoteAsset,
                provider: library
            })
            const bigBaseAssetBalanceShrub = await getAvailableBalance({
                address: account,
                tokenContractAddress: baseAsset,
                provider: library
            })
            const { bigBalance: bigQuoteAssetBalanceWallet } = await getBigWalletBalance(quoteAsset, library);
            const { bigBalance: bigBaseAssetBalanceWallet } = await getBigWalletBalance(baseAsset, library);
            setBalances({
                shrub: {quoteAsset: bigQuoteAssetBalanceShrub, baseAsset: bigBaseAssetBalanceShrub},
                wallet: {baseAsset: bigBaseAssetBalanceWallet, quoteAsset: bigQuoteAssetBalanceWallet}
            })
        }
        main()
          .catch(console.error);
    },[active, account])

    useEffect(() => {
        // console.log('useEffect - 4 - updateOptionPosition')
        const oPosition = optionPositionData && optionPositionData.userOption && optionPositionData.userOption.balance;
        setOptionPosition(Number(oPosition))
    }, [optionPositionData])

    const {
        getRootProps: getOrderTypeRootProps,
        getRadioProps: getOrderTypeRadioProps,
    } = useRadioGroup({
        name: "orderType",
        defaultValue: 'Market',
        onChange: (nextValue: OrderType) => {
            setRadioOrderType(nextValue)
        },
    });

    const groupOption = getOptionRootProps();
    const groupOptionType = getOrderTypeRootProps();

   const handleErrorMessages = handleErrorMessagesFactory(setLocalError);
   

    async function limitOrder() {
        try {
        setApproving(true);
        if (!active || !account) {
            setLocalError('');
            handleErrorMessages({ customMessage: 'Please connect your wallet'})
            console.error('Please connect your wallet');
            setApproving(false);
            return;
        }
        if (!price) {
            throw new Error('Price is required');
        }
        const now = new Date();
        const oneDayFromNow = new Date(now);
        oneDayFromNow.setUTCDate(oneDayFromNow.getUTCDate() + 1);
        const common:OrderCommon = {
            baseAsset,
            quoteAsset,
            expiry: toEthDate(expiry),
            strike,
            optionType: optionTypeToNumber(optionType)
        }
        const nonce = (await getUserNonce(account, common, library)) + 1;
        const unsignedOrder: UnsignedOrder = {
            size: ethers.utils.parseUnits(amount.toString(), 18),
            isBuy: optionActionToIsBuy(radioOption),
            optionType: optionTypeToNumber(optionType),
            baseAsset,
            quoteAsset,
            expiry: toEthDate(expiry),
            strike,
            price: ethers.utils.parseUnits((Number(price) * amount).toString(), 18),
            fee: ethers.utils.parseUnits('0', 18),
            offerExpire: toEthDate(oneDayFromNow),
            nonce,
        };
            const signedOrder = await signOrder(unsignedOrder, library);
            const verifiedAddress = await getAddressFromSignedOrder(signedOrder, library);
            console.log(`verifiedAddress: ${verifiedAddress}`);
            const tx = await announceOrder(signedOrder, library);
            console.log(tx);
            const quoteSymbol = await getSymbolFor(quoteAsset, library);
            const description = `Submitted limit order to ${radioOption.toLowerCase()} ${amount} ${formatDate(expiry)} $${formattedStrike} ${quoteSymbol} ${optionType.toLowerCase()} options for $${price}`;
            const orderToName = {
                optionAction: radioOption,
                formattedSize: amount,
                optionType,
                formattedStrike,
                formattedExpiry
            };
            const data = {
                txType: 'limitOrder',
                id: '',
                blockNumber: '',
                orderToName,
                positionHash,
                userAccount: account,
                status: 'confirming',
                pricePerContract: price
            }
            pendingTxsDispatch({type: 'add', txHash: tx.hash, description, data})
            setActiveHash(tx.hash);
            console.log(pendingTxsState);
            try {
                const receipt = await tx.wait()
                const toastDescription = ToastDescription(description, receipt.transactionHash, chainId);
                toast({title: 'Transaction Confirmed', description: toastDescription, status: 'success', isClosable: true, variant: 'solid', position: 'top-right'})
                pendingTxsDispatch({type: 'update', txHash: receipt.transactionHash, status: 'confirmed', data: {blockNumber: receipt.blockNumber, status: 'active'}})
            } catch (e) {
                const toastDescription = ToastDescription(description, e.transactionHash, chainId);
                toast({title: 'Transaction Failed', description: toastDescription, status: 'error', isClosable: true, variant: 'solid', position: 'top-right'})
                pendingTxsDispatch({type: 'update', txHash: e.transactionHash || e.hash, status: 'failed'})
            }
            console.log(pendingTxsState);
            setApproving(false);
        } catch (e) {
            console.error(e);
            setApproving(false);
            handleErrorMessages({err:e});
        }
    }

    async function marketOrderMany() {
        try {
            console.log('running marketOrderMany');
            setApproving(true);
            if (!active || !account) {
                setLocalError('');
                handleErrorMessages({ customMessage: 'Please connect your wallet'})
                console.error('Please connect your wallet');
                setApproving(false);
                return;
            }
            let signedBuyOrders: IOrder[] = [];
            let signedSellOrders: IOrder[] = [];
            const localOrderBook = radioOption === 'BUY' ? orderBook.sellOrders : orderBook.buyOrders;
            // const depth = localOrderBook.reduce((tot, order) => tot.add(order.size), Zero)
            const depth = localOrderBook.reduce((tot, order) => tot.add(ethers.utils.parseUnits(order.formattedSize, 18)), Zero)
            const bigSize = ethers.utils.parseUnits(amount.toString(), 18);
            if (bigSize.gt(depth)) {
                throw new Error('Order size exceeds available depth in orderbook');
            }
            let remainingSize = ethers.BigNumber.from(bigSize);
            const now = new Date();
            const oneWeekFromNow = new Date(now);
            oneWeekFromNow.setUTCDate(oneWeekFromNow.getUTCDate() + 7);

            // Create as many unsigned orders as needed to get the total amount up to the requested amount
            const counterPartyOrders: IOrder[] = [];

            let index = 0;
            let accumulatedPrice = Zero;
            let temporaryWorkaroundPrice = Zero;
            while (remainingSize.gt(Zero)) {
                // const order = localOrderBook[index];
                let order: AppOrderSigned | undefined;
                const lightOrder = localOrderBook[index];
                if (!lightOrder) {
                    throw new Error('Insufficient market depth for this order. Try making a smaller order.');
                }
                // @ts-ignore
                const {blockHeight, user, formattedSize, unitPrice} = lightOrder;
                const orders = await getAnnouncedEvent(library, positionHash, user, blockHeight);
                if (!orders) {
                    continue;
                }
                if (orders.length === 1) {
                    order = orders[0];
                } else {
                    order = orders.find((o) => {
                        return (
                            o.optionAction !== radioOption &&
                            Number(o.formattedSize).toFixed(4) === Number(formattedSize).toFixed(4) &&
                            Number(o.unitPrice).toFixed(4) === Number(unitPrice).toFixed(4)
                        )
                    })
                }
                if (!order) {
                    continue;
                }
                // Need to convert order into AppOrderSigned
                const { address: counterpartyAddress, nonce: orderNonce, size } = order;
                if (!counterpartyAddress) {
                    console.error('no counterparty address on order');
                    index++;
                    continue;
                }
                const counterPartyOrder = transformOrderAppChain(order);
                const doesAddressMatch: boolean = await validateOrderAddress(counterPartyOrder, library);
                const counterPartyCommon = iOrderToCommon(counterPartyOrder);
                console.log(doesAddressMatch);
                const counterpartyNonce = await getUserNonce(counterpartyAddress, counterPartyCommon, library) + 1;
                console.log(counterpartyNonce);
                console.log(orderNonce);
                if (orderNonce !== counterpartyNonce) {
                    console.error("order nonce does not match the signer of the order's nonce");
                    index++;
                    continue;
                }
                // if buying - check the collateral of the counterparty
                if (radioOption === 'BUY') {
                    if (optionType === 'CALL') {
                        // required collateral is size of the quoteAsset
                        const balance = await getAvailableBalance({
                            address: counterpartyAddress,
                            tokenContractAddress: quoteAsset,
                            provider: library
                        });
                        console.log(balance);
                        console.log(size)
                        if (balance.lt(size)) {
                            throw new Error("Not enough collateral of quoteAsset");
                        }
                    } else {
                        // Case: PUT
                        // required collateral is strike * size of the baseAsset
                        const balance = await getAvailableBalance({
                            address: counterpartyAddress,
                            tokenContractAddress: baseAsset,
                            provider: library
                        });
                        console.log(balance.toString());
                        // TODO: Add this validation back where it properly checks if the user has sufficient funds to buy the put
                        // if (balance.lt(ethers.BigNumber.from(pricePerContract).mul(size))) {
                        //     throw new Error("Not enough collateral of baseAsset");
                        // }
                    }
                }
                // TODO: If selling, check that you have sufficient collateral

                remainingSize = remainingSize.sub(order.size);
                accumulatedPrice = accumulatedPrice.add(counterPartyOrder.price);
                if (remainingSize.lt(Zero)) {
                    accumulatedPrice = accumulatedPrice.add(remainingSize.mul(counterPartyOrder.price).div(counterPartyOrder.size));
                    remainingSize = Zero;
                }
                counterPartyOrders.push(counterPartyOrder);
                // TODO: the matchOrders method of the contract needs to accomadate accumulatedPrice - see chat logs from Oct 21
                temporaryWorkaroundPrice = bigSize.mul(counterPartyOrder.price).div(counterPartyOrder.size);
                console.log('remaining size');
                console.log(ethers.utils.formatUnits(remainingSize));
                index++;
            }
            const common:OrderCommon = {
                baseAsset,
                quoteAsset,
                expiry: toEthDate(expiry),
                strike,
                optionType: optionTypeToNumber(optionType)
            }
            const nonce = (await getUserNonce(account, common, library)) + 1;

            const unsignedOrder: UnsignedOrder = {
                ...common,
                size: bigSize,
                isBuy: optionActionToIsBuy(radioOption),
                // TODO: update contract so that the commented out price logic works (with partial orders)
                // price: accumulatedPrice,
                price: temporaryWorkaroundPrice,
                fee: ethers.utils.parseUnits('0', 18),
                offerExpire: toEthDate(oneWeekFromNow),
                nonce,
            };
            // ordersToSign.push(unsignedOrder);
            const signedOrder = await signOrder(unsignedOrder, library);
            if (radioOption === 'BUY') {
                signedBuyOrders = [signedOrder];
                signedSellOrders = counterPartyOrders;
            } else {
                signedBuyOrders = counterPartyOrders;
                signedSellOrders = [signedOrder];
            }
            console.log(signedBuyOrders, signedSellOrders);
            const tx = await matchOrders(signedBuyOrders, signedSellOrders, library)
            console.log(tx);
            const quoteSymbol = await getSymbolFor(quoteAsset, library);
            const description = `${radioOption === 'BUY' ? 'Buy' : 'Sell'} ${amount} ${formatDate(expiry)} $${formattedStrike} ${quoteSymbol} ${optionType.toLowerCase()} options for $${ethers.utils.formatUnits(accumulatedPrice, 18)}`;
            const orderToName = {
                optionAction: radioOption,
                formattedSize: amount,
                optionType,
                formattedStrike,
                formattedExpiry
            };
            const pricePerContract = Number(ethers.utils.formatUnits(accumulatedPrice)) / amount
            const formattedPricePerContract = (Math.round(Number(pricePerContract) * 10000) / 10000).toString();
            const data = {
                txType: 'marketOrder',
                id: '',
                blockNumber: '',
                orderToName,
                positionHash,
                userAccount: account,
                status: 'confirming',
                pricePerContract: formattedPricePerContract,
            }
            pendingTxsDispatch({type: 'add', txHash: tx.hash, description, data})
            setActiveHash(tx.hash);
            console.log(pendingTxsState);
            try {
                const receipt = await tx.wait()
                const toastDescription = ToastDescription(description, receipt.transactionHash, chainId);
                toast({title: 'Transaction Confirmed', description: toastDescription, status: 'success', isClosable: true, variant: 'solid', position: 'top-right'})
                pendingTxsDispatch({type: 'update', txHash: receipt.transactionHash, status: 'confirmed', data: {blockNumber: receipt.blockNumber, status: 'completed'}})
            } catch (e) {
                const toastDescription = ToastDescription(description, e.transactionHash, chainId);
                toast({title: 'Transaction Failed', description: toastDescription, status: 'error', isClosable: true, variant: 'solid', position: 'top-right'})
                pendingTxsDispatch({type: 'update', txHash: e.transactionHash || e.hash, status: 'failed'})
            }
            console.log(pendingTxsState);

        } catch (e) {
            setApproving(false);
            handleErrorMessages({ err: e})
            console.error(e);
        }
    }

    function placeOrderConfirmation() {
        if(radioOrderType === 'Limit') {
            limitOrder();
        } else {
            marketOrderMany();
        }
        onCloseConfirmDialog();

    }
    // TODO: get the symbols dynamically
    const tooltipLabel = `You are about to ${radioOption === 'BUY' ? 'buy' : 'sell'} options that give ${radioOption === 'BUY' ? 'you' : 'someone'} the right to ${optionType === 'CALL' ? 'buy' : 'sell'} ${amount} sMATIC for ${formattedStrike} sUSD/sMATIC ${radioOption === 'SELL' ? `${optionType === 'CALL' ? 'from' : 'to'} you` : ''} until ${formattedExpiry}`;

    const orderbookSellRows: JSX.Element[] = [];
    const orderbookBuyRows: JSX.Element[] = [];
    orderBook.sellOrders
      .slice(0,6)
      .sort((a,b) => b.unitPrice - a.unitPrice)
      .forEach((sellOrder, index) => {
        if (index > 5) {
            return;
        }
        orderbookSellRows.push(<Tr key={index} letterSpacing={"wide"} fontWeight={"semibold"} color={orderBookColor}>
            <Td>{`$${sellOrder.unitPrice.toFixed(4)}`}</Td>
            <Td>{sellOrder.formattedSize}</Td>
        </Tr>)
    });
    orderBook.buyOrders
      .slice(0, 6)
      .sort((a,b) => b.unitPrice - a.unitPrice)
      .forEach((buyOrder, index) => {
          if (index > 5) {
              return;
          }
          orderbookBuyRows.push(
              <Tr key={index} letterSpacing={"wide"} fontWeight={"semibold"} color={orderBookColor}>
              <Td>{`$${buyOrder.unitPrice.toFixed(4)}`}</Td>
              <Td>{buyOrder.formattedSize}</Td>
          </Tr>)
      });

    return (
      <>
          {localError &&
          <>
              <SlideFade in={true} unmountOnExit={true}>
                  <Flex>
                      <Alert status="error" borderRadius={"2xl"} my={4}>
                            <AlertIcon/>
                            {!!web3Error ? getErrorMessage(web3Error).message : localError}
                        </Alert>
                    </Flex>
                </SlideFade>
            </>
            }
            <Modal motionPreset="slideInBottom" isOpen={isOpenConnectModal}
                   onClose={onCloseConnectModal}>
                <ModalOverlay/>
                <ModalContent top="6rem" boxShadow="dark-lg" borderRadius="15">
                    <ModalHeader>
                        <Text fontSize={20}>Connect to a wallet</Text>
                    </ModalHeader>
                    <ModalCloseButton/>
                    <ModalBody>
                        <ConnectWalletModal/>
                    </ModalBody>
                </ModalContent>
            </Modal>

            <Flex direction={{ base: "column", md: "row" }}>
                <Box id={"order form"}>
                    <Stack spacing="24px">
                        <Box mt={2} mb={8}>
                            <HStack spacing={3}>
                                {/*<Tooltip label={tooltipLabel} bg="gray.300" color="gray.800" borderRadius="lg">*/}
                                    <Tag colorScheme="green">
                                        {!isMobile &&  <Icon as={sellBuy === 'BUY' ? FiShoppingCart : RiHandCoinLine} />}
                                        <TagLabel pl={'1'}>{sellBuy}</TagLabel>
                                    </Tag>
                                {/*</Tooltip>*/}
                                    <Tag colorScheme="blue">
                                        {!isMobile && <Icon as={MdDateRange} />}
                                        <TagLabel pl={'1'}> {formattedExpiry}</TagLabel>
                                    </Tag>
                                    <Tag colorScheme="purple">
                                        {!isMobile && <Icon as={optionType === 'CALL' ? MdArrowUpward : MdArrowDownward} />}
                                        <TagLabel pl={'1'}>{optionType}</TagLabel>
                                    </Tag>
                                <Tag colorScheme="yellow">
                                    {!isMobile &&  <Icon as={GiMoneyStack}/>}
                                    <TagLabel pl={'1'}>{`${formattedStrike} sUSD`}</TagLabel>
                                </Tag>
                            </HStack>
                        </Box>
                        <Box>
                            <HStack {...groupOptionType}>
                                <FormLabel htmlFor="orderType">Order:</FormLabel>
                                {radioOrderTypes.map((value) => {
                                    const radio = getOrderTypeRadioProps({ value });
                                    return (
                                      <RadioCard key={value} {...radio}>
                                          {value}
                                      </RadioCard>
                                    );
                                })}
                            </HStack>
                        </Box>
                        <Accordion allowToggle display={{ sm: "block", md: "none" }}>
                            <AccordionItem>
                                <h2>
                                    <AccordionButton>
                                        <Box flex="1" textAlign="left">
                                            View Orderbook
                                        </Box>
                                        <AccordionIcon />
                                    </AccordionButton>
                                </h2>
                                <AccordionPanel pb={6}>
                                    <Box id={"orderbook"}>
                                        <Box
                                            color={useColorModeValue("gray.500", "black")}
                                            bgColor={useColorModeValue("gray.100", "gray.400")}
                                            fontWeight="semibold"
                                            letterSpacing="wide"
                                            fontSize="xs"
                                            ml="2"
                                            borderRadius="md"
                                            px="2"
                                            py="1"
                                        >
                                            Sell Offers
                                        </Box>
                                        <Table variant={'unstyled'} size={'sm'}>
                                            <Thead>
                                                <Tr>
                                                    <Th color="gray.400">Price</Th>
                                                    <Th color="gray.400">Contract</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {orderbookSellRows}
                                            </Tbody>
                                        </Table>
                                        <Divider/>
                                        <Box
                                            color={useColorModeValue("gray.500", "black")}
                                            bgColor={useColorModeValue("gray.100", "gray.400")}
                                            fontWeight="semibold"
                                            letterSpacing="wide"
                                            fontSize="xs"
                                            ml="2"
                                            borderRadius="md"
                                            px="2"
                                            py="1"
                                        >
                                            Buy Offers
                                        </Box>
                                        <Table variant={'unstyled'} size={'sm'}>
                                            <Thead>
                                                <Tr>
                                                    <Th color="gray.400">Price</Th>
                                                    <Th color="gray.400">Contract</Th>
                                                </Tr>
                                            </Thead>
                                            <Tbody>
                                                {orderbookBuyRows}
                                            </Tbody>
                                        </Table>
                                    </Box>
                                </AccordionPanel>
                            </AccordionItem>
                        </Accordion>
                        <Box>
                            <FormLabel htmlFor="amount">Quantity:
                                <Popover trigger={"hover"}>
                                    <PopoverTrigger>
                                        <Text as="sup" pl={1}><QuestionOutlineIcon/></Text>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverArrow />
                                        <PopoverBody letterSpacing="wide" textAlign={"left"} fontSize={'sm'}>
                                            <Text> Number of contracts you want to {radioOption.toLowerCase()}</Text><Text> 1 contract = 1 sMATIC. </Text><Text>Min: 0.000001</Text>
                                        </PopoverBody>
                                    </PopoverContent>
                                </Popover>
                            </FormLabel>
                            <Input
                                id="amount"
                                placeholder="0.1"
                                value={amount || ''}
                                isInvalid={amount<=0 ||isNaN(Number(amount)) }
                                onChange={(event: any) => setAmount(event.target.value)}
                            />
                        </Box>
                        <Box>
                            <FormLabel htmlFor="bid">Price per contract:
                                <Popover trigger={"hover"}>
                                    <PopoverTrigger>
                                        <Text as="sup" pl={1}><QuestionOutlineIcon/></Text>
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <PopoverArrow />
                                        <PopoverBody letterSpacing="wide" textAlign={"left"} fontSize={'sm'}>
                                            <Text> The sUSD required to purchase 1 contract</Text>
                                            <Text>1 contract = 1 sMATIC</Text>
                                        </PopoverBody>
                                    </PopoverContent>
                                </Popover>
                            </FormLabel>
                            <Input
                              // Market
                              display={radioOrderType === 'Market' ? 'block' : 'none'}
                              id="bid"
                              placeholder="0"
                              value={marketPrice || ''}
                              isDisabled={true}
                              isInvalid={radioOrderType === 'Limit' && (Number(marketPrice)<=0 || price === '' || isNaN(Number(marketPrice)))}
                            />
                            <Input
                              // Limit
                              display={radioOrderType === 'Market' ? 'none' : 'block'}
                              id="bid"
                              placeholder="0"
                              value={price || ''}
                              isDisabled={false}
                              onChange={(event: any) => setPrice(event.target.value)}
                              isInvalid={radioOrderType === 'Limit' && (Number(price)<=0 || price === '' || isNaN(Number(price)))}
                            />
                        </Box>
                        {/*<Alert status="info" borderRadius={"2xl"} bgColor={alertColor}>*/}
                        {/*    <AlertIcon />*/}
                        {/*    {tooltipLabel}*/}
                        {/*</Alert>*/}
                        <Box>
                            <Flex justifyContent="flex-end">
                                <Button
                                    colorScheme={useColorModeValue("green", "teal")}
                                  type="submit"
                                  // onClick={radioOrderType === 'Limit' ? limitOrder : marketOrderMany}
                                    onClick={onOpenConfirmDialog}
                                  disabled={
                                      amount<=0 ||
                                      isNaN(Number(amount)) ||
                                      (radioOrderType === 'Market' && (
                                        Boolean(radioOption === 'BUY' ? !orderBook.sellOrders[0] : !orderBook.buyOrders[0])
                                      )) ||
                                      (radioOrderType === 'Limit' && (
                                          Number(price)<=0 ||
                                          isNaN(Number(price))
                                      ))
                                  }


                                >
                                    Place {radioOption === 'BUY' ? 'Buy' : 'Sell'} Order
                                </Button>
                            </Flex>
                        </Box>
                    </Stack>

                </Box>
                {!isMobile && <Box id={"orderbook"} ml={4} display={{ sm: "none", md: "block" }}>
                    <Box

                        fontWeight="semibold"
                        letterSpacing="wide"
                        fontSize="xs"
                        ml="2"
                        borderRadius="md"
                        px="2"
                        py="1"
                        color = {orderBookColorMobile}
                        bgColor={orderBookBgColorMobile}
                    >
                        Sell Offers
                    </Box>
                    <Table variant={'unstyled'} size={'sm'}>
                        <Thead>
                            <Tr>
                                <Th color="gray.400">Price</Th>
                                <Th color="gray.400">Size</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {orderbookSellRows}
                        </Tbody>
                    </Table>
                    <Box
                        color={orderBookColorMobile}
                        bgColor={orderBookBgColorMobile}
                        fontWeight="semibold"
                        letterSpacing="wide"
                        fontSize="xs"
                        ml="2"
                        borderRadius="md"
                        px="2"
                        py="1"
                        mt="4"
                    >
                        Buy Offers
                    </Box>
                    <Table variant={'unstyled'} size={'sm'}>
                        <Thead>
                            <Tr>
                                <Th color="gray.400">Price</Th>
                                <Th color="gray.400">Size</Th>
                            </Tr>
                        </Thead>
                        <Tbody>
                            {orderbookBuyRows}
                        </Tbody>
                    </Table>
                </Box>}
            </Flex>

          <AlertDialog
              motionPreset="slideInBottom"
              // @ts-ignore
              leastDestructiveRef={cancelRef}
              onClose={onCloseConfirmDialog}
              isOpen={isOpenConfirmDialog}
              isCentered
          >
              <AlertDialogOverlay />

              <AlertDialogContent>
                  <AlertDialogHeader>Order Confirmation</AlertDialogHeader>
                  <AlertDialogCloseButton />
                  <Divider/>
                  <AlertDialogBody>
                      <Text>You are about to <strong>{radioOption === 'BUY' ? 'buy' : 'sell'}</strong> options that give {radioOption === 'BUY' ? 'you' : 'someone'} the <strong>right to {optionType === 'CALL' ? 'buy' : 'sell'} {amount} sMATIC for {formattedStrike} sUSD/sMATIC</strong> {radioOption === 'SELL' ? optionType === 'CALL' ? 'from you' : 'to you': ''} until <strong>{formattedExpiry}, {formatTime(expiry)}</strong>. Place order?</Text>
                  </AlertDialogBody>
                  <AlertDialogFooter>
                      <Button
                          // @ts-ignore
                          ref={cancelRef} onClick={onCloseConfirmDialog}>
                          No
                      </Button>
                      <Button colorScheme="teal" ml={3} onClick={placeOrderConfirmation}>
                          Yes
                      </Button>
                  </AlertDialogFooter>
              </AlertDialogContent>
          </AlertDialog>
        </>
    )
}

export default OptionDetails;
